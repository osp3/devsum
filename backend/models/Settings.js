import mongoose from 'mongoose';
import { decryptSecret, encryptSecret, isEncrypted } from '../utils/crypto.js';

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  value: {
    type: String,
    required: true
  },
  encrypted: {
    type: Boolean,
    default: false
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Sensitive keys that should be encrypted
const SENSITIVE_KEYS = [
  'GITHUB_CLIENT_SECRET',
  'OPENAI_API_KEY',
  'SESSION_SECRET'
];

const protect = (key, value) => (SENSITIVE_KEYS.includes(key) ? encryptSecret(value) : value);

// Encrypt sensitive data before saving
settingsSchema.pre('save', function(next) {
  if (this.isModified('value')) {
    this.value = protect(this.key, this.value);
    this.encrypted = isEncrypted(this.value);
  }
  next();
});

// Method to decrypt sensitive data
settingsSchema.methods.getDecryptedValue = function() {
  return decryptSecret(this.value);
};

// Static method to get all settings as key-value pairs
settingsSchema.statics.getAllSettings = async function() {
  const settings = await this.find({});
  const result = {};
  
  for (const setting of settings) {
    result[setting.key] = setting.getDecryptedValue();
  }
  
  return result;
};

// Static method to get a specific setting value
settingsSchema.statics.getValue = async function(key) {
  const setting = await this.findOne({ key });
  if (!setting) {
    return null;
  }
  return setting.getDecryptedValue();
};

// Static method to set a setting value
settingsSchema.statics.setValue = async function(key, value) {
  const storedValue = protect(key, value);
  const setting = await this.findOneAndUpdate(
    { key },
    { value: storedValue, encrypted: isEncrypted(storedValue), updatedAt: new Date() },
    { upsert: true, new: true }
  );
  return setting;
};

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings; 