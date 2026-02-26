import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import toast from 'react-hot-toast';
import ImageUploader from '../components/ImageUploader';
import AICategorizBtn from '../components/AICategorizBtn';
import DuplicateDetector from '../components/DuplicateDetector';
import VoiceInput from '../components/VoiceInput';
import { useOfflineDrafts } from '../hooks/useOfflineDrafts';

const DEPARTMENTS = [
  'Roads & Infrastructure','Sanitation & Waste',
  'Street Lighting','Water Supply','Parks & Gardens','General',
];

const SEVERITY_COLOR = (s) => {
  if (s >= 8) return 'text-red-600 bg-red-50 border-red-200';
  if (s >= 5) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-green-600 bg-green-50 border-green-200';
};

export default function NewComplaint() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isOnline, drafts, saveAsDraft, removeDraft } = useOfflineDrafts();
  const [form, setForm] = useState({
    title: '', description: '', department: DEPARTMENTS[0],
    emergency: false, location: { address: '', lat: null, lng: null }, tags: '',
  });
  const [images, setImages]         = useState([]);
  const [aiResult, setAiResult]     = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAIResult = (data) => {
    setAiResult(data);
    setForm(f => ({
      ...f,
      department: data.department || f.department,
      emergency:  data.emergency  ?? f.emergency,
      title:      data.suggestedTitle || f.title,
      tags:       data.tags?.join(', ') || f.tags,
    }));
  };

  const loadDraft = (draft) => {
    setForm({
      title: draft.title || '',
      description: draft.description || '',
      department: draft.department || DEPARTMENTS[0],
      emergency: draft.emergency || false,
      location: draft.location || { address: '', lat: null, lng: null },
      tags: Array.isArray(draft.tags) ? draft.tags.join(', ') : draft.tags || '',
    });
    setShowDrafts(false);
    toast.success('📂 Draft loaded!');
  };

  const handleUpvote = async (complaintId) => {
    try {
      await api.post(`/complaints/${complaintId}/vote`);
      toast.success('👍 Upvoted! Thanks for helping prioritize this issue.');
      navigate(`/complaints/${complaintId}`);
    } catch { toast.error('Could not upvote'); }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const d = await r.json();
          setForm(f => ({ ...f, location: { address: d.display_name || `${lat}, ${lng}`, lat, lng } }));
          toast.success('📍 Location detected!');
        } catch {
          setForm(f => ({ ...f, location: { address: `${lat}, ${lng}`, lat, lng } }));
        }
        setGeoLoading(false);
      },
      () => { toast.error('Could not get location'); setGeoLoading(false); }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) { toast.error('Title and description are required'); return; }

    // If offline, save as draft
    if (!isOnline) {
      await saveAsDraft({
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        images,
        imageUrl: images[0]?.url || '',
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      const { data } = await api.post('/complaints', payload);
      toast.success('✅ Complaint filed! +20 Civic Points 🎉');
      navigate(`/complaints/${data.complaint._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally { setSubmitting(false); }
  };

  const syncDraft = async (draft) => {
    if (!isOnline) { toast.error('Still offline'); return; }
    setSubmitting(true);
    try {
      const payload = { ...draft, images: [], imageUrl: '' };
      const { data } = await api.post('/complaints', payload);
      await removeDraft(draft.id);
      toast.success('✅ Draft synced! +20 Civic Points 🎉');
      navigate(`/complaints/${data.complaint._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to sync draft');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-stone-900 dark:text-white">{t('nav.report')}</h1>
          <p className="text-sm text-stone-400 mt-0.5">Attach photos for faster resolution · earn +20 Civic Points!</p>
        </div>
        {/* Offline indicator */}
        {!isOnline && (
          <span className="shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
            📴 Offline
          </span>
        )}
      </div>

      {/* Offline drafts banner */}
      {drafts.length > 0 && (
        <div className="card p-4 border-l-4 border-blue-400">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-stone-800 dark:text-white">💾 {drafts.length} offline draft{drafts.length > 1 ? 's' : ''} saved</p>
              <p className="text-xs text-stone-400 mt-0.5">{isOnline ? 'You can sync them now.' : 'Will auto-sync when back online.'}</p>
            </div>
            <button onClick={() => setShowDrafts(s => !s)} className="btn-secondary text-xs px-3 py-1.5">
              {showDrafts ? 'Hide' : 'View Drafts'}
            </button>
          </div>
          {showDrafts && (
            <div className="mt-3 space-y-2">
              {drafts.map(d => (
                <div key={d.id} className="bg-stone-50 dark:bg-stone-800 rounded-lg p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800 dark:text-white truncate">{d.title || 'Untitled draft'}</p>
                    <p className="text-xs text-stone-400">{d.department} · {new Date(d.savedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => loadDraft(d)} className="text-xs px-2 py-1 rounded bg-civic-100 text-civic-700 hover:bg-civic-200 font-medium">Load</button>
                    {isOnline && (
                      <button onClick={() => syncDraft(d)} disabled={submitting} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 font-medium">Sync</button>
                    )}
                    <button onClick={() => removeDraft(d.id)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 font-medium">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card p-4 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Emergency toggle */}
          <label className={`flex items-center gap-3 p-3 md:p-4 rounded-xl border-2 cursor-pointer transition ${
            form.emergency ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-stone-200 dark:border-stone-700 hover:border-stone-300'
          }`}>
            <input type="checkbox" name="emergency" checked={form.emergency} onChange={handleChange} className="w-5 h-5 accent-red-500" />
            <div>
              <p className="font-semibold text-sm text-stone-800 dark:text-white">🚨 {t('complaint.emergency')}</p>
              <p className="text-xs text-stone-400">{t('complaint.emergencyHint')}</p>
            </div>
          </label>

          {/* Title + AI button */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <label className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                {t('complaint.title')} <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                {/* Voice input for title */}
                <VoiceInput
                  onTranscript={(text) => setForm(f => ({ ...f, title: text }))}
                  placeholder="Speak complaint title…"
                />
                <AICategorizBtn
                  title={form.title}
                  description={form.description}
                  onResult={handleAIResult}
                />
              </div>
            </div>
            <input name="title" required value={form.title} onChange={handleChange}
              className="input" placeholder="e.g. Large pothole blocking Rajapeth road near bus stand" />
          </div>

          {/* AI result badge */}
          {aiResult && (
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${SEVERITY_COLOR(aiResult.severity)}`}>
                ⚠️ Severity {aiResult.severity}/10
              </span>
              {aiResult.emergency && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-red-300 bg-red-50 text-red-700">
                  🚨 Emergency detected
                </span>
              )}
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-700">
                🤖 AI: {aiResult.department}
              </span>
              {aiResult.summary && (
                <span className="text-xs text-stone-500 italic w-full">"{aiResult.summary}"</span>
              )}
            </div>
          )}

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">
              {t('complaint.department')} <span className="text-red-400">*</span>
            </label>
            <select name="department" value={form.department} onChange={handleChange} className="input">
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Description + voice input */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <label className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                {t('complaint.description')} <span className="text-red-400">*</span>
              </label>
              <VoiceInput
                onTranscript={(text) => setForm(f => ({ ...f, description: f.description ? f.description + ' ' + text : text }))}
                placeholder="Speak description…"
              />
            </div>
            <textarea name="description" required rows={4} value={form.description} onChange={handleChange}
              className="input resize-none"
              placeholder="Describe the issue in detail — when it started, how many affected, what immediate danger exists…" />
          </div>

          {/* Duplicate Detector */}
          <DuplicateDetector
            department={form.department}
            lat={form.location.lat}
            lng={form.location.lng}
            title={form.title}
            onUpvote={handleUpvote}
          />

          {/* Photo Upload */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">
              📷 {t('complaint.photoEvidence')}
              <span className="ml-2 text-civic-500 font-normal normal-case">(up to 4 images · 3× faster resolution)</span>
            </label>
            <ImageUploader value={images} onChange={setImages} maxFiles={4} />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">
              {t('complaint.location')}
            </label>
            <div className="flex gap-2">
              <input value={form.location.address}
                onChange={e => setForm(f => ({ ...f, location: { ...f.location, address: e.target.value } }))}
                className="input flex-1" placeholder="Enter area / landmark or auto-detect" />
              <button type="button" onClick={detectLocation} disabled={geoLoading} className="btn-secondary px-3 shrink-0 text-sm">
                {geoLoading ? '⏳' : '📍'}
              </button>
            </div>
            {form.location.lat && (
              <p className="text-xs text-green-600 mt-1 font-mono">
                ✅ GPS: {form.location.lat.toFixed(5)}, {form.location.lng.toFixed(5)}
              </p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">
              {t('complaint.tags')} <span className="font-normal normal-case text-stone-400">(comma separated)</span>
            </label>
            <input name="tags" value={form.tags} onChange={handleChange}
              className="input" placeholder="PotholePatrol, RoadDamage, Rajapeth" />
          </div>

          {/* Photo verified indicator */}
          {images.length > 0 && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm font-medium">
              📷 {images.length} photo{images.length > 1 ? 's' : ''} ready
              <span className="font-bold ml-1">· photo-verified ✓</span>
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-base">
            {submitting
              ? '⏳ Filing complaint…'
              : !isOnline
              ? '💾 Save as Offline Draft'
              : `📋 ${t('complaint.fileComplaint')} (+20 pts)${images.length ? ` · ${images.length} 📷` : ''}`}
          </button>
        </form>
      </div>
    </div>
  );
}
