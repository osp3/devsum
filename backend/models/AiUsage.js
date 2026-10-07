import mongoose from 'mongoose';

const RETENTION_SECONDS = 8 * 24 * 60 * 60;

// Daily OpenAI token usage on DevSum's key, per user (UTC days)
const aiUsageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  day: { type: String, required: true },
  tokens: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, expires: RETENTION_SECONDS }
}, { versionKey: false });

aiUsageSchema.index({ userId: 1, day: 1 }, { unique: true });

const utcDay = (now) => now.toISOString().slice(0, 10);

aiUsageSchema.statics.tokensToday = async function(userId, now = new Date()) {
  const usage = await this.findOne({ userId, day: utcDay(now) }, { tokens: 1 }).lean();
  return usage?.tokens || 0;
};

aiUsageSchema.statics.record = function(userId, tokens, now = new Date()) {
  return this.updateOne({ userId, day: utcDay(now) }, { $inc: { tokens } }, { upsert: true });
};

export default mongoose.model('AiUsage', aiUsageSchema);
