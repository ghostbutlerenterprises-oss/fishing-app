import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, PHOTO_BUCKET } from '../lib/supabase.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const PAGE_SIZE = 20;

export default function CatchHistory() {
  const { user } = useAuth();
  const [catches, setCatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('catches')
        .select('id, species, weight_lbs, length_inches, caught_at, photo_path, notes')
        .eq('user_id', user.id)
        .order('caught_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }
      setCatches(data ?? []);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function handleDelete(c) {
    if (!confirm(`Delete this ${c.species} catch? This cannot be undone.`)) return;
    setDeleting(c.id);
    // Delete the row first; RLS prevents non-owners.
    const { error: rowError } = await supabase
      .from('catches')
      .delete()
      .eq('id', c.id);
    if (rowError) {
      setDeleting(null);
      setError(`Delete failed: ${rowError.message}`);
      return;
    }
    // Then remove the photo from storage (best-effort; orphaned files would just be junk).
    if (c.photo_path) {
      await supabase.storage.from(PHOTO_BUCKET).remove([c.photo_path]);
    }
    setCatches((prev) => prev.filter((x) => x.id !== c.id));
    setDeleting(null);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Your catches</h1>
        <Link
          to="/log"
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          Log a catch
        </Link>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : catches.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <p className="text-gray-600">No catches yet.</p>
          <Link to="/log" className="mt-3 inline-block font-medium text-blue-600 hover:underline">
            Log your first catch
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catches.map((c) => (
            <CatchCard
              key={c.id}
              c={c}
              onDelete={handleDelete}
              deleting={deleting === c.id}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CatchCard({ c, onDelete, deleting }) {
  const photoUrl = useMemo(() => {
    if (!c.photo_path) return null;
    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(c.photo_path);
    return data?.publicUrl ?? null;
  }, [c.photo_path]);

  return (
    <li className="overflow-hidden rounded-lg bg-white shadow">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={`${c.species} caught on ${new Date(c.caught_at).toLocaleDateString()}`}
          className="h-48 w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-48 items-center justify-center bg-gray-100 text-gray-400">
          No photo
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-gray-900">{c.species}</h3>
          <span className="text-xs text-gray-500">
            {new Date(c.caught_at).toLocaleDateString()}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {c.weight_lbs != null && <>Weight: {Number(c.weight_lbs).toFixed(1)} lbs</>}
          {c.weight_lbs != null && c.length_inches != null && ' · '}
          {c.length_inches != null && <>Length: {Number(c.length_inches).toFixed(1)} in</>}
          {c.weight_lbs == null && c.length_inches == null && (
            <span className="text-gray-400">No size recorded</span>
          )}
        </p>
        {c.notes && <p className="mt-2 text-sm text-gray-700">{c.notes}</p>}
        <button
          type="button"
          onClick={() => onDelete(c)}
          disabled={deleting}
          className="mt-3 text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </li>
  );
}
