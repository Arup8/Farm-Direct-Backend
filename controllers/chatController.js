import Chat from '../models/Chat.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { sendNotification } from '../utils/sendNotification.js';
import * as chatService from '../services/chatService.js';

// @desc    Get all chats for the current user
// @route   GET /api/v1/chats
// @access  Private
export const getChats = async (req, res, next) => {
  try {
    console.log('GetChats request from user:', req.user.id, 'with role:', req.user.role);
    
    // Convert user ID to string for consistent comparison
    const userIdString = req.user.id.toString();
    
    // Find all chats where the user is a participant
    const chats = await Chat.find({
      participants: { $in: [userIdString, req.user.id] }
    })
      .sort('-updatedAt')
      .populate('participants', 'name image role')
      .populate('lastMessage.sender', 'name image role');
    
    console.log('Found', chats.length, 'chats for user');
    
    res.status(200).json({
      success: true,
      count: chats.length,
      data: chats
    });
  } catch (error) {
    console.error('Error in getChats:', error);
    next(error);
  }
};

// @desc    Get single chat
// @route   GET /api/v1/chats/:id
// @access  Private
export const getChat = async (req, res, next) => {
  try {
    console.log('GetChat request for chat:', req.params.id, 'from user:', req.user.id);
    
    const chat = await Chat.findById(req.params.id)
      .populate('participants', 'name image role');
    
    if (!chat) {
      console.log('Chat not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }
    
    console.log('Chat participants:', chat.participants.map(p => p._id.toString()));
    
    // Check if user is a participant - convert everything to string to ensure consistent comparison
    const userIdString = req.user.id.toString();
    const isParticipant = chat.participants.some(p => 
      p._id.toString() === userIdString || p.toString() === userIdString
    );
    
    console.log('User is participant:', isParticipant);
    
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this chat'
      });
    }
    
    // Mark messages as read
    await chatService.markMessagesAsRead({
      chatId: chat._id,
      userId: req.user.id
    });
    
    res.status(200).json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Error in getChat:', error);
    next(error);
  }
};

// @desc    Create or get chat with another user
// @route   POST /api/v1/chats
// @access  Private
export const createChat = async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    console.log('CreateChat request from user:', req.user.id, 'to user:', userId);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Check if the target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found'
      });
    }
    
    console.log('Target user role:', targetUser.role, 'Current user role:', req.user.role);
    
    // Only allow chats between:
    // 1. Customers and sellers
    // 2. Admins and any user
    const isSellerCustomerChat = 
      (req.user.role === 'customer' && targetUser.role === 'seller') ||
      (req.user.role === 'seller' && targetUser.role === 'customer');
      
    const isAdminChat = req.user.role === 'admin';
    
    if (!isSellerCustomerChat && !isAdminChat) {
      return res.status(403).json({
        success: false,
        message: 'You can only start chats with sellers if you are a customer, or with customers if you are a seller'
      });
    }
    
    // Get or create chat
    try {
      const chat = await chatService.getOrCreateChat(req.user.id, userId);
      
      res.status(200).json({
        success: true,
        data: chat
      });
    } catch (error) {
      console.error('Error creating chat:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create chat'
      });
    }
  } catch (error) {
    console.error('CreateChat Error:', error);
    next(error);
  }
};

