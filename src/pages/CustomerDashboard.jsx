import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Search, MapPin, Navigation2, Clock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RoutingMachine from '../components/RoutingMachine';
import { useAppStore } from '../store/useAppStore';

// Fix for default leaflet icons not showing in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icon for user
const userIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149059.png', // Placeholder
  iconSize: [35, 35],
  className: 'leaflet-custom-icon-user'
});

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [position, setPosition] = useState([15.7909, 120.9859]); // San Jose City
  const [booking, setBooking] = useState(false);
  const [searching, setSearching] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  
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

  const handleBook = () => {
    setSearching(true);
    setTimeout(() => {
      setSearching(false);
      setBooking(true);
    }, 3000); // Simulate finding driver
  };

  return (
    <div className="app-container flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      
      {/* Top Search Bar */}
      <div className="p-4" style={{ position: 'absolute', top: 0, width: '100%', zIndex: 1000 }}>
          <div className="flex justify-between items-center w-full mb-2">
            {currentUser && <div className="text-primary text-sm font-bold flex items-center gap-1"><User size={16}/> Hi, Rider!</div>}
          </div>
          <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
          <Search className="text-muted" size={20} />
          <input 
            type="text" 
            placeholder="Where to? (e.g. Munoz Market)" 
            style={{ 
              background: 'transparent', border: 'none', color: 'var(--text-main)', 
              width: '100%', fontSize: '1.1rem', outline: 'none', fontWeight: 600
            }} 
          />
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
          
          {/* Simulated Real Map Routing */}
          {booking && (
             <RoutingMachine 
               start={position} 
               end={[15.7226, 120.9028]} 
               onRouteFound={(route) => setRouteInfo(route)} 
             />
          )}
        </MapContainer>
      </div>

      {/* Bottom Action Card */}
      <div className="glass-card" style={{ 
        position: 'absolute', bottom: 0, width: '100%', zIndex: 1000, 
        borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '2rem' 
      }}>
        {!searching && !booking && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <h3 className="mb-2">Ready to Ride?</h3>
            <div className="flex justify-between items-center bg-surface-color p-3 rounded" style={{ background: 'var(--surface-color)', borderRadius: '8px' }}>
               <div className="flex items-center gap-2">
                 <MapPin color="var(--primary)" />
                 <span>Current Location</span>
               </div>
               <span className="text-muted text-sm" style={{ fontSize: '0.8rem' }}>GPS Active</span>
            </div>
            
            <button className="btn btn-primary btn-block mt-2" onClick={handleBook} style={{ padding: '1rem', fontSize: '1.2rem' }}>
              Find a Driver
            </button>
          </div>
        )}

        {searching && (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            <h3>Searching nearby drivers...</h3>
            <p className="text-muted text-center" style={{ fontSize: '0.9rem' }}>Checking San Jose traffic & fast routes.</p>
          </div>
        )}

        {booking && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <h3>Driver Found!</h3>
            <div className="flex items-center gap-4 mb-2">
               <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--surface-color)' }} />
               <div>
                 <h4 className="mb-1">Kuya Juan (Motorcycle)</h4>
                 <p className="text-muted" style={{ fontSize: '0.9rem' }}>Plate: ABC 1234 • 4.9 ★</p>
               </div>
            </div>
            <div className="flex justify-between mt-2">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-primary" />
                <span style={{ fontSize: '0.9rem' }}>
                  {routeInfo ? Math.round(routeInfo.summary.totalTime / 60) + ' mins' : 'Calculating...'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Navigation2 size={18} className="text-secondary" />
                <span style={{ fontSize: '0.9rem' }}>
                  {routeInfo ? (routeInfo.summary.totalDistance / 1000).toFixed(1) + ' km' : 'Fastest Route'}
                </span>
              </div>
            </div>
            <button className="btn btn-outline btn-block mt-4" onClick={() => setBooking(false)} style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
              Cancel Ride
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
