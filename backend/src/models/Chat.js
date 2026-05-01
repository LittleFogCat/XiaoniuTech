import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      enum: ['user', 'assistant', 'system'],
    },
    content: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const ChatTargetSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['identity'],
    },
    id: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const ChatSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      default: '新对话',
      trim: true,
    },
    model: {
      type: String,
      default: 'glm-5.1',
      trim: true,
    },
    messages: {
      type: [MessageSchema],
      default: [],
    },
    chatTarget: {
      type: ChatTargetSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ChatSchema.index(
  { userId: 1, 'chatTarget.type': 1, 'chatTarget.id': 1 },
  {
    unique: true,
    partialFilterExpression: {
      'chatTarget.type': 'identity',
      'chatTarget.id': { $exists: true, $type: 'string' },
    },
  }
);

export default mongoose.model('Chat', ChatSchema);

