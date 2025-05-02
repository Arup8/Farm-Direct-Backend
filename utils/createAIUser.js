/**
 * Script to create an AI User in the database
 * Run with: node utils/createAIUser.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Setup environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

// Connect to database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Create AI User
const createAIUser = async () => {
  try {
    // Check if AI user already exists
    const existingUser = await User.findOne({ email: 'ai-assistant@farm-direct.com' });
    
    if (existingUser) {
      console.log('AI User already exists with ID:', existingUser._id);
      
      // Update .env file with AI user ID if not already there
      if (!process.env.AI_USER_ID) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const newEnvContent = envContent + `\nAI_USER_ID=${existingUser._id}`;
        fs.writeFileSync(envPath, newEnvContent);
        console.log('Added AI_USER_ID to .env file');
      }
      
      mongoose.disconnect();
      return;
    }
    
    // Create new AI user
    const aiUser = await User.create({
      name: 'Farm Assistant',
      email: 'ai-assistant@farm-direct.com',
      password: `ai-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
      role: 'admin', // Use admin role to bypass restrictions
      image: 'ai-assistant.png', // Default image, update with actual image
      phone: '+1234567890'
    });
    
    console.log('AI User created successfully with ID:', aiUser._id);
    
    // Update .env file with AI user ID
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const newEnvContent = envContent + `\nAI_USER_ID=${aiUser._id}`;
    fs.writeFileSync(envPath, newEnvContent);
    console.log('Added AI_USER_ID to .env file');
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error creating AI user:', error);
    mongoose.disconnect();
    process.exit(1);
  }
};

createAIUser(); 