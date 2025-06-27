const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register or update user
router.post('/register', 
  authenticateToken,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('role').isIn(['donor', 'receiver', 'admin']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, role, organizationName } = req.body;
      const { uid, email } = req.user;

      // Check if user already exists
      let user = await User.findByUid(uid);
      
      if (user) {
        // Update existing user
        user = await User.updateProfile(uid, { name, organizationName });
        if (user.role !== role) {
          user = await User.updateRole(uid, role);
        }
      } else {
        // Create new user
        user = await User.create({
          uid,
          email,
          name,
          role,
          organizationName
        });
      }

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationName: user.organization_name
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByUid(req.user.uid);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      uid: user.uid,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationName: user.organization_name,
      location: user.location,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', 
  authenticateToken,
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('organizationName').optional(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, organizationName, location } = req.body;
      const user = await User.updateProfile(req.user.uid, {
        name,
        organizationName,
        location
      });

      res.json({
        message: 'Profile updated successfully',
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationName: user.organization_name,
          location: user.location
        }
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;