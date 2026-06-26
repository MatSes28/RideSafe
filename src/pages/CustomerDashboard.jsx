import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Search, MapPin, Navigation2, Clock, User, Wallet, History, X, PlusCircle, Star, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

// Custom Icon for user
const userIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149059.png', // Placeholder
  iconSize: [35, 35],
  className: 'leaflet-custom-icon-user'
});

const driverIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1048/1048314.png',
  iconSize: [35, 35]
});

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [position, setPosition] = useState([15.7909, 120.9859]); // San Jose City
  const [booking, setBooking] = useState(false);
  const [searching, setSearching] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  
  const currentUser = useAppStore(state => state.currentUser);
  const walletBalance = useAppStore(state => state.walletBalance);
  
  const [driverPosition, setDriverPosition] = useState(null);
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
  
  const [channel, setChannel] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [rideHistory, setRideHistory] = useState([]);

  // GCash Top-Up State
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');

  // Review State
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [completedRideId, setCompletedRideId] = useState(null);
  const [completedDriverId, setCompletedDriverId] = useState(null);

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    // PayMongo Integration
    const paymongoKey = import.meta.env.VITE_PAYMONGO_SECRET_KEY;
    if (paymongoKey) {
      try {
        const response = await fetch('https://api.paymongo.com/v1/links', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: `Basic ${btoa(paymongoKey + ':')}`
          },
          body: JSON.stringify({
            data: {
              attributes: {
                amount: amount * 100, // PayMongo uses centavos
                description: 'RideSafe Wallet Top-Up',
                remarks: currentUser?.id
              }
            }
          })
        });
        const data = await response.json();
        if (data?.data?.attributes?.checkout_url) {
          window.open(data.data.attributes.checkout_url, '_blank');
        } else {
          alert('Failed to generate PayMongo link. Check API Key.');
        }
      } catch (e) {
        console.error('PayMongo Error:', e);
      }
    }

    // Update local and remote wallet
    if (currentUser) {
      const { data } = await supabase.from('profiles').select('wallet_balance').eq('id', currentUser.id).single();
      if (data) {
        await supabase.from('profiles').update({ wallet_balance: data.wallet_balance + amount }).eq('id', currentUser.id);
        useAppStore.getState().initialize(); // refresh balance
      }
    }
    setShowTopUp(false);
    setTopUpAmount('');
  };

  const submitReview = async () => {
    if (completedRideId && completedDriverId && currentUser) {
      await supabase.from('reviews').insert({
        ride_id: completedRideId,
        driver_id: completedDriverId,
        customer_id: currentUser.id,
        rating,
        comment: reviewComment
      });
    }
    setShowReview(false);
  };

  const fetchHistory = async () => {
    if (currentUser) {
      const { data } = await supabase.from('rides').select('*').eq('customer_id', currentUser.id).order('created_at', { ascending: false });
      setRideHistory(data || []);
      setShowHistory(true);
    }
  };

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

  useEffect(() => {
    // Setup Supabase Realtime Channel
    const ridesChannel = supabase.channel('rides', {
      config: { broadcast: { self: true } }
    });

    ridesChannel.on('broadcast', { event: 'ride_accepted' }, (payload) => {
      // Driver accepted the ride!
      if (payload.payload.customerId === currentUser?.id) {
        setSearching(false);
        setBooking(true);
        // Save driver info for later review
        setCompletedDriverId(payload.payload.driverId);
        setActiveRideId(payload.payload.rideId); // New! Assume driver sends a generated rideId
      }
    }).on('broadcast', { event: 'ride_completed' }, (payload) => {
      if (payload.payload.customerId === currentUser?.id) {
        setBooking(false);
        setCompletedRideId(payload.payload.rideId);
        setShowReview(true);
        setDriverPosition(null);
      }
    }).on('broadcast', { event: 'driver_location_update' }, (payload) => {
       setDriverPosition(payload.payload.position);
    }).subscribe();

    setChannel(ridesChannel);

    return () => {
      supabase.removeChannel(ridesChannel);
    };
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

  const handleFindDriver = () => {
    setSearching(true);
    
    // Calculate dynamic fare
    const dropoff = [15.7226, 120.9028]; // Munoz
    const straightDist = getDistance(position[0], position[1], dropoff[0], dropoff[1]);
    const estDrivingDist = straightDist * 1.3;
    const dynamicFare = Math.round(50 + (estDrivingDist * 15));

    // Broadcast ride request to all online drivers
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'ride_request',
        payload: {
          customerId: currentUser?.id,
          customerName: currentUser?.user_metadata?.full_name || 'Customer',
          pickup: position,
          dropoff: dropoff,
          fare: dynamicFare
        }
      });
    }

    // Optional timeout if no driver accepts
    setTimeout(() => {
      if (!booking) {
        // Fallback simulation
        // setSearching(false);
        // setBooking(true);
      }
    }, 15000);
  };

  return (
    <div className="app-container flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      
      {/* Top Search Bar */}
      <div className="p-4" style={{ position: 'absolute', top: 0, width: '100%', zIndex: 1000 }}>
          <div className="flex justify-between items-center w-full mb-2 px-2 pt-2">
            {currentUser && <div className="text-primary text-sm font-bold flex items-center gap-1 cursor-pointer" onClick={() => setShowProfile(true)}><User size={16}/> Hi, Rider!</div>}
            <div className="flex items-center gap-4">
              <div className="text-secondary text-sm font-bold flex items-center gap-1 cursor-pointer" onClick={fetchHistory}><History size={16}/> History</div>
              <div className="text-secondary text-sm font-bold flex items-center gap-1 cursor-pointer" onClick={() => setShowTopUp(true)}><PlusCircle size={16}/> Top-Up</div>
              <div className="text-secondary text-sm font-bold flex items-center gap-1"><Wallet size={16}/> ₱ {walletBalance.toFixed(2)}</div>
            </div>
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

          {driverPosition && booking && (
            <Marker position={driverPosition} icon={driverIcon}>
              <Popup>Your Driver</Popup>
            </Marker>
          )}
          
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
            
            <button className="btn btn-primary btn-block mt-2" onClick={handleFindDriver} style={{ padding: '1rem', fontSize: '1.2rem' }}>
              Find a Driver
            </button>
          </div>
        )}

        {searching && (
          <div className="glass-card animate-slide-up" style={{ padding: '1rem', textAlign: 'center' }}>
            <h3 className="mb-2">Finding a driver...</h3>
            <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>Broadcasting to nearby drivers in San Jose.</p>
            <div className="loading-spinner mb-4" style={{ margin: '0 auto' }}></div>
            <button className="btn btn-outline btn-block text-danger" style={{ borderColor: 'var(--danger)' }} onClick={() => setSearching(false)}>Cancel</button>
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
            <button className="btn btn-primary btn-block mt-2" onClick={() => setShowChat(true)} style={{ background: 'var(--secondary)' }}>
              <MessageSquare size={18} /> Chat with Driver
            </button>
          </div>
        )}
      </div>

      {/* Top Up Modal */}
      {showTopUp && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card w-11/12 max-w-sm" style={{ padding: '2rem' }}>
            <h3 className="mb-4 text-center" style={{ color: '#0052FE' }}>GCash Top-Up</h3>
            <p className="text-sm text-muted text-center mb-4">Simulate adding funds to your wallet.</p>
            <input 
              type="number" 
              className="input mb-4" 
              placeholder="Amount (₱)" 
              value={topUpAmount}
              onChange={e => setTopUpAmount(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="btn btn-outline flex-1" onClick={() => setShowTopUp(false)}>Cancel</button>
              <button className="btn btn-primary flex-1" style={{ background: '#0052FE' }} onClick={handleTopUp}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReview && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card w-11/12 max-w-sm" style={{ padding: '2rem', textAlign: 'center' }}>
            <h3 className="mb-2">Ride Completed!</h3>
            <p className="text-sm text-muted mb-4">Please rate your driver.</p>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(star => (
                <Star 
                  key={star} 
                  size={32} 
                  onClick={() => setRating(star)} 
                  fill={star <= rating ? 'gold' : 'transparent'} 
                  color={star <= rating ? 'gold' : 'gray'} 
                  className="cursor-pointer"
                />
              ))}
            </div>
            <textarea 
              className="input mb-4" 
              placeholder="Leave a comment..." 
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              rows="3"
            />
            <button className="btn btn-primary btn-block" onClick={submitReview}>Submit Review</button>
          </div>
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
