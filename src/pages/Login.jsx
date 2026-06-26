import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function Login() {
  const navigate = useNavigate();

  const login = useAppStore((state) => state.login);

  const handleLogin = (e, role) => {
    e.preventDefault();
    login({ phone: 'user-logged-in' }, role);
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
      </div>

      <div className="glass-card">
        <form>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input type="tel" className="form-input" placeholder="+63 9XX XXX XXXX" required />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="••••••••" required />
          </div>

          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.8rem' }} onClick={(e) => handleLogin(e, 'customer')}>
              Login as Customer
            </button>
            <button type="submit" className="btn btn-outline" style={{ flex: 1, padding: '0.8rem' }} onClick={(e) => handleLogin(e, 'driver')}>
              Login as Driver
            </button>
          </div>
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
