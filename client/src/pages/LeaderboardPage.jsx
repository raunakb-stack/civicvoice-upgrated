import { useEffect, useState } from 'react';
import api from '../api/axios';

const DEPT_ICONS = {
  'Roads & Infrastructure': '🛣',
  'Sanitation & Waste':     '🗑',
  'Street Lighting':        '💡',
  'Water Supply':           '💧',
  'Parks & Gardens':        '🌳',
  'General':                '🏛',
};

const MEDAL = ['🥇', '🥈', '🥉'];

const Bar = ({ value, max, color }) => (
  <div className="flex-1 bg-stone-100 dark:bg-stone-700 rounded-full h-2 overflow-hidden">
    <div
      className={`h-full rounded-full transition-all duration-700 ${color}`}
      style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
    />
  </div>
);

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState(null);

  useEffect(() => {
    api.get('/stats/leaderboard')
      .then(({ data }) => setLeaderboard(data.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-3xl mx-auto space-y-3 animate-pulse">
      <div className="h-8 bg-stone-200 rounded w-1/2" />
      {[1,2,3,4,5,6].map(i => <div key={i} className="card h-20 p-4" />)}
    </div>
  );

  const maxScore = leaderboard.length > 0 ? parseFloat(leaderboard[0].compositeScore) : 100;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 md:p-6 text-white">
        <h1 className="font-bold text-2xl md:text-3xl mb-1">🏆 Department Leaderboard</h1>
        <p className="text-amber-100 text-sm">Ranked by resolution rate, SLA adherence & citizen satisfaction</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-stone-500 dark:text-stone-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"/> Resolution Rate (40%)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"/> SLA Adherence (30%)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block"/> Satisfaction (30%)</span>
      </div>

      {/* Leaderboard cards */}
      <div className="space-y-3">
        {leaderboard.map((dept, idx) => {
          const isExpanded = expanded === dept.department;
          const medal      = MEDAL[idx] || `#${idx + 1}`;
          const score      = parseFloat(dept.compositeScore);
          const scoreColor = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-600';

          return (
            <div
              key={dept.department}
              className={`card overflow-hidden transition-all ${
                idx === 0 ? 'ring-2 ring-amber-400 ring-offset-1' : ''
              }`}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : dept.department)}
                className="w-full text-left p-4 flex items-center gap-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition"
              >
                {/* Rank */}
                <span className="text-2xl w-8 text-center shrink-0">{medal}</span>

                {/* Dept icon + name */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xl">{DEPT_ICONS[dept.department] || '🏛'}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-900 dark:text-white text-sm md:text-base truncate">
                      {dept.department}
                    </p>
                    <p className="text-xs text-stone-400">{dept.total} total · {dept.resolved} resolved</p>
                  </div>
                </div>

                {/* Score bar */}
                <div className="hidden sm:flex items-center gap-3 w-48">
                  <Bar value={score} max={maxScore} color="bg-amber-400" />
                  <span className={`text-sm font-bold shrink-0 ${scoreColor}`}>{score}%</span>
                </div>

                {/* Mobile score */}
                <span className={`sm:hidden text-sm font-bold shrink-0 ${scoreColor}`}>{score}%</span>

                <span className="text-stone-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-stone-100 dark:border-stone-800 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-stone-400 mb-1">Resolution Rate</p>
                    <div className="flex items-center gap-2">
                      <Bar value={parseFloat(dept.resolutionRate)} max={100} color="bg-green-500" />
                      <span className="text-sm font-bold text-green-600 shrink-0">{dept.resolutionRate}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 mb-1">SLA Adherence</p>
                    <div className="flex items-center gap-2">
                      <Bar value={parseFloat(dept.slaAdherence)} max={100} color="bg-blue-500" />
                      <span className="text-sm font-bold text-blue-600 shrink-0">{dept.slaAdherence}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 mb-1">Avg Satisfaction</p>
                    <p className="text-lg font-bold text-amber-500">
                      {dept.avgRating ? `${dept.avgRating} ⭐` : <span className="text-sm text-stone-400">No ratings yet</span>}
                    </p>
                    {dept.ratingCount > 0 && <p className="text-xs text-stone-400">{dept.ratingCount} rating{dept.ratingCount > 1 ? 's' : ''}</p>}
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 mb-1">Avg Resolution</p>
                    <p className="text-lg font-bold text-stone-700 dark:text-stone-300">
                      {dept.avgResolutionHours
                        ? parseFloat(dept.avgResolutionHours) > 24
                          ? `${(parseFloat(dept.avgResolutionHours) / 24).toFixed(1)}d`
                          : `${dept.avgResolutionHours}h`
                        : <span className="text-sm text-stone-400">N/A</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 mb-0.5">Overdue</p>
                    <p className={`text-sm font-bold ${dept.overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {dept.overdue > 0 ? `⚠️ ${dept.overdue}` : '✅ 0'}
                    </p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-xs text-stone-400 mb-0.5">Composite Score</p>
                    <p className={`text-sm font-bold ${scoreColor}`}>{dept.compositeScore} / 100</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center text-stone-400 dark:text-stone-600 pb-4">
        Scores refresh in real-time · Updated every page load
      </p>
    </div>
  );
}
