import mongoose from 'mongoose';

const blogCommentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BlogPost',
      required: true,
    },
    author: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

blogCommentSchema.index({ postId: 1, createdAt: -1 });

export default mongoose.model('BlogComment', blogCommentSchema);
