import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Target } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="border-b border-white/10 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-emerald-500/20 p-2 rounded-xl group-hover:bg-emerald-500/30 transition-colors">
              <Target className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="font-bold text-xl tracking-tight">Skeptic</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link to="/pricing" className="text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors">
              Pricing
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors">
                  Dashboard
                </Link>
                <Link to="/billing" className="text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors">
                  Billing
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors">
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="text-sm font-medium bg-zinc-50 text-zinc-950 px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
