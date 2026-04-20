import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <nav className="glass sticky top-0 z-50 px-4 py-3 sm:px-6 lg:px-8 border-b border-hospital-red/10">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2 text-hospital-red">
          <Activity size={28} className="text-hospital-red fill-hospital-red/20" />
          <span className="text-xl font-bold tracking-tight">HealthSync</span>
        </Link>
        <div className="flex items-center gap-4">
          {!user ? (
            <>
              <Link to="/login" className="text-hospital-dark hover:text-hospital-red font-medium transition-colors">Login</Link>
              <Link to="/register" className="bg-hospital-red text-white px-4 py-2 rounded-md hover:bg-hospital-darkred transition-colors font-medium">Sign Up</Link>
            </>
          ) : (
            <>
              <Link to={user.role === 'admin' ? '/admin-dashboard' : user.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard'} className="text-hospital-dark hover:text-hospital-red font-medium transition-colors">
                Dashboard
              </Link>
              <button 
                onClick={handleLogout}
                className="text-hospital-dark hover:text-hospital-red font-medium transition-colors"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
