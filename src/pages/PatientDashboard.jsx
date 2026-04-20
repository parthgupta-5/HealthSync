import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { db } from '../services/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, deleteDoc } from 'firebase/firestore';
import { ShoppingCart, Search, X, Plus, Minus } from 'lucide-react';

// Time Math Helpers
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

export default function PatientDashboard() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-hospital-dark">Patient Dashboard</h1>
        <div className="text-sm bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
          Welcome back, <span className="font-semibold text-hospital-red">{user?.name}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 border-b border-gray-200 pb-4">
        {['overview', 'doctors', 'appointments', 'services', 'purchases'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveView(tab)}
            className={`px-4 py-2 font-medium rounded-lg transition-colors capitalize ${activeView === tab ? 'bg-hospital-red text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {tab === 'doctors' ? 'Find a Doctor' : tab === 'appointments' ? 'Appointments & History' : tab === 'services' ? 'Medical Services' : tab === 'purchases' ? 'Purchase History' : 'Overview'}
          </button>
        ))}
      </div>

      {activeView === 'overview' && <Overview setView={setActiveView} />}
      {activeView === 'doctors' && <FindDoctor user={user} />}
      {activeView === 'appointments' && <MyAppointments user={user} />}
      {activeView === 'services' && <MedicalServices user={user} />}
      {activeView === 'purchases' && <MyPurchases userId={user?.uid} />}
    </div>
  );
}

function Overview({ setView }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <DashboardCard 
        title="Find a Doctor" 
        desc="Search and book consultation slots with our specialists." 
        action="Book Appointment"
        onClick={() => setView('doctors')}
      />
      <DashboardCard 
        title="My Appointments" 
        desc="View upcoming and past doctor appointments." 
        action="View History"
        onClick={() => setView('appointments')}
      />
      <DashboardCard 
        title="Medical Tests & Pharmacy" 
        desc="Book lab tests and order medicines directly to your home." 
        action="Explore Services"
        onClick={() => setView('services')}
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
        className="w-full text-center bg-hospital-light text-hospital-red px-4 py-3 rounded-lg font-semibold hover:bg-hospital-red hover:text-white transition-colors"
      >
        {action}
      </button>
    </div>
  );
}

function FindDoctor({ user }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Booking Modal States
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [next7Days, setNext7Days] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingTime, setBookingTime] = useState('');

  useEffect(() => {
    async function fetchDoctors() {
      const q = query(collection(db, 'users'), where('role', '==', 'doctor'));
      const querySnapshot = await getDocs(q);
      const docsData = [];
      querySnapshot.forEach((doc) => docsData.push({ id: doc.id, ...doc.data() }));
      // Generate preview availability text per doctor
      const formatted = docsData.map(doc => {
        let availText = "No specific availability set.";
        if (doc.availability) {
          const actives = Object.keys(doc.availability).filter(d => doc.availability[d].enabled);
          if (actives.length > 0) {
            availText = `Available on: ${actives.join(', ')}`;
          }
        }
        return { ...doc, availText };
      });
      setDoctors(formatted);
    }
    fetchDoctors();
  }, []);

  function generateNext7Days(doctor) {
    const next7 = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    const avail = doctor.availability;

    for(let i=0; i<7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dayStr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
        
        // Skip formatting if no availability data
        if (!avail) break;

        let available = false;
        let timeRange = 'Closed';
        if (avail[dayStr] && avail[dayStr].enabled) {
            available = true;
            timeRange = `${avail[dayStr].start} - ${avail[dayStr].end}`;
        }
        
        if (available) {
            next7.push({
                full: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
                display: `${dayStr}, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                dayName: dayStr,
                timeRange
            });
        }
    }
    return next7;
  }

  function openBookingModal(doctor) {
    setBookingDoctor(doctor);
    setNext7Days(generateNext7Days(doctor));
    setSelectedDate('');
    setBookingTime('');
    setAvailableSlots([]);
    setMessage('');
  }

  async function handleSelectDate(dateStr) {
    setSelectedDate(dateStr);
    setBookingTime('');
    setLoadingSlots(true);
    
    try {
      // 1. Fetch booked appointments
      const q = query(collection(db, 'appointments'), where('doctorId', '==', bookingDoctor.id), where('date', '==', dateStr));
      const snap = await getDocs(q);
      const bookedTimes = [];
      snap.forEach(doc => {
          const data = doc.data();
          if (data.status !== 'cancelled' && data.status !== 'rejected') {
              bookedTimes.push(data.time);
          }
      });
      
      // 2. Generate intervals
      const day = new Date(dateStr).getDay();
      const dayStr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day];
      const config = bookingDoctor.availability[dayStr];
      const startMins = timeToMinutes(config.start);
      const endMins = timeToMinutes(config.end);
      const slotDuration = bookingDoctor.slotDuration || 30; // fallback to 30 mins
      
      const intervals = [];
      for (let currentMins = startMins; currentMins + slotDuration <= endMins; currentMins += slotDuration) {
          const timeString = minutesToTime(currentMins);
          if (!bookedTimes.includes(timeString)) {
              intervals.push(timeString);
          }
      }
      setAvailableSlots(intervals);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load slots.');
    }
    setLoadingSlots(false);
  }

  async function handleConfirmBooking() {
    if (!bookingTime) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'appointments'), {
        patientId: user.uid,
        patientName: user.name,
        doctorId: bookingDoctor.id,
        doctorName: bookingDoctor.name,
        date: selectedDate,
        time: bookingTime,
        fee: bookingDoctor.consultationFee || 0,
        status: 'pending' 
      });
      
      toast.success(`Successfully booked ${bookingDoctor.name} for ${selectedDate} at ${bookingTime}!`);
      setBookingDoctor(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to book appointment.");
    }
    setLoading(false);
  }

  return (
    <div className="glass p-6 rounded-2xl relative">
      <h2 className="text-xl font-bold mb-6">Available Doctors</h2>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map(doc => (
          <div key={doc.id} className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-transform">
            <div>
              <h3 className="font-bold text-lg text-hospital-dark">Dr. {doc.name}</h3>
              <p className="text-hospital-red font-medium text-sm mb-2">{doc.specialization || 'General Practitioner'}</p>
              <p className="text-gray-500 text-xs mb-1 font-medium">{doc.availText}</p>
              <p className="text-hospital-dark font-bold text-sm mb-4">Consultation Fee: ₹{doc.consultationFee || 'Not Set'}</p>
            </div>
            
            <button 
              onClick={() => openBookingModal(doc)}
              disabled={!doc.availability}
              className="w-full bg-hospital-light text-hospital-dark font-semibold text-sm py-2 rounded-lg hover:bg-hospital-red hover:text-white transition-colors disabled:opacity-50 border border-gray-200"
            >
              {doc.availability ? 'Book Appointment' : 'No Schedule Setup'}
            </button>
          </div>
        ))}
      </div>

      {bookingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setBookingDoctor(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-hospital-dark">Book Appointment with Dr. {bookingDoctor.name}</h3>
                <p className="text-sm text-hospital-red font-semibold">Consultation Fee: ₹{bookingDoctor.consultationFee || 0} • Slot Duration: {bookingDoctor.slotDuration || 30} mins</p>
              </div>
              <button onClick={() => setBookingDoctor(null)} className="text-gray-400 hover:text-black">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6 mt-6">
              {next7Days.length === 0 ? (
                <div className="p-4 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium">Doctor has not set any active days in their availability.</div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Date (Next 7 Active Days)</label>
                    <div className="flex flex-wrap gap-2">
                      {next7Days.map(d => (
                        <button 
                          key={d.full} 
                          onClick={() => handleSelectDate(d.full)}
                          className={`px-3 py-2 text-sm rounded-lg font-medium border transition-colors ${selectedDate === d.full ? 'bg-hospital-red text-white border-hospital-red' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                        >
                          {d.display}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedDate && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Select Time Slot ({next7Days.find(d => d.full === selectedDate)?.timeRange})</label>
                      {loadingSlots ? (
                        <p className="text-sm text-gray-500">Loading availability...</p>
                      ) : availableSlots.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {availableSlots.map(time => (
                            <button
                               key={time}
                               onClick={() => setBookingTime(time)}
                               className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors ${bookingTime === time ? 'bg-hospital-dark text-white border-hospital-dark' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                            >
                               {time}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100">All slots are booked for this date! Try another day.</div>
                      )}
                    </div>
                  )}

                  {bookingTime && (
                    <div className="pt-4 border-t border-gray-100 mt-6 flex justify-end gap-3">
                      <button onClick={() => setBookingDoctor(null)} className="px-4 py-2 font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">Cancel</button>
                      <button disabled={loading} onClick={handleConfirmBooking} className="px-4 py-2 font-bold text-white bg-hospital-red hover:bg-hospital-darkred rounded-lg shadow-sm text-sm disabled:opacity-50">
                        {loading ? 'Confirming...' : 'Confirm Request'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MyAppointments({ user }) {
  const [appointments, setAppointments] = useState([]);
  
  // Reschedule States
  const [rescheduleData, setRescheduleData] = useState(null);
  const [next7Days, setNext7Days] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingTime, setBookingTime] = useState('');
  const [loadingReschedule, setLoadingReschedule] = useState(false);

  useEffect(() => {
    async function fetchAppointments() {
      if (!user?.uid) return;
      const q = query(collection(db, 'appointments'), where('patientId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      // Sort desc
      setAppointments(data.sort((a,b) => new Date(b.date) - new Date(a.date)));
    }
    fetchAppointments();
  }, [user]);

  async function handleUnbook(app) {
    try {
      await updateDoc(doc(db, 'appointments', app.id), { status: 'cancelled' });
      setAppointments(prev => prev.map(a => a.id === app.id ? { ...a, status: 'cancelled' } : a));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleOpenReschedule(app) {
    // We need to fetch the doctor's document to get their availability settings dynamically
    const docQ = query(collection(db, 'users'), where('uid', '==', app.doctorId));
    const docSnap = await getDocs(docQ);
    let doctorData = null;
    docSnap.forEach(d => { doctorData = { id: d.id, ...d.data() } });
    
    if (!doctorData || !doctorData.availability) {
      toast.error("Doctor's availability setup is missing. Cannot reschedule right now.");
      return;
    }

    setRescheduleData({ app, doctor: doctorData });
    setNext7Days(generateNext7Days(doctorData));
    setSelectedDate('');
    setBookingTime('');
    setAvailableSlots([]);
  }
  
  function generateNext7Days(doctor) {
    const next7 = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    const avail = doctor.availability;
    for(let i=0; i<7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dayStr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
        if (avail[dayStr] && avail[dayStr].enabled) {
            next7.push({
                full: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
                display: `${dayStr}, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                timeRange: `${avail[dayStr].start} - ${avail[dayStr].end}`
            });
        }
    }
    return next7;
  }

  async function handleSelectRescheduleDate(dateStr) {
    setSelectedDate(dateStr);
    setBookingTime('');
    setLoadingSlots(true);
    
    try {
      const q = query(collection(db, 'appointments'), where('doctorId', '==', rescheduleData.doctor.id), where('date', '==', dateStr));
      const snap = await getDocs(q);
      const bookedTimes = [];
      snap.forEach(doc => {
          const data = doc.data();
          if (data.status !== 'cancelled' && data.status !== 'rejected') {
              bookedTimes.push(data.time);
          }
      });
      
      const day = new Date(dateStr).getDay();
      const dayStr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day];
      const config = rescheduleData.doctor.availability[dayStr];
      const startMins = timeToMinutes(config.start);
      const endMins = timeToMinutes(config.end);
      const slotDuration = rescheduleData.doctor.slotDuration || 30; 
      
      const intervals = [];
      for (let currentMins = startMins; currentMins + slotDuration <= endMins; currentMins += slotDuration) {
          const timeString = minutesToTime(currentMins);
          // Allow reserving their OWN current time slot
          if (!bookedTimes.includes(timeString) || (timeString === rescheduleData.app.time && dateStr === rescheduleData.app.date)) {
              intervals.push(timeString);
          }
      }
      setAvailableSlots(intervals);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load slots.');
    }
    setLoadingSlots(false);
  }

  async function handleConfirmReschedule() {
    if (!bookingTime) return;
    setLoadingReschedule(true);
    try {
       await updateDoc(doc(db, 'appointments', rescheduleData.app.id), {
          date: selectedDate,
          time: bookingTime,
          fee: rescheduleData.doctor.consultationFee,
          status: 'pending'
       });
       
       setAppointments(prev => prev.map(a => 
         a.id === rescheduleData.app.id ? { ...a, date: selectedDate, time: bookingTime, fee: rescheduleData.doctor.consultationFee, status: 'pending' } : a
       ));
       toast.success("Successfully rescheduled appointment.");
       setRescheduleData(null);
    } catch (e) { 
       console.error(e); 
       toast.error("Error rescheduling.");
    }
    setLoadingReschedule(false);
  }

  return (
    <div className="glass p-6 rounded-2xl">
      <h2 className="text-xl font-bold mb-4">My Appointments</h2>
      <div className="space-y-4">
        {appointments.map(app => (
          <div key={app.id} className="p-4 bg-white rounded-lg border border-gray-100 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1 w-full sm:w-auto mb-2 sm:mb-0">
                <p className="font-bold text-hospital-dark">Dr. {app.doctorName}</p>
                <p className="text-sm text-gray-600">{app.date} at {app.time} • ₹{app.fee}</p>
                {app.status === 'completed' && app.diagnosis && (
                  <div className="mt-2 bg-green-50 p-3 rounded-lg border border-green-100 text-sm w-full">
                    <p className="mb-1"><span className="font-semibold text-hospital-dark">Diagnosis:</span> {app.diagnosis}</p>
                    <p><span className="font-semibold text-hospital-dark">Prescription:</span> {app.prescription}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${app.status === 'accepted' ? 'bg-green-100 text-green-700' : app.status === 'rejected' || app.status === 'cancelled' ? 'bg-red-100 text-red-700' : app.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                  {app.status === 'accepted' ? 'In Progress' : app.status}
                </div>
                {(app.status === 'pending' || app.status === 'accepted') && (
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenReschedule(app)} className="text-xs text-hospital-dark hover:text-hospital-red font-medium">Reschedule</button>
                    <button onClick={() => handleUnbook(app)} className="text-xs text-red-500 hover:text-red-700 font-medium bg-red-50 px-2 py-1 rounded">Cancel</button>
                  </div>
                )}
              </div>
            </div>

            {rescheduleData?.app.id === app.id && (
              <div className="mt-2 bg-gray-50 p-4 border border-gray-200 rounded-lg animate-in slide-in-from-top-2">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-sm font-bold text-hospital-dark mb-3">Reschedule Dr. {app.doctorName}</h4>
                  <button onClick={() => setRescheduleData(null)} className="text-gray-400 hover:text-black">
                    <X size={18} />
                  </button>
                </div>
                
                <div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {next7Days.map(d => (
                        <button 
                          key={d.full} 
                          onClick={() => handleSelectRescheduleDate(d.full)}
                          className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${selectedDate === d.full ? 'bg-hospital-red text-white border-hospital-red' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                        >
                          {d.display}
                        </button>
                      ))}
                    </div>

                    {selectedDate && (
                      <div className="animate-in fade-in">
                        {loadingSlots ? (
                          <p className="text-xs text-gray-500">Loading availability...</p>
                        ) : availableSlots.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {availableSlots.map(time => (
                              <button
                                 key={time}
                                 onClick={() => setBookingTime(time)}
                                 className={`px-3 py-1 text-xs rounded-lg border font-medium transition-colors ${bookingTime === time ? 'bg-hospital-dark text-white border-hospital-dark' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                              >
                                 {time}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-2 bg-red-50 text-red-700 rounded-lg text-xs font-medium border border-red-100">All slots are booked.</div>
                        )}
                      </div>
                    )}
                    
                    {bookingTime && (
                       <div className="mt-4 flex justify-end">
                          <button disabled={loadingReschedule} onClick={handleConfirmReschedule} className="px-3 py-1.5 font-bold text-white bg-hospital-red hover:bg-hospital-darkred rounded flex items-center text-xs shadow disabled:opacity-50">
                            Confirm Reschedule
                          </button>
                       </div>
                    )}
                </div>
              </div>
            )}
          </div>
        ))}
        {appointments.length === 0 && <p className="text-gray-500">You haven't booked any appointments yet.</p>}
      </div>
    </div>
  );
}

function MedicalServices({ user }) {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Shopping logic states
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState('');

  useEffect(() => {
    fetchMedicines();
  }, []);

  async function fetchMedicines() {
    setLoading(true);
    const querySnapshot = await getDocs(collection(db, 'medicines'));
    let data = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    
    // FAKE API DUMMY DATA SEEDING
    if (data.length === 0) {
      const fakeApiData = [
        { name: 'Paracetamol 500mg', category: 'medicine', price: 5, stock: 100, description: 'Fever and pain relief' },
        { name: 'Complete Blood Count (CBC)', category: 'test', price: 45, stock: 999, description: 'Basic blood test for overall health' },
        { name: 'Amoxicillin 250mg', category: 'medicine', price: 12, stock: 50, description: 'Antibiotic for bacterial infections' },
        { name: 'Chest X-Ray', category: 'test', price: 120, stock: 999, description: 'Radiology imaging for chest' },
        { name: 'Vitamin D3 Supplements', category: 'medicine', price: 15, stock: 200, description: 'Bone and immune support' },
        { name: 'Lipid Profile', category: 'test', price: 35, stock: 999, description: 'Cholesterol and triglycerides check' },
        { name: 'Ibuprofen 400mg', category: 'medicine', price: 8, stock: 150, description: 'Anti-inflammatory painkiller' },
        { name: 'MRI Scan - Brain', category: 'test', price: 500, stock: 999, description: 'Magnetic resonance imaging' },
        { name: 'Cough Syrup 100ml', category: 'medicine', price: 6, stock: 80, description: 'Dry and wet cough relief' },
        { name: 'Thyroid Panel', category: 'test', price: 55, stock: 999, description: 'Thyroid function test' },
      ];
      for (const item of fakeApiData) {
        const docRef = await addDoc(collection(db, 'medicines'), item);
        data.push({ id: docRef.id, ...item });
      }
    }
    setMedicines(data);
    setLoading(false);
  }

  // Filter and Sort Algorithms
  let displayShop = medicines.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || (m.description && m.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = category === 'all' || m.category === category;
    const hasStock = m.stock > 0;
    return matchesSearch && matchesCat && hasStock;
  });

  displayShop.sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    return a.name.localeCompare(b.name);
  });

  function addToCart(med) {
    const existing = cart.find(item => item.id === med.id);
    if (existing && existing.qty >= med.stock) {
      toast.error(`Only ${med.stock} items available in stock for ${med.name}.`);
      return;
    }
    
    setCart(prev => {
      const existingItem = prev.find(item => item.id === med.id);
      if (existingItem) {
        return prev.map(item => item.id === med.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...med, qty: 1 }];
    });
    setCheckoutStatus('');
    toast.success(`${med.name} added to cart!`);
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(item => item.id !== id));
  }

  function adjustQty(id, delta, maxStock) {
    if (delta > 0) {
      const item = cart.find(i => i.id === id);
      if (item && item.qty >= maxStock) {
        toast.error(`Only ${maxStock} items available in stock for ${item.name}.`);
        return;
      }
    }
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        if (newQty > 0 && newQty <= maxStock) return { ...item, qty: newQty };
      }
      return item;
    }));
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  async function handleCheckout() {
    setLoading(true);
    try {
      for (const item of cart) {
        const newStock = item.stock - item.qty;
        await updateDoc(doc(db, 'medicines', item.id), {
          stock: newStock
        });
      }
      if (user?.uid) {
        await addDoc(collection(db, 'orders'), {
          patientId: user.uid,
          patientName: user.name || 'Patient',
          items: cart,
          total: cartTotal,
          date: new Date().toISOString(),
          status: 'completed'
        });
      }
      setCheckoutStatus('Order placed successfully! Total: ₹' + cartTotal.toFixed(2));
      toast.success('Order placed successfully!');
      setCart([]);
      setShowCart(false);
      fetchMedicines(); 
    } catch (err) {
      console.error(err);
      setCheckoutStatus('Failed to process checkout.');
      toast.error('Failed to process checkout.');
    }
    setLoading(false);
  }

  return (
    <div className="relative glass p-4 md:p-6 rounded-2xl min-h-[60vh]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-hospital-dark">Pharmacy & Tests</h2>
          <p className="text-gray-500">Order medicines or book lab tests directly to your home.</p>
        </div>
        <button 
          onClick={() => setShowCart(true)}
          className="relative bg-hospital-dark text-white px-6 py-3 rounded-full hover:bg-hospital-red transition-colors font-medium flex items-center gap-2 shadow-md"
        >
          <ShoppingCart size={20} />
          View Cart
          {cartItemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-hospital-red text-white text-xs w-6 h-6 flex items-center justify-center rounded-full font-bold border-2 border-white">
              {cartItemCount}
            </span>
          )}
        </button>
      </div>

      {checkoutStatus && <div className="bg-hospital-light text-hospital-red p-4 rounded-md mb-6 font-medium border border-red-100">{checkoutStatus}</div>}

      <div className="flex flex-col md:flex-row gap-4 mb-8 bg-white/50 p-4 rounded-xl border border-white">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or description..." 
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-hospital-red"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-hospital-red bg-white"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          <option value="medicine">Medicines Only</option>
          <option value="test">Lab Tests Only</option>
        </select>
        <select 
          className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-hospital-red bg-white"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name-asc">Alphabetical (A-Z)</option>
          <option value="price-asc">Price (Low to High)</option>
          <option value="price-desc">Price (High to Low)</option>
        </select>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {loading && <p className="col-span-full text-center py-10 text-gray-500">Loading catalog...</p>}
        {!loading && displayShop.map(med => (
           <div key={med.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden">
             {med.category === 'test' && <div className="bg-blue-50 text-blue-700 text-xs font-bold uppercase py-1 px-3 w-fit rounded-br-lg">Lab Test</div>}
             {med.category === 'medicine' && <div className="bg-green-50 text-green-700 text-xs font-bold uppercase py-1 px-3 w-fit rounded-br-lg">Medicine</div>}
             
             <div className="p-5 flex-1">
               <h3 className="font-bold text-lg text-hospital-dark border-b border-gray-50 pb-2 mb-2 min-h-[3rem]">{med.name}</h3>
               <p className="text-gray-500 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">{med.description || "No description available."}</p>
               <div className="flex justify-between items-end">
                  <p className="text-hospital-red font-bold text-2xl">₹{med.price}</p>
                  <p className="text-gray-400 text-xs font-medium">{med.stock} left</p>
               </div>
             </div>
             <button 
               onClick={() => addToCart(med)}
               className="w-full bg-hospital-dark text-white py-3 hover:bg-hospital-red transition-colors font-medium flex items-center justify-center gap-2"
             >
               <ShoppingCart size={16} /> Add to Cart
             </button>
           </div>
        ))}
        {!loading && displayShop.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white/50 rounded-xl">
             <p className="text-lg text-gray-500">No items match your search criteria.</p>
          </div>
        )}
      </div>

      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCart(false)}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ShoppingCart className="text-hospital-red" /> Your Cart
              </h2>
              <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-black">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">
                  <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Your cart is empty.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex gap-4 items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex-1">
                      <p className="font-bold text-hospital-dark text-sm">{item.name}</p>
                      <p className="text-hospital-red font-semibold">₹{item.price}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-md border border-gray-200">
                      <button onClick={() => adjustQty(item.id, -1, item.stock)} className="p-1 hover:bg-gray-100 text-gray-600"><Minus size={14} /></button>
                      <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                      <button onClick={() => adjustQty(item.id, 1, item.stock)} className="p-1 hover:bg-gray-100 text-gray-600"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-2">
                      <X size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            {cart.length > 0 && (
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-gray-600 font-medium">Subtotal</span>
                  <span className="text-2xl font-bold text-hospital-dark">₹{cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  disabled={loading}
                  onClick={handleCheckout} 
                  className="w-full bg-hospital-red text-white py-4 rounded-xl font-bold text-lg hover:bg-hospital-darkred transition-colors shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Checkout Now'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MyPurchases({ userId }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPurchases() {
      if (!userId) return;
      setLoading(true);
      try {
        const q = query(collection(db, 'orders'), where('patientId', '==', userId));
        const snap = await getDocs(q);
        const data = [];
        snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
        data.sort((a,b) => new Date(b.date) - new Date(a.date));
        setPurchases(data);
      } catch (err) {
        console.error("Failed to fetch purchases:", err);
      }
      setLoading(false);
    }
    fetchPurchases();
  }, [userId]);

  return (
    <div className="glass p-6 rounded-2xl">
      <h2 className="text-xl font-bold mb-4">My Purchase History</h2>
      {loading ? (
         <p className="text-gray-500">Loading purchases...</p>
      ) : purchases.length === 0 ? (
         <p className="text-gray-500">You haven't made any purchases yet.</p>
      ) : (
         <div className="space-y-4">
           {purchases.map(order => (
             <div key={order.id} className="p-4 bg-white rounded-lg border border-gray-100 flex flex-col gap-2">
                <div className="flex justify-between items-start border-b border-gray-50 pb-2">
                  <div>
                    <p className="text-xs text-gray-500">Order ID: {order.id}</p>
                    <p className="text-sm font-semibold text-hospital-dark">
                      {new Date(order.date).toLocaleDateString()} at {new Date(order.date).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-hospital-red">₹{order.total.toFixed(2)}</p>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded uppercase">Completed</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center text-sm">
                      <span className="font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded w-8 text-center">{item.qty}x</span>
                      <span className="flex-1 truncate">{item.name}</span>
                      <span className="text-gray-500">₹{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
             </div>
           ))}
         </div>
      )}
    </div>
  );
}
