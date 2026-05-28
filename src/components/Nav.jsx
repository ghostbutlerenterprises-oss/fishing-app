import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded text-sm font-medium transition-colors ${
    isActive ? 'bg-blue-700' : 'hover:bg-blue-700'
  }`;

export default function Nav() {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <nav className="bg-blue-600 text-white shadow">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <NavLink to="/" className="text-xl font-bold">
          Fishing App
        </NavLink>

        <div className="flex items-center gap-1">
          {session ? (
            <>
              <NavLink to="/" end className={linkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/log" className={linkClass}>
                Log Catch
              </NavLink>
              <NavLink to="/history" className={linkClass}>
                History
              </NavLink>
              <NavLink to="/leaderboard" className={linkClass}>
                Leaderboard
              </NavLink>
              <span className="ml-3 hidden text-sm text-blue-100 sm:inline">
                {profile?.username ?? '...'}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="ml-2 rounded bg-blue-800 px-3 py-2 text-sm font-medium hover:bg-blue-900"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/leaderboard" className={linkClass}>
                Leaderboard
              </NavLink>
              <NavLink to="/login" className={linkClass}>
                Log in
              </NavLink>
              <NavLink to="/signup" className={linkClass}>
                Sign up
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
