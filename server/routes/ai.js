const express = require('express');
const router  = express.Router();
const { categorize, resolutionSummary } = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

// POST /api/ai/categorize
router.post('/categorize', protect, categorize);

// POST /api/ai/resolution-summary
router.post('/resolution-summary', protect, authorize('department', 'admin'), resolutionSummary);

module.exports = router;
