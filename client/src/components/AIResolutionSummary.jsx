import { useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function AIResolutionSummary({ complaint, onApply }) {
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary]       = useState('');
  const [copied, setCopied]         = useState(false);

  if (!complaint || complaint.status !== 'Resolved') return null;

  const generate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/ai/resolution-summary', {
        complaintTitle:  complaint.title,
        department:      complaint.department,
        activityLog:     complaint.activityLog || [],
        resolutionTime:  complaint.resolutionTime,
      });
      setSummary(data.summary);
      toast.success('🤖 AI summary generated!');
    } catch {
      toast.error('Failed to generate summary');
    } finally { setGenerating(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">AI Resolution Summary</p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition disabled:opacity-50"
        >
          {generating ? '⏳ Generating…' : summary ? '🔄 Regenerate' : '✨ Generate'}
        </button>
      </div>

      {summary && (
        <div className="space-y-2">
          <div className="bg-white dark:bg-stone-800 rounded-lg p-3 text-sm text-stone-700 dark:text-stone-300 leading-relaxed border border-purple-100 dark:border-purple-800">
            {summary}
          </div>
          <div className="flex gap-2">
            <button onClick={copy} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition">
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
            {onApply && (
              <button onClick={() => { onApply(summary); toast.success('Applied to activity note!'); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:bg-purple-200 transition">
                ✏️ Apply as Note
              </button>
            )}
          </div>
        </div>
      )}

      {!summary && !generating && (
        <p className="text-xs text-purple-600 dark:text-purple-400">
          Generate a professional resolution summary using AI based on the activity log.
        </p>
      )}
    </div>
  );
}
