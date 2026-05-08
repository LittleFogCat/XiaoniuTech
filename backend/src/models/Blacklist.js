import mongoose from 'mongoose';

const blacklistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    blockReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
  }
);

export default mongoose.model('Blacklist', blacklistSchema);