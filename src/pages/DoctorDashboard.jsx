import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, query, where } from 'firebase/firestore';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editSpecialization, setEditSpecialization] = useState(user?.specialization || '');

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
            {tab === 'slots' ? 'Manage Slots' : tab === 'requests' ? 'Patient Requests' : tab === 'history' ? 'Consultation History' : 'Overview'}
          </button>
        ))}
      </div>

      {activeView === 'overview' && <Overview setView={setActiveView} />}
      {activeView === 'slots' && <ManageSlots doctorId={user?.uid} />}
      {activeView === 'requests' && <PatientRequests doctorId={user?.uid} />}
      {activeView === 'history' && <ConsultationHistory doctorId={user?.uid} />}
    </div>
  );
}

function Overview({ setView }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <DashboardCard 
        title="Manage Slots" 
        desc="Update your availability and set consultation fees." 
        action="Edit Schedule"
        onClick={() => setView('slots')}
      />
      <DashboardCard 
        title="Patient Requests" 
        desc="Review pending appointment requests from patients." 
        action="View Requests"
        onClick={() => setView('requests')}
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

function DashboardCard({ title, desc, action, onClick }) {
  return (
    <div className="glass p-6 rounded-2xl flex flex-col justify-between hover:shadow-lg transition-transform hover:-translate-y-1">
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

function ManageSlots({ doctorId }) {
  const [slots, setSlots] = useState([]);
  const [fee, setFee] = useState('');
  const [loading, setLoading] = useState(false);

  // Template states
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // Mon-Fri default (0=Sun, 1=Mon)
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakStart, setBreakStart] = useState('13:00');
  const [breakEnd, setBreakEnd] = useState('14:00');
  const [duration, setDuration] = useState(30);
  const [weeksToGenerate, setWeeksToGenerate] = useState(4);
  
  // Holidays
  const [holidayInput, setHolidayInput] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [message, setMessage] = useState('');

  const daysOfWeek = [
    { id: 1, label: 'Mon' }, { id: 2, label: 'Tue' }, { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' }, { id: 5, label: 'Fri' }, { id: 6, label: 'Sat' }, { id: 0, label: 'Sun' }
  ];

  useEffect(() => {
    fetchSlots();
  }, [doctorId]);

  async function fetchSlots() {
    if (!doctorId) return;
    const q = query(collection(db, 'slots'), where('doctorId', '==', doctorId));
    const querySnapshot = await getDocs(q);
    const data = [];
    querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
    setSlots(data.sort((a,b) => new Date(a.date) - new Date(b.date)));
  }

  function addHoliday() {
    if (holidayInput && !holidays.includes(holidayInput)) {
      setHolidays([...holidays, holidayInput]);
      setHolidayInput('');
    }
  }

  function removeHoliday(dateStr) {
    setHolidays(holidays.filter(d => d !== dateStr));
  }

  function toggleDay(id) {
    if (selectedDays.includes(id)) {
      setSelectedDays(selectedDays.filter(d => d !== id));
    } else {
      setSelectedDays([...selectedDays, id]);
    }
  }

  // Time math helpers
  function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }
  
  function minutesToTime(mins) {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  async function handleGenerateSlots(e) {
    e.preventDefault();
    if (!fee) {
      setMessage('Please enter a consultation fee.');
      return;
    }
    if (selectedDays.length === 0) {
      setMessage('Please select at least one working day.');
      return;
    }
    
    setLoading(true);
    setMessage('Generating slots...');
    
    let generatedCount = 0;
    const today = new Date();
    // Reset to start of current day
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (weeksToGenerate * 7));

    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    const bsMins = timeToMinutes(breakStart);
    const beMins = timeToMinutes(breakEnd);

    try {
      for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
        // Check if day maps to selected days
        if (!selectedDays.includes(d.getDay())) continue;
        
        // Check holidays
        // Format YYYY-MM-DD local time directly to avoid timezone shift issue
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateString = `${y}-${m}-${day}`;
        
        if (holidays.includes(dateString)) continue;

        // Generate intervals line by line
        for (let currentMins = startMins; currentMins + duration <= endMins; currentMins += duration) {
           const slotStartMins = currentMins;
           const slotEndMins = currentMins + duration;
           
           // If slot overlaps with break, skip it
           // Simple overlap check: max(start1, start2) < min(end1, end2)
           if (breakStart && breakEnd) {
             const overlaps = Math.max(slotStartMins, bsMins) < Math.min(slotEndMins, beMins);
             if (overlaps) continue;
           }

           const timeString = minutesToTime(currentMins);
           
           // We could check if slot already exists to prevent duplicates
           const existing = slots.find(s => s.date === dateString && s.time === timeString);
           if (!existing) {
             await addDoc(collection(db, 'slots'), {
               doctorId,
               date: dateString,
               time: timeString,
               fee: Number(fee),
               isBooked: false
             });
             generatedCount++;
           }
        }
      }
      setMessage(`Successfully generated ${generatedCount} new slots.`);
      fetchSlots();
    } catch (err) {
      console.error(err);
      setMessage('An error occurred during generation.');
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    try {
      await deleteDoc(doc(db, 'slots', id));
      fetchSlots();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="glass p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-4">Bulk Slot Generator</h2>
        {message && <div className="mb-4 p-3 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 border border-blue-100">{message}</div>}
        <form onSubmit={handleGenerateSlots} className="space-y-4">
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Available Days</label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map(day => (
                <button 
                  type="button" 
                  key={day.id} 
                  onClick={() => toggleDay(day.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${selectedDays.includes(day.id) ? 'bg-hospital-red text-white border-hospital-red' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
              <input required type="time" className="w-full px-3 py-2 border rounded-lg bg-white" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">End Time</label>
              <input required type="time" className="w-full px-3 py-2 border rounded-lg bg-white" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Break Start (Optional)</label>
              <input type="time" className="w-full px-3 py-2 border rounded-lg bg-white" value={breakStart} onChange={e => setBreakStart(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Break End (Optional)</label>
              <input type="time" className="w-full px-3 py-2 border rounded-lg bg-white" value={breakEnd} onChange={e => setBreakEnd(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Slot Duration</label>
              <select className="w-full px-3 py-2 border rounded-lg bg-white text-sm" value={duration} onChange={e => setDuration(Number(e.target.value))}>
                <option value={15}>15 mins</option>
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Generate For</label>
              <select className="w-full px-3 py-2 border rounded-lg bg-white text-sm" value={weeksToGenerate} onChange={e => setWeeksToGenerate(Number(e.target.value))}>
                <option value={1}>1 Week</option>
                <option value={2}>2 Weeks</option>
                <option value={4}>4 Weeks</option>
                <option value={8}>8 Weeks</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fee (₹)</label>
              <input required type="number" min="0" placeholder="e.g. 500" className="w-full px-3 py-2 border rounded-lg bg-white text-sm" value={fee} onChange={e => setFee(e.target.value)} />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
             <label className="block text-sm font-semibold text-gray-700 mb-1">Mark Holidays (Skip these dates)</label>
             <div className="flex gap-2 mb-2">
               <input type="date" className="flex-1 px-3 py-2 border rounded-lg bg-white" value={holidayInput} onChange={e => setHolidayInput(e.target.value)} />
               <button type="button" onClick={addHoliday} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Add</button>
             </div>
             {holidays.length > 0 && (
               <div className="flex flex-wrap gap-2">
                 {holidays.map(h => (
                   <span key={h} className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded-md text-xs font-semibold border border-red-100">
                     {h}
                     <button type="button" onClick={() => removeHoliday(h)} className="hover:text-red-800 font-bold ml-1">&times;</button>
                   </span>
                 ))}
               </div>
             )}
          </div>

          <button disabled={loading} type="submit" className="w-full bg-hospital-red text-white py-3 rounded-lg font-bold hover:bg-hospital-darkred mt-2 transition-colors disabled:opacity-50 shadow-md">
            {loading ? 'Generatings Slots...' : 'Generate Slots Now'}
          </button>
        </form>
      </div>

      <div className="glass p-6 rounded-2xl flex flex-col max-h-[800px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Your Available Slots</h2>
          <span className="text-sm bg-hospital-red text-white px-2 py-1 rounded-full font-bold">{slots.length} Slots</span>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin">
          {slots.map(slot => (
            <div key={slot.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
              <div>
                <p className="font-semibold text-sm">{slot.date} at {slot.time}</p>
                <p className="text-xs text-gray-500">Fee: ₹{slot.fee} | Status: {slot.isBooked ? <span className="text-red-500">Booked</span> : <span className="text-green-500">Available</span>}</p>
              </div>
              {!slot.isBooked && (
                <button onClick={() => handleDelete(slot.id)} className="text-red-500 hover:text-red-700 text-sm font-medium bg-red-50 px-2 py-1 rounded">Remove</button>
              )}
            </div>
          ))}
          {slots.length === 0 && <p className="text-gray-500 text-sm italic">You have no slots configured.</p>}
        </div>
      </div>
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
    querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
    setRequests(data);
  }

  async function handleStatusUpdate(id, newStatus, req) {
    try {
      await updateDoc(doc(db, 'appointments', id), {
        status: newStatus
      });
      if (newStatus === 'rejected') {
        const slotQ = query(collection(db, 'slots'), where('doctorId', '==', doctorId), where('date', '==', req.date), where('time', '==', req.time));
        const slotSnap = await getDocs(slotQ);
        slotSnap.forEach(async (slotDoc) => {
          await updateDoc(doc(db, 'slots', slotDoc.id), { isBooked: false });
        });
      }
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="glass p-6 rounded-2xl">
      <h2 className="text-xl font-bold mb-4">Pending Requests</h2>
      <div className="space-y-4">
        {requests.map(req => (
          <div key={req.id} className="p-4 bg-white rounded-lg border border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <p className="font-bold text-hospital-dark">{req.patientName}</p>
              <p className="text-sm text-gray-600">Requested Slot: {req.date} at {req.time}</p>
              <p className="text-xs font-semibold mt-1">Status: <span className={req.status === 'pending' ? 'text-orange-500' : req.status === 'accepted' ? 'text-green-500' : 'text-red-500'}>{req.status.toUpperCase()}</span></p>
            </div>
            {req.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => handleStatusUpdate(req.id, 'accepted', req)} className="bg-hospital-red text-white px-4 py-2 rounded-lg text-sm hover:bg-hospital-darkred">Accept</button>
                <button onClick={() => handleStatusUpdate(req.id, 'rejected', req)} className="bg-gray-100 text-hospital-dark px-4 py-2 rounded-lg text-sm hover:bg-gray-200">Reject</button>
              </div>
            )}
          </div>
        ))}
        {requests.length === 0 && <p className="text-gray-500">No requests found.</p>}
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
    // We fetch appointments where status is accepted or completed
    const q = query(collection(db, 'appointments'), where('doctorId', '==', doctorId));
    const querySnapshot = await getDocs(q);
    const data = [];
    querySnapshot.forEach((doc) => {
      const app = { id: doc.id, ...doc.data() };
      if (app.status === 'accepted' || app.status === 'completed') {
        data.push(app);
      }
    });
    setHistory(data);
  }

  async function handleCancel(app) {
    try {
      const slotQ = query(collection(db, 'slots'), where('doctorId', '==', doctorId), where('date', '==', app.date), where('time', '==', app.time));
      const slotSnap = await getDocs(slotQ);
      for (const slotDoc of slotSnap.docs) {
        await updateDoc(doc(db, 'slots', slotDoc.id), { isBooked: false });
      }
      await deleteDoc(doc(db, 'appointments', app.id));
      fetchHistory();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleComplete(app) {
    const diagnosis = window.prompt("Enter Diagnosis for the patient:");
    if (!diagnosis) return;
    const prescription = window.prompt("Enter Prescription (optional):") || "No prescription needed.";

    try {
      await updateDoc(doc(db, 'appointments', app.id), { 
        status: 'completed',
        diagnosis,
        prescription
      });
      const slotQ = query(collection(db, 'slots'), where('doctorId', '==', doctorId), where('date', '==', app.date), where('time', '==', app.time));
      const slotSnap = await getDocs(slotQ);
      for (const slotDoc of slotSnap.docs) {
        await deleteDoc(doc(db, 'slots', slotDoc.id));
      }
      fetchHistory();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="glass p-6 rounded-2xl">
      <h2 className="text-xl font-bold mb-4">Consultation History</h2>
      <div className="space-y-4">
        {history.map(app => (
          <div key={app.id} className="p-4 bg-white rounded-lg border border-green-200 border-l-4 border-l-green-500 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <p className="font-bold text-hospital-dark">{app.patientName}</p>
              <p className="text-sm text-gray-600">Consultation Slot: {app.date} at {app.time}</p>
              <p className="text-xs font-semibold mt-1 text-green-600 uppercase">{app.status === 'accepted' ? 'In Progress' : app.status}</p>
              {app.status === 'completed' && app.diagnosis && (
                <div className="mt-2 bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                  <p className="mb-1"><span className="font-semibold text-hospital-dark">Diagnosis:</span> {app.diagnosis}</p>
                  <p><span className="font-semibold text-hospital-dark">Prescription:</span> {app.prescription}</p>
                </div>
              )}
              {app.status === 'accepted' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => handleComplete(app)} className="text-xs bg-hospital-dark text-white px-3 py-1.5 rounded hover:bg-hospital-red">Mark Completed</button>
                  <button onClick={() => handleCancel(app)} className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded hover:bg-red-200 font-medium">Cancel Appointment</button>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="font-bold text-hospital-dark">₹{app.fee}</p>
              <p className="text-xs text-gray-500">{app.status === 'completed' ? 'Paid / Settled' : 'Pending Payment'}</p>
            </div>
          </div>
        ))}
        {history.length === 0 && <p className="text-gray-500">No consultation history available yet.</p>}
      </div>
    </div>
  );
}
