import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Power, MapPin, AlertCircle, Navigation, User } from 'lucide-react';
import RoutingMachine from '../components/RoutingMachine';
import { useAppStore } from '../store/useAppStore';

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

  // Simulate real-time GPS update
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.log(err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Simulate incoming ride request when online
  useEffect(() => {
    let timer;
    if (online && !accepted) {
      timer = setTimeout(() => {
        setIncomingRequest(true);
      }, 5000); // 5 seconds after going online
    } else {
      setIncomingRequest(false);
    }
    return () => clearTimeout(timer);
  }, [online, accepted]);

  const handleAccept = () => {
    setIncomingRequest(false);
    setAccepted(true);
  };

  const handleComplete = () => {
    setAccepted(false);
    setIncomingRequest(false);
  };

  return (
    <div className="app-container flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      
      {/* Top Status Bar */}
      <div className="p-4" style={{ position: 'absolute', top: 0, width: '100%', zIndex: 1000 }}>
        <div className="flex justify-between items-center w-full mb-2 px-2 pt-2">
            {currentUser && <div className="text-primary text-sm font-bold flex items-center gap-1"><User size={16}/> Hi, Driver!</div>}
        </div>
        <div className="glass-card flex justify-between items-center" style={{ padding: '1rem' }}>
          <div>
            <h4 style={{ margin: 0 }}>₱ 1,450.00</h4>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>Today's Earnings</span>
          </div>
          <button 
            className="btn" 
            style={{ 
              background: online ? 'var(--danger)' : 'var(--primary)', 
              color: online ? '#fff' : '#000',
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
              <span>Pickup: San Jose Public Market</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-danger" />
              <span>Dropoff: CLSU Main Gate, Munoz</span>
            </div>
            <p className="text-muted mt-2" style={{ fontSize: '0.9rem' }}>Estimated Fare: ₱ 120.00</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIncomingRequest(false)}>Decline</button>
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
    </div>
  );
}
