import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ doctors: 0, patients: 0, appointments: 0, medicines: 0 });

  useEffect(() => {
    async function fetchStats() {
      const docsQ = query(collection(db, 'users'), where('role', '==', 'doctor'));
      const dSnap = await getDocs(docsQ);
      
      const patQ = query(collection(db, 'users'), where('role', '==', 'patient'));
      const pSnap = await getDocs(patQ);
      
      const appSnap = await getDocs(collection(db, 'appointments'));
      const medSnap = await getDocs(collection(db, 'medicines'));

      setStats({
        doctors: dSnap.size,
        patients: pSnap.size,
        appointments: appSnap.size,
        medicines: medSnap.size
      });
    }
    fetchStats();
  }, []);
  
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-hospital-dark">Admin Dashboard</h1>
        <div className="text-sm bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
          Admin <span className="font-semibold text-hospital-red">{user?.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">Total Doctors</span>
          <span className="text-3xl font-bold text-hospital-dark">{stats.doctors}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">Total Patients</span>
          <span className="text-3xl font-bold text-hospital-dark">{stats.patients}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">Total Appointments</span>
          <span className="text-3xl font-bold text-hospital-dark">{stats.appointments}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">Total Products</span>
          <span className="text-3xl font-bold text-hospital-dark">{stats.medicines}</span>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 pb-4">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-hospital-red text-white' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          Overview & Stats
        </button>
        <button 
          onClick={() => setActiveTab('medicines')}
          className={`px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === 'medicines' ? 'bg-hospital-red text-white' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          Manage Medicines
        </button>
        <button 
          onClick={() => setActiveTab('doctors')}
          className={`px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === 'doctors' ? 'bg-hospital-red text-white' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          Manage Doctors
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="glass p-6 rounded-2xl">
          <h2 className="text-xl font-bold mb-4">Welcome to Admin Portal</h2>
          <p className="text-gray-500">Select a management tab above to add doctors, edit inventory, and moderate users.</p>
        </div>
      )}
      {activeTab === 'medicines' && <ManageMedicines />}
      {activeTab === 'doctors' && <ManageDoctors />}
    </div>
  );
}

function ManageMedicines() {
  const [medicines, setMedicines] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('medicine');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMedicines();
  }, []);

  async function fetchMedicines() {
    const querySnapshot = await getDocs(collection(db, 'medicines'));
    const data = [];
    querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
    setMedicines(data);
  }

  async function handleAddMedicine(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'medicines'), {
        name,
        price: Number(price),
        stock: Number(stock),
        category,
        description
      });
      setName('');
      setPrice('');
      setStock('');
      setCategory('medicine');
      setDescription('');
      fetchMedicines();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    try {
      await deleteDoc(doc(db, 'medicines', id));
      fetchMedicines();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="glass p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-4">Add Medicine Product</h2>
        <form onSubmit={handleAddMedicine} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-1">Product Name</label>
              <input required type="text" className="w-full px-4 py-2 border rounded-lg" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-1">Category</label>
              <select className="w-full px-4 py-2 border rounded-lg bg-white" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="medicine">Medicine</option>
                <option value="test">Lab Test</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Description</label>
            <input required type="text" className="w-full px-4 py-2 border rounded-lg" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-1">Price (₹)</label>
              <input required type="number" min="0" step="0.01" className="w-full px-4 py-2 border rounded-lg" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-1">Stock Quantity</label>
              <input required type="number" min="0" className="w-full px-4 py-2 border rounded-lg" value={stock} onChange={e => setStock(e.target.value)} />
            </div>
          </div>
          <button disabled={loading} type="submit" className="w-full bg-hospital-red text-white py-2 rounded-lg hover:bg-hospital-darkred mt-2">
            {loading ? 'Adding...' : 'Add Medicine'}
          </button>
        </form>
      </div>

      <div className="glass p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-4">Current Inventory</h2>
        <div className="space-y-3">
          {medicines.map(med => (
            <div key={med.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
              <div>
                <p className="font-semibold">{med.name}</p>
                <p className="text-xs text-gray-500">Stock: {med.stock} | Price: ₹{med.price}</p>
              </div>
              <button onClick={() => handleDelete(med.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
            </div>
          ))}
          {medicines.length === 0 && <p className="text-gray-500 text-sm">No medicines found.</p>}
        </div>
      </div>
    </div>
  );
}

function ManageDoctors() {
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    async function fetchDoctors() {
      const q = query(collection(db, 'users'), where('role', '==', 'doctor'));
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      setDoctors(data);
    }
    fetchDoctors();
  }, []);

  return (
    <div className="glass p-6 rounded-2xl">
      <h2 className="text-xl font-bold mb-4">Registered Doctors</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {doctors.map(doc => (
          <div key={doc.id} className="p-4 bg-white rounded-lg border border-gray-100 flex justify-between items-start">
            <div>
              <p className="font-bold text-hospital-dark">{doc.name}</p>
              <p className="text-sm text-hospital-red">{doc.specialization || 'General'}</p>
              <p className="text-xs text-gray-500 mt-1">{doc.email}</p>
            </div>
          </div>
        ))}
        {doctors.length === 0 && <p className="text-gray-500">No doctors registered.</p>}
      </div>
    </div>
  );
}
