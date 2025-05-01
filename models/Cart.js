import mongoose from 'mongoose';

const CartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1']
      }
    }
  ],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
CartSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Populate items with product details
CartSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'items.product',
    select: 'name price originalPrice discountPercentage unit images stock createdBy'
  }).populate({
    path: 'items.product.createdBy',
    select: 'name image',
    model: 'User'
  });
  
  next();
});

// Method to add item to cart
CartSchema.methods.addToCart = function(productId, quantity) {
  const itemIndex = this.items.findIndex(item => 
    item.product.toString() === productId.toString()
  );
  
  if (itemIndex > -1) {
    // Product exists in cart, update quantity
    this.items[itemIndex].quantity += quantity;
  } else {
    // Product does not exists in cart, add new item
    this.items.push({ product: productId, quantity });
  }
  
  return this.save();
};

// Method to remove item from cart
CartSchema.methods.removeFromCart = function(productId) {
  const itemIndex = this.items.findIndex(item => 
    item.product.toString() === productId.toString()
  );
  
  if (itemIndex > -1) {
    this.items.splice(itemIndex, 1);
  }
  
  return this.save();
};

// Method to update item quantity
CartSchema.methods.updateQuantity = function(productId, quantity) {
  const itemIndex = this.items.findIndex(item => 
    item.product.toString() === productId.toString()
  );
  
  if (itemIndex > -1) {
    this.items[itemIndex].quantity = quantity;
  }
  
  return this.save();
};

// Method to clear cart
CartSchema.methods.clearCart = function() {
  this.items = [];
  return this.save();
};

const Cart = mongoose.model('Cart', CartSchema);

export default Cart; 