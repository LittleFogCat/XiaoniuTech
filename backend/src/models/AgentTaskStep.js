import mongoose from 'mongoose';

const agentTaskStepSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgentTask',
      required: true,
      index: true,
    },
    step: {
      type: Number,
      required: true,
      min: 0,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    toolName: {
      type: String,
      default: '',
      trim: true,
    },
    params: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'planning', 'running', 'success', 'failed'],
      default: 'pending',
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
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'agent_task_step',
  }
);

agentTaskStepSchema.index({ taskId: 1, step: 1 }, { unique: true });

export default mongoose.model('AgentTaskStep', agentTaskStepSchema);