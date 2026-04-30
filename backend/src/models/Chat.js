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

const ChatSchema = new mongoose.Schema(
  {
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Chat', ChatSchema);

