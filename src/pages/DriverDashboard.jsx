import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Power, MapPin, AlertCircle, Navigation, User, Wallet, History, X } from 'lucide-react';
import RoutingMachine from '../components/RoutingMachine';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';
import { Geolocation } from '@capacitor/geolocation';

// Fix for default leaflet icons not showing in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function DriverDashboard() {
  const [position, setPosition] = useState([15.7909, 120.9859]); // San Jose City
  const [online, setOnline] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const currentUser = useAppStore(state => state.currentUser);
  const walletBalance = useAppStore(state => state.walletBalance);
  const isApproved = useAppStore(state => state.isApproved);
  const [channel, setChannel] = useState(null);
  const [currentRequest, setCurrentRequest] = useState(null);
  
  const [showHistory, setShowHistory] = useState(false);
  const [rideHistory, setRideHistory] = useState([]);
  const [todaysEarnings, setTodaysEarnings] = useState(0);

  const fetchHistory = async () => {
    if (currentUser) {
      const { data } = await supabase.from('rides').select('*').eq('driver_id', currentUser.id).order('created_at', { ascending: false });
      setRideHistory(data || []);
      
      // Calculate today's earnings
      const today = new Date().setHours(0,0,0,0);
      const earnings = (data || []).filter(ride => new Date(ride.created_at).getTime() >= today)
                                    .reduce((sum, ride) => sum + ride.fare, 0);
      setTodaysEarnings(earnings);
      
      setShowHistory(true);
    }
  };

  useEffect(() => {
    // Initial fetch for earnings
    if (currentUser) {
      supabase.from('rides').select('fare, created_at').eq('driver_id', currentUser.id).then(({ data }) => {
        const today = new Date().setHours(0,0,0,0);
        const earnings = (data || []).filter(ride => new Date(ride.created_at).getTime() >= today)
                                      .reduce((sum, ride) => sum + ride.fare, 0);
        setTodaysEarnings(earnings);
      });
    }
  }, [currentUser]);

  // Native mobile GPS update
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const coordinates = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        setPosition([coordinates.coords.latitude, coordinates.coords.longitude]);
      } catch (e) {
        console.error('GPS Error:', e);
      }
    };
    fetchLocation();
  }, []);

  useEffect(() => {
    const ridesChannel = supabase.channel('rides', {
      config: { broadcast: { self: true } }
    });

    ridesChannel.on('broadcast', { event: 'ride_request' }, (payload) => {
      // Show incoming request if online and not busy
      if (online && !accepted) {
        setIncomingRequest(true);
        setCurrentRequest(payload.payload); // contains customerId, customerName, etc.
      }
    }).subscribe();

    setChannel(ridesChannel);

    return () => supabase.removeChannel(ridesChannel);
  }, [online, accepted]);

  const handleAccept = () => {
    setIncomingRequest(false);
    setAccepted(true);
    
    // Broadcast back to the customer
    if (channel && currentRequest) {
      channel.send({
        type: 'broadcast',
        event: 'ride_accepted',
        payload: {
          driverId: currentUser?.id,
          driverName: currentUser?.user_metadata?.full_name || 'Driver',
          customerId: currentRequest.customerId
        }
      });
    }
  };

  const handleComplete = async () => {
    if (currentRequest) {
      const fareAmount = currentRequest.fare;
      
      // 1. Insert Ride
      await supabase.from('rides').insert({
        customer_id: currentRequest.customerId,
        driver_id: currentUser?.id,
        pickup: "San Jose",
        dropoff: "Munoz",
        fare: fareAmount,
        status: 'completed'
      });

      // 2. Fetch Customer Profile & Deduct
      const { data: custData } = await supabase.from('profiles').select('wallet_balance').eq('id', currentRequest.customerId).single();
      if (custData) {
        await supabase.from('profiles').update({ wallet_balance: custData.wallet_balance - fareAmount }).eq('id', currentRequest.customerId);
      }

      // 3. Fetch Driver Profile & Add
      const { data: drivData } = await supabase.from('profiles').select('wallet_balance').eq('id', currentUser.id).single();
      if (drivData) {
        await supabase.from('profiles').update({ wallet_balance: drivData.wallet_balance + fareAmount }).eq('id', currentUser.id);
      }

      // Reload earnings
      setTodaysEarnings(prev => prev + fareAmount);
      
      // Update local wallet balance state indirectly or just refresh
      useAppStore.getState().initialize(); 
    }
    setAccepted(false);
    setIncomingRequest(false);
    setCurrentRequest(null);
  };

  return (
    <div className="app-container flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      
      {/* Top Status Bar */}
      <div className="p-4" style={{ position: 'absolute', top: 0, width: '100%', zIndex: 1000 }}>
        <div className="flex justify-between items-center w-full mb-2 px-2 pt-2">
            {currentUser && <div className="text-primary text-sm font-bold flex items-center gap-1"><User size={16}/> Hi, Driver!</div>}
            <div className="flex items-center gap-4">
              <div className="text-secondary text-sm font-bold flex items-center gap-1 cursor-pointer" onClick={fetchHistory}><History size={16}/> History</div>
              <div className="text-secondary text-sm font-bold flex items-center gap-1"><Wallet size={16}/> ₱ {walletBalance.toFixed(2)}</div>
            </div>
        </div>
        {/* Verification Banner */}
        {!isApproved && (
          <div className="bg-danger text-white p-2 text-center text-sm font-bold" style={{ width: '100%', left: 0 }}>
            Verification Pending. You cannot go online yet.
          </div>
        )}

        <div className="glass-card flex justify-between items-center mt-2" style={{ padding: '1rem' }}>
          <div>
            <h4 style={{ margin: 0 }}>₱ {todaysEarnings.toFixed(2)}</h4>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>Today's Earnings</span>
          </div>
          <button 
            className="btn" 
            disabled={!isApproved}
            style={{ 
              background: online ? 'var(--danger)' : (isApproved ? 'var(--primary)' : 'var(--border)'), 
              color: online ? '#fff' : (isApproved ? '#000' : '#888'),
              padding: '0.5rem 1rem'
            }}
            onClick={() => setOnline(!online)}
          >
            <Power size={18} />
            {online ? 'GO OFFLINE' : 'GO ONLINE'}
          </button>
        </div>
      </div>

      {/* Full Screen Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          <Marker position={position}>
            <Popup>You are here</Popup>
          </Marker>

          {/* Draw actual route if accepted */}
          {accepted && (
             <RoutingMachine 
               start={position} 
               end={[15.7226, 120.9028]} 
             />
          )}

          {/* Traffic Checkpoint Demo */}
          {online && (
             <Marker position={[15.7800, 120.9800]} icon={new L.Icon({
                iconUrl: 'https://cdn-icons-png.flaticon.com/512/1201/1201509.png',
                iconSize: [25, 25]
             })}>
                <Popup>Heavy Traffic / Checkpoint</Popup>
             </Marker>
          )}
        </MapContainer>
      </div>

      {/* Incoming Request Modal */}
      {incomingRequest && (
        <div style={{
          position: 'absolute', bottom: '20px', left: '20px', right: '20px', zIndex: 2000
        }} className="glass-card animate-fade-in">
          <div className="flex items-center gap-2 mb-4 text-primary">
            <AlertCircle />
            <h3 style={{ margin: 0 }}>New Ride Request</h3>
          </div>
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-secondary" />
              <span>Pickup: {currentRequest?.customerName || 'Customer'} (Current Location)</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-danger" />
              <span>Dropoff: Munoz Market</span>
            </div>
            <p className="text-muted mt-2" style={{ fontSize: '0.9rem' }}>Estimated Fare: ₱ {currentRequest?.fare?.toFixed(2)}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setIncomingRequest(false); setCurrentRequest(null); }}>Decline</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAccept}>Accept</button>
          </div>
        </div>
      )}

      {/* Active Ride Bar */}
      {accepted && (
        <div style={{
          position: 'absolute', bottom: '20px', left: '20px', right: '20px', zIndex: 1000
        }} className="glass-card animate-fade-in">
          <h3 className="mb-2 text-secondary">Navigating to Pickup</h3>
          <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>Avoiding checkpoint traffic...</p>
          
          <button className="btn btn-primary btn-block mb-2" style={{ background: 'var(--secondary)' }}>
            <Navigation size={18} /> Open in Maps
          </button>
          
          <button className="btn btn-outline btn-block text-primary" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }} onClick={handleComplete}>
            Complete Ride
          </button>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}>
          <div className="glass-card animate-slide-up w-full" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '2rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
              <h3>Ride History</h3>
              <X className="cursor-pointer" onClick={() => setShowHistory(false)} />
            </div>
            {rideHistory.length === 0 ? (
              <p className="text-muted text-center">No past rides found.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {rideHistory.map(ride => (
                  <div key={ride.id} className="p-3 bg-surface-light rounded" style={{ background: 'var(--surface-light)', borderRadius: '8px' }}>
                    <div className="flex justify-between">
                      <strong>{new Date(ride.created_at).toLocaleDateString()}</strong>
                      <span className="text-primary font-bold">₱ {ride.fare}</span>
                    </div>
                    <div className="text-sm mt-1 text-muted">
                      <div><MapPin size={12} className="inline mr-1"/> {ride.pickup}</div>
                      <div><MapPin size={12} className="inline mr-1 text-danger"/> {ride.dropoff}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
