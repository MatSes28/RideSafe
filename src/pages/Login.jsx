import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();

  const login = useAppStore((state) => state.login);

  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const email = `${phone.replace(/[^0-9]/g, '')}@ridesafe.com`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // Role comes from user_metadata
    const role = data.user?.user_metadata?.role;
    if (role === 'driver') {
      navigate('/driver-dash');
    } else {
      navigate('/customer-dash');
    }
  };

  return (
    <div className="p-4 animate-fade-in" style={{ paddingTop: '2rem' }}>
      <button className="btn btn-outline mb-4" onClick={() => navigate('/')} style={{ padding: '0.5rem 1rem' }}>
        <ArrowLeft size={18} /> Back
      </button>

      <div className="mb-4">
        <h2>Welcome Back</h2>
        <p>Sign in to continue riding or driving.</p>
        {errorMsg && <p className="text-danger mt-2">{errorMsg}</p>}
      </div>

      <div className="glass-card">
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input type="tel" className="form-input" placeholder="09XX XXX XXXX" required 
                   value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="••••••••" required 
                   value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <button type="submit" className="btn btn-primary btn-block mt-4" disabled={loading}>
            <LogIn size={20} />
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="mb-1" style={{ fontSize: '0.9rem' }}>New to RideSafe?</p>
          <div className="flex flex-col gap-2">
            <button className="btn btn-outline btn-block" onClick={() => navigate('/register-customer')}>
              Register as Customer
            </button>
            <button className="btn btn-outline btn-block" onClick={() => navigate('/register-driver')}>
              Register as Driver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
