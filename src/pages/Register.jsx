import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('patient'); // patient or doctor
  const [specialization, setSpecialization] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin-dashboard" />;
    return <Navigate to={user.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard'} />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await signup(email, password, role, name, specialization);
    } catch (err) {
      setError('Failed to create an account: ' + err.message);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-8 glass rounded-2xl">
      <h2 className="text-3xl font-bold text-center mb-8 text-hospital-dark">Create Account</h2>
      {error && <div className="bg-hospital-light text-hospital-red p-4 rounded-md mb-6 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
          <input 
            type="text" 
            required 
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-hospital-red/50"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
          <input 
            type="email" 
            required 
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-hospital-red/50"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-hospital-red/50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">I am registering as a...</label>
          <div className="flex gap-4">
            <label className="flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input 
                type="radio" 
                name="role" 
                value="patient" 
                checked={role === 'patient'} 
                onChange={(e) => setRole(e.target.value)} 
                className="text-hospital-red focus:ring-hospital-red"
              />
              Patient
            </label>
            <label className="flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input 
                type="radio" 
                name="role" 
                value="doctor" 
                checked={role === 'doctor'} 
                onChange={(e) => setRole(e.target.value)} 
                className="text-hospital-red focus:ring-hospital-red"
              />
              Doctor
            </label>
          </div>
        </div>
        {role === 'doctor' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
            <input 
              type="text" 
              required={role === 'doctor'}
              placeholder="e.g. Cardiologist, Dermatologist"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-hospital-red/50"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
            />
          </div>
        )}
        <button 
          disabled={loading}
          type="submit" 
          className="w-full bg-hospital-red text-white py-3 rounded-lg font-semibold hover:bg-hospital-darkred transition-colors disabled:opacity-50 mt-4"
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
      <p className="mt-6 text-center text-gray-500">
        Already have an account? <Link to="/login" className="text-hospital-red font-semibold hover:underline">Log in</Link>
      </p>
    </div>
  );
}
