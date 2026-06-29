import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, ArrowRight, Lock, Server } from 'lucide-react';
import { supabase } from '../lib/supabase';
import logo from '../assets/ridesafe_logo.png';

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    const role = data.user?.user_metadata?.role;
    if (role === 'admin') {
      navigate('/admin');
    } else if (role === 'operator') {
      navigate('/operator');
    } else {
      supabase.auth.signOut();
      setErrorMsg('Unauthorized access. This portal is for administrative personnel only.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex font-sans box-border overflow-hidden">
      
      {/* LEFT COLUMN: BRANDING & MARKETING */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] bg-gradient-to-br from-[#020617] via-[#0F172A] to-[#0ea5e9]/30 relative overflow-hidden flex-col justify-between p-16 xl:p-24 shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-10">
         
         <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[radial-gradient(circle,_rgba(0,168,107,0.15)_0%,_transparent_70%)] pointer-events-none mix-blend-screen"></div>
         <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(circle,_rgba(0,168,107,0.1)_0%,_transparent_70%)] pointer-events-none mix-blend-screen"></div>
         
         <div className="relative z-10 flex flex-col h-full justify-between">
           {/* Desktop Logo */}
           <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-2xl w-max transition-transform hover:scale-105 cursor-default">
             <img src={logo} alt="RideSafe Logo" className="w-8 h-8 object-contain drop-shadow-md" />
             <span className="text-white font-extrabold text-xl tracking-tight">RideSafe</span>
           </div>
           
           <div className="flex-1 flex flex-col justify-center mt-12">
             <h1 className="text-5xl xl:text-7xl font-black text-white mb-6 leading-[1.05] tracking-tight drop-shadow-lg">
               Command <br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8]">Center.</span>
             </h1>
             <p className="text-slate-300 text-xl max-w-lg leading-relaxed mb-12 font-medium drop-shadow-md">
               RideSafe Operations & Administration. Manage drivers, oversee fleet operations, and resolve customer disputes.
             </p>
             
             <div className="flex flex-col gap-6 mt-4">
                <div className="flex items-center gap-5 text-white font-bold transition-transform hover:-translate-y-1">
                   <div className="bg-[#0ea5e9]/20 p-4 rounded-2xl shadow-[inset_0_0_15px_rgba(0,168,107,0.2)] border border-[#0ea5e9]/30">
                     <Lock className="text-[#38bdf8] w-6 h-6 shrink-0"/>
                   </div>
                   <span className="text-lg tracking-wide drop-shadow-md">End-to-End Encryption</span>
                </div>
                <div className="flex items-center gap-5 text-white font-bold transition-transform hover:-translate-y-1">
                   <div className="bg-[#0ea5e9]/20 p-4 rounded-2xl shadow-[inset_0_0_15px_rgba(0,168,107,0.2)] border border-[#0ea5e9]/30">
                     <Server className="text-[#38bdf8] w-6 h-6 shrink-0"/>
                   </div>
                   <span className="text-lg tracking-wide drop-shadow-md">Real-time Infrastructure Control</span>
                </div>
             </div>
           </div>
           
           <div className="text-slate-500 font-medium text-sm mt-8">
              © {new Date().getFullYear()} RideSafe Philippines Operations.
           </div>
         </div>
      </div>

      {/* RIGHT COLUMN: LOGIN FORM */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col relative bg-slate-50 overflow-y-auto">
         
         <div className="w-full p-8 flex justify-between items-center z-10 shrink-0">
           <button 
             className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold py-2 px-4 rounded-full hover:bg-slate-200/50"
             onClick={() => navigate('/')}
           >
             <ArrowLeft size={18} strokeWidth={2.5} />
             <span className="hidden sm:inline">Back to Main</span>
           </button>

           <div className="lg:hidden flex items-center gap-2 bg-white px-5 py-2.5 rounded-full border border-slate-200 shadow-sm">
              <Shield className="text-[#0ea5e9] w-5 h-5" />
              <span className="text-slate-900 font-extrabold text-sm tracking-tight">Admin</span>
           </div>
         </div>

         {/* Form Container */}
         <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
           <div className="w-full max-w-[420px] bg-white p-10 sm:p-12 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 animate-fade-in relative overflow-hidden">
              
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-[#0ea5e9]"></div>

              <div className="mb-10 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-[#0ea5e9]/10 rounded-full flex items-center justify-center mb-6">
                  <Shield size={32} className="text-[#0ea5e9]" />
                </div>
                <h2 className="text-[2rem] font-black text-slate-900 mb-2 tracking-tight">Admin Login</h2>
                <p className="text-slate-500 text-[1.05rem] font-medium leading-relaxed">Authorized personnel only.</p>
                
                {errorMsg && (
                  <div className="mt-6 p-4 w-full bg-red-50 border border-red-100 text-red-600 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center">
                    {errorMsg}
                  </div>
                )}
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Corporate Email</label>
                  <input 
                    type="email" 
                    className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 px-5 py-4 rounded-xl text-[1.05rem] font-semibold transition-all focus:bg-white focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 outline-none shadow-sm placeholder-slate-300" 
                    placeholder="admin@ridesafe.com" 
                    required 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                  />
                </div>
                
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                    <span>Password</span>
                  </label>
                  <input 
                    type="password" 
                    className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 px-5 py-4 rounded-xl text-[1.05rem] font-semibold transition-all focus:bg-white focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 outline-none shadow-sm placeholder-slate-300" 
                    placeholder="••••••••" 
                    required 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-slate-900 text-white rounded-xl py-4.5 font-bold text-[1.1rem] shadow-lg transition-all duration-200 active:scale-[0.98] hover:bg-[#0ea5e9] hover:shadow-[0_10px_25px_rgba(0,168,107,0.35)] hover:-translate-y-0.5 flex justify-center items-center gap-3 mt-8 disabled:opacity-70 disabled:cursor-not-allowed group"
                  disabled={loading}
                >
                  {loading ? "Authenticating..." : "Login to Portal"}
                  {!loading && <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />}
                </button>
              </form>
           </div>
         </div>
      </div>
    </div>
  );
}
