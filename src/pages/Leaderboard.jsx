import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const TABS = [
  { key: 'weight', label: 'Total weight' },
  { key: 'catches', label: 'Total catches' },
  { key: 'species', label: 'Unique species' },
];

const SORT_COLUMN = {
  weight: 'total_weight_lbs',
  catches: 'total_catches',
  species: 'unique_species',
};

export default function Leaderboard() {
  const [tab, setTab] = useState('weight');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from('leaderboard_global')
        .select('user_id, username, display_name, total_catches, total_weight_lbs, unique_species, heaviest_catch_lbs')
        .order(SORT_COLUMN[tab], { ascending: false, nullsFirst: false })
        .limit(50);
      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }
      // Filter out users with zero activity so the board isn't padded with empties.
      const filtered = (data ?? []).filter(
        (r) => Number(r.total_catches) > 0
      );
      setRows(filtered);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Leaderboard</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded px-3 py-2 text-sm font-medium ${
              tab === t.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <p className="text-gray-600">No catches logged yet. Be the first!</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Angler</th>
                <th className="px-4 py-3 text-right">Catches</th>
                <th className="px-4 py-3 text-right">Weight (lbs)</th>
                <th className="px-4 py-3 text-right">Species</th>
                <th className="hidden px-4 py-3 text-right sm:table-cell">Heaviest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={r.user_id} className={i < 3 ? 'bg-yellow-50' : ''}>
                  <td className="px-4 py-3 font-bold text-gray-900">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {r.display_name || r.username}
                    </div>
                    {r.display_name && (
                      <div className="text-xs text-gray-500">@{r.username}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{r.total_catches}</td>
                  <td className="px-4 py-3 text-right">
                    {Number(r.total_weight_lbs ?? 0).toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right">{r.unique_species}</td>
                  <td className="hidden px-4 py-3 text-right sm:table-cell">
                    {r.heaviest_catch_lbs == null
                      ? '—'
                      : Number(r.heaviest_catch_lbs).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
