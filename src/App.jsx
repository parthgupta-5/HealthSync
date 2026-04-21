import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider, useAuth } from './context/AuthContext';

const PatientDashboard = lazy(() => import('./pages/PatientDashboard'));
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="h-screen flex justify-center items-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) {
    if (user.role === 'admin') return <Navigate to="/admin-dashboard" />;
    return <Navigate to={user.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard'} />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow p-4 md:p-6 lg:p-8">
            <Suspense fallback={<div className="h-full flex items-center justify-center p-8 text-gray-500 font-medium">Loading page component...</div>}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route 
                  path="/patient-dashboard/*" 
                  element={
                    <PrivateRoute role="patient">
                      <PatientDashboard />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/doctor-dashboard/*" 
                  element={
                    <PrivateRoute role="doctor">
                      <DoctorDashboard />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/admin-dashboard/*" 
                  element={
                    <PrivateRoute role="admin">
                      <AdminDashboard />
                    </PrivateRoute>
                  } 
                />
              </Routes>
            </Suspense>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
