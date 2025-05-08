import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://rahuljasrasr1112:YJIOjKgW1TOz99qP@cluster0food.ffgrkhu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0food ');
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;