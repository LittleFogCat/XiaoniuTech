import mongoose from 'mongoose';

const agentToolSchema = new mongoose.Schema(
  {
    agentId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    returns: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'agent_tool',
  }
);

agentToolSchema.index({ agentId: 1, name: 1 }, { unique: true });

export default mongoose.model('AgentTool', agentToolSchema);