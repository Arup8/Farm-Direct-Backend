/**
 * Chat Service
 * 
 * This service handles chat functionality between users
 * In a production app, you would likely implement this with WebSockets for real-time communication
 */

import Chat from '../models/Chat.js';
import User from '../models/User.js';
import { sendNotification } from '../utils/sendNotification.js';
import Product from '../models/Product.js';

/**
 * Get or create a chat between two users
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {Object} The chat object
 */
export const getOrCreateChat = async (userId1, userId2) => {
  try {
    console.log('getOrCreateChat called with users:', userId1, userId2);
    
    if (!userId1 || !userId2) {
      throw new Error('Both user IDs are required');
    }
    
    // Convert IDs to strings for consistent comparison
    const user1IdString = userId1.toString();
    const user2IdString = userId2.toString();
    
    if (user1IdString === user2IdString) {
      throw new Error('Cannot create chat with yourself');
    }
    
    // Check if users exist
    const [user1, user2] = await Promise.all([
      User.findById(userId1),
      User.findById(userId2)
    ]);
    
    if (!user1) {
      throw new Error(`First user (${userId1}) not found`);
    }
    
    if (!user2) {
      throw new Error(`Second user (${userId2}) not found`);
    }
    
    console.log('Both users exist:', user1.name, user2.name);
    console.log('Searching for existing chat...');
    
    // Sort participant IDs to ensure consistent ordering
    const [firstParticipant, secondParticipant] = [user1IdString, user2IdString].sort();
    
    // Check if chat already exists with sorted participants
    let chat = await Chat.findOne({
      'participants.0': firstParticipant,
      'participants.1': secondParticipant
    });
    
    console.log('Existing chat found:', !!chat);
    
    // If chat doesn't exist, create a new one with sorted participants
    if (!chat) {
      console.log('Creating new chat between', user1.name, 'and', user2.name);
      
      try {
        chat = await Chat.create({
          participants: [firstParticipant, secondParticipant],
          messages: []
        });
        console.log('New chat created with ID:', chat._id);
      } catch (createError) {
        console.error('Error creating chat in database:', createError);
        throw new Error(`Failed to create chat: ${createError.message}`);
      }
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
 * @param {boolean} messageData.isAIMessage - Whether this is an AI response
 * @returns {Object} The updated chat with the new message
 */
export const sendMessage = async (messageData) => {
  try {
    const { 
      chatId, 
      senderId, 
      content, 
      isBargain = false, 
      bargainDetails,
      isAIMessage = false
    } = messageData;
    
    if (!chatId || !senderId || !content) {
      throw new Error('Chat ID, sender ID, and content are required');
    }
    
    // Convert sender ID to string for consistent comparison
    const senderIdString = senderId.toString();
    
    // Find the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }
    
    // Check if sender is a participant (skip for AI messages since AI isn't a participant)
    if (!isAIMessage) {
      const isParticipant = chat.participants.some(p => 
        p._id?.toString() === senderIdString || p.toString() === senderIdString
      );
      
      if (!isParticipant) {
        throw new Error('Sender is not a participant in this chat');
      }
    }
    
    // Create the new message
    const newMessage = {
      sender: senderIdString,
      content,
      isBargain,
      bargainDetails,
      isAIMessage, // Add this flag to identify AI messages in the frontend
      createdAt: new Date()
    };
    
    // Add message to chat
    chat.messages.push(newMessage);
    const updatedChat = await chat.save();
    
    // Get the recipient (the other participant)
    // Don't send notification for AI messages as they're automatic
    if (!isAIMessage) {
      const participant = chat.participants.find(p => {
        const participantId = p._id?.toString() || p.toString();
        return participantId !== senderIdString;
      });
      
      // Extract just the ID string, not the entire populated object
      const recipientId = participant && (participant._id?.toString() || participant.toString());
      
      if (recipientId) {
        // Send notification to recipient
        try {
          // Make sure we're passing a simple string ID, not an object
          await sendNotification({
            recipientId: recipientId,
            senderId: senderIdString,
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
      }
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
    
    // Convert responder ID to string for consistent comparison
    const responderIdString = responderId.toString();
    
    // Find the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }
    
    // Check if responder is a participant
    const isParticipant = chat.participants.some(p => 
      p._id?.toString() === responderIdString || p.toString() === responderIdString
    );
    
    if (!isParticipant) {
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
    if (message.sender.toString() === responderIdString) {
      throw new Error('Cannot respond to your own bargain offer');
    }
    
    // Update bargain status
    chat.messages[messageIndex].bargainDetails.status = response;
    
    // Add a new system message about the response
    const responseMessage = {
      sender: responderIdString,
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
        senderId: responderIdString,
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
    
    // Convert user ID to string for consistent comparison
    const userIdString = userId.toString();
    
    // Find the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }
    
    // Check if user is a participant
    const isParticipant = chat.participants.some(p => 
      p._id?.toString() === userIdString || p.toString() === userIdString
    );
    
    if (!isParticipant) {
      throw new Error('User is not a participant in this chat');
    }
    
    // Get messages sent by the other participant and not read yet
    const unreadMessages = chat.messages.filter(m => {
      const senderIdString = m.sender.toString();
      return senderIdString !== userIdString && !m.readBy.includes(userIdString);
    });
    
    // Mark messages as read
    for (const message of unreadMessages) {
      message.readBy.push(userIdString);
    }
    
    // Save the updated chat
    await chat.save();
    
    return chat;
  } catch (error) {
    console.error('Error in markMessagesAsRead:', error);
    throw error;
  }
};

/**
 * Get AI response for a user message
 * @param {Object} aiRequestData - The request data
 * @param {string} aiRequestData.message - User message
 * @param {string} aiRequestData.productId - Product ID if relevant
 * @param {Object} aiRequestData.chatHistory - Previous messages for context
 * @returns {string} The AI generated response
 */
export const getAIResponse = async (aiRequestData) => {
  try {
    const { message, productId, chatHistory = [] } = aiRequestData;
    
    if (!message) {
      throw new Error('Message is required');
    }
    
    // In a production environment, you would integrate with an AI service like OpenAI
    // This is a simple placeholder implementation
    
    let responseMessage = '';
    
    // Check if message contains bargaining keywords
    const bargainKeywords = ['price', 'discount', 'cheaper', 'offer', 'deal', 'bargain', 'negotiate'];
    const isBargainRequest = bargainKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    if (productId) {
      // If this is product-specific, get product details
      const product = await Product.findById(productId);
      
      if (!product) {
        return "I'm sorry, I couldn't find information about that product.";
      }
      
      if (isBargainRequest) {
        // Calculate a potential discount (5-10%)
        const discountPercent = Math.floor(Math.random() * 6) + 5;
        const discountAmount = (product.price * discountPercent / 100).toFixed(2);
        const discountedPrice = (product.price - discountAmount).toFixed(2);
        
        responseMessage = `Thank you for your interest in ${product.name}! The current price is $${product.price}. I can offer a ${discountPercent}% discount, making it $${discountedPrice}. Would that work for you?`;
      } else {
        // Generic product information
        responseMessage = `${product.name} is available for $${product.price}. It's ${product.description}. Would you like more details about it?`;
      }
    } else if (isBargainRequest) {
      // General bargaining without specific product
      responseMessage = "I'd be happy to discuss pricing options. Could you please specify which product you're interested in?";
    } else {
      // General conversation
      const generalResponses = [
        "Hello! I'm the farm assistant. How may I help you today?",
        "I can help you with information about our products, placing orders, or checking delivery status.",
        "Our farmers typically respond within 2 hours during business hours. I'll help you in the meantime!",
        "Is there a specific product category you're interested in? We have fresh fruits, vegetables, dairy, and more.",
        "Feel free to ask me any questions about our products or services."
      ];
      
      // Based on chat history length, choose an appropriate response
      if (chatHistory.length === 0) {
        responseMessage = generalResponses[0];
      } else if (chatHistory.length < 3) {
        responseMessage = generalResponses[1];
      } else {
        // Pick a random response from the remaining options
        const randomIndex = Math.floor(Math.random() * (generalResponses.length - 2)) + 2;
        responseMessage = generalResponses[randomIndex];
      }
    }
    
    return responseMessage;
  } catch (error) {
    console.error('Error in getAIResponse:', error);
    throw error;
  }
};

/**
 * Check if a seller is currently active/online
 * @param {string} userId - The seller's user ID
 * @returns {boolean} Whether the seller is active
 */
export const isSellerActive = async (userId) => {
  try {
    // Ensure we have just the ID string
    const userIdString = userId.toString();
    console.log('Checking if seller is active:', userIdString);
    
    // In a production app, you would check a real-time presence system
    // For now, we'll simulate with a basic check
    const user = await User.findById(userIdString);
    
    if (!user) {
      console.log('Seller not found with ID:', userIdString);
      throw new Error('User not found');
    }
    
    // Check if the user is a seller
    if (user.role !== 'seller') {
      console.log('User is not a seller:', user.role);
      return false; // Non-sellers can't be "active sellers"
    }
    
    // In a real app, you'd check the seller's online status in a cache or database
    // For this demo, we'll simulate random availability (70% chance of being online)
    // Replace this with actual online status tracking in production
    const isActive = Math.random() < 0.7;
    
    // Simulate inactive periods (e.g., during certain hours)
    const currentHour = new Date().getHours();
    // Consider sellers inactive during late night/early morning hours (midnight to 6 AM)
    if (currentHour >= 0 && currentHour < 6) {
      return false;
    }
    
    console.log('Seller active status:', isActive);
    return isActive;
  } catch (error) {
    console.error('Error checking seller activity:', error);
    return false; // Default to inactive on error
  }
};

/**
 * Handle a new message with AI if the seller is inactive
 * @param {Object} messageData - The message data
 * @param {string} messageData.chatId - Chat ID
 * @param {string} messageData.senderId - Sender user ID
 * @param {string} messageData.content - Message content
 * @param {string} messageData.recipientId - Recipient user ID (the seller)
 * @param {boolean} messageData.isBargain - Whether this is a bargain message
 * @param {Object} messageData.bargainDetails - Bargain details if applicable
 * @param {string} messageData.productId - Product ID for context
 * @returns {Object} The updated chat with AI response if applicable
 */
export const handleMessageWithAI = async (messageData) => {
  try {
    const { 
      chatId, 
      senderId, 
      content, 
      recipientId, 
      isBargain = false, 
      bargainDetails,
      productId 
    } = messageData;
    
    // Ensure we have clean string IDs
    const chatIdString = chatId.toString();
    const senderIdString = senderId.toString();
    const recipientIdString = recipientId.toString();
    
    console.log('Handling message with AI. Recipient:', recipientIdString);
    
    // First send the user's message
    const updatedChat = await sendMessage({
      chatId: chatIdString,
      senderId: senderIdString,
      content,
      isBargain,
      bargainDetails
    });
    
    // Check if the recipient (seller) is active
    const sellerActive = await isSellerActive(recipientIdString);
    
    // If seller is active, just return the updated chat without AI response
    if (sellerActive) {
      console.log('Seller is active, no AI response needed');
      return {
        chat: updatedChat,
        aiResponded: false
      };
    }
    
    console.log('Seller is inactive, generating AI response');
    
    // Get last few messages for context
    const chat = await Chat.findById(chatIdString);
    const chatHistory = chat.messages.slice(-5).map(msg => ({
      content: msg.content,
      isUserMessage: msg.sender.toString() === senderIdString
    }));
    
    // Get AI response
    const aiResponse = await getAIResponse({
      message: content,
      productId,
      chatHistory
    });
    
    // Get AI user ID
    const aiUserId = process.env.AI_USER_ID || '000000000000000000000000';
    
    // For bargain messages, we may want AI to provide a counter-offer
    let aiBargainDetails;
    if (isBargain && bargainDetails) {
      // AI might accept or counter the offer
      const shouldAccept = Math.random() > 0.3; // 70% chance to accept
      
      if (shouldAccept) {
        // Accept the offer with an appropriate message
        aiBargainDetails = {
          ...bargainDetails,
          status: 'accepted'
        };
      } else {
        // Counter with a slightly higher price (halfway between original and offered)
        const originalPrice = bargainDetails.originalPrice;
        const offeredPrice = bargainDetails.offeredPrice;
        const counterPrice = (originalPrice + offeredPrice) / 2;
        
        aiBargainDetails = {
          ...bargainDetails,
          offeredPrice: counterPrice,
          status: 'pending'
        };
      }
    }
    
    // Send AI response message
    const chatWithAIResponse = await sendMessage({
      chatId: chatIdString,
      senderId: aiUserId,
      content: aiResponse,
      isBargain: !!aiBargainDetails,
      bargainDetails: aiBargainDetails,
      isAIMessage: true
    });
    
    return {
      chat: chatWithAIResponse,
      aiResponded: true,
      aiMessage: aiResponse
    };
  } catch (error) {
    console.error('Error handling message with AI:', error);
    throw error;
  }
}; 