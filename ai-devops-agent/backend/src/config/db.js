import mongoose from 'mongoose';

export const connectDb = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) return;
  await mongoose.connect(uri);
};
