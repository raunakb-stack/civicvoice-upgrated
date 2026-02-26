import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function DuplicateDetector({ department, lat, lng, title, onUpvote }) {
  const [duplicates, setDuplicates] = useState([]);
  const [checking, setChecking]     = useState(false);
  const [dismissed, setDismissed]   = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!department) return;
    setDismissed(false);

    // Debounce: wait 800ms after last change
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setChecking(true);
      try {
        const params = new URLSearchParams({ department });
        if (lat)   params.set('lat',   lat);
        if (lng)   params.set('lng',   lng);
        if (title) params.set('title', title);
        const { data } = await api.get(`/complaints/duplicates/check?${params}`);
        setDuplicates(data.duplicates || []);
      } catch { /* silent */ }
      setChecking(false);
    }, 800);

    return () => clearTimeout(debounceRef.current);
  }, [department, lat, lng, title]);

  if (dismissed || duplicates.length === 0) return null;

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
              {checking ? 'Checking for duplicates…' : `${duplicates.length} similar complaint${duplicates.length > 1 ? 's' : ''} found nearby`}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Consider upvoting an existing complaint instead of filing a new one
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-500 hover:text-amber-700 text-lg leading-none shrink-0 mt-0.5"
          title="Dismiss"
        >✕</button>
      </div>

      <div className="space-y-2">
        {duplicates.map(d => (
          <div key={d._id} className="bg-white dark:bg-stone-800 rounded-lg border border-amber-200 dark:border-amber-800 p-3 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-800 dark:text-white truncate">{d.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-stone-400">👍 {d.votes} votes</span>
                {d.location?.address && (
                  <span className="text-xs text-stone-400 truncate max-w-[160px]">📍 {d.location.address}</span>
                )}
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => onUpvote && onUpvote(d._id)}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 hover:bg-amber-200 transition"
              >
                👍 Upvote
              </button>
              <Link
                to={`/complaints/${d._id}`}
                target="_blank"
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition"
              >
                View
              </Link>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
      >
        My complaint is different — continue filing
      </button>
    </div>
  );
}
