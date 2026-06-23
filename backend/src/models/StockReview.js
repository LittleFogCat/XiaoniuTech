import mongoose from 'mongoose';

const marketIndexSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    close: {
      type: Number,
      required: true,
    },
    changePercent: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const marketSchema = new mongoose.Schema(
  {
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    indices: {
      type: [marketIndexSchema],
      default: [],
    },
    volume: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const sectorStockSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    changePercent: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const hotSectorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    changePercent: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    stocks: {
      type: [sectorStockSchema],
      default: [],
    },
  },
  { _id: false }
);

const conceptSectorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    changePercent: {
      type: Number,
      required: true,
    },
    stocks: {
      type: [sectorStockSchema],
      default: [],
    },
  },
  { _id: false }
);

const todayHotSchema = new mongoose.Schema(
  {
    topSectors: {
      type: [hotSectorSchema],
      default: [],
    },
    concepts: {
      type: [conceptSectorSchema],
      default: [],
    },
    fallingSectors: {
      type: [hotSectorSchema],
      default: [],
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const newsItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const focusSectorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const focusStockSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const focusStockGroupSchema = new mongoose.Schema(
  {
    sector: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      default: '',
      trim: true,
    },
    stocks: {
      type: [focusStockSchema],
      default: [],
    },
  },
  { _id: false }
);

const reviewCreatorSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    nickname: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const stockReviewSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      trim: true,
    },
    markets: {
      type: marketSchema,
    },
    todayHot: {
      type: todayHotSchema,
    },
    type: {
      type: Number,
      default: 2,
      enum: [1, 2],
    },
    news: {
      type: [newsItemSchema],
      default: [],
    },
    focusSectors: {
      type: [focusSectorSchema],
      default: [],
    },
    focusStocks: {
      type: [focusStockGroupSchema],
      default: [],
    },
    creator: {
      type: reviewCreatorSchema,
      required: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    content: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

stockReviewSchema.index({ date: -1 });
stockReviewSchema.index({ 'todayHot.topSectors.name': 1 });
stockReviewSchema.index({ 'todayHot.concepts.name': 1 });
stockReviewSchema.index({ 'focusSectors.name': 1 });
stockReviewSchema.index({ 'focusStocks.sector': 1 });
stockReviewSchema.index({ 'focusStocks.stocks.code': 1 });

export default mongoose.model('StockReview', stockReviewSchema);