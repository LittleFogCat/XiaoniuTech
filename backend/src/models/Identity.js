import mongoose from 'mongoose';

const IdentitySchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: '',
      trim: true,
    },
    personaDefinition: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      enum: ['seed', 'manual'],
      default: 'seed',
    },
    seedFile: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.model('Identity', IdentitySchema);