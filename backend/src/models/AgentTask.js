import mongoose from 'mongoose';

const agentTaskSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    agentId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'planning', 'running', 'success', 'failed'],
      default: 'pending',
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxRetryCount: {
      type: Number,
      default: 3,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'agent_task',
  }
);

export default mongoose.model('AgentTask', agentTaskSchema);