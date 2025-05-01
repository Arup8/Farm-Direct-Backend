/**
 * Chat Service
 * 
 * This service handles chat functionality between users
 * In a production app, you would likely implement this with WebSockets for real-time communication
 */

import Chat from '../models/Chat.js';
import User from '../models/User.js';
import { sendNotification } from '../utils/sendNotification.js';

/**
 * Get or create a chat between two users
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {Object} The chat object
 */
export const getOrCreateChat = async (userId1, userId2) => {
  try {
    if (!userId1 || !userId2) {
      throw new Error('Both user IDs are required');
    }
    
    if (userId1 === userId2) {
      throw new Error('Cannot create chat with yourself');
    }
    
    // Check if users exist
    const [user1, user2] = await Promise.all([
      User.findById(userId1),
      User.findById(userId2)
    ]);
    
    if (!user1 || !user2) {
      throw new Error('One or both users not found');
    }
    
    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [userId1, userId2] }
    });
    
    // If chat doesn't exist, create a new one
    if (!chat) {
      chat = await Chat.create({
        participants: [userId1, userId2],
        messages: []
      });
    }
    
    return chat;
  } catch (error) {
    console.error('Error in getOrCreateChat:', error);
    throw error;
  }
};

/**
 * Send a message in a chat
 * @param {Object} messageData - The message data
 * @param {string} messageData.chatId - Chat ID
 * @param {string} messageData.senderId - Sender user ID
 * @param {string} messageData.content - Message content
 * @param {boolean} messageData.isBargain - Whether this is a bargain message
 * @param {Object} messageData.bargainDetails - Bargain details if applicable
 * @returns {Object} The updated chat with the new message
 */
export const sendMessage = async (messageData) => {
  try {
    const { chatId, senderId, content, isBargain = false, bargainDetails } = messageData;
    
    if (!chatId || !senderId || !content) {
      throw new Error('Chat ID, sender ID, and content are required');
    }
    
    // Find the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }
    
    // Check if sender is a participant
    if (!chat.participants.some(p => p._id.toString() === senderId)) {
      throw new Error('Sender is not a participant in this chat');
    }
    
    // Create the new message
    const newMessage = {
      sender: senderId,
      content,
      isBargain,
      bargainDetails,
      createdAt: new Date()
    };
    
    // Add message to chat
    chat.messages.push(newMessage);
    const updatedChat = await chat.save();
    
    // Get the recipient (the other participant)
    const recipientId = chat.participants
      .find(p => p._id.toString() !== senderId)
      ._id.toString();
    
    // Send notification to recipient
    try {
      await sendNotification({
        recipientId: recipientId,
        senderId: senderId,
        title: 'New message',
        body: isBargain 
          ? 'You received a new bargain offer'
          : content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        type: 'chat',
        data: {
          chatId: chat._id.toString()
        }
      });
    } catch (notifError) {
      console.error('Failed to send chat notification:', notifError);
      // Continue even if notification fails
    }
    
    return updatedChat;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
};

/**
 * Handle a bargain response (accept/reject)
 * @param {Object} responseData - The response data
 * @param {string} responseData.chatId - Chat ID
 * @param {string} responseData.messageId - Message ID of the bargain
 * @param {string} responseData.responderId - User ID of the responder
 * @param {string} responseData.response - Response ('accepted' or 'rejected')
 * @returns {Object} The updated chat
 */
export const respondToBargain = async (responseData) => {
  try {
    const { chatId, messageId, responderId, response } = responseData;
    
    if (!chatId || !messageId || !responderId || !response) {
      throw new Error('Chat ID, message ID, responder ID, and response are required');
    }
    
    if (!['accepted', 'rejected'].includes(response)) {
      throw new Error('Response must be "accepted" or "rejected"');
    }
    
    // Find the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }
    
    // Check if responder is a participant
    if (!chat.participants.some(p => p._id.toString() === responderId)) {
      throw new Error('Responder is not a participant in this chat');
    }
    
    // Find the bargain message
    const messageIndex = chat.messages.findIndex(
      m => m._id.toString() === messageId
    );
    
    if (messageIndex === -1) {
      throw new Error('Message not found');
    }
    
    const message = chat.messages[messageIndex];
    
    // Check if message is a bargain
    if (!message.isBargain) {
      throw new Error('Message is not a bargain offer');
    }
    
    // Check if sender is not the responder
    if (message.sender.toString() === responderId) {
      throw new Error('Cannot respond to your own bargain offer');
    }
    
    // Update bargain status
    chat.messages[messageIndex].bargainDetails.status = response;
    
    // Add a new system message about the response
    const responseMessage = {
      sender: responderId,
      content: `Bargain offer ${response}`,
      isBargain: true,
      bargainDetails: {
        ...message.bargainDetails,
        status: response
      },
      createdAt: new Date()
    };
    
    chat.messages.push(responseMessage);
    
    // Save the updated chat
    const updatedChat = await chat.save();
    
    // Send notification to the original bargain sender
    try {
      await sendNotification({
        recipientId: message.sender.toString(),
        senderId: responderId,
        title: 'Bargain Response',
        body: `Your bargain offer was ${response}`,
        type: 'chat',
        data: {
          chatId: chat._id.toString()
        }
      });
    } catch (notifError) {
      console.error('Failed to send bargain response notification:', notifError);
    }
    
    return updatedChat;
  } catch (error) {
    console.error('Error in respondToBargain:', error);
    throw error;
  }
};

/**
 * Mark messages as read
 * @param {Object} readData - The read data
 * @param {string} readData.chatId - Chat ID
 * @param {string} readData.userId - User ID
 * @returns {Object} Updated chat
 */
export const markMessagesAsRead = async (readData) => {
  try {
    const { chatId, userId } = readData;
    
    if (!chatId || !userId) {
      throw new Error('Chat ID and user ID are required');
    }
    
    // Find the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }
    
    // Check if user is a participant
    if (!chat.participants.some(p => p._id.toString() === userId)) {
      throw new Error('User is not a participant in this chat');
    }
    
    // Get messages sent by the other participant and not read yet
    const unreadMessages = chat.messages.filter(
      m => m.sender.toString() !== userId && !m.readBy.includes(userId)
    );
    
    // Mark messages as read
    for (const message of unreadMessages) {
      message.readBy.push(userId);
    }
    
    // Save the updated chat
    await chat.save();
    
    return chat;
  } catch (error) {
    console.error('Error in markMessagesAsRead:', error);
    throw error;
  }
}; 