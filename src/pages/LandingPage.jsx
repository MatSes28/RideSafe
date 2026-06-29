import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, ShieldCheck, Wallet } from 'lucide-react';
import logo from '../assets/ridesafe_logo.png';

export default function LandingPage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Swipe State
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const slides = [
    {
      title: "Your Everyday SuperApp",
      description: "Rides, Deliveries, Food, and cashless payments. Everything you need for your daily life, built into one powerful app.",
      icon: <Car size={64} className="text-[#00A86B]" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 0 15px rgba(0,168,107,0.5))' }} />
    },
    {
      title: "Safety First, Always",
      description: "Biometric driver approvals, real-time tracking, and a built-in SOS emergency button for ultimate peace of mind.",
      icon: <ShieldCheck size={64} className="text-[#00A86B]" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 0 15px rgba(0,168,107,0.5))' }} />
    },
    {
      title: "Cashless & Rewarding",
      description: "Pay bills, send money, and earn SafePoints on every transaction with RideSafe Pay.",
      icon: <Wallet size={64} className="text-[#00A86B]" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 0 15px rgba(0,168,107,0.5))' }} />
    }
  ];

  // Auto-play interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 4500);

    return () => clearInterval(timer);
  }, [slides.length]);

  const minSwipeDistance = 50; 
  const handleTouchStart = (e) => {
    setTouchEnd(null); 
    setTouchStart(e.targetTouches[0].clientX);
  };
  const handleTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
    if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-white font-sans overflow-hidden grid grid-cols-1 lg:grid-cols-12">
      
      {/* DESKTOP VIEW - LEFT SECTION (Marketing Pane) */}
      <div className="hidden lg:flex lg:col-span-7 xl:col-span-8 flex-col justify-center items-start px-16 xl:px-24 bg-gradient-to-br from-[#0F172A] to-[#00A86B]/10 relative overflow-hidden">
         {/* Decorative Glow */}
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,_rgba(0,168,107,0.15)_0%,_transparent_50%)] pointer-events-none"></div>
         
         {/* Desktop Logo */}
         <div className="absolute top-12 left-16 xl:left-24 flex items-center gap-3 bg-white/5 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 shadow-lg z-20">
           <img src={logo} alt="RideSafe Logo" className="w-8 h-8 object-contain" />
           <span className="text-white font-extrabold text-xl tracking-tight">RideSafe</span>
         </div>

         <div className="relative z-10 max-w-2xl">
           <h1 className="text-5xl xl:text-7xl font-black text-white mb-6 tracking-tight leading-[1.1]">
              Your Everyday <br/>
              <span className="text-[#00A86B]">SuperApp.</span>
           </h1>
           <p className="text-[#94A3B8] text-xl leading-relaxed mb-10 max-w-xl font-medium">
              Rides, Deliveries, Food, and cashless payments. Everything you need for your daily life in San Jose, Muñoz, and Talavera, built into one powerful app.
           </p>
           
           <div className="flex gap-4">
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 text-sm font-bold text-white shadow-lg">
                 <ShieldCheck size={20} className="text-[#00A86B]"/> Biometric Safe
              </div>
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 text-sm font-bold text-white shadow-lg">
                 <Wallet size={20} className="text-[#00A86B]"/> Cashless Pay
              </div>
           </div>
         </div>
      </div>

      {/* MOBILE VIEW / DESKTOP RIGHT SECTION (Interactive Onboarding Pane) */}
      <div className="w-full h-screen lg:col-span-5 xl:col-span-4 bg-[#0B0F19] relative flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-20 overflow-hidden">
         
         {/* Ambient Glow */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[radial-gradient(circle,_rgba(0,168,107,0.12)_0%,_transparent_70%)] pointer-events-none z-0"></div>

         {/* Mobile Logo Header */}
         <div className="lg:hidden shrink-0 pt-8 pb-4 px-8 flex justify-center z-50">
           <div className="flex items-center gap-2 bg-[#0F172A]/80 backdrop-blur-xl px-5 py-2 rounded-full border border-white/10 shadow-lg">
             <img src={logo} alt="RideSafe Logo" className="w-6 h-6 object-contain" />
             <span className="text-white font-extrabold text-lg tracking-tight">RideSafe</span>
           </div>
         </div>

         {/* Carousel Container (Takes remaining height) */}
         <div 
           className="flex-1 relative z-10 overflow-hidden flex flex-col justify-center w-full"
           onTouchStart={handleTouchStart}
           onTouchMove={handleTouchMove}
           onTouchEnd={handleTouchEnd}
         >
            <div 
              className="flex h-full transition-transform duration-500 ease-out will-change-transform" 
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
               {slides.map((slide, index) => (
                 <div key={index} className="min-w-full h-full flex flex-col items-center justify-center px-10 text-center pb-12">
                   
                   {/* Explicit bounding container for icon to prevent layout explosion */}
                   <div className="w-28 h-28 flex items-center justify-center mb-8 bg-[#00A86B]/10 rounded-full border border-[#00A86B]/20 shadow-[inset_0_0_20px_rgba(0,168,107,0.2)]">
                      {slide.icon}
                   </div>
                   
                   <h2 className="text-white text-3xl font-extrabold mb-4 leading-tight tracking-tight">
                     {slide.title}
                   </h2>
                   
                   <p className="text-[#94A3B8] text-[1.05rem] leading-relaxed font-medium max-w-[320px]">
                     {slide.description}
                   </p>
                 </div>
               ))}
            </div>

            {/* Pagination Indicators - Anchored inside the flex-1 container at the bottom */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-40">
              {slides.map((_, i) => (
                <div 
                  key={i} 
                  onClick={() => setCurrentSlide(i)}
                  className={`rounded-full cursor-pointer transition-all duration-300 ${currentSlide === i ? 'w-8 h-2 bg-[#00A86B]' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`}
                />
              ))}
            </div>
         </div>

         {/* Fixed Premium Bottom Actions (Bounded, Never Collapses, Always Visible) */}
         <div className="shrink-0 w-full bg-[#0F172A] p-6 pb-8 border-t border-white/5 shadow-[0_-20px_40px_rgba(0,0,0,0.5)] z-50 flex flex-col gap-4">
            <button 
              className="w-full bg-[#00A86B] text-white rounded-full py-4 font-bold text-lg shadow-[0_4px_14px_rgba(0,168,107,0.3)] transition-transform duration-200 active:scale-[0.98] hover:shadow-[0_6px_20px_rgba(0,168,107,0.4)] flex justify-center items-center"
              onClick={() => navigate('/login')}
            >
              Login to Book
            </button>
            <button 
              className="w-full bg-transparent text-[#00A86B] border-2 border-[#00A86B]/80 rounded-full py-4 font-bold text-lg transition-all duration-200 active:scale-[0.98] hover:bg-[#00A86B]/10 flex justify-center items-center"
              onClick={() => navigate('/register-driver')}
            >
              Register to Drive
            </button>
         </div>

      </div>
    </div>
  );
}
