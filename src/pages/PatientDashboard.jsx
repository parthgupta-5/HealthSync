import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { db } from '../services/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, deleteDoc } from 'firebase/firestore';
import { ShoppingCart, Search, X, Plus, Minus } from 'lucide-react';

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
        {['overview', 'doctors', 'appointments', 'services'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveView(tab)}
            className={`px-4 py-2 font-medium rounded-lg transition-colors capitalize ${activeView === tab ? 'bg-hospital-red text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {tab === 'doctors' ? 'Find a Doctor' : tab === 'appointments' ? 'My Appointments' : tab === 'services' ? 'Medical Services' : 'Overview'}
          </button>
        ))}
      </div>

      {activeView === 'overview' && <Overview setView={setActiveView} />}
      {activeView === 'doctors' && <FindDoctor user={user} />}
      {activeView === 'appointments' && <MyAppointments userId={user?.uid} />}
      {activeView === 'services' && <MedicalServices />}
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
  const [slots, setSlots] = useState({});
  const [loading, setLoading] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchDoctors() {
      const q = query(collection(db, 'users'), where('role', '==', 'doctor'));
      const querySnapshot = await getDocs(q);
      const docsData = [];
      querySnapshot.forEach((doc) => docsData.push({ id: doc.id, ...doc.data() }));
      setDoctors(docsData);

      // Fetch slots for all doctors
      const slotsData = {};
      for (const doctor of docsData) {
        const slotsQ = query(collection(db, 'slots'), where('doctorId', '==', doctor.id), where('isBooked', '==', false));
        const slotSnap = await getDocs(slotsQ);
        slotsData[doctor.id] = [];
        slotSnap.forEach((doc) => slotsData[doctor.id].push({ id: doc.id, ...doc.data() }));
      }
      setSlots(slotsData);
    }
    fetchDoctors();
  }, []);

  async function handleBookSlot(doctor, slot) {
    setLoading({ ...loading, [slot.id]: true });
    try {
      await addDoc(collection(db, 'appointments'), {
        patientId: user.uid,
        patientName: user.name,
        doctorId: doctor.id,
        doctorName: doctor.name,
        date: slot.date,
        time: slot.time,
        fee: slot.fee,
        status: 'pending' 
      });

      await updateDoc(doc(db, 'slots', slot.id), {
        isBooked: true
      });

      setMessage(`Successfully booked ${doctor.name} for ${slot.date} at ${slot.time}!`);
      
      setSlots(prev => ({
        ...prev,
        [doctor.id]: prev[doctor.id].filter(s => s.id !== slot.id)
      }));
    } catch (err) {
      console.error(err);
      setMessage("Failed to book slot.");
    }
    setLoading({ ...loading, [slot.id]: false });
  }

  return (
    <div className="glass p-6 rounded-2xl">
      <h2 className="text-xl font-bold mb-4">Available Doctors & Slots</h2>
      {message && <div className="bg-hospital-light text-hospital-red p-4 rounded-md mb-6 font-medium">{message}</div>}
      
      <div className="space-y-6">
        {doctors.map(doc => (
          <div key={doc.id} className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-lg text-hospital-dark">Dr. {doc.name}</h3>
            <p className="text-hospital-red font-medium text-sm mb-4">{doc.specialization || 'General Practitioner'}</p>
            
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {slots[doc.id] && slots[doc.id].length > 0 ? (
                slots[doc.id].map(slot => (
                  <div key={slot.id} className="border border-green-200 bg-green-50 rounded-lg p-3 flex flex-col justify-between">
                    <div>
                      <p className="font-semibold text-sm">{slot.date}</p>
                      <p className="text-xs text-gray-600">{slot.time} • ₹{slot.fee}</p>
                    </div>
                    <button 
                      disabled={loading[slot.id]}
                      onClick={() => handleBookSlot(doc, slot)}
                      className="mt-3 bg-hospital-red text-white text-xs py-1.5 rounded disabled:opacity-50 hover:bg-hospital-darkred"
                    >
                      {loading[slot.id] ? 'Booking...' : 'Book Now'}
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No available slots at the moment.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MyAppointments({ userId }) {
  const [appointments, setAppointments] = useState([]);
  const [reschedulingAppId, setReschedulingAppId] = useState(null);
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [loadingReschedule, setLoadingReschedule] = useState(false);

  useEffect(() => {
    async function fetchAppointments() {
      if (!userId) return;
      const q = query(collection(db, 'appointments'), where('patientId', '==', userId));
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      setAppointments(data);
    }
    fetchAppointments();
  }, [userId]);

  async function handleUnbook(app) {
    try {
      const slotQ = query(collection(db, 'slots'), where('doctorId', '==', app.doctorId), where('date', '==', app.date), where('time', '==', app.time));
      const slotSnap = await getDocs(slotQ);
      for (const slotDoc of slotSnap.docs) {
        await updateDoc(doc(db, 'slots', slotDoc.id), { isBooked: false });
      }
      await deleteDoc(doc(db, 'appointments', app.id));
      setAppointments(prev => prev.filter(a => a.id !== app.id));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleOpenReschedule(app) {
    if (reschedulingAppId === app.id) {
       setReschedulingAppId(null);
       return;
    }
    setReschedulingAppId(app.id);
    setLoadingReschedule(true);
    try {
      const q = query(collection(db, 'slots'), where('doctorId', '==', app.doctorId), where('isBooked', '==', false));
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach(doc => data.push({id: doc.id, ...doc.data()}));
      setRescheduleSlots(data.sort((a,b) => new Date(a.date) - new Date(b.date)));
    } catch (e) {
      console.error(e);
    }
    setLoadingReschedule(false);
  }

  async function handleConfirmReschedule(app, newSlot) {
    try {
       // Free old slot
       const oldSlotQ = query(collection(db, 'slots'), where('doctorId', '==', app.doctorId), where('date', '==', app.date), where('time', '==', app.time));
       const oldSlotSnap = await getDocs(oldSlotQ);
       for (const slotDoc of oldSlotSnap.docs) {
         await updateDoc(doc(db, 'slots', slotDoc.id), { isBooked: false });
       }
       // Reserve new slot
       await updateDoc(doc(db, 'slots', newSlot.id), { isBooked: true });
       // Update appt
       await updateDoc(doc(db, 'appointments', app.id), {
          date: newSlot.date,
          time: newSlot.time,
          fee: newSlot.fee,
          status: 'pending'
       });
       
       setAppointments(prev => prev.map(a => 
         a.id === app.id ? { ...a, date: newSlot.date, time: newSlot.time, fee: newSlot.fee, status: 'pending' } : a
       ));
       setReschedulingAppId(null);
    } catch (e) { 
       console.error(e); 
    }
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
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${app.status === 'accepted' ? 'bg-green-100 text-green-700' : app.status === 'rejected' ? 'bg-red-100 text-red-700' : app.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                  {app.status === 'accepted' ? 'In Progress' : app.status}
                </div>
                {app.status !== 'completed' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenReschedule(app)} className="text-xs text-hospital-dark hover:text-hospital-red font-medium">Reschedule</button>
                    <button onClick={() => handleUnbook(app)} className="text-xs text-red-500 hover:text-red-700 font-medium bg-red-50 px-2 py-1 rounded">Cancel</button>
                  </div>
                )}
              </div>
            </div>

            {reschedulingAppId === app.id && (
              <div className="mt-2 bg-gray-50 p-4 border border-gray-200 rounded-lg animate-in slide-in-from-top-2">
                <h4 className="text-sm font-bold text-hospital-dark mb-3">Select a New Time Slot for Dr. {app.doctorName}</h4>
                {loadingReschedule ? (
                   <p className="text-sm text-gray-500">Loading available slots...</p>
                ) : rescheduleSlots.length > 0 ? (
                   <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                     {rescheduleSlots.map(slot => (
                       <button 
                         key={slot.id} 
                         onClick={() => handleConfirmReschedule(app, slot)}
                         className="text-left border border-hospital-red/30 bg-white hover:bg-hospital-red hover:text-white transition-colors rounded-lg p-3 group"
                       >
                         <p className="font-semibold text-sm">{slot.date}</p>
                         <p className="text-xs text-gray-600 group-hover:text-red-100">{slot.time} • ₹{slot.fee}</p>
                       </button>
                     ))}
                   </div>
                ) : (
                   <p className="text-sm text-orange-600 font-medium">No other slots are currently available for this doctor.</p>
                )}
              </div>
            )}
          </div>
        ))}
        {appointments.length === 0 && <p className="text-gray-500">You haven't booked any appointments yet.</p>}
      </div>
    </div>
  );
}

function MedicalServices() {
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
    // If the database is completely empty, act as a Fake API and auto-generate inventory
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
        // Deduct specifically purchased quantity from database inventory
        const newStock = item.stock - item.qty;
        await updateDoc(doc(db, 'medicines', item.id), {
          stock: newStock
        });
      }
      setCheckoutStatus('Order placed successfully! Total: ₹' + cartTotal.toFixed(2));
      toast.success('Order placed successfully!');
      setCart([]);
      setShowCart(false);
      fetchMedicines(); // Refresh stock immediately
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

      {/* Cart Modal/Sidebar overlay */}
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
