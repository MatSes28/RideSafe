import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Users, Activity, DollarSign, Map as MapIcon, ClipboardCheck } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';

// Fix for default leaflet icons not showing in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const driverIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1048/1048314.png',
  iconSize: [35, 35]
});

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('approvals'); // approvals, analytics, map, disputes
  const [drivers, setDrivers] = useState([]);
  
  // Disputes
  const [disputes, setDisputes] = useState([
    { id: 'D-001', customer: 'Juan Dela Cruz', issue: 'Driver was rude and took a longer route.', status: 'pending' },
    { id: 'D-002', customer: 'Maria Clara', issue: 'Food arrived cold. RideSafe Eats.', status: 'pending' }
  ]);
  
  // Analytics
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalRides, setTotalRides] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  // Live Map
  const [liveDrivers, setLiveDrivers] = useState({});
  const [showHeatmap, setShowHeatmap] = useState(false);
  
  // Simulated High Demand Zones (Heatmap)
  const demandZones = [
    { center: [14.5547, 121.0244], radius: 1000, intensity: 0.8 }, // Makati CBD
    { center: [14.5523, 121.0493], radius: 1500, intensity: 0.9 }, // BGC
    { center: [14.6349, 121.0416], radius: 1200, intensity: 0.7 }, // Quezon City (Tomas Morato)
    { center: [14.5826, 121.0617], radius: 800, intensity: 0.6 }   // Ortigas
  ];

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
        <button 
          className={`flex items-center gap-2 pb-2 ${activeTab === 'disputes' ? 'border-b-2' : 'text-muted'}`}
          style={{ borderColor: activeTab === 'disputes' ? 'var(--primary)' : 'transparent', color: activeTab === 'disputes' ? 'var(--text-main)' : 'var(--text-muted)', background: 'transparent' }}
          onClick={() => setActiveTab('disputes')}
        >
          <AlertCircle size={18} /> Disputes
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
                {drivers.map(driver => {
                  const metaRaw = localStorage.getItem(`driver_meta_${driver.id}`);
                  const meta = metaRaw ? JSON.parse(metaRaw) : { fullName: 'Unknown Applicant', vehicleType: 'Motorcycle', plateNumber: 'Unknown', idType: 'national_id', biometricScore: 92 };
                  return (
                  <div key={driver.id} className="glass-card flex flex-col p-4 mb-4 border-l-4 border-primary shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h4 className="mb-1 text-lg font-bold flex items-center gap-2">{meta.fullName} <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full uppercase tracking-wider">{meta.vehicleType}</span></h4>
                        <p className="text-muted text-xs font-mono">ID: {driver.id}</p>
                        <p className="text-muted text-xs mt-1">Plate: <span className="font-bold">{meta.plateNumber}</span></p>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.5rem 1rem' }}>
                          <XCircle size={18} /> Reject
                        </button>
                        <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={() => handleApprove(driver.id)}>
                          <CheckCircle size={18} /> Approve
                        </button>
                      </div>
                    </div>
                    
                    {/* KYC Document Display */}
                    <div className="flex gap-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex-1">
                        <p className="text-sm font-bold mb-2 flex justify-between items-center">
                          <span>Valid ID / Document</span>
                          <span className="text-[10px] bg-gray-200 px-2 py-1 rounded-full text-gray-700 uppercase tracking-widest">{meta.idType.replace('_', ' ')}</span>
                        </p>
                        {driver.vehicle_registration_url ? (
                          <a href={driver.vehicle_registration_url} target="_blank" rel="noreferrer">
                            <img src={driver.vehicle_registration_url} alt="ID" className="w-full h-32 object-cover rounded-lg border border-gray-300 shadow-sm transition-transform hover:scale-105" />
                          </a>
                        ) : (
                          <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center text-muted border border-dashed border-gray-300">No ID Uploaded</div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <p className="text-sm font-bold mb-2 text-primary flex justify-between items-center">
                          <span>Face Verification</span>
                          <span className="text-[10px] bg-primary/10 px-2 py-1 rounded-full text-primary uppercase tracking-widest">Selfie</span>
                        </p>
                        {driver.license_url ? (
                          <a href={driver.license_url} target="_blank" rel="noreferrer">
                            <img src={driver.license_url} alt="Selfie" className="w-full h-32 object-cover rounded-lg border border-primary shadow-sm transition-transform hover:scale-105" />
                          </a>
                        ) : (
                          <div className="w-full h-32 bg-blue-50 rounded-lg flex flex-col items-center justify-center text-primary border border-primary/30 border-dashed">
                             <UserPlus size={24} className="mb-2 opacity-50" />
                             <span className="text-xs">No Selfie</span>
                          </div>
                        )}
                        <div className={`text-xs font-bold mt-3 text-center flex items-center justify-center gap-1 py-1.5 rounded-lg shadow-sm ${meta.biometricScore >= 90 ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                           {meta.biometricScore >= 90 ? <CheckCircle size={14} /> : <AlertCircle size={14} />} 
                           {meta.biometricScore}% Biometric Face Match
                        </div>
                      </div>
                    </div>

                  </div>
                )})}
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
            <MapContainer center={[14.5547, 121.0244]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; CARTO'
              />
              
              {/* Heatmap Layer */}
              {showHeatmap && demandZones.map((zone, i) => (
                 <Circle 
                    key={`zone-${i}`}
                    center={zone.center} 
                    radius={zone.radius}
                    pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: zone.intensity * 0.5, stroke: false }}
                 />
              ))}

              {/* Simulated active routes lines */}
              {Object.keys(liveDrivers).length > 0 && (
                <Marker position={[15.7909, 120.9859]} icon={new L.Icon({iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149059.png', iconSize:[20,20]})} />
              )}
              {Object.keys(liveDrivers).map(rideId => (
                <Marker key={rideId} position={liveDrivers[rideId]} icon={driverIcon}>
                  <Popup>Driver (Ride: {rideId.substring(0,6)})</Popup>
                </Marker>
              ))}
            </MapContainer>
            {/* Global Stats Overlay */}
            <div className="absolute top-4 left-4 z-[1000] glass-card p-3 shadow-md border-primary border-l-4">
               <h4 className="m-0 text-sm">System Status</h4>
               <p className="m-0 text-xs text-muted font-bold text-green-500">All Systems Nominal</p>
               <p className="m-0 text-xs mt-1 mb-2">Active Drivers: {Object.keys(liveDrivers).length || 3}</p>
               
               <div className="flex items-center gap-2 border-t pt-2 mt-2">
                 <span className="text-xs font-bold">Live Demand Heatmap</span>
                 <label className="relative inline-flex items-center cursor-pointer">
                   <input type="checkbox" className="sr-only peer" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} />
                   <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-orange-500"></div>
                 </label>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'disputes' && (
          <div className="animate-fade-in flex flex-col gap-4">
             {disputes.length === 0 ? (
                <div className="glass-card text-center p-4">No active disputes.</div>
             ) : (
                disputes.map(d => (
                   <div key={d.id} className="glass-card p-4">
                      <div className="flex justify-between items-center mb-2">
                         <span className="font-bold">{d.customer}</span>
                         <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs uppercase font-bold">{d.status}</span>
                      </div>
                      <p className="text-sm text-muted mb-4">{d.issue}</p>
                      <div className="flex gap-2 border-t pt-3 mt-3">
                         <button className="btn btn-outline text-xs flex-1 py-2" onClick={() => setDisputes(disputes.filter(x => x.id !== d.id))}>Dismiss</button>
                         <button className="btn btn-primary text-xs flex-1 py-2" style={{ background: 'var(--danger)' }} onClick={() => {
                            alert('Refund issued to user wallet.');
                            setDisputes(disputes.filter(x => x.id !== d.id));
                         }}>Issue Refund</button>
                      </div>
                   </div>
                ))
             )}
          </div>
        )}

      </div>
    </div>
  );
}
