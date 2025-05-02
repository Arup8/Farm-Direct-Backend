// Script to reset the chats collection
// This will drop the current chats collection and recreate it with the correct indexes

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chat from './models/Chat.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connect = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Main function to reset chats
const resetChats = async () => {
  try {
    // Connect to MongoDB
    const conn = await connect();
    
    console.log('Dropping chats collection...');
    try {
      await conn.connection.db.dropCollection('chats');
      console.log('Chats collection dropped successfully');
    } catch (error) {
      console.log('Collection may not exist yet, continuing...');
    }
    
    // Create a new empty chat to initialize the collection with proper indexes
    console.log('Creating new chat to initialize collection with correct indexes...');
    const chat = new Chat({
      participants: [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId()
      ],
      messages: []
    });
    
    await chat.save();
    console.log('Chat created with ID:', chat._id);
    
    // Delete the temporary chat
    await Chat.deleteOne({ _id: chat._id });
    console.log('Temporary chat deleted');
    
    console.log('Chats collection has been reset successfully!');
    
    // Close the connection
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
    
    process.exit(0);
  } catch (error) {
    console.error(`Error resetting chats: ${error.message}`);
    process.exit(1);
  }
};

// Run the reset function
resetChats(); 