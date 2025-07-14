import mongoose from 'mongoose';
import crypto from 'crypto';

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

// Encryption utilities
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'fallback-key-change-in-production';
const ALGORITHM = 'aes-256-cbc';

// Sensitive keys that should be encrypted
const SENSITIVE_KEYS = [
  'GITHUB_CLIENT_SECRET',
  'OPENAI_API_KEY',
  'SESSION_SECRET'
];

// Encrypt sensitive data before saving
settingsSchema.pre('save', function(next) {
  if (this.isModified('value') && SENSITIVE_KEYS.includes(this.key)) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
      let encrypted = cipher.update(this.value, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      this.value = iv.toString('hex') + ':' + encrypted;
      this.encrypted = true;
    } catch (error) {
      console.error('Encryption error:', error);
      return next(error);
    }
  }
  next();
});

// Method to decrypt sensitive data
settingsSchema.methods.getDecryptedValue = function() {
  if (!this.encrypted) {
    return this.value;
  }
  
  try {
    const textParts = this.value.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = textParts.join(':');
    
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
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
  const setting = await this.findOneAndUpdate(
    { key },
    { value, updatedAt: new Date() },
    { upsert: true, new: true }
  );
  return setting;
};

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings; 