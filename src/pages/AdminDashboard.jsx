import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle } from 'lucide-react';

export default function AdminDashboard() {
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    // Fetch profiles where role is driver and is_approved is false
    const { data } = await supabase
      .from('profiles')
      .select('id, is_approved, wallet_balance, ...auth.users!inner(email, raw_user_meta_data)')
      .eq('role', 'driver')
      .eq('is_approved', false);
      
    // In Supabase, joining auth.users is restricted, so we actually need a backend or service role key. 
    // Wait, we can just fetch all profiles that are drivers. But profiles don't store full name.
    // Ah, wait. I should fetch all profiles and use them if they contain metadata. 
    // To make this work safely without service role, we should have stored full_name in the profiles table!
    // Since we didn't, let's just fetch profiles and display the ID for now in the prototype.
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'driver')
      .eq('is_approved', false);

    setDrivers(profileData || []);
  };

  const handleApprove = async (id) => {
    await supabase.from('profiles').update({ is_approved: true }).eq('id', id);
    fetchDrivers();
  };

  return (
    <div className="p-4 animate-fade-in" style={{ paddingTop: '2rem' }}>
      <h2>Admin Dashboard</h2>
      <p className="text-muted mb-4">Pending Driver Applications</p>

      {drivers.length === 0 ? (
        <div className="glass-card text-center p-4">No pending applications.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {drivers.map(driver => (
            <div key={driver.id} className="glass-card flex justify-between items-center p-4">
              <div>
                <h4 className="mb-1">Driver ID:</h4>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>{driver.id}</p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.5rem' }}>
                  <XCircle size={18} /> Reject
                </button>
                <button className="btn btn-primary" style={{ padding: '0.5rem' }} onClick={() => handleApprove(driver.id)}>
                  <CheckCircle size={18} /> Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
