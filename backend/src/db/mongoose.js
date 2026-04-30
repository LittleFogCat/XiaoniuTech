import mongoose from 'mongoose';

const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017/xn_chat';

export async function connectMongoDB() {
  const uri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
  await mongoose.connect(uri);
  return uri;
}

export async function disconnectMongoDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

