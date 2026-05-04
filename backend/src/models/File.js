import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    md5: {
      type: String,
      default: '',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

fileSchema.index({ md5: 1, size: 1, mimetype: 1 });

export default mongoose.model('File', fileSchema);
