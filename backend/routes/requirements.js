const express = require('express');
const { body, validationResult } = require('express-validator');
const Requirement = require('../models/Requirement');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Create a new requirement
router.post('/', 
  authenticateToken,
  requireRole(['receiver', 'admin']),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('foodType').notEmpty().withMessage('Food type is required'),
    body('quantity').notEmpty().withMessage('Quantity is required'),
    body('unit').notEmpty().withMessage('Unit is required'),
    body('urgency').isIn(['high', 'medium', 'low']).withMessage('Invalid urgency level'),
    body('organizationName').notEmpty().withMessage('Organization name is required'),
    body('location').isObject().withMessage('Location is required'),
    body('location.address').notEmpty().withMessage('Address is required'),
    body('location.lat').isFloat().withMessage('Valid latitude is required'),
    body('location.lng').isFloat().withMessage('Valid longitude is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const requirementData = {
        ...req.body,
        receiverId: req.user.uid,
        receiverName: req.user.name
      };

      const requirement = await Requirement.create(requirementData);
      res.status(201).json({
        message: 'Requirement created successfully',
        requirement
      });
    } catch (error) {
      console.error('Requirement creation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get requirements by current receiver
router.get('/my-requirements', 
  authenticateToken,
  requireRole(['receiver', 'admin']),
  async (req, res) => {
    try {
      const requirements = await Requirement.findByReceiver(req.user.uid);
      res.json(requirements);
    } catch (error) {
      console.error('Requirements fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get active requirements
router.get('/active', 
  authenticateToken,
  async (req, res) => {
    try {
      const requirements = await Requirement.findActive();
      res.json(requirements);
    } catch (error) {
      console.error('Active requirements fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update requirement status
router.patch('/:id/status', 
  authenticateToken,
  [
    body('status').isIn(['active', 'matched', 'fulfilled']).withMessage('Invalid status'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status, matchedWith } = req.body;

      // Check if user owns the requirement or is admin
      const requirement = await Requirement.findById(id);
      if (!requirement) {
        return res.status(404).json({ error: 'Requirement not found' });
      }

      if (requirement.receiver_id !== req.user.uid && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const updatedRequirement = await Requirement.updateStatus(id, status, matchedWith);
      res.json({
        message: 'Requirement status updated successfully',
        requirement: updatedRequirement
      });
    } catch (error) {
      console.error('Requirement status update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get all requirements (admin only)
router.get('/all', 
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const requirements = await Requirement.getAll();
      res.json(requirements);
    } catch (error) {
      console.error('All requirements fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get requirement analytics (admin only)
router.get('/analytics', 
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const analytics = await Requirement.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Requirement analytics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;