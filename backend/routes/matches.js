const express = require('express');
const { body, validationResult } = require('express-validator');
const Match = require('../models/Match');
const Donation = require('../models/Donation');
const Requirement = require('../models/Requirement');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Create a new match
router.post('/', 
  authenticateToken,
  [
    body('donationId').notEmpty().withMessage('Donation ID is required'),
    body('requirementId').notEmpty().withMessage('Requirement ID is required'),
    body('distance').isFloat({ min: 0 }).withMessage('Valid distance is required'),
    body('matchScore').isFloat({ min: 0, max: 100 }).withMessage('Valid match score is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { donationId, requirementId, distance, matchScore } = req.body;

      // Verify donation and requirement exist
      const donation = await Donation.findById(donationId);
      const requirement = await Requirement.findById(requirementId);

      if (!donation || !requirement) {
        return res.status(404).json({ error: 'Donation or requirement not found' });
      }

      const matchData = {
        donationId,
        requirementId,
        donorId: donation.donor_id,
        receiverId: requirement.receiver_id,
        distance,
        matchScore
      };

      const match = await Match.create(matchData);

      // Update donation and requirement status
      await Donation.updateStatus(donationId, 'matched', requirement.organization_name);
      await Requirement.updateStatus(requirementId, 'matched', donation.donor_name);

      res.status(201).json({
        message: 'Match created successfully',
        match
      });
    } catch (error) {
      console.error('Match creation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update match status
router.patch('/:id/status', 
  authenticateToken,
  [
    body('status').isIn(['pending', 'confirmed', 'completed', 'cancelled']).withMessage('Invalid status'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status } = req.body;

      const updatedMatch = await Match.updateStatus(id, status);
      
      if (!updatedMatch) {
        return res.status(404).json({ error: 'Match not found' });
      }

      // Update related donation and requirement status if match is completed
      if (status === 'completed') {
        await Donation.updateStatus(updatedMatch.donation_id, 'completed');
        await Requirement.updateStatus(updatedMatch.requirement_id, 'fulfilled');
      }

      res.json({
        message: 'Match status updated successfully',
        match: updatedMatch
      });
    } catch (error) {
      console.error('Match status update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get matches for current user
router.get('/my-matches', 
  authenticateToken,
  async (req, res) => {
    try {
      let matches;
      
      if (req.user.role === 'donor') {
        matches = await Match.findByDonor(req.user.uid);
      } else if (req.user.role === 'receiver') {
        matches = await Match.findByReceiver(req.user.uid);
      } else {
        matches = await Match.getAll();
      }

      res.json(matches);
    } catch (error) {
      console.error('Matches fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get all matches (admin only)
router.get('/all', 
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const matches = await Match.getAll();
      res.json(matches);
    } catch (error) {
      console.error('All matches fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;