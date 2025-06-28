const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'FoodBridge API',
    version: '1.0.0'
  });
});

// Mock data for demo
const mockDonations = [
  {
    id: '1',
    donorId: 'donor-1',
    donorName: 'Green Restaurant',
    foodType: 'fresh-produce',
    quantity: '25',
    unit: 'kg',
    description: 'Fresh organic vegetables',
    location: { address: '123 Main St', lat: 40.7128, lng: -74.0060 },
    status: 'pending',
    createdAt: new Date().toISOString()
  }
];

const mockRequirements = [
  {
    id: '1',
    receiverId: 'receiver-1',
    organizationName: 'Community Shelter',
    title: 'Daily Meal Program',
    foodType: 'any',
    quantity: '50',
    unit: 'portions',
    urgency: 'high',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

// API Routes
app.get('/api/donations', (req, res) => {
  res.json(mockDonations);
});

app.get('/api/requirements', (req, res) => {
  res.json(mockRequirements);
});

app.post('/api/donations', (req, res) => {
  const newDonation = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  mockDonations.push(newDonation);
  res.status(201).json({ message: 'Donation created', donation: newDonation });
});

app.post('/api/requirements', (req, res) => {
  const newRequirement = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  mockRequirements.push(newRequirement);
  res.status(201).json({ message: 'Requirement created', requirement: newRequirement });
});

app.get('/api/analytics', (req, res) => {
  res.json({
    donations: mockDonations,
    requirements: mockRequirements,
    matches: [],
    stats: {
      totalDonations: mockDonations.length,
      totalRequirements: mockRequirements.length,
      totalMatches: 0
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FoodBridge API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});