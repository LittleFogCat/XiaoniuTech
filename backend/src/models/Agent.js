import mongoose from 'mongoose';

const agentSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    role: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: '',
      trim: true,
    },
    personaDefinition: {
      type: String,
      required: true,
      trim: true,
    },
    systemPrompt: {
      type: String,
      default: '',
      trim: true,
    },
    free: {
      type: Boolean,
      default: true,
    },
    source: {
      type: String,
      enum: ['seed', 'manual'],
      default: 'seed',
    },
    seedFile: {
      type: String,
      default: '',
      trim: true,
    },
    avatarFileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      default: null,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'agent',
  }
);

agentSchema.index({ deleted: 1 });

export default mongoose.model('Agent', agentSchema);