import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, PHOTO_BUCKET } from '../lib/supabase.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png']);

export default function LogCatch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [species, setSpecies] = useState('');
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [caughtAt, setCaughtAt] = useState(() =>
    new Date().toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function handleFileChange(e) {
    setError(null);
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setPhoto(null);
      return;
    }
    if (!ALLOWED_MIMES.has(file.type)) {
      setError('Photo must be JPEG or PNG.');
      e.target.value = '';
      setPhoto(null);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('Photo must be 10 MB or smaller.');
      e.target.value = '';
      setPhoto(null);
      return;
    }
    setPhoto(file);
  }

  function buildStoragePath(file) {
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const safeId = (crypto.randomUUID && crypto.randomUUID()) ||
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    return `${user.id}/${safeId}.${ext}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!species.trim()) {
      setError('Species is required.');
      return;
    }
    if (!photo) {
      setError('Photo is required.');
      return;
    }
    const weightNum = weight === '' ? null : Number(weight);
    if (weightNum !== null && (Number.isNaN(weightNum) || weightNum < 0 || weightNum > 9999.99)) {
      setError('Weight must be a number between 0 and 9999.99 lbs.');
      return;
    }
    const lengthNum = length === '' ? null : Number(length);
    if (lengthNum !== null && (Number.isNaN(lengthNum) || lengthNum < 0 || lengthNum > 9999.99)) {
      setError('Length must be a number between 0 and 9999.99 inches.');
      return;
    }

    setSubmitting(true);

    // 1) Upload the photo. RLS requires the path's first segment to equal auth.uid().
    const photoPath = buildStoragePath(photo);
    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(photoPath, photo, {
        cacheControl: '3600',
        upsert: false,
        contentType: photo.type,
      });

    if (uploadError) {
      setSubmitting(false);
      setError(`Photo upload failed: ${uploadError.message}`);
      return;
    }

    // 2) Insert the catch row. RLS requires user_id === auth.uid().
    const { error: insertError } = await supabase.from('catches').insert({
      user_id: user.id,
      species: species.trim(),
      weight_lbs: weightNum,
      length_inches: lengthNum,
      caught_at: new Date(caughtAt).toISOString(),
      photo_path: photoPath,
      notes: notes.trim() || null,
    });

    if (insertError) {
      // Best-effort: try to clean up the orphaned upload so we don't accumulate junk.
      await supabase.storage.from(PHOTO_BUCKET).remove([photoPath]);
      setSubmitting(false);
      setError(`Saving catch failed: ${insertError.message}`);
      return;
    }

    setSubmitting(false);
    navigate('/history');
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Log a catch</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow">
        <div>
          <label htmlFor="species" className="mb-1 block text-sm font-medium text-gray-700">
            Species *
          </label>
          <input
            id="species"
            type="text"
            required
            maxLength={100}
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="weight" className="mb-1 block text-sm font-medium text-gray-700">
              Weight (lbs)
            </label>
            <input
              id="weight"
              type="number"
              step="0.01"
              min="0"
              max="9999.99"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="length" className="mb-1 block text-sm font-medium text-gray-700">
              Length (inches)
            </label>
            <input
              id="length"
              type="number"
              step="0.01"
              min="0"
              max="9999.99"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="caughtAt" className="mb-1 block text-sm font-medium text-gray-700">
            Caught at *
          </label>
          <input
            id="caughtAt"
            type="datetime-local"
            required
            value={caughtAt}
            onChange={(e) => setCaughtAt(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="photo" className="mb-1 block text-sm font-medium text-gray-700">
            Photo (JPEG or PNG, max 10 MB) *
          </label>
          <input
            id="photo"
            type="file"
            accept="image/jpeg,image/png"
            required
            onChange={handleFileChange}
            className="w-full text-sm text-gray-700"
          />
        </div>

        <div>
          <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700">
            Notes <span className="text-gray-400">(optional, max 1000 chars)</span>
          </label>
          <textarea
            id="notes"
            rows={3}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? 'Saving...' : 'Save catch'}
        </button>
      </form>
    </div>
  );
}
