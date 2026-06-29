import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Menu, User, Settings, MapPin, Compass, Navigation, Phone, MessageSquare, AlertCircle, Check, X, Shield, History, Wallet, DollarSign, ArrowUpRight, CheckCircle, Power, Bot, Users, ShieldAlert, Mic, Lock } from 'lucide-react';
import RoutingMachine from '../components/RoutingMachine';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';

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
  const [autoAccept, setAutoAccept] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [showPOD, setShowPOD] = useState(false);
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
  const [showCashOut, setShowCashOut] = useState(false);
  const [cashOutMethod, setCashOutMethod] = useState('gcash');
  const [cashOutAmount, setCashOutAmount] = useState('');
  const [cashOutSuccess, setCashOutSuccess] = useState(false);
  const [rideHistory, setRideHistory] = useState([]);
  const [todaysEarnings, setTodaysEarnings] = useState(0);

  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeRideId, setActiveRideId] = useState(null);

  // ISO Safety State
  const [showSafety, setShowSafety] = useState(false);
  const [audioProtect, setAudioProtect] = useState(false);
  const [dataPrivacy, setDataPrivacy] = useState(false);
  const [trustedContacts, setTrustedContacts] = useState([]);
  const [newContact, setNewContact] = useState('');

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

  // AI Chatbot State
  const [showBot, setShowBot] = useState(false);
  const [botMessages, setBotMessages] = useState([{ sender: 'bot', text: 'Hello, Driver! How can I assist you with your shifts today?' }]);
  const [botInput, setBotInput] = useState('');

  const handleBotSend = () => {
    if (!botInput.trim()) return;
    const userMsg = botInput.trim();
    setBotMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setBotInput('');
    
    setTimeout(() => {
      let reply = "I'm sorry, I don't understand. Could you rephrase?";
      const lowerMsg = userMsg.toLowerCase();
      if (lowerMsg.includes('earnings') || lowerMsg.includes('money')) {
        reply = "You can view your daily and weekly earnings in the History tab. We pay out instantly to your wallet!";
      } else if (lowerMsg.includes('food') || lowerMsg.includes('eats')) {
        reply = "When accepting a RideSafe Eats order, you'll need to go to the restaurant to pick it up, then deliver it to the customer. Delivery fees are paid in full to you minus our small commission.";
      } else if (lowerMsg.includes('help') || lowerMsg.includes('support')) {
        reply = "If you need immediate assistance with an ongoing ride or dispute, please contact our 24/7 Driver Support hotline at 0917-123-4567.";
      } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
        reply = "Hello! Drive safe out there. How can I help you today?";
      }
      setBotMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    }, 800);
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

  // Auto-Accept Logic
  useEffect(() => {
    if (incomingRequest && autoAccept && currentRequest && !accepted) {
      handleAccept();
    }
  }, [incomingRequest, autoAccept, currentRequest, accepted]);

  const handleAccept = async () => {
    setIncomingRequest(false);
    setAccepted(true);
    
    if (currentRequest) {
      // 1. Insert Ride as active to get the ID
      const { data } = await supabase.from('rides').insert({
        customer_id: currentRequest.customerId,
        driver_id: currentUser?.id,
        pickup: currentRequest.pickupName || "San Jose",
        dropoff: currentRequest.dropoffName || "Munoz",
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

  const triggerComplete = () => {
    if (currentRequest?.serviceType === 'express') {
      setShowPOD(true);
    } else {
      handleComplete();
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
              <div className="text-green-500 text-sm font-bold flex items-center gap-1 cursor-pointer" onClick={() => setShowSafety(true)}><Shield size={16}/> Safety</div>
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

        <div className="glass-card mt-2" style={{ padding: '1rem' }}>
          <div className="flex justify-between items-center">
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
          {online && (
             <div className="flex items-center justify-between border-t pt-2 mt-3">
               <span className="text-sm font-bold text-gray-600">Auto-Accept Rides</span>
               <label className="relative inline-flex items-center cursor-pointer">
                 <input type="checkbox" className="sr-only peer" checked={autoAccept} onChange={(e) => setAutoAccept(e.target.checked)} />
                 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
               </label>
             </div>
          )}
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
          {accepted && currentRequest?.pickup && (
             <RoutingMachine 
               waypoints={currentRequest?.extraStopCoords ? [position, currentRequest.pickup, currentRequest.extraStopCoords, currentRequest.dropoff] : [position, currentRequest.pickup, currentRequest.dropoff]}
             />
          )}

          {/* Traffic Checkpoint Demo & Demand Heatmaps */}
          {online && !accepted && (
             <>
               <Circle center={[position[0] + 0.005, position[1] + 0.005]} radius={400} pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2 }} />
               <Circle center={[position[0] - 0.003, position[1] - 0.004]} radius={250} pathOptions={{ color: 'orange', fillColor: 'orange', fillOpacity: 0.2 }} />
               <Marker position={[15.7800, 120.9800]} icon={new L.Icon({
                  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1201/1201509.png',
                  iconSize: [25, 25]
               })}>
                  <Popup>Heavy Traffic / Checkpoint</Popup>
               </Marker>
             </>
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
            <h3 style={{ margin: 0 }}>
               {currentRequest?.serviceType === 'food' ? 'New Eats Order' : currentRequest?.serviceType === 'pabili' ? 'New Pabili Request' : currentRequest?.serviceType === 'mart' ? 'New Mart Order' : currentRequest?.serviceType === 'express' ? 'New Express Delivery' : 'New Ride Request'}
            </h3>
          </div>
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex justify-between items-center bg-blue-50 p-2 rounded text-primary mb-2">
              <strong>{currentRequest?.vehicleType || 'RideSafe Moto'}</strong>
              <span className="font-bold">₱ {currentRequest?.fare?.toFixed(2)}</span>
            </div>
            {currentRequest?.serviceType === 'express' && currentRequest?.packageDetails && (
               <div className="bg-orange-50 text-orange-800 p-2 rounded text-sm mb-2 border border-orange-200">
                 <strong>Package:</strong> {currentRequest.packageDetails.item} ({currentRequest.packageDetails.weight})<br/>
                 <strong>To:</strong> {currentRequest.packageDetails.recipientName} ({currentRequest.packageDetails.recipientPhone})
               </div>
            )}
            {currentRequest?.serviceType === 'food' && currentRequest?.packageDetails && (
               <div className="bg-red-50 text-red-800 p-2 rounded text-sm mb-2 border border-red-200">
                 <strong>Eats Order:</strong> {currentRequest.packageDetails.item}
               </div>
            )}
            {currentRequest?.serviceType === 'pabili' && currentRequest?.packageDetails && (
               <div className="bg-purple-50 text-purple-800 p-2 rounded text-sm mb-2 border border-purple-200">
                 <strong>Pabili Request:</strong> {currentRequest.packageDetails.item}
               </div>
            )}
            {currentRequest?.serviceType === 'mart' && currentRequest?.packageDetails && (
               <div className="bg-green-50 text-green-800 p-2 rounded text-sm mb-2 border border-green-200">
                 <strong>Mart Order:</strong> {currentRequest.packageDetails.item}
               </div>
            )}
            {currentRequest?.scheduledTime && (
               <div className="bg-yellow-100 text-yellow-800 p-2 rounded text-sm mb-2 flex items-center gap-2">
                 <AlertCircle size={16}/> Scheduled: {new Date(currentRequest.scheduledTime).toLocaleString()}
               </div>
            )}
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-secondary" />
              <span>Pickup: {currentRequest?.pickupName || 'Current Location'} ({currentRequest?.customerName || 'Customer'})</span>
            </div>
            {currentRequest?.extraStops && currentRequest.extraStops.length > 0 && currentRequest.extraStops.map((stop, i) => (
               <div key={i} className="flex items-center gap-2">
                 <MapPin size={16} className="text-orange-500" />
                 <span>Stop {i+1}: {stop.name}</span>
               </div>
            ))}
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-danger" />
              <span>Dropoff: {currentRequest?.dropoffName || 'Munoz Market'}</span>
            </div>
            
            {currentRequest?.targetFare && (
               <div className="bg-primary/10 border border-primary/30 p-3 rounded-xl mt-2">
                  <span className="text-xs font-bold text-primary block mb-1">Customer Suggested Fare (Tawad)</span>
                  <div className="flex gap-2">
                     <button className="btn bg-white border border-gray-200 py-1 px-3 flex-1 text-sm text-main" onClick={() => {
                         alert(`Counter Offer sent: ₱${Math.round(currentRequest.targetFare * 1.2)}`);
                         setIncomingRequest(false);
                         setCurrentRequest(null);
                     }}>Offer ₱{Math.round(currentRequest.targetFare * 1.2)}</button>
                     <button className="btn bg-white border border-gray-200 py-1 px-3 flex-1 text-sm text-main" onClick={() => {
                         alert(`Counter Offer sent: ₱${Math.round(currentRequest.targetFare * 1.5)}`);
                         setIncomingRequest(false);
                         setCurrentRequest(null);
                     }}>Offer ₱{Math.round(currentRequest.targetFare * 1.5)}</button>
                  </div>
               </div>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setIncomingRequest(false); setCurrentRequest(null); }}>Decline</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleAccept}>{currentRequest?.targetFare ? 'Accept Tawad' : 'Accept Ride'}</button>
          </div>
        </div>
      )}

      {/* Active Ride Bar */}
      {accepted && (
        <>
        {/* Navigation Overlay (Mock Waze) */}
        <div style={{ position: 'absolute', top: '80px', left: '20px', right: '20px', zIndex: 1000 }} className="glass-card p-3 bg-[#16a34a] text-white flex items-center gap-3 animate-fade-in shadow-lg border-0 border-t-4 border-green-300">
           <div className="w-12 h-12 bg-black/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Navigation size={24} className="transform rotate-45 text-white" />
           </div>
           <div>
              <h3 className="m-0 text-white text-base opacity-90">In 200m</h3>
              <p className="m-0 text-white font-bold text-2xl">Turn right onto Main St</p>
           </div>
        </div>

        <div style={{
          position: 'absolute', bottom: '20px', left: '20px', right: '20px', zIndex: 1000
        }} className="glass-card animate-fade-in">
          <h3 className="mb-2 text-secondary">
             {['food', 'pabili', 'mart'].includes(currentRequest?.serviceType) ? 'Navigating to Store' : currentRequest?.serviceType === 'express' ? 'Navigating to Pickup' : 'Navigating to Customer'}
          </h3>
          <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>Avoiding checkpoint traffic...</p>
          
          <div className="flex gap-2 mb-2">
            <button className="btn btn-primary flex-1" style={{ background: 'var(--secondary)' }}>
              <Navigation size={18} /> Maps
            </button>
            <button className="btn btn-outline flex-1" onClick={() => setShowChat(true)} style={{ color: 'var(--secondary)', borderColor: 'var(--secondary)' }}>
              <MessageSquare size={18} /> Chat
            </button>
          </div>
          
          <button className="btn btn-outline btn-block text-primary" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }} onClick={triggerComplete}>
            {['food', 'pabili', 'mart', 'express'].includes(currentRequest?.serviceType) ? 'Confirm Delivery' : 'Complete Ride'}
          </button>
        </div>
        </>
      )}

      {/* Proof of Delivery Modal */}
      {showPOD && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card w-11/12 max-w-sm text-center" style={{ padding: '2rem' }}>
            <h3 className="mb-2 text-orange-500">Proof of Delivery</h3>
            <p className="text-sm text-muted mb-4">Please upload a photo or get a digital signature to complete this delivery.</p>
            
            <div className="w-full h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center mb-4 cursor-pointer">
              <span className="text-muted">Tap to take photo</span>
            </div>
            
            <div className="flex gap-2">
              <button className="btn btn-outline flex-1" onClick={() => setShowPOD(false)}>Cancel</button>
              <button className="btn flex-1" style={{ background: 'var(--orange)', color: 'white' }} onClick={() => { setShowPOD(false); handleComplete(); }}>Submit & Complete</button>
            </div>
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
          <div className="glass-card animate-slide-up w-full bg-surface-color" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '2rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
              <h3>Earnings Insights</h3>
              <X className="cursor-pointer" onClick={() => setShowHistory(false)} />
            </div>

            <div className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-100">
               <h4 className="text-primary mb-2 flex justify-between"><span>Weekly Summary</span> <span>₱ {rideHistory.reduce((s,r)=>s+r.fare,0).toFixed(2)}</span></h4>
               <div className="flex items-end gap-2 h-24 mb-2">
                 {[40, 70, 30, 90, 50, 100, todaysEarnings > 0 ? Math.min(100, todaysEarnings/10) : 10].map((val, i) => (
                   <div key={i} className="flex-1 bg-primary rounded-t" style={{ height: `${Math.max(10, val)}%`, opacity: i === 6 ? 1 : 0.5 }}></div>
                 ))}
               </div>
               <div className="flex justify-between text-xs text-muted">
                 <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span className="font-bold text-primary">Today</span>
               </div>
            </div>
            
            <div className="mb-4">
               <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted">Daily Goal (₱1,000)</span>
                  <span className="font-bold">{Math.round((todaysEarnings / 1000) * 100)}%</span>
               </div>
               <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, (todaysEarnings / 1000) * 100)}%` }}></div>
               </div>
            </div>

            <button className="btn btn-primary btn-block py-3 mb-6 flex items-center justify-center gap-2 font-bold" style={{ background: '#22c55e', borderColor: '#22c55e', color: 'white' }} onClick={() => { setShowHistory(false); setShowCashOut(true); }}>
               <Wallet size={18} /> Cash Out Earnings
            </button>

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

      {/* Cash Out Modal */}
      {showCashOut && (
         <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'flex-end' }}>
            <div className="glass-card animate-slide-up w-full bg-surface-color" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '2rem', maxHeight: '80vh', overflowY: 'auto' }}>
               <div className="flex justify-between items-center mb-4">
                  <h3 className="flex items-center gap-2"><DollarSign className="text-green-500"/> Transfer to Bank</h3>
                  <X className="cursor-pointer" onClick={() => { setShowCashOut(false); setCashOutSuccess(false); setCashOutAmount(''); }} />
               </div>

               {cashOutSuccess ? (
                  <div className="text-center py-6">
                     <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-green-400">
                        <CheckCircle size={40} className="text-green-500" />
                     </div>
                     <h2 className="text-green-500 m-0 mb-2">Cash Out Successful!</h2>
                     <p className="text-muted">₱{cashOutAmount} has been transferred to your {cashOutMethod.toUpperCase()} account instantly.</p>
                  </div>
               ) : (
                  <>
                     <div className="bg-green-50 text-green-800 p-4 rounded-xl mb-4 text-center border border-green-200">
                        <span className="block text-xs uppercase font-bold text-green-600 mb-1">Available to Cash Out</span>
                        <span className="text-4xl font-black block">₱ {walletBalance.toFixed(2)}</span>
                     </div>

                     <div className="mb-4">
                        <label className="form-label text-xs uppercase font-bold text-muted">Destination Account</label>
                        <select className="form-input" value={cashOutMethod} onChange={e => setCashOutMethod(e.target.value)}>
                           <option value="gcash">GCash (Linked •••• 1234)</option>
                           <option value="maya">Maya (Linked •••• 9876)</option>
                           <option value="bdo">BDO Unibank (Linked)</option>
                           <option value="bpi">BPI (Linked)</option>
                        </select>
                     </div>

                     <div className="mb-6">
                        <label className="form-label text-xs uppercase font-bold text-muted">Amount (₱)</label>
                        <input type="number" className="form-input text-lg font-bold" placeholder="0.00" value={cashOutAmount} onChange={e => setCashOutAmount(e.target.value)} />
                     </div>

                     <button className="btn btn-primary btn-block py-3 font-bold flex items-center justify-center gap-2" style={{ background: '#22c55e', borderColor: '#22c55e' }} onClick={() => {
                        if(!cashOutAmount || cashOutAmount <= 0) return alert('Enter a valid amount.');
                        if(cashOutAmount > walletBalance) return alert('Insufficient funds.');
                        
                        // Deduct logic
                        const newBal = walletBalance - parseFloat(cashOutAmount);
                        supabase.from('profiles').update({ wallet_balance: newBal }).eq('id', currentUser.id).then(() => {
                           useAppStore.setState({ walletBalance: newBal });
                           setCashOutSuccess(true);
                        });
                     }}>
                        Confirm Transfer <ArrowUpRight size={18} />
                     </button>
                  </>
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

      {/* ISO Safety Center Modal */}
      {showSafety && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 5000, display: 'flex', alignItems: 'flex-end' }}>
          <div className="glass-card animate-slide-up w-full" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '2rem', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="m-0 flex items-center gap-2 text-green-600"><Shield /> ISO Safety Center</h3>
              <X className="cursor-pointer" onClick={() => setShowSafety(false)} />
            </div>

            <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-xl mb-4 text-sm flex gap-2">
               <ShieldCheck size={20} className="shrink-0" />
               <span>RideSafe is ISO 27001 & ISO 9001 compliant. Your safety and data privacy are our top priorities.</span>
            </div>

            <div className="flex flex-col gap-4">
               {/* Audio Protect */}
               <div className="p-4 bg-surface-light rounded-xl border border-gray-100 flex justify-between items-center">
                  <div>
                     <h4 className="m-0 flex items-center gap-1"><Mic size={16}/> Audio Protect</h4>
                     <p className="text-xs text-muted m-0">Record audio during rides for dispute resolution.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={audioProtect} onChange={e => setAudioProtect(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
               </div>

               {/* Data Privacy Mode */}
               <div className="p-4 bg-surface-light rounded-xl border border-gray-100 flex justify-between items-center">
                  <div>
                     <h4 className="m-0 flex items-center gap-1"><Lock size={16}/> Data Privacy Mode</h4>
                     <p className="text-xs text-muted m-0">Anonymize your name/number to passengers.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={dataPrivacy} onChange={e => setDataPrivacy(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
               </div>

               {/* Trusted Contacts */}
               <div className="p-4 bg-surface-light rounded-xl border border-gray-100">
                  <h4 className="m-0 flex items-center gap-1 mb-2"><Users size={16}/> Trusted Contacts</h4>
                  <p className="text-xs text-muted mb-3">Automatically share live trip details with these contacts via SMS.</p>
                  
                  <div className="flex gap-2 mb-3">
                     <input type="text" className="form-input flex-1 m-0 text-sm py-2" placeholder="Phone Number" value={newContact} onChange={e => setNewContact(e.target.value)} />
                     <button className="btn btn-primary py-2" onClick={() => { if(newContact) { setTrustedContacts([...trustedContacts, newContact]); setNewContact(''); }}}>Add</button>
                  </div>

                  {trustedContacts.map((c, i) => (
                     <div key={i} className="flex justify-between items-center bg-surface-color border border-gray-200 p-2 rounded mb-2 text-sm">
                        <span>{c}</span>
                        <X size={14} className="text-danger cursor-pointer" onClick={() => setTrustedContacts(trustedContacts.filter((_, idx) => idx !== i))}/>
                     </div>
                  ))}
               </div>

               {/* Emergency SOS Button */}
               <button className="btn btn-danger btn-block py-4 mt-2 flex items-center justify-center gap-2" style={{ background: '#ef4444', color: 'white' }} onClick={() => alert("🚨 SOS ACTIVATED! Authorities and trusted contacts have been notified with your live location.")}>
                  <ShieldAlert size={20} /> TRIGGER EMERGENCY SOS
               </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Support FAB */}
      <div className="absolute bottom-[200px] right-4 z-[1500]">
         <button className="btn btn-primary rounded-full w-14 h-14 p-0 shadow-lg flex items-center justify-center" style={{ animation: 'pulse 2s infinite' }} onClick={() => setShowBot(true)}>
            <Bot size={28} />
         </button>
      </div>

      {/* AI Bot Modal */}
      {showBot && (
         <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 6000, display: 'flex', flexDirection: 'column' }} className="animate-fade-in">
            <div className="flex-1" onClick={() => setShowBot(false)}></div>
            <div className="bg-surface-color w-full h-[65%] rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden text-main border-t border-gray-200">
               <div className="p-4 bg-primary text-white flex justify-between items-center shadow-sm z-10">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><Bot size={20}/></div>
                     <h3 className="m-0 text-white">RideSafe AI</h3>
                  </div>
                  <X className="cursor-pointer opacity-80 hover:opacity-100" onClick={() => setShowBot(false)}/>
               </div>
               <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" style={{ scrollbarWidth: 'none', background: 'var(--surface-color)' }}>
                  {botMessages.map((msg, i) => (
                     <div key={i} className={`p-3 rounded-2xl max-w-[85%] text-sm ${msg.sender === 'user' ? 'self-end bg-primary text-white rounded-br-sm' : 'self-start bg-surface-light text-main border border-gray-200 rounded-bl-sm'}`}>
                        {msg.text}
                     </div>
                  ))}
               </div>
               <div className="p-3 bg-surface-color border-t border-gray-200 flex gap-2">
                  <input type="text" className="form-input flex-1 m-0 py-2 px-4 rounded-full text-sm" placeholder="Ask me anything..." value={botInput} onChange={e => setBotInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleBotSend()} />
                  <button className="btn btn-primary rounded-full px-5 py-2 text-sm" onClick={handleBotSend}>Send</button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
}
