import { Link } from 'react-router-dom';
import { ArrowRight, Stethoscope, Calendar, Activity } from 'lucide-react';

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col items-center justify-center pt-20">
      <div className="text-center max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-1000">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-hospital-dark">
          Your Health, <br />
          <span className="text-hospital-red">Simplified.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Book appointments with top doctors, schedule medical tests, and order medicines directly to your door—all from one seamless platform.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link to="/register" className="bg-hospital-red text-white px-8 py-4 rounded-lg font-semibold hover:bg-hospital-darkred hover:shadow-lg transition-all flex items-center gap-2">
            Get Started <ArrowRight size={20} />
          </Link>
          <Link to="/login" className="bg-white border-2 border-hospital-gray text-hospital-dark px-8 py-4 rounded-lg font-semibold hover:border-hospital-red/30 transition-all">
            Login
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mt-24 w-full">
        <FeatureCard 
          icon={<Stethoscope className="text-hospital-red w-8 h-8" />}
          title="Top Doctors"
          desc="Access highly qualified medical professionals across multiple specialties."
        />
        <FeatureCard 
          icon={<Calendar className="text-hospital-red w-8 h-8" />}
          title="Easy Scheduling"
          desc="Book your appointments instantly and manage your schedule online."
        />
        <FeatureCard 
          icon={<Activity className="text-hospital-red w-8 h-8" />}
          title="Medical Services"
          desc="Easily arrange for clinical tests and pharmacy deliveries."
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="glass p-8 rounded-2xl hover:shadow-xl transition-all hover:-translate-y-1">
      <div className="bg-hospital-light w-16 h-16 rounded-full flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}
