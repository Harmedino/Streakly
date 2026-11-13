import mongoose, { Schema } from 'mongoose';
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    authVersion: { type: Number, default: 0 },
    resetHash: String,
    resetExpires: Date,
  },
  { timestamps: true },
);
export const User = mongoose.model('User', userSchema);
const sessionSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    csrf: { type: String, required: true },
    authVersion: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Session = mongoose.model('Session', sessionSchema);
// One aggregate per owner keeps ledger movements, learning credits and derived streaks atomic.
// Every write runs the same domain validators used by Angular, then a revision compare-and-swap.
const workspaceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true },
    revision: { type: Number, default: 0, required: true },
    data: { type: Schema.Types.Mixed, required: true },
    migrationHashes: { type: [String], default: [] },
    draftEpoch: { type: Number, default: 0 },
    draft: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true, minimize: false },
);
export const Workspace = mongoose.model('Workspace', workspaceSchema);
