import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Users, Activity, DollarSign, Map as MapIcon, ClipboardCheck } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

export default function AdminDashboard() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""
  });
  
  const [activeTab, setActiveTab] = useState('approvals'); // approvals, analytics, map
  const [drivers, setDrivers] = useState([]);
  
  // Analytics
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalRides, setTotalRides] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  // Live Map
  const [liveDrivers, setLiveDrivers] = useState({});

  useEffect(() => {
    fetchDrivers();
    fetchAnalytics();

    // Listen to live driver locations
    const ridesChannel = supabase.channel('rides', { config: { broadcast: { self: true } } });
    ridesChannel.on('broadcast', { event: 'driver_location_update' }, (payload) => {
      setLiveDrivers(prev => ({
        ...prev,
        [payload.payload.rideId]: payload.payload.position
      }));
    }).subscribe();

    return () => supabase.removeChannel(ridesChannel);
  }, []);

  const fetchDrivers = async () => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'driver')
      .eq('is_approved', false);
    setDrivers(profileData || []);
  };

  const fetchAnalytics = async () => {
    const { data: profiles } = await supabase.from('profiles').select('id');
    setTotalUsers(profiles?.length || 0);

    const { data: rides } = await supabase.from('rides').select('fare').eq('status', 'completed');
    if (rides) {
      setTotalRides(rides.length);
      const revenue = rides.reduce((sum, ride) => sum + ride.fare, 0);
      setTotalRevenue(revenue);
    }
  };

  const handleApprove = async (id) => {
    await supabase.from('profiles').update({ is_approved: true }).eq('id', id);
    fetchDrivers();
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="p-4" style={{ background: 'var(--surface-color)', borderBottom: '1px solid var(--border)' }}>
        <h2 className="m-0 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
          <Activity size={24} /> Admin God Mode
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-4 gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <button 
          className={`flex items-center gap-2 pb-2 ${activeTab === 'approvals' ? 'border-b-2' : 'text-muted'}`}
          style={{ borderColor: activeTab === 'approvals' ? 'var(--primary)' : 'transparent', color: activeTab === 'approvals' ? 'var(--text-main)' : 'var(--text-muted)', background: 'transparent' }}
          onClick={() => setActiveTab('approvals')}
        >
          <ClipboardCheck size={18} /> Approvals
        </button>
        <button 
          className={`flex items-center gap-2 pb-2 ${activeTab === 'analytics' ? 'border-b-2' : 'text-muted'}`}
          style={{ borderColor: activeTab === 'analytics' ? 'var(--primary)' : 'transparent', color: activeTab === 'analytics' ? 'var(--text-main)' : 'var(--text-muted)', background: 'transparent' }}
          onClick={() => setActiveTab('analytics')}
        >
          <DollarSign size={18} /> Analytics
        </button>
        <button 
          className={`flex items-center gap-2 pb-2 ${activeTab === 'map' ? 'border-b-2' : 'text-muted'}`}
          style={{ borderColor: activeTab === 'map' ? 'var(--primary)' : 'transparent', color: activeTab === 'map' ? 'var(--text-main)' : 'var(--text-muted)', background: 'transparent' }}
          onClick={() => setActiveTab('map')}
        >
          <MapIcon size={18} /> Live Map
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 relative">
        
        {activeTab === 'approvals' && (
          <div className="animate-fade-in">
            {drivers.length === 0 ? (
              <div className="glass-card text-center p-4">No pending applications.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {drivers.map(driver => (
                  <div key={driver.id} className="glass-card flex flex-col p-4 mb-4">
                    <div className="flex justify-between items-center mb-4">
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
                    
                    {/* Document Display */}
                    <div className="flex gap-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex-1">
                        <p className="text-sm font-bold mb-2">Driver's License</p>
                        {driver.license_url ? (
                          <a href={driver.license_url} target="_blank" rel="noreferrer">
                            <img src={driver.license_url} alt="License" className="w-full h-32 object-cover rounded-lg border border-gray-600" />
                          </a>
                        ) : (
                          <div className="w-full h-32 bg-gray-800 rounded-lg flex items-center justify-center text-muted">No License</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold mb-2">Valid ID / ORCR</p>
                        {driver.vehicle_registration_url ? (
                          <a href={driver.vehicle_registration_url} target="_blank" rel="noreferrer">
                            <img src={driver.vehicle_registration_url} alt="ID/ORCR" className="w-full h-32 object-cover rounded-lg border border-gray-600" />
                          </a>
                        ) : (
                          <div className="w-full h-32 bg-gray-800 rounded-lg flex items-center justify-center text-muted">No ID/ORCR</div>
                        )}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-fade-in flex flex-col gap-4">
            <div className="glass-card p-6 flex flex-col items-center justify-center">
              <DollarSign size={48} className="text-secondary mb-2" />
              <h2 className="m-0" style={{ fontSize: '2.5rem' }}>₱ {totalRevenue.toFixed(2)}</h2>
              <p className="text-muted">Total Gross Revenue</p>
            </div>
            <div className="flex gap-4">
              <div className="glass-card flex-1 p-4 flex flex-col items-center">
                <Activity size={24} className="text-primary mb-2" />
                <h3 className="m-0">{totalRides}</h3>
                <p className="text-muted text-sm text-center">Completed Rides</p>
              </div>
              <div className="glass-card flex-1 p-4 flex flex-col items-center">
                <Users size={24} className="text-primary mb-2" />
                <h3 className="m-0">{totalUsers}</h3>
                <p className="text-muted text-sm text-center">Registered Users</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="absolute inset-0 animate-fade-in">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={{ height: '100%', width: '100%' }}
                center={{ lat: 15.7909, lng: 120.9859 }}
                zoom={13}
                options={{ disableDefaultUI: true }}
              >
                {Object.keys(liveDrivers).map(rideId => (
                  <Marker 
                    key={rideId} 
                    position={{ lat: liveDrivers[rideId][0], lng: liveDrivers[rideId][1] }} 
                    icon={{ url: 'https://cdn-icons-png.flaticon.com/512/1048/1048314.png', scaledSize: new window.google.maps.Size(35, 35) }}
                  />
                ))}
              </GoogleMap>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">Loading Map...</div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
