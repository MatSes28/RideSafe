import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    const role = data.user?.user_metadata?.role;
    if (role === 'admin') {
      navigate('/admin');
    } else if (role === 'operator') {
      navigate('/operator');
    } else {
      // If a regular user tries to log in here, kick them out
      supabase.auth.signOut();
      setErrorMsg('Unauthorized access. This portal is for administrative personnel only.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="flex justify-center mb-6 text-primary">
           <Shield size={48} />
        </div>
        <h2 className="text-center text-2xl font-bold mb-2">Secure Portal</h2>
        <p className="text-center text-gray-400 mb-6 text-sm">RideSafe Administration & Operations</p>
        
        {errorMsg && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">{errorMsg}</div>}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Corporate Email</label>
            <input type="email" className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-primary outline-none" placeholder="admin@ridesafe.com" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Password</label>
            <input type="password" className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-primary outline-none" placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <button type="submit" className="btn btn-primary w-full py-3 mt-4 flex items-center justify-center gap-2 font-bold" disabled={loading}>
            {loading ? "Authenticating..." : "Login to Portal"} <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-8 text-center">
           <button className="text-gray-500 text-xs hover:text-white" onClick={() => navigate('/')}>Return to Main Site</button>
        </div>
      </div>
    </div>
  );
}
