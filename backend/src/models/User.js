import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    nickname: {
      type: String,
      default: '',
      trim: true,
    },
    avatarFileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      default: null,
    },
    bio: {
      type: String,
      default: '',
      maxlength: 200,
    },
    groups: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserGroup',
      }],
      default: [],
    },
    priority: {
      type: Number,
      default: 10,
      min: 1,
      max: 100,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('User', UserSchema);
