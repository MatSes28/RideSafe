import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';
import { Power, MapPin, AlertCircle, Navigation, User, Wallet, History, X, MessageSquare } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';

export default function DriverDashboard() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""
  });

  const [position, setPosition] = useState([15.7909, 120.9859]); // San Jose City
  const [online, setOnline] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);

  const directionsCallback = useCallback((res) => {
    if (res !== null) {
      if (res.status === 'OK') {
        setRouteInfo(res);
      }
    }
  }, []);
  const currentUser = useAppStore(state => state.currentUser);
  const walletBalance = useAppStore(state => state.walletBalance);
  const isApproved = useAppStore(state => state.isApproved);
  const [channel, setChannel] = useState(null);
  const [currentRequest, setCurrentRequest] = useState(null);
  
  const [showProfile, setShowProfile] = useState(false);
  const [homeAddress, setHomeAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');

  // Load profile addresses
  useEffect(() => {
    if (currentUser) {
      supabase.from('profiles').select('home_address, work_address').eq('id', currentUser.id).single().then(({data}) => {
        if (data) {
          setHomeAddress(data.home_address || '');
          setWorkAddress(data.work_address || '');
        }
      });
    }
  }, [currentUser]);

  const saveProfile = async () => {
    if (currentUser) {
      await supabase.from('profiles').update({ home_address: homeAddress, work_address: workAddress }).eq('id', currentUser.id);
      setShowProfile(false);
    }
  };
  
  const [showHistory, setShowHistory] = useState(false);
  const [rideHistory, setRideHistory] = useState([]);
  const [todaysEarnings, setTodaysEarnings] = useState(0);

  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeRideId, setActiveRideId] = useState(null);

  useEffect(() => {
    if (activeRideId) {
      supabase.from('messages').select('*').eq('ride_id', activeRideId).order('created_at', {ascending: true}).then(({data}) => {
        if (data) setChatMessages(data);
      });
      const chatSub = supabase.channel(`chat_${activeRideId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `ride_id=eq.${activeRideId}` }, (payload) => {
           setChatMessages(prev => [...prev, payload.new]);
        }).subscribe();
      return () => supabase.removeChannel(chatSub);
    }
  }, [activeRideId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeRideId) return;
    await supabase.from('messages').insert({
      ride_id: activeRideId,
      sender_id: currentUser.id,
      text: newMessage
    });
    setNewMessage('');
  };

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
    LocalNotifications.requestPermissions();
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

  // Live Driver Tracking Loop
  useEffect(() => {
    let interval;
    if (accepted && channel && activeRideId) {
      interval = setInterval(async () => {
        try {
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
          const newPos = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPos);
          channel.send({
            type: 'broadcast',
            event: 'driver_location_update',
            payload: {
              rideId: activeRideId,
              position: newPos
            }
          });
        } catch (e) {
          console.error(e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [accepted, channel, activeRideId]);

  useEffect(() => {
    const ridesChannel = supabase.channel('rides', {
      config: { broadcast: { self: true } }
    });

    ridesChannel.on('broadcast', { event: 'ride_request' }, (payload) => {
      // Show incoming request if online and not busy
      if (online && !accepted) {
        setIncomingRequest(true);
        setCurrentRequest(payload.payload); // contains customerId, customerName, etc.
        LocalNotifications.schedule({
          notifications: [{
            title: "New Ride Request!",
            body: `Pickup: ${payload.payload.customerName}`,
            id: new Date().getTime()
          }]
        });
      }
    }).subscribe();

    setChannel(ridesChannel);

    return () => supabase.removeChannel(ridesChannel);
  }, [online, accepted]);

  const handleAccept = async () => {
    setIncomingRequest(false);
    setAccepted(true);
    
    if (currentRequest) {
      // 1. Insert Ride as active to get the ID
      const { data } = await supabase.from('rides').insert({
        customer_id: currentRequest.customerId,
        driver_id: currentUser?.id,
        pickup: "San Jose",
        dropoff: "Munoz",
        fare: currentRequest.fare,
        status: 'active'
      }).select('id').single();
      
      let newRideId = null;
      if (data) {
        newRideId = data.id;
        setActiveRideId(newRideId);
      }
      
      // Broadcast back to the customer
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'ride_accepted',
          payload: {
            driverId: currentUser?.id,
            driverName: currentUser?.user_metadata?.full_name || 'Driver',
            customerId: currentRequest.customerId,
            rideId: newRideId
          }
        });
      }
    }
  };

  const handleComplete = async () => {
    if (currentRequest && activeRideId) {
      const fareAmount = currentRequest.fare;
      
      // 1. Update Ride status to completed
      await supabase.from('rides').update({ status: 'completed' }).eq('id', activeRideId);

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
      useAppStore.getState().initialize(); 

      // Broadcast ride completed
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'ride_completed',
          payload: {
            customerId: currentRequest.customerId,
            rideId: activeRideId
          }
        });
      }
    }
    setAccepted(false);
    setIncomingRequest(false);
    setCurrentRequest(null);
    setActiveRideId(null);
  };

  return (
    <div className="app-container flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      
      {/* Top Status Bar */}
      <div className="p-4" style={{ position: 'absolute', top: 0, width: '100%', zIndex: 1000 }}>
        <div className="flex justify-between items-center w-full mb-2 px-2 pt-2">
            {currentUser && <div className="text-primary text-sm font-bold flex items-center gap-1 cursor-pointer" onClick={() => setShowProfile(true)}><User size={16}/> Hi, Driver!</div>}
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
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ height: '100%', width: '100%' }}
            center={{ lat: position[0], lng: position[1] }}
            zoom={14}
            options={{ disableDefaultUI: true }}
          >
            <Marker position={{ lat: position[0], lng: position[1] }} />

            {/* Draw actual route if accepted */}
            {accepted && !routeInfo && (
              <DirectionsService
                options={{
                  destination: { lat: 15.7226, lng: 120.9028 }, // Munoz
                  origin: { lat: position[0], lng: position[1] },
                  travelMode: 'DRIVING'
                }}
                callback={directionsCallback}
              />
            )}

            {routeInfo && (
              <DirectionsRenderer
                options={{ directions: routeInfo }}
              />
            )}

            {/* Traffic Checkpoint Demo */}
            {online && (
               <Marker 
                 position={{ lat: 15.7800, lng: 120.9800 }} 
                 icon={{ url: 'https://cdn-icons-png.flaticon.com/512/1201/1201509.png', scaledSize: new window.google.maps.Size(25, 25) }}
               />
            )}
          </GoogleMap>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
            <div className="loading-spinner"></div>
          </div>
        )}
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
          
          <div className="flex gap-2 mb-2">
            <button className="btn btn-primary flex-1" style={{ background: 'var(--secondary)' }}>
              <Navigation size={18} /> Maps
            </button>
            <button className="btn btn-outline flex-1" onClick={() => setShowChat(true)} style={{ color: 'var(--secondary)', borderColor: 'var(--secondary)' }}>
              <MessageSquare size={18} /> Chat
            </button>
          </div>
          
          <button className="btn btn-outline btn-block text-primary" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }} onClick={handleComplete}>
            Complete Ride
          </button>
        </div>
      )}

      {/* Chat Modal */}
      {showChat && (
        <div style={{ position: 'absolute', inset: 0, background: 'var(--background)', zIndex: 3000, display: 'flex', flexDirection: 'col' }} className="flex flex-col h-full w-full">
          <div className="p-4 flex items-center justify-between shadow-sm" style={{ background: 'var(--surface-color)' }}>
            <h3 className="m-0 flex items-center gap-2"><MessageSquare size={20} /> Chat</h3>
            <X onClick={() => setShowChat(false)} className="cursor-pointer" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`p-3 rounded-lg max-w-[80%] ${msg.sender_id === currentUser?.id ? 'self-end bg-primary text-black' : 'self-start bg-surface-color'}`}>
                {msg.text}
              </div>
            ))}
          </div>
          <div className="p-4 flex gap-2" style={{ background: 'var(--surface-color)' }}>
            <input 
              type="text" 
              className="input flex-1" 
              placeholder="Type a message..." 
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button className="btn btn-primary" onClick={sendMessage}>Send</button>
          </div>
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
      {/* Profile Modal */}
      {showProfile && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card w-11/12 max-w-sm" style={{ padding: '2rem' }}>
            <h3 className="mb-4">My Profile</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm text-muted">Home Address</label>
                <input 
                  type="text" 
                  className="input w-full mt-1" 
                  value={homeAddress}
                  onChange={e => setHomeAddress(e.target.value)}
                  placeholder="e.g. 123 Main St"
                />
              </div>
              <div>
                <label className="text-sm text-muted">Work Address</label>
                <input 
                  type="text" 
                  className="input w-full mt-1" 
                  value={workAddress}
                  onChange={e => setWorkAddress(e.target.value)}
                  placeholder="e.g. 456 Business Rd"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn btn-outline flex-1" onClick={() => setShowProfile(false)}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={saveProfile}>Save</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
