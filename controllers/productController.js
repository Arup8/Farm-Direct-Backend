import Product from '../models/Product.js';
import { cloudinary } from '../config/cloudinary.js';

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
export const getProducts = async (req, res, next) => {
  try {
    // Build query
    let query = {};
    
    // Filtering
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    if (req.query.minPrice && req.query.maxPrice) {
      query.price = { 
        $gte: Number(req.query.minPrice), 
        $lte: Number(req.query.maxPrice) 
      };
    } else if (req.query.minPrice) {
      query.price = { $gte: Number(req.query.minPrice) };
    } else if (req.query.maxPrice) {
      query.price = { $lte: Number(req.query.maxPrice) };
    }
    
    // Filter by seller
    if (req.query.seller) {
      query.createdBy = req.query.seller;
    }
    
    // Filter by rating
    if (req.query.rating) {
      query.rating = { $gte: Number(req.query.rating) };
    }

    // Handle search term
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Handle pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Execute query
    const products = await Product.find(query)
      .populate('createdBy', 'name image')
      .skip(startIndex)
      .limit(limit)
      .sort(req.query.sort || '-createdAt');
    
    // Get total count for pagination
    const total = await Product.countDocuments(query);
    
    // Pagination result
    const pagination = {
      total,
      pages: Math.ceil(total / limit),
      page,
      limit
    };
    
    res.status(200).json({
      success: true,
      count: products.length,
      pagination,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
export const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('createdBy', 'name image');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product
// @route   POST /api/v1/products
// @access  Private (Seller, Admin)
export const createProduct = async (req, res, next) => {
  try {
    console.log('Create Product Request Body:', req.body);
    console.log('User ID:', req.user?.id);
    console.log('Files:', req.files ? req.files.length : 'No files');
    
    // Check for required fields
    const requiredFields = ['name', 'description', 'price', 'unit', 'category', 'stock'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.log('Missing fields:', missingFields);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    // Add user to req.body
    req.body.createdBy = req.user.id;
    
    // Handle images
    let images = [];
    if (req.files && req.files.length > 0) {
      // Upload each image to Cloudinary
      for (const file of req.files) {
        try {
          console.log('Uploading file to Cloudinary:', file.originalname);
          
          // Create a dataURL from the buffer
          const fileStr = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
          
          const result = await cloudinary.uploader.upload(fileStr, {
            folder: 'products',
            width: 500,
            crop: 'scale'
          });
          
          images.push(result.secure_url);
          console.log('Cloudinary upload successful');
        } catch (cloudinaryError) {
          console.error('Cloudinary upload error:', cloudinaryError);
          return res.status(500).json({
            success: false,
            message: 'Image upload failed',
            error: cloudinaryError.message
          });
        }
      }
    }
    
    if (images.length > 0) {
      req.body.images = images;
    }
    
    // Create product
    console.log('Creating product with data:', req.body);
    const product = await Product.create(req.body);
    
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Product creation error:', error);
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private (Owner, Admin)
export const updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if user is product owner or admin
    if (
      product.createdBy.toString() !== req.user.id && 
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }
    
    // Handle image uploads if any
    if (req.files && req.files.length > 0) {
      let images = [...product.images]; // Keep existing images
      
      // Upload each new image to Cloudinary
      for (const file of req.files) {
        // Create a dataURL from the buffer
        const fileStr = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        
        const result = await cloudinary.uploader.upload(fileStr, {
          folder: 'products',
          width: 500,
          crop: 'scale'
        });
        
        images.push(result.secure_url);
      }
      
      req.body.images = images;
    }
    
    // Update product
    product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private (Owner, Admin)
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if user is product owner or admin
    if (
      product.createdBy.toString() !== req.user.id && 
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }
    
    // Delete product images from Cloudinary
    // For each image URL, extract the public_id and delete it
    if (product.images && product.images.length > 0) {
      for (const imageUrl of product.images) {
        try {
          // Extract public_id from URL
          const publicId = imageUrl
            .split('/')
            .slice(-1)[0]
            .split('.')[0];
            
          await cloudinary.uploader.destroy(`products/${publicId}`);
        } catch (err) {
          console.error('Error deleting image from Cloudinary:', err);
          // Continue even if image deletion fails
        }
      }
    }
    
    await product.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search products
// @route   GET /api/v1/products/search
// @access  Public
export const searchProducts = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query'
      });
    }
    
    // Search using text index
    const products = await Product.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .populate('createdBy', 'name image');
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
}; 