// @desc    Send message
// @route   POST /api/v1/chats/:id/messages
// @access  Private
export const sendMessage = async (req, res, next) => {
  try {
    const { content, isBargain, productId, offeredPrice } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }
    
    const chat = await Chat.findById(req.params.id);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }
    
    // Check if user is a participant - convert to string for consistent comparison
    const userIdString = req.user.id.toString();
    const isParticipant = chat.participants.some(p => 
      p._id?.toString() === userIdString || p.toString() === userIdString
    );
    
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages in this chat'
      });
    }
    
    let bargainDetails;
    
    // Handle bargain messages
    if (isBargain && productId) {
      // Validate product
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      if (!offeredPrice) {
        return res.status(400).json({
          success: false,
          message: 'Offered price is required for bargain messages'
        });
      }
      
      bargainDetails = {
        productId,
        originalPrice: product.price,
        offeredPrice,
        status: 'pending'
      };
    }
    
    // Get recipient (the other participant) - make sure we only have the ID as a string
    const participant = chat.participants.find(p => {
      const participantId = p._id?.toString() || p.toString();
      return participantId !== userIdString;
    });
    
    // Extract just the ID string, not the entire populated object
    const recipientId = participant && (participant._id?.toString() || participant.toString());
    
    if (!recipientId) {
      return res.status(500).json({
        success: false,
        message: 'Could not determine message recipient'
      });
    }
    
    // Log recipient ID for debugging
    console.log('Recipient ID for message:', recipientId);
    
    // Check if this is a customer messaging a seller
    const sender = await User.findById(req.user.id);
    const recipient = await User.findById(recipientId);
    
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found'
      });
    }
    
    const isCustomerToSeller = sender.role === 'customer' && recipient.role === 'seller';
    
    // If this is a customer messaging a seller, check if AI should respond
    if (isCustomerToSeller) {
      // Use the handleMessageWithAI service which will:
      // 1. Send the user's message
      // 2. Check if seller is active
      // 3. If inactive, automatically send an AI response
      const result = await chatService.handleMessageWithAI({
        chatId: chat._id,
        senderId: req.user.id,
        content,
        recipientId,
        isBargain: !!isBargain,
        bargainDetails,
        productId // Pass product ID for context-aware responses
      });
      
      // Return the result, including information about AI response if any
      return res.status(200).json({
        success: true,
        data: result.chat,
        aiResponded: result.aiResponded,
        aiMessage: result.aiMessage
      });
    } else {
      // For all other cases (seller to customer, customer to customer, etc.)
      // Just send the message normally
      const updatedChat = await chatService.sendMessage({
        chatId: chat._id,
        senderId: req.user.id,
        content,
        isBargain: !!isBargain,
        bargainDetails
      });
      
      res.status(200).json({
        success: true,
        data: updatedChat
      });
    }
  } catch (error) {
    console.error("Error in sendMessage:", error);
    next(error);
  }
};

// @desc    Respond to bargain
// @route   POST /api/v1/chats/:id/bargain/:messageId
// @access  Private
export const respondToBargain = async (req, res, next) => {
  try {
    const { response } = req.body;
    const { id: chatId, messageId } = req.params;
    
    if (!response || !['accepted', 'rejected'].includes(response)) {
      return res.status(400).json({
        success: false,
        message: 'Response must be "accepted" or "rejected"'
      });
    }
    
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }
    
    // Check if user is a participant - convert to string for consistent comparison
    const userIdString = req.user.id.toString();
    const isParticipant = chat.participants.some(p => 
      p._id?.toString() === userIdString || p.toString() === userIdString
    );
    
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to respond in this chat'
      });
    }
    
    // Find the message
    const message = chat.messages.id(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Check if message is a bargain
    if (!message.isBargain) {
      return res.status(400).json({
        success: false,
        message: 'This message is not a bargain offer'
      });
    }
    
    // Check if user is not the sender of the bargain
    if (message.sender.toString() === userIdString) {
      return res.status(400).json({
        success: false,
        message: 'You cannot respond to your own bargain offer'
      });
    }
    
    // Respond to bargain
    const updatedChat = await chatService.respondToBargain({
      chatId,
      messageId,
      responderId: req.user.id,
      response
    });
    
    res.status(200).json({
      success: true,
      data: updatedChat
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get AI response for a chat
// @route   POST /api/v1/chats/ai-response
// @access  Private
export const getAIResponse = async (req, res, next) => {
  try {
    const { message, productId, chatId } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }
    
    // Get chat history if chatId is provided
    let chatHistory = [];
    if (chatId) {
      const chat = await Chat.findById(chatId);
      if (chat) {
        // Get last 5 messages for context
        chatHistory = chat.messages.slice(-5).map(msg => ({
          content: msg.content,
          isUserMessage: msg.sender.toString() === req.user.id
        }));
      }
    }
    
    // Get AI response
    const aiResponse = await chatService.getAIResponse({
      message,
      productId,
      chatHistory
    });
    
    // If chatId is provided, also save this interaction in the chat
    if (chatId) {
      const chat = await Chat.findById(chatId);
      
      if (chat) {
        // Add user message
        chat.messages.push({
          sender: req.user.id,
          content: message,
          createdAt: new Date()
        });
        
        // Create virtual AI user if needed
        const aiUserId = process.env.AI_USER_ID || '000000000000000000000000';
        
        // Add AI response
        chat.messages.push({
          sender: aiUserId,
          content: aiResponse,
          createdAt: new Date(Date.now() + 1000) // 1 second later
        });
        
        await chat.save();
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        response: aiResponse
      }
    });
  } catch (error) {
    next(error);
  }
}; 