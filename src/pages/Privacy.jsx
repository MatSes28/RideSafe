import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="p-4" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '600px', margin: '0 auto' }}>
      <button className="btn btn-outline mb-4" onClick={() => navigate(-1)} style={{ padding: '0.5rem 1rem' }}>
        <ArrowLeft size={18} /> Back
      </button>
      <h2>Privacy Policy</h2>
      <div className="glass-card p-4">
        <p className="mb-4"><strong>1. Data Collection</strong><br/>We collect personal information such as name, phone number, and location data when you use RideSafe.</p>
        <p className="mb-4"><strong>2. Location Tracking</strong><br/>Your precise location is required to match you with drivers and track your ride in real-time.</p>
        <p className="mb-4"><strong>3. Data Security</strong><br/>We implement security measures (Row Level Security) to maintain the safety of your personal information.</p>
        <p className="mb-4"><strong>4. Third-Party Disclosure</strong><br/>We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties.</p>
      </div>
    </div>
  );
}
