import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs, deleteDoc, updateDoc, doc, query, where, setDoc, onSnapshot } from 'firebase/firestore';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editSpecialization, setEditSpecialization] = useState(user?.specialization || '');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'appointments'), where('doctorId', '==', user.uid), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  async function handleUpdateProfile() {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: editName,
        specialization: editSpecialization
      });
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  }
  
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-hospital-dark">Doctor Dashboard</h1>
        <div className="text-sm bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 flex items-center gap-2">
          {isEditingProfile ? (
            <div className="flex gap-2 items-center">
              <input value={editName} onChange={e=>setEditName(e.target.value)} className="border border-gray-300 px-2 py-1 rounded text-sm w-full max-w-[120px] focus:outline-none focus:border-hospital-red" placeholder="Name" />
              <select value={editSpecialization} onChange={e=>setEditSpecialization(e.target.value)} className="border border-gray-300 px-2 py-1 rounded text-sm w-full max-w-[150px] focus:outline-none focus:border-hospital-red bg-white">
                <option value="" disabled>Specialization</option>
                {['General Physician', 'Cardiologist', 'Dermatologist', 'Pediatrician', 'Neurologist', 'Psychiatrist', 'Orthopedic Surgeon', 'Gynecologist', 'Dentist', 'ENT Specialist'].map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
              <button onClick={handleUpdateProfile} className="text-xs font-semibold bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600 transition-colors">Save</button>
              <button onClick={() => setIsEditingProfile(false)} className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-200 transition-colors">Cancel</button>
            </div>
          ) : (
            <>
              <span>Dr. <span className="font-semibold text-hospital-red">{user?.name}</span></span>
              <span className="text-gray-400">| {user?.specialization || 'General'}</span>
              <button onClick={() => setIsEditingProfile(true)} className="text-gray-400 hover:text-hospital-red transition-colors ml-1 p-1">
                <Pencil size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 pb-4">
        {['overview', 'slots', 'requests', 'history'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveView(tab)}
            className={`px-4 py-2 font-medium rounded-lg transition-colors capitalize ${activeView === tab ? 'bg-hospital-red text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {tab === 'slots' ? 'Availability' : tab === 'requests' ? (
              <span className="flex items-center gap-2">
                Patient Requests
                {pendingCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{pendingCount}</span>}
              </span>
            ) : tab === 'history' ? 'Consultation History' : 'Overview'}
          </button>
        ))}
      </div>

      {activeView === 'overview' && <Overview setView={setActiveView} pendingCount={pendingCount} />}
      {activeView === 'slots' && <AvailabilitySettings doctorId={user?.uid} user={user} />}
      {activeView === 'requests' && <PatientRequests doctorId={user?.uid} />}
      {activeView === 'history' && <ConsultationHistory doctorId={user?.uid} />}
    </div>
  );
}

function Overview({ setView, pendingCount }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <DashboardCard 
        title="Set Availability" 
        desc="Update your weekly schedule, fee, and slot duration." 
        action="Edit Availability"
        onClick={() => setView('slots')}
      />
      <DashboardCard 
        title="Patient Requests" 
        desc="Review pending appointment requests from patients." 
        action="View Requests"
        onClick={() => setView('requests')}
        badge={pendingCount > 0 ? pendingCount : null}
      />
      <DashboardCard 
        title="Consultation History" 
        desc="View past appointments and patient notes." 
        action="View History"
        onClick={() => setView('history')}
      />
    </div>
  );
}

function DashboardCard({ title, desc, action, onClick, badge }) {
  return (
    <div className="glass p-6 rounded-2xl flex flex-col justify-between hover:shadow-lg transition-transform hover:-translate-y-1 relative">
      {badge && (
        <div className="absolute top-4 right-4 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md">
          {badge}
        </div>
      )}
      <div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-500 mb-6">{desc}</p>
      </div>
      <button 
        onClick={onClick}
        className="w-full text-center bg-hospital-light text-hospital-dark px-4 py-3 rounded-lg font-semibold hover:bg-hospital-gray transition-colors border border-gray-200"
      >
        {action}
      </button>
    </div>
  );
}

function AvailabilitySettings({ doctorId, user }) {
  const [fee, setFee] = useState(user?.consultationFee || '');
  const [slotDuration, setSlotDuration] = useState(user?.slotDuration || 30);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const daysLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Default structure
  const [availability, setAvailability] = useState({
    Mon: { enabled: true, start: '09:00', end: '17:00' },
    Tue: { enabled: true, start: '09:00', end: '17:00' },
    Wed: { enabled: true, start: '09:00', end: '17:00' },
    Thu: { enabled: true, start: '09:00', end: '17:00' },
    Fri: { enabled: true, start: '09:00', end: '17:00' },
    Sat: { enabled: false, start: '09:00', end: '13:00' },
    Sun: { enabled: false, start: '09:00', end: '13:00' }
  });

  useEffect(() => {
    if (user?.availability) {
      setAvailability(user.availability);
    }
  }, [user]);

  function handleDayChange(day, field, value) {
    setAvailability(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  }

  async function handleSaveAvailability(e) {
    e.preventDefault();
    if (!fee) {
      setMessage('Please enter a consultation fee.');
      return;
    }
    
    setLoading(true);
    setMessage('Saving availability...');
    try {
      await updateDoc(doc(db, 'users', doctorId), {
        availability,
        consultationFee: Number(fee),
        slotDuration: Number(slotDuration)
      });
      setMessage('Availability saved successfully!');
    } catch (err) {
      console.error(err);
      setMessage('An error occurred while saving.');
    }
    setLoading(false);
  }

  return (
    <div className="glass p-6 rounded-2xl max-w-3xl">
      <h2 className="text-xl font-bold mb-4">Set Weekly Availability</h2>
      <p className="text-sm text-gray-500 mb-6">Configure your working hours. Patients will be able to book slots based on this recurring schedule and your chosen slot duration.</p>
      
      {message && <div className={`mb-4 p-3 rounded-lg text-sm font-medium border ${message.includes('success') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{message}</div>}
      
      <form onSubmit={handleSaveAvailability} className="space-y-6">
        
        <div className="space-y-4">
          {daysLabels.map(day => (
            <div key={day} className={`flex items-center gap-4 p-3 rounded-lg border ${availability[day].enabled ? 'bg-white border-hospital-red/30' : 'bg-gray-50 border-gray-100'}`}>
              <div className="w-24">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700">
                  <input 
                    type="checkbox" 
                    checked={availability[day].enabled} 
                    onChange={e => handleDayChange(day, 'enabled', e.target.checked)}
                    className="w-4 h-4 text-hospital-red rounded focus:ring-hospital-red"
                  />
                  {day}
                </label>
              </div>
              
              <div className="flex-1 flex items-center gap-2 sm:gap-4">
                {availability[day].enabled ? (
                  <>
                    <input 
                      type="time" 
                      value={availability[day].start} 
                      onChange={e => handleDayChange(day, 'start', e.target.value)}
                      className="px-3 py-1.5 border rounded-md text-sm w-full"
                    />
                    <span className="text-gray-400 text-sm">to</span>
                    <input 
                      type="time" 
                      value={availability[day].end} 
                      onChange={e => handleDayChange(day, 'end', e.target.value)}
                      className="px-3 py-1.5 border rounded-md text-sm w-full"
                    />
                  </>
                ) : (
                  <span className="text-sm text-gray-400 italic">Not available</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Consultation Fee (₹)</label>
            <input 
              required 
              type="number" 
              min="0" 
              placeholder="e.g. 500" 
              className="w-full px-3 py-2 border rounded-lg bg-white" 
              value={fee} 
              onChange={e => setFee(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Slot Duration</label>
            <select 
              className="w-full px-3 py-2 border rounded-lg bg-white" 
              value={slotDuration} 
              onChange={e => setSlotDuration(Number(e.target.value))}
            >
              <option value={15}>15 minutes</option>
              <option value={20}>20 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </div>
        </div>

        <button disabled={loading} type="submit" className="w-full bg-hospital-red text-white py-3 rounded-lg font-bold hover:bg-hospital-darkred mt-4 transition-colors disabled:opacity-50 shadow-md">
          {loading ? 'Saving...' : 'Save Availability settings'}
        </button>
      </form>
    </div>
  );
}

function PatientRequests({ doctorId }) {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchRequests();
  }, [doctorId]);

  async function fetchRequests() {
    if (!doctorId) return;
    const q = query(collection(db, 'appointments'), where('doctorId', '==', doctorId));
    const querySnapshot = await getDocs(q);
    const data = [];
    querySnapshot.forEach((doc) => {
      const app = { id: doc.id, ...doc.data() };
      if (!['completed', 'cancelled', 'rejected'].includes(app.status)) {
        data.push(app);
      }
    });
    setRequests(data);
  }

  async function handleStatusUpdate(id, newStatus, req) {
    try {
      await updateDoc(doc(db, 'appointments', id), {
        status: newStatus
      });
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCancel(app) {
    try {
      await updateDoc(doc(db, 'appointments', app.id), { status: 'cancelled' });
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleComplete(app) {
    const defaultDiagnosis = "General Consultation";
    const diagnosis = window.prompt("Enter Diagnosis for the patient:", defaultDiagnosis) || defaultDiagnosis;
    const prescription = window.prompt("Enter Prescription (optional):") || "No prescription needed.";

    try {
      await updateDoc(doc(db, 'appointments', app.id), { 
        status: 'completed',
        diagnosis,
        prescription
      });
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="glass p-6 rounded-2xl">
      <h2 className="text-xl font-bold mb-4">Patient Requests & Active Appointments</h2>
      <div className="space-y-4">
        {requests.map(req => (
          <div key={req.id} className="p-4 bg-white rounded-lg border border-gray-100 flex flex-col justify-between gap-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <p className="font-bold text-hospital-dark">{req.patientName}</p>
                <p className="text-sm text-gray-600">Consultation Slot: {req.date} at {req.time}</p>
                <p className="text-xs font-semibold mt-1">Status: <span className={req.status === 'pending' ? 'text-orange-500' : req.status === 'accepted' ? 'text-green-500' : 'text-red-500'}>{req.status === 'accepted' ? 'IN PROGRESS' : req.status.toUpperCase()}</span></p>
              </div>
              {req.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleStatusUpdate(req.id, 'accepted', req)} className="bg-hospital-red text-white px-4 py-2 rounded-lg text-sm hover:bg-hospital-darkred focus:outline-none">Accept</button>
                  <button onClick={() => handleStatusUpdate(req.id, 'rejected', req)} className="bg-gray-100 text-hospital-dark px-4 py-2 rounded-lg text-sm hover:bg-gray-200 focus:outline-none">Reject</button>
                </div>
              )}
            </div>
            
            {req.status === 'accepted' && (
              <div className="mt-2 pt-3 border-t border-gray-50 flex flex-wrap gap-2">
                <button onClick={() => handleComplete(req)} className="text-xs bg-hospital-dark text-white px-3 py-1.5 rounded hover:bg-hospital-red">Mark Completed</button>
                <button onClick={() => handleCancel(req)} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded hover:bg-red-100 font-medium border border-red-100">Cancel Appointment</button>
              </div>
            )}
          </div>
        ))}
        {requests.length === 0 && <p className="text-gray-500">No active or pending requests found.</p>}
      </div>
    </div>
  );
}

function ConsultationHistory({ doctorId }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, [doctorId]);

  async function fetchHistory() {
    if (!doctorId) return;
    const q = query(collection(db, 'appointments'), where('doctorId', '==', doctorId));
    const querySnapshot = await getDocs(q);
    const data = [];
    querySnapshot.forEach((doc) => {
      const app = { id: doc.id, ...doc.data() };
      if (['completed', 'cancelled', 'rejected'].includes(app.status)) {
        data.push(app);
      }
    });
    setHistory(data.sort((a,b) => new Date(b.date) - new Date(a.date)));
  }

  return (
    <div className="glass p-6 rounded-2xl">
      <h2 className="text-xl font-bold mb-4">Consultation History</h2>
      <div className="space-y-4">
        {history.map(app => (
          <div key={app.id} className={`p-4 bg-white rounded-lg border-l-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 ${app.status === 'completed' ? 'border-l-blue-500 border-gray-200' : 'border-l-red-500 border-red-100 opacity-80'}`}>
            <div>
              <p className="font-bold text-hospital-dark">{app.patientName}</p>
              <p className="text-sm text-gray-600">Consultation Slot: {app.date} at {app.time}</p>
              <p className={`text-xs font-semibold mt-1 uppercase ${['cancelled', 'rejected'].includes(app.status) ? 'text-red-600' : 'text-blue-600'}`}>{app.status}</p>
              {app.status === 'completed' && app.diagnosis && (
                <div className="mt-2 bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                  <p className="mb-1"><span className="font-semibold text-hospital-dark">Diagnosis:</span> {app.diagnosis}</p>
                  <p><span className="font-semibold text-hospital-dark">Prescription:</span> {app.prescription}</p>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="font-bold text-hospital-dark">₹{app.fee}</p>
              <p className="text-xs text-gray-500">{app.status === 'completed' ? 'Paid / Settled' : ['cancelled', 'rejected'].includes(app.status) ? 'Cancelled' : 'Pending Payment'}</p>
            </div>
          </div>
        ))}
        {history.length === 0 && <p className="text-gray-500">No consultation history available yet.</p>}
      </div>
    </div>
  );
}
