# Farm Direct - Backend API

This is the backend API for the Farm Direct application, a platform that connects local farmers directly with consumers.

## Features

- User authentication (signup, login, password reset)
- Product management (create, read, update, delete)
- Order management
- Shopping cart functionality
- In-app chat between farmers and customers
- Payment processing
- Reviews and ratings
- Admin dashboard with analytics
- Complaint handling
- Push notifications

## Tech Stack

- **Runtime & Framework**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **File & Media Handling**: Multer, Cloudinary
- **Authentication & Security**: bcryptjs, jsonwebtoken, helmet
- **Validation**: express-validator
- **Others**: dotenv, cors, cookie-parser

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd farm-direct-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following environment variables:
```
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/farm-direct
MONGODB_URI_PROD=your_production_mongodb_uri

# JWT Configuration
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=7

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email Configuration (for password reset)
EMAIL_USERNAME=your_email
EMAIL_PASSWORD=your_email_password
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
```

4. Start the development server:
```bash
npm run dev
```

The server will run on `http://localhost:5000`.

## API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `GET /auth/me` - Get current user
- `PUT /auth/me` - Update current user

### Products
- `GET /products` - Get all products
- `GET /products/:id` - Get single product
- `POST /products` - Create a product (seller only)
- `PUT /products/:id` - Update a product
- `DELETE /products/:id` - Delete a product
- `GET /products/search` - Search products

### Cart
- `GET /cart` - Get user's cart
- `POST /cart` - Add item to cart
- `PUT /cart/:productId` - Update item quantity
- `DELETE /cart/:productId` - Remove item from cart
- `DELETE /cart` - Clear cart

### Orders
- `GET /orders` - Get user's orders
- `GET /orders/:id` - Get a single order
- `POST /orders` - Create a new order
- `PUT /orders/:id/status` - Update order status (seller only)

### Reviews
- `GET /products/:id/reviews` - Get reviews for a product
- `POST /products/:id/reviews` - Add a review
- `PUT /reviews/:id` - Update a review
- `DELETE /reviews/:id` - Delete a review

### Chat
- `GET /chats` - Get user's chats
- `GET /chats/:id` - Get a single chat
- `POST /chats` - Create a new chat
- `POST /chats/:id/messages` - Send a message

### Payments
- `POST /payments/order` - Create payment order
- `POST /payments/verify` - Verify payment
- `POST /payments/refund` - Request refund

### Admin
- `GET /admin/users` - Get all users
- `GET /admin/analytics` - Get analytics data
- `GET /admin/complaints` - Get all complaints
- `PUT /admin/complaints/:id` - Update complaint status

## Directory Structure

```
backend/
├── config/           # Configuration files
├── controllers/      # Request handlers
├── middlewares/      # Custom middlewares
├── models/           # Database models
├── routes/           # API routes
├── services/         # Business logic
├── utils/            # Utility functions
├── uploads/          # Temporary file storage
├── .env              # Environment variables
├── package.json      # Dependencies
└── server.js         # Entry point
```

## Development

- Start the development server with auto-reload:
```bash
npm run dev
```

## Production Deployment

1. Set the environment variables for production
2. Build and start the server:
```bash
npm start
```

## License

[MIT](LICENSE) 