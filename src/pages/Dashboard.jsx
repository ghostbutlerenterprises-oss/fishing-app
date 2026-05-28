import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('leaderboard_global')
        .select('total_catches, total_weight_lbs, unique_species, heaviest_catch_lbs')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }
      setStats(data);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const greeting = profile?.display_name || profile?.username || 'angler';

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {greeting}</h1>
        <Link
          to="/log"
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          Log a catch
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="text-gray-500">Loading stats...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total catches" value={stats?.total_catches ?? 0} />
          <StatCard
            label="Total weight (lbs)"
            value={Number(stats?.total_weight_lbs ?? 0).toFixed(1)}
          />
          <StatCard label="Unique species" value={stats?.unique_species ?? 0} />
          <StatCard
            label="Heaviest catch (lbs)"
            value={
              stats?.heaviest_catch_lbs == null
                ? '—'
                : Number(stats.heaviest_catch_lbs).toFixed(1)
            }
          />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-blue-600">{value}</p>
    </div>
  );
}
