import mongoose from 'mongoose';

const visitStatisticSchema = new mongoose.Schema(
  {
    cid: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    ip: {
      type: String,
      default: '',
      trim: true,
    },
    region: {
      type: String,
      default: '未知',
      trim: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    referer: {
      type: String,
      default: '',
      trim: true,
    },
    ua: {
      type: String,
      default: '',
      trim: true,
    },
    enterTime: {
      type: Date,
      required: true,
      index: true,
    },
    exitTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
      min: 0,
    },
    isComplete: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'visit_statistics',
  }
);

visitStatisticSchema.index({ cid: 1, enterTime: -1 });
visitStatisticSchema.index({ path: 1, enterTime: -1 });

export default mongoose.model('VisitStatistic', visitStatisticSchema);