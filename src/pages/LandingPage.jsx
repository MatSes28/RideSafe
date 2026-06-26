import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, MapPin } from 'lucide-react';
import logo from '../assets/ridesafe_logo.png';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center p-4 animate-fade-in" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      
      {/* Decorative background elements */}
      <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'var(--secondary)', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.5, zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '-100px', left: '-50px', width: '300px', height: '300px', background: 'var(--primary)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.3, zIndex: 0 }}></div>

      <div className="mb-4 text-center" style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex justify-center mb-4">
          <div style={{ background: '#fff', padding: '1rem', borderRadius: '32px', boxShadow: '0 15px 30px rgba(14, 165, 233, 0.25)', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <img src={logo} alt="RideSafe Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '20px' }} />
          </div>
        </div>
        <h1 className="text-gradient" style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>RideSafe</h1>
        <p style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-main)' }}>San Jose • Munoz • Talavera</p>
      </div>

      <div className="glass-card flex flex-col gap-4 mt-4" style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>
        <button 
          className="btn btn-primary btn-block"
          onClick={() => navigate('/login')}
          style={{ padding: '1.2rem', fontSize: '1.2rem' }}
        >
          <Car size={24} />
          Book a Ride
        </button>

        <button 
          className="btn btn-outline btn-block"
          onClick={() => navigate('/register-driver')}
          style={{ padding: '1.2rem', fontSize: '1.2rem' }}
        >
          <MapPin size={24} />
          Drive with Us
        </button>
      </div>

      <div className="mt-8 text-center" style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex items-center justify-center gap-2 mb-2">
           <div className="pulse-circle"></div>
           <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Live Map Active</span>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Real-time GPS • Traffic Updates • Fastest Routes</p>
      </div>
    </div>
  );
}
