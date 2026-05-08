import mongoose from 'mongoose';

const chatModelSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      trim: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    modelId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    free: {
      type: Boolean,
      default: true,
    },
    reasoning: {
      type: Boolean,
      default: false,
    },
    input: {
      type: [String],
      default: ['text'],
    },
    contextWindow: {
      type: Number,
      default: null,
    },
    maxTokens: {
      type: Number,
      default: null,
    },
    compat: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    providerConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    source: {
      type: String,
      enum: ['seed', 'manual'],
      default: 'seed',
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'chat_model',
  }
);

chatModelSchema.index({ provider: 1, modelId: 1 }, { unique: true });

export default mongoose.model('ChatModel', chatModelSchema);