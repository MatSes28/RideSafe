import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, MapPin, Navigation2, Clock, User, Wallet, History, X, PlusCircle, Star, MessageSquare, ChevronLeft, ArrowLeft, ArrowRight, ShieldAlert, Share2, Sparkles, Info, TrendingUp, Bot, Scan, Send, Receipt, ShoppingCart, Shield, ShieldCheck, Mic, Lock, Users, Flame, Trophy, Home, Package, Utensils, ShoppingBag, Bell } from 'lucide-react';
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

// Custom Icons
const driverIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1048/1048314.png',
  iconSize: [35, 35]
});
const pickupIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149059.png',
  iconSize: [35, 35]
});
const dropoffIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1409/1409035.png',
  iconSize: [35, 35]
});

// Map View updater component
function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 15, { animate: true, duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

const translations = {
  en: {
    whereTo: "Where to?",
    findingDriver: "Finding a driver",
    connecting: "Connecting you to the nearest rider...",
    cancel: "Cancel Request",
    book: "Book",
    scheduled: "Scheduled",
    share: "Share",
    sos: "SOS",
    home: "Home",
    work: "Work",
    liteMode: "Lite Mode Enabled",
  },
  tl: {
    whereTo: "Saan tayo?",
    findingDriver: "Naghahanap ng driver",
    connecting: "Kumokonekta sa pinakamalapit na rider...",
    cancel: "Kanselahin",
    book: "I-book",
    scheduled: "Naka-schedule",
    share: "I-share",
    sos: "Tulong",
    home: "Bahay",
    work: "Trabaho",
    liteMode: "Naka-Lite Mode",
  },
  ceb: {
    whereTo: "Asa ta?",
    findingDriver: "Nangita ug driver",
    connecting: "Gakonekta sa pinakaduol nga rider...",
    cancel: "Ikansela",
    book: "I-book",
    scheduled: "Naka-schedule",
    share: "I-share",
    sos: "Tabang",
    home: "Balay",
    work: "Trabaho",
    liteMode: "Naka-Lite Mode",
  }
};

export default function CustomerDashboard() {
  const language = useAppStore(state => state.language) || 'en';
  const t = (key) => translations[language]?.[key] || translations['en'][key] || key;
  const navigate = useNavigate();
  
  // UI Flow State
  const [uiState, setUiState] = useState('home'); // home -> idle (map) -> searching -> preview -> finding -> booked
  
  // Location States
  const [position, setPosition] = useState([15.7909, 120.9859]); // Default / GPS
  const [pickup, setPickup] = useState({ name: 'Current Location', coords: null });
  const [dropoff, setDropoff] = useState({ name: '', coords: null });
  const [extraStops, setExtraStops] = useState([]);
  const [scheduledTime, setScheduledTime] = useState('');
  const [recurrence, setRecurrence] = useState('none'); // 'none' | 'daily' | 'weekdays' | 'weekly'
  
  // Service Type
  const [serviceType, setServiceType] = useState('ride'); // 'ride' | 'express' | 'food' | 'pabili' | 'mart'
  const [packageDetails, setPackageDetails] = useState({ item: '', weight: '', recipientName: '', recipientPhone: '' });
  
  // V7.0 Tawad Bidding System
  const [targetFare, setTargetFare] = useState('');
  const [driverBids, setDriverBids] = useState([]);
  const [foodCart, setFoodCart] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const restaurants = [
    { id: 1, name: 'Jollibee', category: 'Fast Food', rating: 4.8, img: 'https://cdn-icons-png.flaticon.com/512/1046/1046784.png', menu: [{id: 101, name: '1pc Chickenjoy', price: 99}, {id: 102, name: 'Jolly Spaghetti', price: 60}] },
    { id: 2, name: 'Mang Inasal', category: 'Filipino', rating: 4.6, img: 'https://cdn-icons-png.flaticon.com/512/3082/3082008.png', menu: [{id: 201, name: 'Paa Large PM1', price: 145}, {id: 202, name: 'Halo-Halo', price: 89}] }
  ];
  
  const [pabiliDetails, setPabiliDetails] = useState({ store: '', items: '', estimatedCost: '' });
  const [martCart, setMartCart] = useState([]);
  const groceries = [
    { id: 301, name: 'Coke 1.5L', category: 'Beverages', price: 75, img: 'https://cdn-icons-png.flaticon.com/512/933/933099.png' },
    { id: 302, name: 'Gardenia Bread', category: 'Bakery', price: 85, img: 'https://cdn-icons-png.flaticon.com/512/3233/3233027.png' },
    { id: 303, name: 'Eggs (1 Dozen)', category: 'Dairy', price: 110, img: 'https://cdn-icons-png.flaticon.com/512/837/837560.png' },
    { id: 304, name: 'Century Tuna', category: 'Canned Goods', price: 45, img: 'https://cdn-icons-png.flaticon.com/512/2821/2821811.png' }
  ];
  
  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeSearchField, setActiveSearchField] = useState(null); // 'pickup' | 'dropoff' | 'extraStop'

  const [routeInfo, setRouteInfo] = useState(null);
  const [baseDistance, setBaseDistance] = useState(0);
  const [fare, setFare] = useState(0);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.0);
  const [showFareBreakdown, setShowFareBreakdown] = useState(false);

  const vehicleTypes = [
    { id: 'moto', name: 'RideSafe Moto', icon: 'https://cdn-icons-png.flaticon.com/512/1048/1048314.png', multiplier: 1, base: 50 },
    { id: 'car4', name: 'RideSafe Car (4-Seater)', icon: 'https://cdn-icons-png.flaticon.com/512/3204/3204121.png', multiplier: 1.5, base: 100 },
    { id: 'car6', name: 'RideSafe Car (6-Seater)', icon: 'https://cdn-icons-png.flaticon.com/512/3204/3204121.png', multiplier: 2.0, base: 150 },
    { id: 'share', name: 'RideSafe Carpool (Share)', icon: 'https://cdn-icons-png.flaticon.com/512/3204/3204121.png', multiplier: 0.9, base: 60 },
    { id: 'premium', name: 'RideSafe Premium', icon: 'https://cdn-icons-png.flaticon.com/512/1048/1048315.png', multiplier: 2.5, base: 200 }
  ];
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleTypes[0]);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);

  const currentUser = useAppStore(state => state.currentUser);
  const walletBalance = useAppStore(state => state.walletBalance);
  const liteMode = useAppStore(state => state.liteMode);
  const setLiteMode = useAppStore(state => state.setLiteMode);
  const setLanguage = useAppStore(state => state.setLanguage);
  
  const [driverPosition, setDriverPosition] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [homeAddress, setHomeAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [channel, setChannel] = useState(null);
  
  // Modals
  const [showHistory, setShowHistory] = useState(false);
  const [rideHistory, setRideHistory] = useState([]);
  const [showWallet, setShowWallet] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [showRewards, setShowRewards] = useState(false);
  const [rewardsTab, setRewardsTab] = useState('marketplace'); // 'marketplace' | 'leaderboard'
  const [showCommunity, setShowCommunity] = useState(false);
  
  // SafePoints & Ledger
  const [safePoints, setSafePoints] = useState(() => parseInt(localStorage.getItem('safePoints')) || 0);
  const [transactions, setTransactions] = useState(() => JSON.parse(localStorage.getItem('transactions')) || []);

  const addSafePoints = (pts) => {
    const newPts = safePoints + pts;
    setSafePoints(newPts);
    localStorage.setItem('safePoints', newPts);
  };

  const addTransaction = (type, amount, desc) => {
    const newTx = [{ id: Date.now(), type, amount, desc, date: new Date().toISOString() }, ...transactions];
    setTransactions(newTx);
    localStorage.setItem('transactions', JSON.stringify(newTx));
  };
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [completedRideId, setCompletedRideId] = useState(null);
  const [completedDriverId, setCompletedDriverId] = useState(null);
  const [tipAmount, setTipAmount] = useState(0);
  const [selectedBadges, setSelectedBadges] = useState([]);
  const badges = ['Safe Driver', 'Good Music', 'Clean Car', 'Friendly'];

  // Dark Mode
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Business Mode
  const [isBusinessMode, setIsBusinessMode] = useState(() => localStorage.getItem('isBusinessMode') === 'true');
  useEffect(() => {
    localStorage.setItem('isBusinessMode', isBusinessMode);
  }, [isBusinessMode]);

  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeRideId, setActiveRideId] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);

  // ISO Safety State
  const [showSafety, setShowSafety] = useState(false);
  const [audioProtect, setAudioProtect] = useState(false);
  const [dataPrivacy, setDataPrivacy] = useState(false);
  const [trustedContacts, setTrustedContacts] = useState([]);
  const [newContact, setNewContact] = useState('');

  // RideSafe Plus State
  const [showPlus, setShowPlus] = useState(false);
  
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [isSubscribed, setIsSubscribed] = useState(() => localStorage.getItem('isSubscribed') === 'true');

  // AI Chatbot State
  const [showBot, setShowBot] = useState(false);
  const [botMessages, setBotMessages] = useState([{ sender: 'bot', text: 'Hi! I am the RideSafe AI. How can I help you today?' }]);
  const [botInput, setBotInput] = useState('');

  const handleBotSend = () => {
    if (!botInput.trim()) return;
    const userMsg = botInput.trim();
    setBotMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setBotInput('');
    
    // Simulated AI Logic
    setTimeout(() => {
      let reply = "I'm sorry, I don't understand. Could you rephrase?";
      const lowerMsg = userMsg.toLowerCase();
      if (lowerMsg.includes('fare') || lowerMsg.includes('price')) {
        reply = "Fares are calculated based on base distance, traffic multipliers, and a dynamic supply/demand surge. We ensure 100% transparency before you book!";
      } else if (lowerMsg.includes('driver') || lowerMsg.includes('where')) {
        reply = "If you have an active ride, you can see the driver's location on the map. If they are delayed, they might be navigating around a checkpoint.";
      } else if (lowerMsg.includes('food') || lowerMsg.includes('eat')) {
        reply = "RideSafe Eats delivers hot food straight to your door! Delivery fees start at ₱49.";
      } else if (lowerMsg.includes('help') || lowerMsg.includes('support')) {
        reply = "I'm here to help! You can ask me about fares, food delivery, or how to report an issue.";
      } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
        reply = "Hello! How can I assist you with RideSafe today?";
      }
      setBotMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    }, 800);
  };

  // GPS Location Init
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const coordinates = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        const coords = [coordinates.coords.latitude, coordinates.coords.longitude];
        setPosition(coords);
        if (!pickup.coords && pickup.name === 'Current Location') {
           setPickup({ name: 'Current Location', coords: coords });
        }
      } catch (e) {
        console.error('GPS Error:', e);
      }
    };
    fetchLocation();
  }, []);

  // RideSafe Pay States
  const [showP2P, setShowP2P] = useState(false);
  const [p2pTarget, setP2pTarget] = useState('');
  const [p2pAmount, setP2pAmount] = useState('');

  const [showQRScan, setShowQRScan] = useState(false);
  const [qrAmount, setQrAmount] = useState('');

  const [showPayBills, setShowPayBills] = useState(false);
  const [selectedBiller, setSelectedBiller] = useState('meralco');
  const [billerAcct, setBillerAcct] = useState('');
  const [billerAmount, setBillerAmount] = useState('');

  // Location Autocomplete Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}&countrycodes=ph&limit=5`);
          const data = await res.json();
          setSearchResults(data);
        } catch (e) {
          console.error(e);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectLocation = (item) => {
    const newLocation = { name: item.display_name.split(',')[0], full_name: item.display_name, coords: [parseFloat(item.lat), parseFloat(item.lon)] };
    
    if (activeSearchField === 'pickup') {
      setPickup(newLocation);
      if (dropoff.coords) {
         setUiState('preview');
      } else {
         setActiveSearchField('dropoff');
         setSearchQuery('');
      }
    } else if (activeSearchField === 'dropoff') {
      setDropoff(newLocation);
      if (pickup.coords || pickup.name === 'Current Location') {
         if (!pickup.coords) setPickup({ name: 'Current Location', coords: position });
         setUiState('preview');
      }
    } else if (activeSearchField?.startsWith('stop-')) {
      const index = parseInt(activeSearchField.split('-')[1]);
      const newStops = [...extraStops];
      newStops[index] = newLocation;
      setExtraStops(newStops);
      setActiveSearchField('dropoff');
      setSearchQuery('');
    }
  };

  // Profile Sync
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

  // Realtime Socket
  useEffect(() => {
    const ridesChannel = supabase.channel('rides', { config: { broadcast: { self: true } } });

    ridesChannel.on('broadcast', { event: 'ride_accepted' }, (payload) => {
      if (payload.payload.customerId === currentUser?.id) {
        setUiState('booked');
        setCompletedDriverId(payload.payload.driverId);
        setActiveRideId(payload.payload.rideId);
        setDriverInfo(payload.payload);
      }
    }).on('broadcast', { event: 'ride_completed' }, (payload) => {
      if (payload.payload.customerId === currentUser?.id) {
        setUiState('idle');
        setCompletedRideId(payload.payload.rideId);
        setShowReview(true);
        setDriverPosition(null);
        setPickup({ name: 'Current Location', coords: position });
        setDropoff({ name: '', coords: null });
        setExtraStop(null);
        setShowExtraStop(false);
        setScheduledTime('');
        setRouteInfo(null);
      }
    }).on('broadcast', { event: 'driver_location_update' }, (payload) => {
       setDriverPosition(payload.payload.position);
    }).subscribe();

    setChannel(ridesChannel);
    return () => supabase.removeChannel(ridesChannel);
  }, [currentUser, position]);

  // Chat Sync
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
    await supabase.from('messages').insert({ ride_id: activeRideId, sender_id: currentUser.id, text: newMessage });
    setNewMessage('');
  };

  const handleRouteFound = (route) => {
    setRouteInfo(route);
    const distKm = route.summary.totalDistance / 1000;
    setBaseDistance(distKm);
  };

  useEffect(() => {
    if (baseDistance > 0) {
      const surge = 1.0 + (Math.random() * 0.4); // Random surge between 1.0x and 1.4x
      setSurgeMultiplier(surge);
      const activeStops = extraStops.filter(s => s?.coords).length;
      let calcFare = Math.round((selectedVehicle.base + (baseDistance * 15 * selectedVehicle.multiplier) + (activeStops * 30)) * surge);
      if (discount > 0) {
        calcFare = Math.max(0, calcFare - discount);
      }
      setFare(calcFare);
    }
  }, [baseDistance, selectedVehicle, discount, extraStops]);

  const applyPromoCode = () => {
    if (promoCode.toUpperCase() === 'RIDESAFE50') {
      setDiscount(50);
      alert('₱50 Discount Applied!');
    } else if (promoCode.toUpperCase() === 'FREE') {
      setDiscount(Math.round(selectedVehicle.base + (baseDistance * 15 * selectedVehicle.multiplier)));
      alert('100% Discount Applied!');
    } else {
      alert('Invalid Promo Code');
      setDiscount(0);
    }
  };

  const handleFindDriver = () => {
    if (!isBusinessMode && walletBalance < fare) {
       alert('Insufficient wallet balance. Please top up.');
       setShowWallet(true);
       return;
    }
    
    setUiState('finding');
    setDriverBids([]); // Reset bids for new ride
    
    // Simulate incoming bids if we have a targetFare
    if (targetFare) {
       setTimeout(() => {
          setDriverBids(prev => [...prev, { id: 'd1', name: 'Kuya Rey (Moto)', rating: 4.9, eta: '3 mins', fare: Math.round(targetFare * 1.1) }]);
       }, 3000);
       setTimeout(() => {
          setDriverBids(prev => [...prev, { id: 'd2', name: 'Alex M. (Moto)', rating: 4.8, eta: '5 mins', fare: parseInt(targetFare) }]);
       }, 5000);
    }

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'ride_request',
        payload: {
          customerId: currentUser?.id,
          customerName: currentUser?.user_metadata?.full_name || (isBusinessMode ? 'Corporate User' : 'Customer'),
          pickup: pickup.coords,
          dropoff: dropoff.coords,
          pickupName: pickup.name,
          dropoffName: dropoff.name,
          extraStops: extraStops.filter(s => s !== null).map(s => ({name: s.name, coords: s.coords})),
          scheduledTime: scheduledTime,
          recurrence: recurrence,
          fare: targetFare ? parseInt(targetFare) : fare,
          targetFare: targetFare ? parseInt(targetFare) : null,
          vehicleType: selectedVehicle.name,
          serviceType: serviceType,
          packageDetails: serviceType === 'express' ? packageDetails : null,
          isCorporate: isBusinessMode
        }
      });
    }
  };

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (currentUser) {
      const { data } = await supabase.from('profiles').select('wallet_balance').eq('id', currentUser.id).single();
      if (data) {
        await supabase.from('profiles').update({ wallet_balance: data.wallet_balance + amount }).eq('id', currentUser.id);
        addTransaction('topup', amount, 'GCash Top-Up');
        useAppStore.getState().initialize();
      }
    }
    setTopUpAmount('');
  };

  const handleSOS = () => {
    alert('🚨 EMERGENCY SOS ACTIVATED! Authorities and your emergency contacts are being notified.');
  };

  const rewards = [
    { id: 1, title: '₱50 Off Ride', cost: 500, code: 'RIDE50' },
    { id: 2, title: 'Free Delivery (Eats)', cost: 800, code: 'FREEDEL' },
    { id: 3, title: 'VIP Status (1 Month)', cost: 1000, code: 'VIP' },
    { id: 4, title: 'Free Starbucks Coffee', cost: 1500, code: 'SBUX50' },
    { id: 5, title: 'SM Cinema Ticket', cost: 3000, code: 'SMCINEMA' }
  ];

  const mockLeaderboard = [
    { id: 1, name: 'Juan D.', points: 12500, rank: 1 },
    { id: 2, name: 'Maria C.', points: 11200, rank: 2 },
    { id: 3, name: 'Matt F.', points: safePoints, rank: 3 },
    { id: 4, name: 'Pedro S.', points: 9800, rank: 4 },
    { id: 5, name: 'Ana B.', points: 8400, rank: 5 }
  ];

  const communityFeed = [
    { id: 1, user: 'Alex Reyes', type: 'traffic', message: 'Heavy traffic at EDSA Magallanes SB. Avoid!', time: '5m ago', likes: 12 },
    { id: 2, user: 'Sarah Lee', type: 'shoutout', message: 'Huge shoutout to Kuya Rey for returning my lost wallet! 5 stars!', time: '12m ago', likes: 45 },
    { id: 3, user: 'Mike T.', type: 'hazard', message: 'Flooded area near Taft Ave. Ingat mga riders!', time: '1h ago', likes: 89 }
  ];

  const redeemReward = (reward) => {
    if (safePoints >= reward.cost) {
      addSafePoints(-reward.cost);
      alert(`Successfully redeemed ${reward.title}! Use code ${reward.code}`);
    } else {
      alert("Not enough SafePoints.");
    }
  };

  const handleShareRide = () => {
    const trackingUrl = `${window.location.origin}/track/${activeRideId || 'demo-123'}`;
    const text = `I'm riding with RideSafe! My driver is ${driverInfo?.driverName || 'Kuya Juan'}. ETA: 10 mins. Track me: ${trackingUrl}`;
    if (navigator.share) {
      navigator.share({ title: 'Track my ride', text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Ride details and Tracking Link copied to clipboard!');
    }
  };

  const toggleBadge = (badge) => {
    setSelectedBadges(prev => prev.includes(badge) ? prev.filter(b => b !== badge) : [...prev, badge]);
  };

  const submitReview = async () => {
    if (completedRideId && completedDriverId && currentUser) {
      await supabase.from('reviews').insert({
        ride_id: completedRideId,
        driver_id: completedDriverId,
        customer_id: currentUser.id,
        rating,
        comment: reviewComment,
        tip: tipAmount,
        badges: selectedBadges
      });

      // Earn points (10% of fare)
      addSafePoints(Math.round(fare * 0.1));
      addTransaction('ride', -fare, 'Ride Payment');

      if (tipAmount > 0) {
         await supabase.from('profiles').update({ wallet_balance: walletBalance - tipAmount }).eq('id', currentUser.id);
         addTransaction('tip', -tipAmount, 'Driver Tip');
         useAppStore.getState().initialize();
      }
    }
    setShowReview(false);
    setTipAmount(0);
    setSelectedBadges([]);
  };

  const fetchHistory = async () => {
    if (currentUser) {
      const { data } = await supabase.from('rides').select('*').eq('customer_id', currentUser.id).order('created_at', { ascending: false });
      setRideHistory(data || []);
      setShowHistory(true);
    }
  };

  // Determine map center
  let mapCenter = position;
  let mapZoom = 15;
  if (uiState === 'preview' && pickup.coords) {
    mapCenter = pickup.coords;
    mapZoom = 13;
  }

  return (
    <div className={`app-container flex flex-col ${darkMode ? 'dark text-white' : ''}`} style={{ height: '100vh', overflow: 'hidden', background: isBusinessMode ? '#1e293b' : 'var(--bg-color)' }}>
      
      {/* Live Activity Pill (Dynamic Island style) */}
      {uiState === 'booked' && (
         <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-xl text-white px-5 py-2.5 rounded-full flex items-center gap-3 z-[5000] shadow-lg animate-fade-in text-sm font-bold border border-white/20 whitespace-nowrap">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
            {serviceType === 'food' ? 'Food arriving in 15m' : serviceType === 'express' ? 'Courier arriving...' : 'Driver arriving in 2m'}
         </div>
      )}

      {/* Search Overlay */}
      {uiState === 'searching' && (
        <div className="search-overlay">
          <div className="p-4" style={{ background: 'var(--surface-color)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-4 mb-4">
              <ChevronLeft size={24} className="cursor-pointer" onClick={() => setUiState('idle')} />
              <h3 className="m-0 text-lg">Select Location</h3>
            </div>
            
            <div className="flex flex-col gap-2 relative">
               <div className="absolute left-4 top-5 bottom-5 w-0.5 bg-gray-200" style={{ zIndex: 0 }}></div>
               
               {/* Pickup Input */}
               <div className={`flex items-center gap-3 p-2 rounded-lg bg-surface-light`} onClick={() => setActiveSearchField('pickup')}>
                 <div className="w-2 h-2 rounded-full bg-primary relative z-10 shadow-[0_0_0_4px_var(--surface-color)]"></div>
                 <input 
                   type="text"
                   className="input flex-1 m-0"
                   value={activeSearchField === 'pickup' ? searchQuery : pickup.name}
                   onChange={(e) => activeSearchField === 'pickup' && setSearchQuery(e.target.value)}
                   placeholder="Current Location"
                   autoFocus={activeSearchField === 'pickup'}
                 />
               </div>
               
               {/* Extra Stops Input */}
               {extraStops.map((stop, idx) => (
                 <div key={idx} className={`flex items-center gap-3 p-2 rounded-lg bg-surface-light`} onClick={() => setActiveSearchField(`stop-${idx}`)}>
                   <PlusCircle size={16} className="text-secondary relative z-10 bg-surface-light" style={{ marginLeft: '-4px' }} />
                   <input 
                     type="text"
                     className="input flex-1 m-0"
                     value={activeSearchField === `stop-${idx}` ? searchQuery : (stop?.name || '')}
                     onChange={(e) => activeSearchField === `stop-${idx}` && setSearchQuery(e.target.value)}
                     placeholder={`Add stop ${idx + 1}`}
                     autoFocus={activeSearchField === `stop-${idx}`}
                   />
                   <X size={16} className="text-muted cursor-pointer" onClick={(e) => { 
                      e.stopPropagation(); 
                      const newStops = [...extraStops];
                      newStops.splice(idx, 1);
                      setExtraStops(newStops);
                      setActiveSearchField('dropoff'); 
                   }} />
                 </div>
               ))}
               
               {/* Dropoff Input */}
               <div className={`flex items-center gap-3 p-2 rounded-lg bg-surface-light`} onClick={() => setActiveSearchField('dropoff')}>
                 <MapPin size={16} className="text-danger relative z-10 bg-surface-light" style={{ marginLeft: '-4px' }} />
                 <input 
                   type="text"
                   className="input flex-1 m-0"
                   value={activeSearchField === 'dropoff' ? searchQuery : dropoff.name}
                   onChange={(e) => activeSearchField === 'dropoff' && setSearchQuery(e.target.value)}
                   placeholder="Where to?"
                   autoFocus={activeSearchField === 'dropoff'}
                 />
                 {extraStops.length < 5 && (
                    <PlusCircle size={16} className="text-primary cursor-pointer" onClick={(e) => { 
                       e.stopPropagation(); 
                       setExtraStops([...extraStops, null]);
                       setActiveSearchField(`stop-${extraStops.length}`); 
                    }} />
                 )}
               </div>
            </div>
          </div>
          
          <div className="search-results">
             {searchResults.map((item, idx) => (
                <div key={idx} className="search-item" onClick={() => handleSelectLocation(item)}>
                  <div className="bg-gray-100 p-2 rounded-full"><MapPin size={18} className="text-muted" /></div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{item.display_name.split(',')[0]}</span>
                    <span className="text-xs text-muted truncate max-w-[280px]">{item.display_name}</span>
                  </div>
                </div>
             ))}
             {searchResults.length === 0 && searchQuery.length > 2 && (
                <div className="text-center p-4 text-muted">No results found</div>
             )}
          </div>
        </div>
      )}

      {/* Dashboard Home Screen */}
      {uiState === 'home' && (
         <div className="absolute inset-0 bg-bg-color z-[2000] flex flex-col animate-fade-in pb-20 overflow-y-auto">
            {/* Top Emerald Header */}
            <div className="bg-primary pt-12 pb-24 px-4 text-white rounded-b-[40px] relative shadow-lg">
               <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-2">
                     <Shield size={28} className="text-white" />
                     <h2 className="m-0 text-white font-black tracking-tight text-2xl">RideSafe</h2>
                  </div>
                  <div className="flex gap-4">
                     <div className="relative cursor-pointer" onClick={() => setShowRewards(true)}>
                        <Star size={24} fill="currentColor" className="text-yellow-300" />
                        <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{safePoints}</span>
                     </div>
                     <User size={24} className="cursor-pointer" onClick={() => setShowProfile(true)} />
                  </div>
               </div>
            </div>

            {/* Floating Wallet Card */}
            <div className="px-4 -mt-16 relative z-20 mb-6">
               <div className="glass-card bg-white p-5 rounded-3xl flex justify-between items-center shadow-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <Wallet size={24} />
                     </div>
                     <div>
                        <div className="text-xs text-muted font-bold uppercase mb-1">RideSafe Pay</div>
                        <div className="text-xl font-black text-gray-800">₱ {walletBalance.toFixed(2)}</div>
                     </div>
                  </div>
                  <button className="btn btn-primary py-2 px-4 rounded-full text-sm shadow-md" onClick={() => setShowWallet(true)}>
                     Top Up
                  </button>
               </div>
            </div>

            {/* Services Grid */}
            <div className="px-4 mb-6">
               <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                  <div className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105" onClick={() => { setServiceType('ride'); setUiState('idle'); }}>
                     <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 relative">
                        <img src="https://cdn-icons-png.flaticon.com/512/1048/1048314.png" className="w-10 h-10" />
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">HOT</span>
                     </div>
                     <span className="text-xs font-bold text-gray-700">MC Taxi</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105" onClick={() => { setServiceType('ride'); setUiState('idle'); }}>
                     <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                        <img src="https://cdn-icons-png.flaticon.com/512/3204/3204121.png" className="w-10 h-10" />
                     </div>
                     <span className="text-xs font-bold text-gray-700">Car</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105" onClick={() => { setServiceType('pool'); setUiState('idle'); }}>
                     <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 shadow-sm border border-green-100">
                        <Users size={28} />
                     </div>
                     <span className="text-xs font-bold text-gray-700">Pool</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105" onClick={() => { setServiceType('express'); setUiState('idle'); }}>
                     <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 shadow-sm border border-orange-100 relative">
                        <Package size={28} />
                     </div>
                     <span className="text-xs font-bold text-gray-700">Delivery</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105" onClick={() => { setServiceType('food'); setUiState('idle'); }}>
                     <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 shadow-sm border border-red-100">
                        <Utensils size={28} />
                     </div>
                     <span className="text-xs font-bold text-gray-700">Food</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105" onClick={() => { setServiceType('mart'); setUiState('idle'); }}>
                     <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 shadow-sm border border-teal-100">
                        <ShoppingCart size={28} />
                     </div>
                     <span className="text-xs font-bold text-gray-700">Mart</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105" onClick={() => { setServiceType('pabili'); setUiState('idle'); }}>
                     <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 shadow-sm border border-purple-100">
                        <ShoppingBag size={28} />
                     </div>
                     <span className="text-xs font-bold text-gray-700">Pabili</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105" onClick={() => setShowPlus(true)}>
                     <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-600 shadow-sm border border-yellow-100 relative">
                        <Sparkles size={28} />
                        <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">NEW</span>
                     </div>
                     <span className="text-xs font-bold text-gray-700">More</span>
                  </div>
               </div>
            </div>

            {/* Promo Carousel */}
            <div className="px-4 mb-8">
               <h3 className="text-lg font-bold mb-3 text-gray-800">Exclusive Promos</h3>
               <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
                  <div className="min-w-[280px] h-40 bg-gradient-to-r from-primary to-green-400 rounded-3xl p-5 text-white shadow-md relative overflow-hidden flex flex-col justify-center">
                     <div className="absolute right-0 bottom-0 opacity-20"><Shield size={120} className="-mr-4 -mb-4"/></div>
                     <h2 className="text-2xl font-black m-0 mb-1 relative z-10">50% OFF</h2>
                     <p className="text-sm opacity-90 m-0 mb-3 relative z-10">Your first Carpool match!</p>
                     <button className="bg-white text-primary font-bold py-2 px-4 rounded-full text-xs w-max relative z-10 shadow-sm" onClick={() => { setServiceType('pool'); setUiState('idle'); }}>BOOK NOW</button>
                  </div>
                  <div className="min-w-[280px] h-40 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-5 text-white shadow-md relative overflow-hidden flex flex-col justify-center">
                     <div className="absolute right-0 bottom-0 opacity-20"><Wallet size={120} className="-mr-4 -mb-4"/></div>
                     <h2 className="text-2xl font-black m-0 mb-1 relative z-10">0% FEES</h2>
                     <p className="text-sm opacity-90 m-0 mb-3 relative z-10">Pay Meralco via RideSafe Pay</p>
                     <button className="bg-white text-blue-600 font-bold py-2 px-4 rounded-full text-xs w-max relative z-10 shadow-sm" onClick={() => setShowWallet(true)}>PAY BILLS</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Fixed Bottom Navigation (Dashboard only) */}
      {uiState === 'home' && (
         <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-[2500] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-6">
            <div className="flex flex-col items-center gap-1 text-primary cursor-pointer">
               <Home size={24} fill="currentColor" />
               <span className="text-[10px] font-bold">Home</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-muted hover:text-primary cursor-pointer transition-colors" onClick={() => setShowHistory(true)}>
               <History size={24} />
               <span className="text-[10px] font-bold">Orders</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-muted hover:text-primary cursor-pointer transition-colors" onClick={() => setShowWallet(true)}>
               <Wallet size={24} />
               <span className="text-[10px] font-bold">Wallet</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-muted hover:text-primary cursor-pointer transition-colors" onClick={() => setShowProfile(true)}>
               <User size={24} />
               <span className="text-[10px] font-bold">Profile</span>
            </div>
         </div>
      )}

      {/* Top Bar (Map View) */}
      {uiState !== 'searching' && uiState !== 'home' && (
        <div className="p-4" style={{ position: 'absolute', top: 0, width: '100%', zIndex: 1000, background: `linear-gradient(${isBusinessMode ? '#1e293b' : 'var(--bg-color)'}, transparent)` }}>
          <div className="flex justify-between items-center w-full mb-2">
            <div className={`glass-card shadow-sm flex items-center justify-center p-2 rounded-full cursor-pointer bg-white text-gray-800`} style={{ padding: '0.5rem', borderRadius: '50%' }} onClick={() => setUiState('home')}>
               <ArrowLeft size={20} />
            </div>
            <div className="flex items-center gap-2">
              <div className="glass-card flex items-center gap-1 cursor-pointer" style={{ padding: '0.5rem', borderRadius: '50%' }} onClick={() => setShowSafety(true)}>
                 <Shield size={20} className="text-green-500" />
              </div>
              <div className={`glass-card flex items-center gap-1 cursor-pointer font-bold ${isSubscribed ? 'text-yellow-500 border border-yellow-400 bg-yellow-50' : 'text-primary'}`} style={{ padding: '0.5rem 1rem', borderRadius: '20px' }} onClick={() => setShowPlus(true)}>
                 {isSubscribed ? <Sparkles size={16} fill="currentColor"/> : <Sparkles size={16}/>} Plus
              </div>
              <div className="glass-card flex items-center gap-1 cursor-pointer" style={{ padding: '0.5rem 1rem', borderRadius: '20px' }} onClick={() => setShowRewards(true)}>
                 <Star size={16} className="text-yellow-500" /> {safePoints}
              </div>
              <div className="glass-card flex items-center gap-1 cursor-pointer" style={{ padding: '0.5rem 1rem', borderRadius: '20px' }} onClick={fetchHistory}><History size={16}/></div>
              <div className="glass-card flex items-center gap-1 cursor-pointer" style={{ padding: '0.5rem 1rem', borderRadius: '20px' }} onClick={() => setShowWallet(true)}>
                <Wallet size={16} className="text-primary"/> ₱ {walletBalance.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map or Lite Mode Placeholder */}
      <div style={{ flex: 1, position: 'relative' }}>
        {liteMode ? (
           <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center p-6 text-center">
              <Shield size={48} className="text-gray-300 mb-4" />
              <h3 className="text-gray-500 mb-2">{t('liteMode')}</h3>
              <p className="text-gray-400 text-sm mb-6">The live map has been disabled to save mobile data and battery life.</p>
              
              <button className="btn bg-white border border-gray-300 text-primary flex items-center gap-2" onClick={() => {
                 const smsBody = `RIDESAFE PICKUP: ${pickup.name || 'Current'} DROPOFF: ${dropoff.name || 'Dest'}`;
                 window.location.href = `sms:2346?body=${encodeURIComponent(smsBody)}`;
              }}>
                 <MessageSquare size={18} /> Book via SMS (Offline)
              </button>
           </div>
        ) : (
           <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
             <TileLayer
               url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
               attribution='&copy; CARTO'
             />
             <MapUpdater center={mapCenter} zoom={mapZoom} />

          {/* Idle State Marker */}
          {uiState === 'idle' && (
             <>
               <Marker position={position} icon={pickupIcon}>
                 <Popup>You are here</Popup>
               </Marker>
               {/* Mock Idle Drivers */}
               <Marker position={[position[0] + 0.002, position[1] + 0.002]} icon={driverIcon} opacity={0.6} />
               <Marker position={[position[0] - 0.003, position[1] + 0.001]} icon={driverIcon} opacity={0.6} />
               <Marker position={[position[0] + 0.001, position[1] - 0.004]} icon={driverIcon} opacity={0.6} />
             </>
          )}

          {/* Preview State Markers & Route */}
          {(uiState === 'preview' || uiState === 'finding' || uiState === 'booked') && pickup.coords && dropoff.coords && (
             <RoutingMachine 
               waypoints={[pickup.coords, ...extraStops.filter(s => s?.coords).map(s => s.coords), dropoff.coords]}
               onRouteFound={handleRouteFound} 
             />
          )}

          {/* Driver Marker */}
          {driverPosition && uiState === 'booked' && (
            <Marker position={driverPosition} icon={driverIcon}>
               <Popup>Your Driver</Popup>
            </Marker>
          )}

          {/* Community Map Markers */}
          {uiState === 'idle' && (
            <>
               <Marker position={[position[0] + 0.005, position[1] - 0.005]} icon={new L.Icon({iconUrl: 'https://cdn-icons-png.flaticon.com/512/3282/3282224.png', iconSize: [30,30]})}>
                  <Popup>Traffic Alert: Heavy Traffic</Popup>
               </Marker>
               <Marker position={[position[0] - 0.008, position[1] + 0.002]} icon={new L.Icon({iconUrl: 'https://cdn-icons-png.flaticon.com/512/564/564245.png', iconSize: [30,30]})}>
                  <Popup>Hazard: Flooded Area</Popup>
               </Marker>
            </>
          )}
        </MapContainer>
        )}

      {/* Community FAB (Only when on map view) */}
      {uiState === 'idle' && (
         <button 
           className="absolute bottom-6 right-4 z-[1000] bg-white text-primary p-4 rounded-full shadow-lg border-2 border-primary/20 hover:scale-105 transition-transform flex items-center justify-center"
           onClick={() => setShowCommunity(true)}
         >
            <Users size={24} />
         </button>
      )}
      </div>

      {/* Idle Bottom Sheet */}
      {uiState === 'idle' && (
         <div className="bottom-sheet sheet-visible">
            <div className="bottom-sheet-handle"></div>
            
            <div className="flex bg-surface-light p-1 rounded-xl mb-4 border border-gray-100 shadow-sm overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
               <button className={`flex-1 min-w-[70px] py-2 rounded-lg font-bold transition-all ${serviceType === 'ride' ? 'bg-primary text-white shadow-sm' : 'text-muted'}`} onClick={() => setServiceType('ride')}>Ride</button>
               <button className={`flex-1 min-w-[70px] py-2 rounded-lg font-bold transition-all ${serviceType === 'pool' ? 'bg-green-500 text-white shadow-sm' : 'text-muted'}`} onClick={() => setServiceType('pool')}>Pool</button>
               <button className={`flex-1 min-w-[70px] py-2 rounded-lg font-bold transition-all ${serviceType === 'express' ? 'bg-orange-500 text-white shadow-sm' : 'text-muted'}`} onClick={() => setServiceType('express')}>Express</button>
               <button className={`flex-1 min-w-[70px] py-2 rounded-lg font-bold transition-all ${serviceType === 'food' ? 'bg-red-500 text-white shadow-sm' : 'text-muted'}`} onClick={() => setServiceType('food')}>Eats</button>
               <button className={`flex-1 min-w-[70px] py-2 rounded-lg font-bold transition-all ${serviceType === 'pabili' ? 'bg-purple-500 text-white shadow-sm' : 'text-muted'}`} onClick={() => setServiceType('pabili')}>Pabili</button>
               <button className={`flex-1 min-w-[70px] py-2 rounded-lg font-bold transition-all ${serviceType === 'mart' ? 'bg-teal-500 text-white shadow-sm' : 'text-muted'}`} onClick={() => setServiceType('mart')}>Mart</button>
            </div>

            {serviceType === 'pabili' ? (
               <div className="animate-fade-in pb-4">
                  <h3 className="mb-3">Buy For Me (Pabili)</h3>
                  <div className="flex flex-col gap-3">
                     <input type="text" className="form-input m-0" placeholder="Store Name (e.g. 7-Eleven, Mercury Drug)" value={pabiliDetails.store} onChange={e => setPabiliDetails({...pabiliDetails, store: e.target.value})} />
                     <textarea className="form-input m-0" placeholder="List of items to buy..." rows="3" value={pabiliDetails.items} onChange={e => setPabiliDetails({...pabiliDetails, items: e.target.value})}></textarea>
                     <input type="number" className="form-input m-0" placeholder="Estimated Budget (₱)" value={pabiliDetails.estimatedCost} onChange={e => setPabiliDetails({...pabiliDetails, estimatedCost: e.target.value})} />
                     <button className="btn btn-primary btn-block py-3 bg-purple-500 border-purple-500 shadow-[0_4px_14px_0_rgba(168,85,247,0.39)]" onClick={() => {
                         if(!pabiliDetails.store || !pabiliDetails.items) return alert('Please fill in store and items.');
                         setUiState('finding');
                         setFare(89); // Pabili base fee
                         if (channel) {
                           channel.send({
                             type: 'broadcast',
                             event: 'ride_request',
                             payload: {
                               customerId: currentUser?.id,
                               customerName: currentUser?.user_metadata?.full_name || 'Customer',
                               pickupName: pabiliDetails.store,
                               dropoffName: homeAddress || 'Home',
                               fare: 89,
                               vehicleType: 'RideSafe Moto',
                               serviceType: 'pabili',
                               packageDetails: { item: `Pabili from ${pabiliDetails.store}: ${pabiliDetails.items}` }
                             }
                           });
                         }
                     }}>Request Pabili • ₱89 Base Fee</button>
                  </div>
               </div>
            ) : serviceType === 'mart' ? (
               <div className="animate-fade-in pb-4">
                  <h3 className="mb-3 flex items-center gap-2 text-green-600"><ShoppingCart size={20}/> RideSafe Mart</h3>
                  <div className="grid grid-cols-2 gap-3 max-h-[250px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                     {groceries.map(item => (
                        <div key={item.id} className="border border-gray-100 rounded-xl p-3 bg-surface-color shadow-sm flex flex-col items-center text-center">
                           <img src={item.img} alt={item.name} className="w-12 h-12 mb-2" />
                           <span className="font-bold text-sm mb-1">{item.name}</span>
                           <span className="text-xs text-muted mb-2">₱{item.price}</span>
                           <button className="btn btn-outline py-1 px-3 text-xs rounded-full border-green-500 text-green-600 hover:bg-green-50" onClick={() => setMartCart([...martCart, item])}>Add</button>
                        </div>
                     ))}
                  </div>
                  {martCart.length > 0 && (
                     <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="flex justify-between font-bold mb-2">
                           <span>Mart Cart ({martCart.length})</span>
                           <span>₱{martCart.reduce((sum, item) => sum + item.price, 0)}</span>
                        </div>
                        <button className="btn btn-primary btn-block py-3 border-green-500 shadow-[0_4px_14px_0_rgba(34,197,94,0.39)]" style={{ background: '#22c55e' }} onClick={() => {
                           setUiState('finding');
                           const totalFare = martCart.reduce((sum, item) => sum + item.price, 0) + 59; // 59 Delivery
                           setFare(totalFare);
                           if (channel) {
                             channel.send({
                               type: 'broadcast',
                               event: 'ride_request',
                               payload: {
                                 customerId: currentUser?.id,
                                 customerName: currentUser?.user_metadata?.full_name || 'Customer',
                                 pickupName: 'RideSafe Mart',
                                 dropoffName: homeAddress || 'Home',
                                 fare: totalFare,
                                 vehicleType: 'RideSafe Moto',
                                 serviceType: 'mart',
                                 packageDetails: { item: `${martCart.length} grocery items` }
                               }
                             });
                           }
                        }}>
                           Checkout • ₱{martCart.reduce((sum, item) => sum + item.price, 0) + 59} (incl. ₱59 fee)
                        </button>
                     </div>
                  )}
               </div>
            ) : serviceType === 'food' ? (
               <div className="animate-fade-in pb-4">
                  {!selectedRestaurant ? (
                    <>
                       <h3 className="mb-3">Cravings? We got you.</h3>
                       <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                         {restaurants.map(r => (
                            <div key={r.id} className="min-w-[140px] border border-gray-100 rounded-xl p-3 cursor-pointer shadow-sm bg-surface-color" onClick={() => setSelectedRestaurant(r)}>
                               <img src={r.img} alt={r.name} className="w-12 h-12 mb-2" />
                               <h4 className="m-0 text-sm">{r.name}</h4>
                               <div className="flex justify-between items-center mt-1">
                                  <span className="text-xs text-muted">{r.category}</span>
                                  <span className="text-xs font-bold text-yellow-500 flex items-center gap-1"><Star size={10} fill="currentColor"/>{r.rating}</span>
                               </div>
                            </div>
                         ))}
                       </div>
                    </>
                  ) : (
                    <>
                       <div className="flex items-center gap-2 mb-3 cursor-pointer" onClick={() => setSelectedRestaurant(null)}>
                          <ChevronLeft size={18} className="text-primary" /> <span className="text-sm font-bold text-primary">Back</span>
                       </div>
                       <h3 className="mb-2">{selectedRestaurant.name} Menu</h3>
                       <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                          {selectedRestaurant.menu.map(item => (
                             <div key={item.id} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 bg-surface-color">
                                <div>
                                   <div className="font-bold text-sm">{item.name}</div>
                                   <div className="text-xs text-muted">₱{item.price}</div>
                                </div>
                                <button className="btn btn-primary p-1 rounded-full w-8 h-8 flex items-center justify-center" onClick={() => setFoodCart([...foodCart, item])}><PlusCircle size={16}/></button>
                             </div>
                          ))}
                       </div>
                       
                       {foodCart.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-gray-200">
                             <div className="flex justify-between font-bold mb-2">
                                <span>Cart ({foodCart.length})</span>
                                <span>₱{foodCart.reduce((sum, item) => sum + item.price, 0)}</span>
                             </div>
                             <button className="btn btn-primary btn-block py-3 border-red-500 shadow-[0_4px_14px_0_rgba(239,68,68,0.39)]" style={{ background: '#ef4444' }} onClick={() => {
                                setUiState('finding');
                                const totalFare = foodCart.reduce((sum, item) => sum + item.price, 0) + 49;
                                setFare(totalFare);
                                if (channel) {
                                  channel.send({
                                    type: 'broadcast',
                                    event: 'ride_request',
                                    payload: {
                                      customerId: currentUser?.id,
                                      customerName: currentUser?.user_metadata?.full_name || 'Customer',
                                      pickupName: selectedRestaurant.name,
                                      dropoffName: homeAddress || 'Home',
                                      fare: totalFare,
                                      vehicleType: 'RideSafe Moto',
                                      serviceType: 'food',
                                      packageDetails: { item: `${foodCart.length} items from ${selectedRestaurant.name}` }
                                    }
                                  });
                                }
                             }}>
                                Checkout • ₱{foodCart.reduce((sum, item) => sum + item.price, 0) + 49} (incl. ₱49 fee)
                             </button>
                          </div>
                       )}
                    </>
                  )}
               </div>
            ) : (
               <>
                 <h2 className="mb-4">{serviceType === 'ride' ? 'Where to?' : serviceType === 'pool' ? 'Share a Ride To' : 'Deliver Package To'}</h2>
                 
                 {serviceType === 'pool' && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl mb-4 text-sm flex gap-2">
                       <Users size={20} className="shrink-0" />
                       <span>Carpooling saves up to 50% on fare and helps reduce traffic! Matches take 1-3 mins.</span>
                    </div>
                 )}
                 
                 <div className="bg-surface-light rounded-2xl p-4 flex items-center gap-3 cursor-pointer shadow-sm border border-gray-100" 
                      onClick={() => { setActiveSearchField('dropoff'); setUiState('searching'); }}>
                    <Search className="text-primary" size={24} />
                    <span className="text-lg font-semibold text-gray-500">Search destination...</span>
                 </div>
                 
                 <div className="flex justify-between items-center mt-4 mb-2 px-1">
                    <span className="text-sm font-bold text-gray-500">Suggested</span>
                    <span className="text-xs text-primary bg-blue-100 px-2 py-1 rounded-full flex items-center gap-1"><Sparkles size={12}/> AI Powered</span>
                 </div>
                 
                 {/* Quick Suggestions */}
                 <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                    <div className="flex flex-col items-center gap-1 min-w-[70px] cursor-pointer" onClick={() => {
                       if (homeAddress) {
                          handleSelectLocation({display_name: homeAddress, lat: 15.7909, lon: 120.9859});
                       }
                    }}>
                       <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-primary"><MapPin /></div>
                       <span className="text-xs font-semibold">Home</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 min-w-[70px] cursor-pointer" onClick={() => {
                       if (workAddress) {
                          handleSelectLocation({display_name: workAddress, lat: 15.7800, lon: 120.9800});
                       }
                    }}>
                       <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-primary"><MapPin /></div>
                       <span className="text-xs font-semibold">Work</span>
                    </div>
                 </div>
               </>
            )}
         </div>
      )}

      {/* Preview Bottom Sheet */}
      {uiState === 'preview' && (
         <div className="bottom-sheet sheet-visible">
            <div className="bottom-sheet-handle"></div>
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="m-0">Select Ride</h3>
              <div className="bg-surface-light p-2 rounded-lg cursor-pointer" onClick={() => setUiState('idle')}><X size={20}/></div>
            </div>

            {routeInfo ? (
              <div className="flex flex-col gap-4 animate-fade-in">
                {/* Vehicle Selection */}
                <div className="flex gap-4 overflow-x-auto pb-2 pt-2" style={{ scrollbarWidth: 'none' }}>
                  {vehicleTypes.map(v => (
                     <div key={v.id} 
                          className={`flex flex-col items-center justify-center p-3 rounded-xl min-w-[100px] cursor-pointer transition-all ${selectedVehicle.id === v.id ? 'border-2 border-primary bg-primary/10' : 'border border-gray-200 bg-surface-color opacity-70'}`}
                          onClick={() => setSelectedVehicle(v)}
                     >
                        <img src={v.icon} alt={v.name} className="w-10 h-10 mb-2" />
                        <span className="text-xs font-bold text-main">{v.name}</span>
                     </div>
                  ))}
                </div>

                {/* Ride Option Card */}
                <div className={`border-2 ${isBusinessMode ? 'border-blue-500 bg-blue-500/10' : 'border-primary bg-primary/10'} rounded-xl p-4 flex justify-between items-center`}>
                  <div className="flex items-center gap-4">
                    <img src={selectedVehicle.icon} alt={selectedVehicle.name} className="w-12 h-12" />
                    <div>
                      <h4 className="m-0">{selectedVehicle.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span>{Math.round(routeInfo.summary.totalTime / 60)} mins</span>
                        <span>•</span>
                        <span>{(routeInfo.summary.totalDistance / 1000).toFixed(1)} km</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right cursor-pointer select-none" onClick={() => setShowFareBreakdown(!showFareBreakdown)}>
                     {discount > 0 && <div className="text-xs text-danger" style={{ textDecoration: 'line-through' }}>₱{Math.round((selectedVehicle.base + (baseDistance * 15 * selectedVehicle.multiplier)) * surgeMultiplier)}</div>}
                     <div className="flex items-center gap-1 justify-end">
                       <h3 className="m-0 text-primary">₱{fare}</h3>
                       <Info size={14} className="text-muted" />
                     </div>
                     {surgeMultiplier > 1.1 && <span className="text-xs text-orange-500 font-bold flex items-center gap-1 justify-end mt-1"><TrendingUp size={10}/> {t('highDemand')}</span>}
                  </div>
                </div>

                {/* Fare Breakdown Popup */}
                {showFareBreakdown && (
                  <div className="bg-surface-color p-3 rounded-xl border border-gray-200 text-sm shadow-sm mt-[-10px] mb-2 animate-fade-in relative z-10 text-main">
                     <div className="flex justify-between mb-1">
                        <span className="text-muted">{t('baseFare')}</span>
                        <span>₱{selectedVehicle.base}</span>
                     </div>
                     <div className="flex justify-between mb-1">
                        <span className="text-muted">{t('distance', { distance: baseDistance.toFixed(1) })}</span>
                        <span>₱{Math.round(baseDistance * 15 * selectedVehicle.multiplier)}</span>
                     </div>
                     {extraStops.filter(s => s?.coords).length > 0 && (
                        <div className="flex justify-between mb-1 text-orange-600">
                           <span>Extra Stops ({extraStops.filter(s => s?.coords).length})</span>
                           <span>+₱{extraStops.filter(s => s?.coords).length * 30}</span>
                        </div>
                     )}
                     {surgeMultiplier > 1.1 && (
                       <div className="flex justify-between mb-1 text-orange-500">
                          <span>{t('surge')}</span>
                          <span>x{surgeMultiplier.toFixed(1)}</span>
                       </div>
                     )}
                     {discount > 0 && (
                       <div className="flex justify-between mb-1 text-danger">
                          <span>{t('discount')}</span>
                          <span>-₱{discount}</span>
                       </div>
                     )}
                     <div className="border-t pt-1 mt-1 flex justify-between font-bold">
                        <span>{t('totalFare')}</span>
                        <span className="text-primary">₱{fare}</span>
                     </div>
                  </div>
                )}

                {/* V7.0 Tawad Bidding Input */}
                {!isBusinessMode && (
                   <div className="flex flex-col gap-2 mb-3 bg-surface-light p-3 rounded-xl border border-gray-100">
                     <div className="flex items-center gap-2">
                       <span className="text-sm font-bold flex-1 text-primary">{t('nameYourFare')}</span>
                       <span className="text-xs text-muted">{t('optional')}</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <span className="font-bold text-lg text-muted">₱</span>
                       <input 
                         type="number" 
                         className="form-input flex-1 m-0" 
                         placeholder={`${t('suggested')}: ₱${fare}`} 
                         value={targetFare} 
                         onChange={e => setTargetFare(e.target.value)} 
                       />
                     </div>
                     <p className="text-xs text-muted m-0 leading-tight">{t('biddingHelper')}</p>
                   </div>
                )}

                {/* Split Fare & Promo */}
                <div className="flex gap-2">
                  <button className="btn btn-outline flex-1 flex items-center justify-center gap-2 text-sm" onClick={() => {
                     const friend = prompt(t('enterFriendUsername'));
                     if (friend) {
                        alert(t('fareSplitSent', { friend }));
                     }
                  }}>
                     <Users size={16}/> {t('splitFare')}
                  </button>
                  <div className="flex gap-2 flex-[2]">
                    <input type="text" className="form-input flex-1 m-0 text-sm" placeholder={t('promoCode')} value={promoCode} onChange={e => setPromoCode(e.target.value)} />
                    <button className="btn btn-outline py-2 px-4" onClick={applyPromoCode}>{t('apply')}</button>
                  </div>
                </div>

                {/* Schedule & Recurring Input */}
                <div className="flex flex-col gap-2 mb-3 bg-surface-light p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-primary"/>
                    <span className="text-sm font-bold flex-1">{t('scheduleRide')}</span>
                    {scheduledTime && <button className="btn btn-outline py-1 px-2 text-xs" onClick={() => {setScheduledTime(''); setRecurrence('none');}}>{t('clear')}</button>}
                  </div>
                  <input type="datetime-local" className="form-input m-0 text-sm py-2" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
                  {scheduledTime && (
                    <select className="form-input m-0 text-sm py-2" value={recurrence} onChange={e => setRecurrence(e.target.value)}>
                      <option value="none">{t('oneTimeOnly')}</option>
                      <option value="daily">{t('everyDay')}</option>
                      <option value="weekdays">{t('everyWeekday')}</option>
                      <option value="weekly">{t('everyWeek')}</option>
                    </select>
                  )}
                </div>

                {serviceType === 'express' && (
                   <div className="flex flex-col gap-2 bg-orange-50 p-3 rounded-xl border border-orange-100 mb-2">
                     <h4 className="m-0 text-orange-600">{t('packageDetails')}</h4>
                     <input type="text" className="form-input text-sm m-0" placeholder={t('itemDescription')} value={packageDetails.item} onChange={e => setPackageDetails({...packageDetails, item: e.target.value})} />
                     <input type="text" className="form-input text-sm m-0" placeholder={t('weight')} value={packageDetails.weight} onChange={e => setPackageDetails({...packageDetails, weight: e.target.value})} />
                     <input type="text" className="form-input text-sm m-0" placeholder={t('recipientName')} value={packageDetails.recipientName} onChange={e => setPackageDetails({...packageDetails, recipientName: e.target.value})} />
                     <input type="tel" className="form-input text-sm m-0" placeholder={t('recipientPhone')} value={packageDetails.recipientPhone} onChange={e => setPackageDetails({...packageDetails, recipientPhone: e.target.value})} />
                   </div>
                )}

                <button className={`btn btn-block text-lg py-4 ${isBusinessMode ? 'bg-blue-600 border-blue-600 text-white' : 'btn-primary'}`} style={serviceType === 'express' && !isBusinessMode ? { background: 'var(--orange)', borderColor: 'var(--orange)' } : {}} onClick={handleFindDriver}>
                  {scheduledTime ? `${t('schedule')} ${selectedVehicle.name}` : isBusinessMode ? `${t('book')} • ${t('billedCorporate')}` : `${t('book')} ${selectedVehicle.name}`}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6">
                <div className="loading-spinner mb-2"></div>
                <p className="text-muted text-sm">{t('calculatingRoute')}</p>
              </div>
            )}
         </div>
      )}

      {/* Finding Driver Bottom Sheet */}
      {uiState === 'finding' && (
         <div className="bottom-sheet sheet-visible text-center" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="bottom-sheet-handle"></div>
            
            {driverBids.length > 0 && serviceType !== 'pool' ? (
               <div className="text-left animate-fade-in">
                  <h2 className="mb-1 text-primary">{t('incomingBids')}</h2>
                  <p className="text-muted text-sm mb-4">{t('selectDriver')}</p>
                  <div className="flex flex-col gap-3 mb-6">
                     {driverBids.map((bid, i) => (
                        <div key={i} className="border border-primary/20 bg-blue-50 p-4 rounded-xl flex justify-between items-center animate-fade-in shadow-sm">
                           <div>
                              <div className="font-bold text-lg">{bid.name}</div>
                              <div className="flex items-center gap-2 text-xs text-muted mt-1">
                                 <span className="flex items-center text-yellow-600"><Star size={12} fill="currentColor"/> {bid.rating}</span>
                                 <span>•</span>
                                 <span>{bid.eta} {t('away')}</span>
                              </div>
                           </div>
                           <div className="text-right">
                              <h3 className="m-0 text-primary mb-1">₱{bid.fare}</h3>
                              <button className="btn btn-primary py-1 px-4 text-sm" onClick={() => {
                                 setFare(bid.fare);
                                 setDriverPosition([pickup.coords[0] + 0.002, pickup.coords[1] + 0.002]);
                                 setUiState('booked');
                              }}>{t('accept')}</button>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            ) : serviceType === 'pool' ? (
               <>
                  <h2 className="mb-2 text-blue-600">Scanning for Co-Riders</h2>
                  <p className="text-muted mb-6">Finding people heading the same way...</p>
                  
                  <div className="relative w-48 h-48 mx-auto mb-6 flex items-center justify-center">
                     <div className="absolute inset-0 rounded-full border border-blue-400 opacity-20 animate-[ping_2s_ease-out_infinite]"></div>
                     <div className="absolute inset-4 rounded-full border border-blue-400 opacity-40 animate-[ping_2s_ease-out_infinite]" style={{ animationDelay: '0.4s' }}></div>
                     <div className="absolute inset-8 rounded-full border border-blue-400 opacity-60 animate-[ping_2s_ease-out_infinite]" style={{ animationDelay: '0.8s' }}></div>
                     
                     <div className="z-10 w-16 h-16 bg-blue-500 rounded-full shadow-lg flex items-center justify-center text-white">
                        <Users size={32} />
                     </div>

                     {/* Mock Matched Users appearing after a delay */}
                     <div className="absolute top-0 right-0 animate-fade-in w-10 h-10 bg-white border-2 border-green-500 rounded-full shadow flex items-center justify-center" style={{ animationDelay: '1.5s', animationFillMode: 'both' }}>
                        <img src="https://i.pravatar.cc/100?img=1" className="w-full h-full rounded-full" alt="Sarah" />
                     </div>
                     <div className="absolute bottom-4 left-0 animate-fade-in w-10 h-10 bg-white border-2 border-green-500 rounded-full shadow flex items-center justify-center" style={{ animationDelay: '2.5s', animationFillMode: 'both' }}>
                        <img src="https://i.pravatar.cc/100?img=11" className="w-full h-full rounded-full" alt="Mark" />
                     </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-left mb-6 animate-fade-in" style={{ animationDelay: '3s', animationFillMode: 'both' }}>
                     <h4 className="m-0 mb-2 text-blue-800 flex items-center gap-2"><CheckCircle size={16} /> Pool Match Found!</h4>
                     <p className="text-sm text-blue-700 mb-3">Matched with <strong>Sarah D.</strong> and <strong>Mark L.</strong></p>
                     <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-blue-100">
                        <div>
                           <div className="text-xs text-muted uppercase font-bold">Your Split Fare</div>
                           <div className="text-xl font-black text-primary line-through opacity-50 mr-2">₱{fare}</div>
                        </div>
                        <div className="text-right">
                           <div className="text-xs text-green-600 uppercase font-bold mb-1">Savings 60%</div>
                           <div className="text-2xl font-black text-green-600">₱{Math.round(fare * 0.4)}</div>
                        </div>
                     </div>
                     <button className="btn btn-primary btn-block py-3 mt-3 bg-blue-600 border-blue-600 text-white" onClick={() => {
                        setFare(Math.round(fare * 0.4));
                        setDriverPosition([pickup.coords[0] + 0.002, pickup.coords[1] + 0.002]);
                        setUiState('booked');
                     }}>Confirm & Ride</button>
                  </div>
               </>
            ) : (
               <>
                  <h2 className="mb-2">{t('findingDriver')}</h2>
                  <p className="text-muted mb-6">{t('connecting')}</p>
                  
                  <div className="relative w-32 h-32 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-primary opacity-20 animate-ping"></div>
                    <div className="absolute inset-2 rounded-full border-4 border-primary opacity-40 animate-ping" style={{ animationDelay: '0.2s' }}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="https://cdn-icons-png.flaticon.com/512/1048/1048314.png" className="w-16 h-16 animate-bounce" alt="Moto" />
                    </div>
                  </div>
               </>
            )}

            <button className="btn btn-outline btn-block text-danger border-danger hover:bg-red-50 hover:text-danger" onClick={() => {
               setUiState('preview');
               setDriverBids([]);
            }}>
               {t('cancel')}
            </button>
         </div>
      )}

      {/* Booked / Active Ride Bottom Sheet */}
      {uiState === 'booked' && (
         <div className="bottom-sheet sheet-visible">
            <div className="bottom-sheet-handle"></div>
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h3 className="m-0 mb-1">{serviceType === 'food' ? t('foodOnWay') : serviceType === 'ride' ? t('driverOnWay') : t('courierOnWay')}</h3>
                  <p className="text-sm text-muted">{t('plate')}: ABC 1234 • Yamaha NMAX</p>
               </div>
               <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">{t('arriving')}</div>
            </div>

            <div className="flex items-center gap-4 bg-surface-light p-3 rounded-xl mb-4">
               <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                 <User size={24} className="text-gray-400" />
               </div>
               <div className="flex-1">
                 <h4 className="m-0">{driverInfo?.driverName || t('kuyaJuan')}</h4>
                 <div className="flex items-center text-sm text-yellow-500 font-bold"><Star size={14} fill="currentColor"/> 4.9</div>
               </div>
               <div className="flex gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-primary cursor-pointer" onClick={() => setShowChat(true)}>
                    <MessageSquare size={18} />
                  </div>
               </div>
            </div>

            <div className="flex flex-col gap-2 border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted">{t('paymentMethod')}</span>
                <span className="font-bold flex items-center gap-1"><Wallet size={16}/> {t('wallet')}</span>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-outline flex-1 py-2 flex items-center justify-center gap-2" onClick={handleShareRide}>
                   <Share2 size={16} /> {t('share')}
                </button>
                <button className="btn flex-1 py-2 flex items-center justify-center gap-2 bg-red-100 text-danger border border-red-200" onClick={handleSOS}>
                   <ShieldAlert size={16} /> {t('sos')}
                </button>
              </div>
            </div>
         </div>
      )}

      {/* Modals... */}
      {/* Wallet / Ledger Modal (RideSafe Pay) */}
      {showWallet && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 4000, display: 'flex', alignItems: 'flex-end' }}>
          <div className="glass-card animate-slide-up w-full" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '2rem', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="m-0 flex items-center gap-2"><Wallet /> {t('ridesafePay')}</h3>
              <X className="cursor-pointer" onClick={() => setShowWallet(false)} />
            </div>

            <div className="bg-primary text-white p-5 rounded-2xl mb-6 shadow-lg bg-gradient-to-tr from-primary to-blue-700 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-20"><Wallet size={80}/></div>
               <div className="text-sm opacity-80 mb-1">{t('availableBalance')}</div>
               <h1 className="m-0 text-4xl font-bold mb-4">₱ {walletBalance.toFixed(2)}</h1>
               <div className="flex gap-2 relative z-10">
                 <input type="number" className="form-input text-black m-0 flex-1 rounded-full text-sm px-4" placeholder={t('amount')} value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} />
                 <button className="btn bg-white text-primary font-bold rounded-full px-6" onClick={handleTopUp}>{t('topUp')}</button>
               </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3 mb-6">
               <div className="flex flex-col items-center gap-2 p-3 bg-surface-light rounded-xl cursor-pointer shadow-sm border border-gray-100 transition-transform hover:scale-105" onClick={() => setShowQRScan(true)}>
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-primary shadow-inner"><Scan size={24} /></div>
                  <span className="text-xs font-bold text-center text-gray-700">{t('scanToPay')}</span>
               </div>
               <div className="flex flex-col items-center gap-2 p-3 bg-surface-light rounded-xl cursor-pointer shadow-sm border border-gray-100 transition-transform hover:scale-105" onClick={() => setShowP2P(true)}>
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-inner"><Send size={24} /></div>
                  <span className="text-xs font-bold text-center text-gray-700">{t('sendMoney')}</span>
               </div>
               <div className="flex flex-col items-center gap-2 p-3 bg-surface-light rounded-xl cursor-pointer shadow-sm border border-gray-100 transition-transform hover:scale-105" onClick={() => setShowPayBills(true)}>
                  <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shadow-inner"><Receipt size={24} /></div>
                  <span className="text-xs font-bold text-center text-gray-700">{t('payBills')}</span>
               </div>
            </div>

            {/* Sub-modals for RideSafe Pay */}
            {showP2P && (
               <div className="absolute inset-0 bg-white z-[4100] flex flex-col animate-fade-in" style={{ borderRadius: '1.5rem 1.5rem 0 0' }}>
                  <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                     <ArrowRight className="transform rotate-180 cursor-pointer" onClick={() => setShowP2P(false)} />
                     <h3 className="m-0 text-lg">Send Money</h3>
                  </div>
                  <div className="p-6 flex-1">
                     <div className="mb-6">
                        <label className="text-xs font-bold uppercase text-muted mb-1 block">Send To (Mobile Number)</label>
                        <input type="tel" className="form-input text-lg py-3" placeholder="09XX XXX XXXX" value={p2pTarget} onChange={e => setP2pTarget(e.target.value)} />
                     </div>
                     <div className="mb-6">
                        <label className="text-xs font-bold uppercase text-muted mb-1 block">Amount (₱)</label>
                        <input type="number" className="form-input text-3xl font-black py-4 text-center text-primary" placeholder="0.00" value={p2pAmount} onChange={e => setP2pAmount(e.target.value)} />
                        <div className="text-center text-xs text-muted mt-2">Available Balance: ₱{walletBalance.toFixed(2)}</div>
                     </div>
                     <button className="btn btn-primary btn-block py-4 text-lg mt-auto" onClick={() => {
                        const amt = parseFloat(p2pAmount);
                        if (!p2pTarget || p2pTarget.length < 10) return alert("Enter a valid mobile number.");
                        if (amt > 0 && amt <= walletBalance) {
                           addTransaction('transfer', -amt, `Transfer to ${p2pTarget}`);
                           supabase.from('profiles').update({ wallet_balance: walletBalance - amt }).eq('id', currentUser.id).then(() => {
                              useAppStore.setState({ walletBalance: walletBalance - amt });
                              alert(`₱${amt} sent to ${p2pTarget} successfully!`);
                              setShowP2P(false);
                              setP2pAmount('');
                              setP2pTarget('');
                           });
                        } else {
                           alert("Invalid amount or insufficient balance.");
                        }
                     }}>Send Instantly</button>
                  </div>
               </div>
            )}

            {showQRScan && (
               <div className="absolute inset-0 bg-gray-900 z-[4100] flex flex-col animate-fade-in text-white" style={{ borderRadius: '1.5rem 1.5rem 0 0' }}>
                  <div className="p-4 flex items-center gap-3">
                     <X className="cursor-pointer" onClick={() => setShowQRScan(false)} />
                     <h3 className="m-0 text-lg text-white">Scan to Pay</h3>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center p-6">
                     {/* Mock Camera Viewfinder */}
                     <div className="w-64 h-64 border-2 border-white/50 rounded-3xl relative mb-8 overflow-hidden">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl"></div>
                        <div className="absolute inset-0 bg-primary/20 animate-pulse"></div>
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-primary shadow-[0_0_10px_rgba(59,130,246,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
                     </div>
                     <p className="text-gray-300 text-center mb-6">Align QR Code within the frame to pay</p>
                     
                     <button className="btn btn-outline border-white text-white btn-block py-3" onClick={() => {
                        const merchant = prompt("Mock QR Scan: Enter Merchant Name (e.g. Jollibee)");
                        if (merchant) {
                           const amt = prompt(`Amount to pay ${merchant}?`);
                           if (amt && parseFloat(amt) > 0 && parseFloat(amt) <= walletBalance) {
                              addTransaction('payment', -parseFloat(amt), `Payment to ${merchant}`);
                              supabase.from('profiles').update({ wallet_balance: walletBalance - parseFloat(amt) }).eq('id', currentUser.id).then(() => {
                                 useAppStore.setState({ walletBalance: walletBalance - parseFloat(amt) });
                                 alert(`Successfully paid ₱${amt} to ${merchant}`);
                                 setShowQRScan(false);
                              });
                           } else {
                              alert("Invalid amount.");
                           }
                        }
                     }}>Simulate Successful Scan</button>
                  </div>
               </div>
            )}

            {showPayBills && (
               <div className="absolute inset-0 bg-gray-50 z-[4100] flex flex-col animate-fade-in" style={{ borderRadius: '1.5rem 1.5rem 0 0' }}>
                  <div className="p-4 flex items-center gap-3 bg-white border-b border-gray-200">
                     <ArrowRight className="transform rotate-180 cursor-pointer" onClick={() => setShowPayBills(false)} />
                     <h3 className="m-0 text-lg">Pay Bills</h3>
                  </div>
                  <div className="p-6 flex-1 overflow-y-auto">
                     <div className="mb-4">
                        <label className="text-xs font-bold uppercase text-muted mb-2 block">Select Biller</label>
                        <div className="grid grid-cols-2 gap-2">
                           <div className={`p-3 border rounded-xl flex flex-col items-center gap-2 cursor-pointer transition-all ${selectedBiller === 'meralco' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 bg-white'}`} onClick={() => setSelectedBiller('meralco')}>
                              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-black text-xl">M</div>
                              <span className="text-xs font-bold">Meralco</span>
                           </div>
                           <div className={`p-3 border rounded-xl flex flex-col items-center gap-2 cursor-pointer transition-all ${selectedBiller === 'maynilad' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 bg-white'}`} onClick={() => setSelectedBiller('maynilad')}>
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-black text-xl">W</div>
                              <span className="text-xs font-bold">Maynilad</span>
                           </div>
                           <div className={`p-3 border rounded-xl flex flex-col items-center gap-2 cursor-pointer transition-all ${selectedBiller === 'globe' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 bg-white'}`} onClick={() => setSelectedBiller('globe')}>
                              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-xl">G</div>
                              <span className="text-xs font-bold">Globe</span>
                           </div>
                           <div className={`p-3 border rounded-xl flex flex-col items-center gap-2 cursor-pointer transition-all ${selectedBiller === 'smart' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 bg-white'}`} onClick={() => setSelectedBiller('smart')}>
                              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-black text-xl">S</div>
                              <span className="text-xs font-bold">Smart</span>
                           </div>
                        </div>
                     </div>
                     <div className="mb-4">
                        <label className="text-xs font-bold uppercase text-muted mb-1 block">Account Number</label>
                        <input type="text" className="form-input py-3" placeholder="Enter 10-digit account No." value={billerAcct} onChange={e => setBillerAcct(e.target.value)} />
                     </div>
                     <div className="mb-6">
                        <label className="text-xs font-bold uppercase text-muted mb-1 block">Amount (₱)</label>
                        <input type="number" className="form-input text-2xl font-black py-3 text-primary" placeholder="0.00" value={billerAmount} onChange={e => setBillerAmount(e.target.value)} />
                        <div className="text-right text-xs text-muted mt-1">Fee: ₱15.00</div>
                     </div>
                     <button className="btn btn-primary btn-block py-4" onClick={() => {
                        const amt = parseFloat(billerAmount);
                        const total = amt + 15; // 15 fee
                        if (!billerAcct) return alert("Enter account number.");
                        if (total > 0 && total <= walletBalance) {
                           addTransaction('bills', -total, `Bills: ${selectedBiller.toUpperCase()} - ${billerAcct}`);
                           supabase.from('profiles').update({ wallet_balance: walletBalance - total }).eq('id', currentUser.id).then(() => {
                              useAppStore.setState({ walletBalance: walletBalance - total });
                              alert(`₱${total.toFixed(2)} paid to ${selectedBiller.toUpperCase()} successfully! (Includes ₱15 fee)`);
                              setShowPayBills(false);
                              setBillerAmount('');
                              setBillerAcct('');
                           });
                        } else {
                           alert("Invalid amount or insufficient balance.");
                        }
                     }}>Pay ₱{billerAmount ? (parseFloat(billerAmount) + 15).toFixed(2) : '0.00'}</button>
                  </div>
               </div>
            )}

            <h4 className="mb-3 text-secondary">{t('transactionHistory')}</h4>
            {transactions.length === 0 ? (
               <p className="text-muted text-sm">{t('noTransactions')}</p>
            ) : (
               <div className="flex flex-col gap-3">
                 {transactions.map(tx => (
                   <div key={tx.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-xl bg-surface-color shadow-sm">
                     <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                           {tx.amount > 0 ? <ArrowRight className="transform -rotate-90" size={16}/> : <ArrowRight className="transform rotate-90" size={16}/>}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{tx.desc}</div>
                          <div className="text-xs text-muted">{new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString()}</div>
                        </div>
                     </div>
                     <div className={`font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-danger'}`}>
                       {tx.amount > 0 ? '+' : ''}{tx.amount} ₱
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
        </div>
      )}

      {/* Gamification & Rewards Modal */}
      {showRewards && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 4000, display: 'flex', alignItems: 'flex-end' }}>
          <div className="glass-card animate-slide-up w-full flex flex-col" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, height: '85vh' }}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-surface-color" style={{ borderTopLeftRadius: '1.5rem', borderTopRightRadius: '1.5rem' }}>
              <h3 className="m-0 flex items-center gap-2"><Star className="text-yellow-500"/> {t('safepointsHub')}</h3>
              <X className="cursor-pointer" onClick={() => setShowRewards(false)} />
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-surface-color">
              <div className="text-center mb-6">
                 <h1 className="text-5xl font-black text-yellow-500 m-0 drop-shadow-sm flex items-center justify-center gap-2"><Star fill="currentColor"/> {safePoints}</h1>
                 <span className="text-muted text-sm font-bold uppercase tracking-widest">{t('availablePoints')} (SafeCoins)</span>
              </div>

              {/* Tier Progress */}
              <div className="bg-surface-light rounded-2xl p-5 mb-6 border border-yellow-300 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 opacity-10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                 <div className="flex justify-between items-end mb-2 relative z-10">
                    <div>
                       <div className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Current Tier</div>
                       <h3 className="m-0 text-yellow-600 font-black text-2xl drop-shadow-sm">GOLD MEMBER</h3>
                    </div>
                    <div className="text-right">
                       <div className="text-sm font-bold">{safePoints} / 5000</div>
                       <div className="text-xs text-muted">to Platinum</div>
                    </div>
                 </div>
                 <div className="w-full bg-gray-200 rounded-full h-3 relative z-10 shadow-inner overflow-hidden">
                    <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-3 rounded-full" style={{ width: `${(safePoints / 5000) * 100}%` }}></div>
                 </div>
                 <div className="mt-3 text-xs text-yellow-700 font-semibold flex items-center gap-1 relative z-10">
                    <CheckCircle size={14} /> You are earning 2x SafeCoins per ride!
                 </div>
              </div>

              {/* Daily Streak */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 mb-6 text-white shadow-lg flex items-center justify-between transition-transform hover:scale-105">
                 <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full backdrop-blur-md">
                       <Flame size={24} fill="currentColor" className="text-yellow-300" />
                    </div>
                    <div>
                       <h4 className="m-0 text-white font-bold text-lg">{t('dayStreak', { days: 4 })}</h4>
                       <p className="m-0 text-white/80 text-sm">{t('bookAgainTomorrow')}</p>
                    </div>
                 </div>
                 <div className="text-center">
                    <div className="text-2xl font-black">1.5x</div>
                    <div className="text-xs text-white/80">{t('ptsMultiplier')}</div>
                 </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-surface-light p-1 rounded-xl mb-4 border border-gray-100 shadow-sm">
                 <button className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${rewardsTab === 'marketplace' ? 'bg-primary text-white shadow-sm' : 'text-muted'}`} onClick={() => setRewardsTab('marketplace')}><ShoppingCart size={16}/> {t('marketplace')}</button>
                 <button className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${rewardsTab === 'leaderboard' ? 'bg-yellow-500 text-white shadow-sm' : 'text-muted'}`} onClick={() => setRewardsTab('leaderboard')}><Trophy size={16}/> {t('leaderboard')}</button>
              </div>

              {rewardsTab === 'marketplace' ? (
                <div className="flex flex-col gap-3">
                   {rewards.map(reward => (
                      <div key={reward.id} className="border border-gray-100 p-4 rounded-xl flex justify-between items-center bg-surface-light hover:border-primary transition-all">
                         <div>
                           <h4 className="m-0 font-bold">{reward.title}</h4>
                           <span className="text-yellow-500 text-sm font-bold flex items-center gap-1"><Star size={12} fill="currentColor"/> {reward.cost} pts</span>
                         </div>
                         <button className="btn btn-primary shadow-sm" onClick={() => redeemReward(reward)}>{t('redeem')}</button>
                      </div>
                   ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                   <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 mb-2 flex items-center gap-3">
                      <Trophy className="text-yellow-600"/>
                      <div>
                         <h4 className="m-0 text-yellow-800">{t('topRiders')}</h4>
                         <p className="m-0 text-xs text-yellow-600">{t('topRidersReward')}</p>
                      </div>
                   </div>
                   {mockLeaderboard.map(user => (
                      <div key={user.id} className={`p-4 rounded-xl flex items-center justify-between ${user.rank === 3 ? 'bg-blue-50 border border-blue-200 shadow-sm' : 'border border-gray-100 bg-surface-light'}`}>
                         <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${user.rank === 1 ? 'bg-yellow-400 text-white shadow-md' : user.rank === 2 ? 'bg-gray-300 text-gray-800' : user.rank === 3 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                               #{user.rank}
                            </div>
                            <span className={`font-bold ${user.rank === 3 ? 'text-primary' : ''}`}>{user.name}</span>
                         </div>
                         <span className="font-black text-gray-600">{user.points.toLocaleString()} pts</span>
                      </div>
                   ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Community Feed Modal */}
      {showCommunity && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 4000, display: 'flex', alignItems: 'flex-end' }}>
          <div className="glass-card animate-slide-up w-full flex flex-col" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, height: '80vh' }}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-surface-color" style={{ borderTopLeftRadius: '1.5rem', borderTopRightRadius: '1.5rem' }}>
              <h3 className="m-0 flex items-center gap-2"><Users className="text-primary"/> {t('community')}</h3>
              <X className="cursor-pointer" onClick={() => setShowCommunity(false)} />
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-surface-color flex flex-col gap-3">
               {/* Post Input */}
               <div className="bg-surface-light p-3 rounded-xl border border-gray-100 mb-2 flex gap-2 items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">{t('you')}</div>
                  <input type="text" className="form-input flex-1 m-0 text-sm border-none bg-transparent" placeholder={t('communityPlaceholder')} />
                  <button className="btn btn-primary p-2 rounded-full"><Send size={16}/></button>
               </div>

               {/* Feed */}
               {communityFeed.map(post => (
                  <div key={post.id} className="bg-surface-light p-4 rounded-xl border border-gray-100 shadow-sm">
                     <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">{post.user[0]}</div>
                           <div>
                              <div className="font-bold text-sm">{post.user}</div>
                              <div className="text-xs text-muted">{post.time}</div>
                           </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${post.type === 'traffic' ? 'bg-orange-100 text-orange-600' : post.type === 'hazard' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                           {post.type}
                        </span>
                     </div>
                     <p className="text-sm m-0 mb-3 text-gray-700">{post.message}</p>
                     <div className="flex gap-4 border-t border-gray-100 pt-2">
                        <button className="flex items-center gap-1 text-xs font-bold text-muted hover:text-primary"><Star size={14}/> {post.likes}</button>
                        <button className="flex items-center gap-1 text-xs font-bold text-muted hover:text-primary"><MessageSquare size={14}/> {t('reply')}</button>
                     </div>
                  </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReview && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card w-11/12 max-w-sm text-center" style={{ padding: '2rem' }}>
            <h3 className="mb-2">{t('rideCompleted')}</h3>
            <p className="text-sm text-muted mb-4">{t('rateDriver')}</p>
            
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} size={32} onClick={() => setRating(star)} fill={star <= rating ? 'gold' : 'transparent'} color={star <= rating ? 'gold' : 'gray'} className="cursor-pointer" />
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {badges.map(badge => (
                <span key={badge} 
                      className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${selectedBadges.includes(badge) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}
                      onClick={() => toggleBadge(badge)}>
                  {badge}
                </span>
              ))}
            </div>

            <div className="mb-4">
               <p className="text-sm font-bold mb-2">{t('addTip')}</p>
               <div className="flex justify-center gap-2">
                 {[0, 20, 50, 100].map(amt => (
                   <button key={amt} className={`btn flex-1 py-1 px-0 ${tipAmount === amt ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTipAmount(amt)}>
                     {amt === 0 ? t('none') : `₱${amt}`}
                   </button>
                 ))}
               </div>
            </div>

            <textarea className="form-input mb-4" placeholder={t('leaveComment')} value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows="2" />
            <button className="btn btn-primary btn-block" onClick={submitReview}>{t('submit')}</button>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChat && (
        <div style={{ position: 'absolute', inset: 0, background: 'var(--background)', zIndex: 4000, display: 'flex', flexDirection: 'column' }} className="h-full w-full">
          <div className="p-4 flex items-center justify-between shadow-sm bg-surface-color">
            <h3 className="m-0 flex items-center gap-2"><MessageSquare size={20} /> {t('chat')}</h3>
            <X onClick={() => setShowChat(false)} className="cursor-pointer" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`p-3 rounded-lg max-w-[80%] ${msg.sender_id === currentUser?.id ? 'self-end bg-primary text-white' : 'self-start bg-surface-color'}`}>
                {msg.text}
              </div>
            ))}
          </div>
          <div className="p-4 flex gap-2 bg-surface-color">
            <input type="text" className="input flex-1" placeholder={t('typeMessage')} value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
            <button className="btn btn-primary" onClick={sendMessage}>{t('send')}</button>
          </div>
        </div>
      )}
      
      {/* Profile Modal */}
      {showProfile && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card w-11/12 max-w-sm" style={{ padding: '2rem' }}>
            <h3 className="mb-4">{t('myProfile')}</h3>
            
            <div className="flex justify-center mb-6 relative">
               <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-secondary p-1">
                  <div className="w-full h-full rounded-full bg-surface-color flex items-center justify-center overflow-hidden border-2 border-surface-color">
                     <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Matt" alt="Avatar" className="w-full h-full object-cover" />
                  </div>
               </div>
            </div>

            <div className="flex flex-col gap-3">
              <div><label className="text-sm text-muted">{t('homeAddress')}</label><input type="text" className="input w-full mt-1" value={homeAddress} onChange={e => setHomeAddress(e.target.value)} /></div>
              <div><label className="text-sm text-muted">{t('workAddress')}</label><input type="text" className="input w-full mt-1" value={workAddress} onChange={e => setWorkAddress(e.target.value)} /></div>
              
              <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-200">
                <span className="font-bold text-main">{t('darkMode')}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={darkMode} onChange={e => setDarkMode(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <div>
                   <span className="font-bold text-main block">{t('corporateMode')}</span>
                   <span className="text-xs text-muted">{t('corporateModeHelper')}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isBusinessMode} onChange={e => setIsBusinessMode(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <div>
                   <span className="font-bold text-main block">Lite Mode (Data Saver)</span>
                   <span className="text-xs text-muted">Disables map and animations for slow internet</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={liteMode} onChange={e => setLiteMode(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <span className="font-bold text-main">Language</span>
                <select className="input text-sm p-1" value={language} onChange={e => setLanguage(e.target.value)}>
                   <option value="en">English</option>
                   <option value="tl">Tagalog</option>
                   <option value="ceb">Cebuano</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
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

            {sosActive ? (
               <div className="flex flex-col items-center justify-center py-10 animate-pulse text-center">
                  <div className="w-32 h-32 rounded-full bg-red-100 flex items-center justify-center border-8 border-red-500 mb-6 shadow-[0_0_50px_rgba(239,68,68,0.6)]">
                     <ShieldAlert size={64} className="text-red-500" />
                  </div>
                  <h2 className="text-3xl text-red-600 font-black mb-2 uppercase tracking-widest">SOS Activated</h2>
                  <p className="text-muted font-bold text-lg mb-6">Auto-dialing Emergency Services in...</p>
                  <div className="text-7xl font-black text-red-600 mb-8">{sosCountdown}</div>
                  
                  <div className="w-full bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm font-bold mb-6">
                     Live location shared with 911 and Trusted Contacts.
                  </div>

                  <button className="btn btn-outline border-gray-400 text-gray-500 py-3 px-8 font-bold rounded-full" onClick={() => {
                     setSosActive(false);
                     setSosCountdown(5);
                  }}>
                     CANCEL SOS
                  </button>
               </div>
            ) : (
               <>
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
                           <p className="text-xs text-muted m-0">Anonymize your name/number to drivers.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={dataPrivacy} onChange={e => setDataPrivacy(e.target.checked)} />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                     </div>

                     {/* Trusted Contacts */}
                     <div className="p-4 bg-surface-light rounded-xl border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                           <h4 className="m-0 flex items-center gap-1"><Users size={16}/> Trusted Contacts</h4>
                           {uiState !== 'idle' && (
                              <button className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded flex items-center gap-1 border border-blue-200 shadow-sm" onClick={() => {
                                 navigator.clipboard.writeText(`https://ridesafe.com/track/LIVE-12345`);
                                 alert('Live Tracking Link Copied to Clipboard!');
                              }}>
                                 Share Live Link
                              </button>
                           )}
                        </div>
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
                     <button className="btn btn-danger btn-block py-4 mt-2 flex items-center justify-center gap-2" style={{ background: '#ef4444', color: 'white', boxShadow: '0 4px 14px 0 rgba(239, 68, 68, 0.39)' }} onClick={() => {
                        setSosActive(true);
                        setSosCountdown(5);
                        let count = 5;
                        const iv = setInterval(() => {
                           count--;
                           setSosCountdown(count);
                           if(count <= 0) {
                              clearInterval(iv);
                           }
                        }, 1000);
                     }}>
                        <ShieldAlert size={20} /> TRIGGER EMERGENCY SOS
                     </button>
                  </div>
               </>
            )}
          </div>
        </div>
      )}

      {/* RideSafe Plus Modal */}
      {showPlus && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 5000, display: 'flex', alignItems: 'flex-end' }}>
          <div className="glass-card animate-slide-up w-full" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '2rem', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="m-0 flex items-center gap-2 text-yellow-500"><Sparkles fill="currentColor"/> RideSafe Plus</h3>
              <X className="cursor-pointer" onClick={() => setShowPlus(false)} />
            </div>

            <div className="text-center mb-6">
               {isSubscribed ? (
                  <>
                     <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-yellow-400 shadow-lg">
                        <Sparkles size={40} className="text-yellow-500" fill="currentColor"/>
                     </div>
                     <h2 className="m-0 text-2xl text-yellow-500">You are a Plus Member!</h2>
                     <p className="text-muted mt-2">Enjoy unlimited free delivery and priority booking.</p>
                     
                     <button className="btn btn-outline text-danger border-danger mt-4" onClick={() => { setIsSubscribed(false); localStorage.setItem('isSubscribed', 'false'); }}>Cancel Subscription</button>
                  </>
               ) : (
                  <>
                     <div className="bg-gradient-to-tr from-yellow-400 to-yellow-600 text-white p-5 rounded-2xl mb-6 shadow-[0_10px_25px_rgba(234,179,8,0.5)]">
                        <h1 className="m-0 text-3xl font-bold mb-2">₱249 <span className="text-sm opacity-80 font-normal">/ month</span></h1>
                        <p className="opacity-90">Unlock the ultimate SuperApp experience.</p>
                     </div>

                     <div className="flex flex-col gap-3 text-left mb-6">
                        <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                           <ShoppingCart className="text-yellow-600" size={24}/>
                           <div>
                              <h4 className="m-0 text-yellow-800">Unlimited Free Delivery</h4>
                              <p className="text-xs text-yellow-700 m-0">Zero delivery fees on Eats, Mart, and Pabili.</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                           <Star className="text-yellow-600" size={24}/>
                           <div>
                              <h4 className="m-0 text-yellow-800">2x SafePoints</h4>
                              <p className="text-xs text-yellow-700 m-0">Earn rewards twice as fast on all rides.</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                           <Clock className="text-yellow-600" size={24}/>
                           <div>
                              <h4 className="m-0 text-yellow-800">Priority Booking</h4>
                              <p className="text-xs text-yellow-700 m-0">Get matched with top drivers instantly.</p>
                           </div>
                        </div>
                     </div>

                     <button className="btn btn-primary btn-block py-4 text-lg bg-yellow-500 border-yellow-500 text-white shadow-[0_4px_14px_0_rgba(234,179,8,0.39)]" onClick={() => {
                        if(walletBalance >= 249) {
                           supabase.from('profiles').update({ wallet_balance: walletBalance - 249 }).eq('id', currentUser.id).then(() => {
                              addTransaction('subscription', -249, 'RideSafe Plus (1 Month)');
                              useAppStore.getState().initialize();
                              setIsSubscribed(true);
                              localStorage.setItem('isSubscribed', 'true');
                              alert('Welcome to RideSafe Plus!');
                           });
                        } else {
                           alert('Insufficient wallet balance. Please top up ₱249.');
                        }
                     }}>Subscribe Now</button>
                  </>
               )}
            </div>
          </div>
        </div>
      )}

      {/* AI Support FAB */}
      {uiState !== 'searching' && (
         <div className="absolute bottom-[100px] right-4 z-[1500]">
            <button className="btn btn-primary rounded-full w-14 h-14 p-0 shadow-lg flex items-center justify-center" style={{ animation: 'pulse 2s infinite' }} onClick={() => setShowBot(true)}>
               <Bot size={28} />
            </button>
         </div>
      )}

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
