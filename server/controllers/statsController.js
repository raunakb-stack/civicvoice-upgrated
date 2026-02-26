const Complaint = require('../models/Complaint');
const User = require('../models/User');

// GET /api/stats/city
exports.getCityStats = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [
      total, todayTotal, resolvedToday, overdue, escalated, activeUsers,
      resolutionData, deptBreakdown
    ] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ createdAt: { $gte: today } }),
      Complaint.countDocuments({ status: 'Resolved', resolvedAt: { $gte: today } }),
      Complaint.countDocuments({ status: 'Overdue' }),
      Complaint.countDocuments({ status: 'Escalated' }),
      User.countDocuments({ isActive: true }),
      Complaint.aggregate([
        { $match: { resolutionTime: { $exists: true } } },
        { $group: { _id: null, avg: { $avg: '$resolutionTime' } } }
      ]),
      Complaint.aggregate([
        { $group: { _id: '$department', total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
          pending:  { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          overdue:  { $sum: { $cond: [{ $eq: ['$status', 'Overdue'] }, 1, 0] } },
          avgPriority: { $avg: '$priorityScore' }
        }},
        { $sort: { total: -1 } }
      ])
    ]);

    const avgResolutionHours = resolutionData[0]?.avg?.toFixed(1) || 0;
    const resolvedTotal = await Complaint.countDocuments({ status: 'Resolved' });
    const resolutionRate = total > 0 ? ((resolvedTotal / total) * 100).toFixed(1) : 0;

    res.json({
      total, todayTotal, resolvedToday, overdue, escalated,
      activeUsers, avgResolutionHours, resolutionRate,
      deptBreakdown,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/stats/leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const DEPARTMENTS = ['Roads & Infrastructure', 'Sanitation & Waste', 'Street Lighting', 'Water Supply', 'Parks & Gardens', 'General'];

    const results = await Promise.all(DEPARTMENTS.map(async (dept) => {
      const filter = { department: dept };
      const [total, resolved, overdue, slaData, ratingData, resTimeData] = await Promise.all([
        Complaint.countDocuments(filter),
        Complaint.countDocuments({ ...filter, status: 'Resolved' }),
        Complaint.countDocuments({ ...filter, status: 'Overdue' }),
        // SLA adherence: resolved before deadline
        Complaint.countDocuments({ ...filter, status: 'Resolved', $expr: { $lte: ['$resolvedAt', '$slaDeadline'] } }),
        Complaint.aggregate([{ $match: { ...filter, satisfactionRating: { $exists: true } } },
          { $group: { _id: null, avg: { $avg: '$satisfactionRating' }, count: { $sum: 1 } } }]),
        Complaint.aggregate([{ $match: { ...filter, resolutionTime: { $exists: true } } },
          { $group: { _id: null, avg: { $avg: '$resolutionTime' } } }]),
      ]);

      const resolutionRate = total > 0 ? ((resolved / total) * 100) : 0;
      const slaAdherence   = resolved > 0 ? ((slaData / resolved) * 100) : 0;
      const avgRating      = ratingData[0]?.avg || 0;
      const ratingCount    = ratingData[0]?.count || 0;
      const avgResTime     = resTimeData[0]?.avg || null;

      // Composite score: resolutionRate (40%) + slaAdherence (30%) + satisfactionNorm (30%)
      const satisfactionScore = avgRating > 0 ? ((avgRating / 5) * 100) : 50; // default 50 if no ratings
      const compositeScore = (resolutionRate * 0.4) + (slaAdherence * 0.3) + (satisfactionScore * 0.3);

      return {
        department: dept,
        total,
        resolved,
        overdue,
        resolutionRate: resolutionRate.toFixed(1),
        slaAdherence: slaAdherence.toFixed(1),
        avgRating: avgRating > 0 ? avgRating.toFixed(1) : null,
        ratingCount,
        avgResolutionHours: avgResTime ? avgResTime.toFixed(1) : null,
        compositeScore: compositeScore.toFixed(1),
      };
    }));

    // Sort by composite score descending
    results.sort((a, b) => b.compositeScore - a.compositeScore);

    res.json({ leaderboard: results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getDeptStats = async (req, res) => {
  try {
    const dept = decodeURIComponent(req.params.dept);
    const filter = { department: dept };

    const [total, pending, inProgress, resolved, overdue, escalated, avgRatingData, avgResData] = await Promise.all([
      Complaint.countDocuments(filter),
      Complaint.countDocuments({ ...filter, status: 'Pending' }),
      Complaint.countDocuments({ ...filter, status: 'In Progress' }),
      Complaint.countDocuments({ ...filter, status: 'Resolved' }),
      Complaint.countDocuments({ ...filter, status: 'Overdue' }),
      Complaint.countDocuments({ ...filter, status: 'Escalated' }),
      Complaint.aggregate([{ $match: { ...filter, satisfactionRating: { $exists: true } } },
        { $group: { _id: null, avg: { $avg: '$satisfactionRating' } } }]),
      Complaint.aggregate([{ $match: { ...filter, resolutionTime: { $exists: true } } },
        { $group: { _id: null, avg: { $avg: '$resolutionTime' } } }]),
    ]);

    res.json({
      dept, total, pending, inProgress, resolved, overdue, escalated,
      resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(1) : 0,
      avgRating: avgRatingData[0]?.avg?.toFixed(1) || 'N/A',
      avgResolutionHours: avgResData[0]?.avg?.toFixed(1) || 'N/A',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
