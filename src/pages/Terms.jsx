import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="p-4" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '600px', margin: '0 auto' }}>
      <button className="btn btn-outline mb-4" onClick={() => navigate(-1)} style={{ padding: '0.5rem 1rem' }}>
        <ArrowLeft size={18} /> Back
      </button>
      <h2>Terms of Service</h2>
      <div className="glass-card p-4">
        <p className="mb-4"><strong>1. Acceptance of Terms</strong><br/>By accessing or using RideSafe, you agree to be bound by these Terms. If you disagree, do not use the service.</p>
        <p className="mb-4"><strong>2. User Accounts</strong><br/>You must provide accurate information. You are responsible for safeguarding your password.</p>
        <p className="mb-4"><strong>3. Service Provision</strong><br/>RideSafe connects riders with drivers. We do not guarantee the availability of rides at all times.</p>
        <p className="mb-4"><strong>4. Code of Conduct</strong><br/>Users must treat each other with respect. Any form of harassment or violence will result in immediate termination.</p>
      </div>
    </div>
  );
}
