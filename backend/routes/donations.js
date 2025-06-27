const express = require('express');
const { body, validationResult } = require('express-validator');
const Donation = require('../models/Donation');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Create a new donation
router.post('/', 
  authenticateToken,
  requireRole(['donor', 'admin']),
  [
    body('foodType').notEmpty().withMessage('Food type is required'),
    body('quantity').notEmpty().withMessage('Quantity is required'),
    body('unit').notEmpty().withMessage('Unit is required'),
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

      const donationData = {
        ...req.body,
        donorId: req.user.uid,
        donorName: req.user.name
      };

      const donation = await Donation.create(donationData);
      res.status(201).json({
        message: 'Donation created successfully',
        donation
      });
    } catch (error) {
      console.error('Donation creation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get donations by current donor
router.get('/my-donations', 
  authenticateToken,
  requireRole(['donor', 'admin']),
  async (req, res) => {
    try {
      const donations = await Donation.findByDonor(req.user.uid);
      res.json(donations);
    } catch (error) {
      console.error('Donations fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get available donations
router.get('/available', 
  authenticateToken,
  async (req, res) => {
    try {
      const donations = await Donation.findAvailable();
      res.json(donations);
    } catch (error) {
      console.error('Available donations fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update donation status
router.patch('/:id/status', 
  authenticateToken,
  [
    body('status').isIn(['pending', 'matched', 'completed', 'expired']).withMessage('Invalid status'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status, matchedWith } = req.body;

      // Check if user owns the donation or is admin
      const donation = await Donation.findById(id);
      if (!donation) {
        return res.status(404).json({ error: 'Donation not found' });
      }

      if (donation.donor_id !== req.user.uid && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const updatedDonation = await Donation.updateStatus(id, status, matchedWith);
      res.json({
        message: 'Donation status updated successfully',
        donation: updatedDonation
      });
    } catch (error) {
      console.error('Donation status update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get all donations (admin only)
router.get('/all', 
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const donations = await Donation.getAll();
      res.json(donations);
    } catch (error) {
      console.error('All donations fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get donation analytics (admin only)
router.get('/analytics', 
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const analytics = await Donation.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Donation analytics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;