import mongoose from 'mongoose';

// Connect to MongoDB
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options are no longer needed in newer mongoose versions
      // but kept for backwards compatibility
    });
    
    console.log(`📌  MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}; 