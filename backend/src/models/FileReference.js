import mongoose from 'mongoose';

const fileReferenceRecordSchema = new mongoose.Schema(
  {
    bizType: {
      type: String,
      required: true,
      trim: true,
    },
    bizId: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const fileReferenceSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      required: true,
      unique: true,
      index: true,
    },
    refRecord: {
      type: [fileReferenceRecordSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('FileReference', fileReferenceSchema);