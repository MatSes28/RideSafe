import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UploadCloud, UserPlus, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function CustomerRegister() {
  const navigate = useNavigate();
  const [idFile, setIdFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({ name: '', phone: '', password: '' });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setIdFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!idFile) {
      alert("Please upload a valid ID.");
      return;
    }
    
    setLoading(true);
    setErrorMsg("");

    // Use fake email for phone auth simulation
    const email = `${formData.phone.replace(/[^0-9]/g, '')}@ridesafe.com`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password: formData.password,
      options: {
        data: {
          role: 'customer',
          full_name: formData.name,
          phone: formData.phone
        }
      }
    });

    if (error) {
      setLoading(false);
      setErrorMsg(error.message);
      return;
    }

    const userId = data.user.id;

    // Upload ID to storage
    const idFileName = `${userId}/customer_id_${Date.now()}`;
    await supabase.storage.from('verifications').upload(idFileName, idFile);

    // Create profile
    await supabase.from('profiles').insert({
      id: userId,
      role: 'customer',
      wallet_balance: 500 // give them some initial credit to test
    });

    setLoading(false);

    setSubmitted(true);
    setTimeout(() => {
      navigate('/customer-dash');
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="p-4 flex flex-col items-center justify-center animate-fade-in" style={{ minHeight: '80vh' }}>
        <CheckCircle size={60} className="text-primary mb-4" />
        <h2 className="text-center">Registration Successful!</h2>
        <p className="text-center">Preparing your map...</p>
      </div>
    );
  }

  return (
    <div className="p-4 animate-fade-in" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <button className="btn btn-outline mb-4" onClick={() => navigate('/login')} style={{ padding: '0.5rem 1rem' }}>
        <ArrowLeft size={18} /> Back
      </button>

      <div className="mb-4">
        <h2>Customer Registration</h2>
        <p>Join RideSafe today. Fast, safe, and reliable.</p>
        {errorMsg && <p className="text-danger mt-2">{errorMsg}</p>}
      </div>

      <div className="glass-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" placeholder="Juan Dela Cruz" required 
                   value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input type="tel" className="form-input" placeholder="09XX XXX XXXX" required 
                   value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="Create a strong password" required 
                   value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          <div className="form-group">
            <label className="form-label">Upload 1 Valid ID</label>
            <label className={`file-upload ${idFile ? 'has-file' : ''}`}>
              <UploadCloud className="file-upload-icon" size={32} />
              <span style={{ fontWeight: '500', marginBottom: '0.5rem' }}>
                {idFile ? idFile.name : 'Tap to upload ID'}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                PNG, JPG up to 5MB
              </span>
              <input type="file" accept="image/*" className="form-input" onChange={handleFileChange} />
            </label>
          </div>

          <button type="submit" className="btn btn-primary btn-block mt-4" disabled={loading}>
            <UserPlus size={20} />
            {loading ? "Registering..." : "Register Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
