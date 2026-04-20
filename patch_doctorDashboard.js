const fs = require('fs');

const path = 'src/pages/DoctorDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect } from 'react';\nimport { Pencil } from 'lucide-react';");

content = content.replace(
`export default function DoctorDashboard() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-hospital-dark">Doctor Dashboard</h1>
        <div className="text-sm bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
          Dr. <span className="font-semibold text-hospital-red">{user?.name}</span>
          <span className="text-gray-400 ml-2">| {user?.specialization || 'General'}</span>
        </div>
      </div>`,
`export default function DoctorDashboard() {
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-hospital-dark">Doctor Dashboard</h1>
        <div className="text-sm bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 flex items-center gap-2">
          {isEditingProfile ? (
            <div className="flex gap-2 items-center">
              <input value={editName} onChange={e=>setEditName(e.target.value)} className="border px-2 py-1 rounded text-sm w-24" placeholder="Name" />
              <input value={editSpecialization} onChange={e=>setEditSpecialization(e.target.value)} className="border px-2 py-1 rounded text-sm w-32" placeholder="Specialization" />
              <button onClick={handleUpdateProfile} className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">Save</button>
              <button onClick={() => setIsEditingProfile(false)} className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">Cancel</button>
            </div>
          ) : (
            <>
              <span>Dr. <span className="font-semibold text-hospital-red">{user?.name}</span></span>
              <span className="text-gray-400">| {user?.specialization || 'General'}</span>
              <button onClick={() => setIsEditingProfile(true)} className="text-gray-400 hover:text-hospital-red">
                <Pencil size={14} />
              </button>
            </>
          )}
        </div>
      </div>`
);

content = content.replace("<label className=\"block text-sm text-gray-700 mb-1\">Consultation Fee ($)</label>", "<label className=\"block text-sm text-gray-700 mb-1\">Consultation Fee (₹)</label>");
content = content.replace("Fee: ${slot.fee}", "Fee: ₹{slot.fee}");
content = content.replace("<p className=\"font-bold text-hospital-dark\">${app.fee}</p>", "<p className=\"font-bold text-hospital-dark\">₹{app.fee}</p>");


content = content.replace(
`  async function handleStatusUpdate(id, newStatus) {
    try {
      await updateDoc(doc(db, 'appointments', id), {
        status: newStatus
      });
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  }`,
`  async function handleStatusUpdate(id, newStatus, req) {
    try {
      await updateDoc(doc(db, 'appointments', id), {
        status: newStatus
      });
      if (newStatus === 'rejected') {
        const slotQ = query(collection(db, 'slots'), where('doctorId', '==', doctorId), where('date', '==', req.date), where('time', '==', req.time));
        const slotSnap = await getDocs(slotQ);
        for (const slotDoc of slotSnap.docs) {
          await updateDoc(doc(db, 'slots', slotDoc.id), { isBooked: false });
        }
      }
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  }`
);

content = content.replace(
`            {req.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => handleStatusUpdate(req.id, 'accepted')} className="bg-hospital-red text-white px-4 py-2 rounded-lg text-sm hover:bg-hospital-darkred">Accept</button>
                <button onClick={() => handleStatusUpdate(req.id, 'rejected')} className="bg-gray-100 text-hospital-dark px-4 py-2 rounded-lg text-sm hover:bg-gray-200">Reject</button>
              </div>
            )}`,
`            {req.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => handleStatusUpdate(req.id, 'accepted', req)} className="bg-hospital-red text-white px-4 py-2 rounded-lg text-sm hover:bg-hospital-darkred">Accept</button>
                <button onClick={() => handleStatusUpdate(req.id, 'rejected', req)} className="bg-gray-100 text-hospital-dark px-4 py-2 rounded-lg text-sm hover:bg-gray-200">Reject</button>
              </div>
            )}`
);


content = content.replace(
`  async function fetchHistory() {
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
  }`,
`  async function fetchHistory() {
    if (!doctorId) return;
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
    try {
      await updateDoc(doc(db, 'appointments', app.id), { status: 'completed' });
      const slotQ = query(collection(db, 'slots'), where('doctorId', '==', doctorId), where('date', '==', app.date), where('time', '==', app.time));
      const slotSnap = await getDocs(slotQ);
      for (const slotDoc of slotSnap.docs) {
        await deleteDoc(doc(db, 'slots', slotDoc.id));
      }
      fetchHistory();
    } catch (err) {
      console.error(err);
    }
  }`
);

content = content.replace(
`            <div>
              <p className="font-bold text-hospital-dark">{app.patientName}</p>
              <p className="text-sm text-gray-600">Consultation Slot: {app.date} at {app.time}</p>
              <p className="text-xs font-semibold mt-1 text-green-600 uppercase">{app.status}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-hospital-dark">₹{app.fee}</p>
              <p className="text-xs text-gray-500">Paid / Settled</p>
            </div>`,
`            <div>
              <p className="font-bold text-hospital-dark">{app.patientName}</p>
              <p className="text-sm text-gray-600">Consultation Slot: {app.date} at {app.time}</p>
              <p className="text-xs font-semibold mt-1 text-green-600 uppercase">{app.status === 'accepted' ? 'In Progress' : app.status}</p>
              {app.status === 'accepted' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => handleComplete(app)} className="text-xs bg-hospital-dark text-white px-3 py-1.5 rounded hover:bg-hospital-red">Mark Completed</button>
                  <button onClick={() => handleCancel(app)} className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded hover:bg-red-200 font-medium">Cancel Appt</button>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="font-bold text-hospital-dark">₹{app.fee}</p>
              <p className="text-xs text-gray-500">{app.status === 'completed' ? 'Paid / Settled' : 'Pending Payment'}</p>
            </div>`
);

fs.writeFileSync(path, content);
