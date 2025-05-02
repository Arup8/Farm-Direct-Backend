/**
 * AI User Initialization Utility
 * 
 * This file contains functions to ensure the AI user exists in the database
 * It should be called during server startup to guarantee AI chat functionality
 */

import User from '../models/User.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env');

// Load environment variables if not already loaded
if (!process.env.AI_USER_ID) {
  dotenv.config({ path: envPath });
}

/**
 * Initialize the AI user
 * Creates the AI user if it doesn't exist and updates .env with the user ID
 */
export const initializeAIUser = async () => {
  try {
    console.log('Initializing AI assistant...');
    
    // Check if AI user already exists
    let aiUser = await User.findOne({ email: 'ai-assistant@farm-direct.com' });
    
    if (aiUser) {
      console.log('✅ AI assistant already exists with ID:', aiUser._id);
      
      // Update environment variable if needed
      if (!process.env.AI_USER_ID) {
        process.env.AI_USER_ID = aiUser._id.toString();
        
        // Also update .env file for persistence
        try {
          const envContent = fs.readFileSync(envPath, 'utf-8');
          if (!envContent.includes('AI_USER_ID=')) {
            fs.writeFileSync(envPath, envContent + `\nAI_USER_ID=${aiUser._id}`);
            console.log('✅ Added AI_USER_ID to .env file');
          }
        } catch (fileError) {
          console.warn('⚠️ Could not update .env file, but AI_USER_ID is set in memory:', fileError.message);
        }
      }
      
      return aiUser;
    }
    
    // Create new AI user
    console.log('Creating new AI assistant user...');
    aiUser = await User.create({
      name: 'Farm Assistant',
      email: 'ai-assistant@farm-direct.com',
      password: `ai-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
      role: 'admin', // Use admin role to bypass restrictions
      image: 'ai-assistant.png'
    });
    
    console.log('✅ AI assistant created successfully with ID:', aiUser._id);
    
    // Set environment variable
    process.env.AI_USER_ID = aiUser._id.toString();
    
    // Update .env file
    try {
      const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
      fs.writeFileSync(envPath, envContent + `\nAI_USER_ID=${aiUser._id}`);
      console.log('✅ Added AI_USER_ID to .env file');
    } catch (fileError) {
      console.warn('⚠️ Could not update .env file, but AI_USER_ID is set in memory:', fileError.message);
    }
    
    return aiUser;
  } catch (error) {
    console.error('❌ Error initializing AI assistant:', error);
    // Don't throw error to prevent server startup failure
    // Just log it and continue - AI features will be limited
  }
}; 