import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Package, Navigation2, Clock, CheckCircle } from 'lucide-react';
import L from 'leaflet';

// Leaflet setup
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

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16, { animate: true, duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

export default function TrackingPage() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const [driverPosition, setDriverPosition] = useState(null);
  const [status, setStatus] = useState('Tracking package delivery...');
  
  useEffect(() => {
    // Simulated initial position based on random Metro Manila coords
    setDriverPosition([14.654, 121.031]);

    // Subscribe to driver location updates using Supabase realtime
    const channel = supabase.channel('rides', { config: { broadcast: { self: true } } });
    
    channel.on('broadcast', { event: 'driver_location_update' }, (payload) => {
       if (payload.payload.rideId === rideId) {
          setDriverPosition(payload.payload.position);
          setStatus('Driver is on the way to the dropoff location.');
       }
    }).subscribe();

    return () => {
       supabase.removeChannel(channel);
    };
  }, [rideId]);

  return (
    <div className="flex flex-col h-screen bg-surface-light relative">
      {/* Header */}
      <div className="bg-primary text-white p-4 shadow-md z-20 flex justify-between items-center relative" style={{ borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-center gap-2">
           <Package size={24} />
           <h2 className="m-0 text-white text-lg">RideSafe Tracking</h2>
        </div>
        <div className="text-xs opacity-80">ID: {rideId?.substring(0,8)}</div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative z-10">
        <MapContainer center={[14.654, 121.031]} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          {driverPosition && (
            <>
              <Marker position={driverPosition} icon={driverIcon}>
                <Popup>Driver is here</Popup>
              </Marker>
              <MapUpdater center={driverPosition} />
            </>
          )}
        </MapContainer>
      </div>

      {/* Status Bar */}
      <div className="bg-surface-color p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20" style={{ borderRadius: '24px 24px 0 0' }}>
         <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary">
               <Navigation2 size={24} />
            </div>
            <div>
               <h3 className="m-0 text-main">{status}</h3>
               <div className="text-sm text-muted mt-1 flex items-center gap-1">
                  <Clock size={14} /> Estimated arrival: <span className="text-primary font-bold">12 mins</span>
               </div>
            </div>
         </div>
         
         <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center gap-3 mb-4">
            <img src="https://ui-avatars.com/api/?name=Kuya+Rey&background=0ea5e9&color=fff" className="w-10 h-10 rounded-full" alt="Driver" />
            <div className="flex-1">
               <div className="font-bold text-main text-sm">Kuya Rey</div>
               <div className="text-xs text-muted">RideSafe Express Driver</div>
            </div>
            <div className="text-xs font-bold bg-white px-2 py-1 rounded text-primary">Moto: ABC 1234</div>
         </div>
         
         <button className="btn btn-outline btn-block text-sm py-3" onClick={() => navigate('/')}>
            Download RideSafe App
         </button>
      </div>
    </div>
  );
}
