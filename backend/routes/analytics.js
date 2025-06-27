const express = require('express');
const Donation = require('../models/Donation');
const Requirement = require('../models/Requirement');
const Match = require('../models/Match');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get comprehensive analytics (admin only)
router.get('/', 
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const [donationAnalytics, requirementAnalytics, users, matches] = await Promise.all([
        Donation.getAnalytics(),
        Requirement.getAnalytics(),
        User.getAll(),
        Match.getAll()
      ]);

      const analytics = {
        donations: donationAnalytics,
        requirements: requirementAnalytics,
        users: {
          total: users.length,
          donors: users.filter(u => u.role === 'donor').length,
          receivers: users.filter(u => u.role === 'receiver').length,
          admins: users.filter(u => u.role === 'admin').length
        },
        matches: {
          total: matches.length,
          pending: matches.filter(m => m.status === 'pending').length,
          confirmed: matches.filter(m => m.status === 'confirmed').length,
          completed: matches.filter(m => m.status === 'completed').length,
          cancelled: matches.filter(m => m.status === 'cancelled').length
        }
      };

      res.json(analytics);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get user-specific analytics
router.get('/my-stats', 
  authenticateToken,
  async (req, res) => {
    try {
      let stats = {};

      if (req.user.role === 'donor') {
        const donations = await Donation.findByDonor(req.user.uid);
        const matches = await Match.findByDonor(req.user.uid);
        
        stats = {
          totalDonations: donations.length,
          pendingDonations: donations.filter(d => d.status === 'pending').length,
          completedDonations: donations.filter(d => d.status === 'completed').length,
          totalMatches: matches.length,
          totalQuantity: donations.reduce((sum, d) => sum + parseInt(d.quantity || 0), 0)
        };
      } else if (req.user.role === 'receiver') {
        const requirements = await Requirement.findByReceiver(req.user.uid);
        const matches = await Match.findByReceiver(req.user.uid);
        
        stats = {
          totalRequirements: requirements.length,
          activeRequirements: requirements.filter(r => r.status === 'active').length,
          fulfilledRequirements: requirements.filter(r => r.status === 'fulfilled').length,
          totalMatches: matches.length,
          totalPeopleServed: requirements.reduce((sum, r) => sum + parseInt(r.serving_size || 0), 0)
        };
      }

      res.json(stats);
    } catch (error) {
      console.error('User stats fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;