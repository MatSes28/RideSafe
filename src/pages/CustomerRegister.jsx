import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UploadCloud, UserPlus, CheckCircle, Map, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import logo from '../assets/ridesafe_logo.png';

export default function CustomerRegister() {
  const navigate = useNavigate();
  const [idFile, setIdFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [acceptLegal, setAcceptLegal] = useState(false);

  const [formData, setFormData] = useState({ name: '', phone: '', password: '', idType: 'national_id', idNumber: '' });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setIdFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!idFile) {
      alert("Please upload a valid ID.");
      return;
    }
    if (!selfieFile) {
      alert("Please upload a selfie for face verification.");
      return;
    }
    if (!acceptLegal) {
      alert("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }
    
    setLoading(true);
    setErrorMsg("");

    const email = `${formData.phone.replace(/[^0-9]/g, '')}@ridesafe.com`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password: formData.password,
      options: {
        data: {
          role: 'customer',
          full_name: formData.name,
          phone: formData.phone
        }
      }
    });

    if (error) {
      setLoading(false);
      setErrorMsg(error.message);
      return;
    }

    const userId = data.user.id;

    const idFileName = `${userId}/customer_id_${Date.now()}`;
    await supabase.storage.from('verifications').upload(idFileName, idFile);

    await supabase.from('profiles').insert({
      id: userId,
      role: 'customer',
      wallet_balance: 500
    });

    setLoading(false);
    setSubmitted(true);
    setTimeout(() => {
      navigate('/customer-dash');
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center font-sans">
        <div className="bg-white p-12 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center animate-fade-in text-center max-w-md w-full border border-slate-100">
          <CheckCircle size={80} className="text-[#0ea5e9] mb-6 animate-pulse" />
          <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Registration Successful!</h2>
          <p className="text-slate-500 font-medium text-lg">Preparing your map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex font-sans box-border overflow-hidden">
      
      {/* LEFT COLUMN: BRANDING & MARKETING */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] bg-gradient-to-br from-[#020617] via-[#0F172A] to-[#0ea5e9]/30 relative overflow-hidden flex-col justify-between p-16 xl:p-24 shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-10">
         
         {/* Deep Ambient Glow */}
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
               Join <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8]">RideSafe.</span>
             </h1>
             <p className="text-slate-300 text-xl max-w-lg leading-relaxed mb-12 font-medium drop-shadow-md">
               Create your account today. Experience fast, safe, and reliable rides and deliveries instantly.
             </p>
             
             <div className="flex flex-col gap-6 mt-4">
                <div className="flex items-center gap-5 text-white font-bold transition-transform hover:-translate-y-1">
                   <div className="bg-[#0ea5e9]/20 p-4 rounded-2xl shadow-[inset_0_0_15px_rgba(0,168,107,0.2)] border border-[#0ea5e9]/30">
                     <Map className="text-[#38bdf8] w-6 h-6 shrink-0"/>
                   </div>
                   <span className="text-lg tracking-wide drop-shadow-md">Live map tracking & fast booking</span>
                </div>
                <div className="flex items-center gap-5 text-white font-bold transition-transform hover:-translate-y-1">
                   <div className="bg-[#0ea5e9]/20 p-4 rounded-2xl shadow-[inset_0_0_15px_rgba(0,168,107,0.2)] border border-[#0ea5e9]/30">
                     <Shield className="text-[#38bdf8] w-6 h-6 shrink-0"/>
                   </div>
                   <span className="text-lg tracking-wide drop-shadow-md">Strict driver background checks</span>
                </div>
             </div>
           </div>
           
           <div className="text-slate-500 font-medium text-sm mt-8">
              © {new Date().getFullYear()} RideSafe Philippines.
           </div>
         </div>
      </div>

      {/* RIGHT COLUMN: REGISTRATION FORM */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col relative bg-slate-50 overflow-y-auto">
         
         <div className="w-full p-8 flex justify-between items-center z-10 shrink-0 sticky top-0 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/50">
           <button 
             className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold py-2 px-4 rounded-full hover:bg-slate-200/50"
             onClick={() => navigate('/login')}
           >
             <ArrowLeft size={18} strokeWidth={2.5} />
             <span className="hidden sm:inline">Back to Login</span>
           </button>

           <div className="lg:hidden flex items-center gap-2 bg-white px-5 py-2.5 rounded-full border border-slate-200 shadow-sm">
              <img src={logo} alt="RideSafe" className="w-6 h-6 object-contain" />
              <span className="text-slate-900 font-extrabold text-sm tracking-tight">RideSafe</span>
           </div>
         </div>

         {/* Form Container */}
         <div className="flex-1 flex flex-col p-8 sm:p-12 animate-fade-in">
           <div className="w-full max-w-[460px] mx-auto bg-white p-8 sm:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
              
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8]"></div>

              <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Customer Registration</h2>
                <p className="text-slate-500 text-[1.05rem] font-medium leading-relaxed">Fill in your details to create an account.</p>
                
                {errorMsg && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl font-bold text-sm shadow-sm flex items-center">
                    {errorMsg}
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                  <input type="text" className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 px-5 py-3.5 rounded-xl text-[1.05rem] font-semibold transition-all focus:bg-white focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 outline-none placeholder-slate-300" placeholder="Juan Dela Cruz" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Phone Number</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold border-r border-slate-200 pr-3">+63</span>
                    <input type="tel" className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 pl-16 pr-5 py-3.5 rounded-xl text-[1.05rem] font-semibold transition-all focus:bg-white focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 outline-none placeholder-slate-300" placeholder="9XX XXX XXXX" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</label>
                  <input type="password" className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 px-5 py-3.5 rounded-xl text-[1.05rem] font-semibold transition-all focus:bg-white focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 outline-none placeholder-slate-300" placeholder="Create a strong password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">ID Type</label>
                  <select className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 px-5 py-3.5 rounded-xl text-[1.05rem] font-semibold transition-all focus:bg-white focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 outline-none appearance-none" value={formData.idType} onChange={e => setFormData({...formData, idType: e.target.value})}>
                    <option value="national_id">National ID</option>
                    <option value="passport">Passport</option>
                    <option value="drivers_license">Driver's License</option>
                    <option value="student_id">Student ID</option>
                    <option value="postal_id">Postal ID</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">ID Number</label>
                  <input type="text" className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 px-5 py-3.5 rounded-xl text-[1.05rem] font-semibold transition-all focus:bg-white focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 outline-none placeholder-slate-300" placeholder="Enter ID number" required value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} />
                </div>

                {/* File Uploads */}
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Upload Valid ID Photo</label>
                  <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all ${idFile ? 'border-[#0ea5e9] bg-[#0ea5e9]/5' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-[#0ea5e9]/50'}`}>
                    <UploadCloud className={`mb-3 ${idFile ? 'text-[#0ea5e9]' : 'text-slate-400'}`} size={32} />
                    <span className="font-bold text-slate-700 text-center mb-1">
                      {idFile ? idFile.name : 'Tap to upload ID'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">PNG, JPG up to 5MB</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Face Verification (Selfie)</label>
                  <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all ${selfieFile ? 'border-[#0ea5e9] bg-[#0ea5e9]/5' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-[#0ea5e9]/50'}`}>
                    <UploadCloud className={`mb-3 ${selfieFile ? 'text-[#0ea5e9]' : 'text-slate-400'}`} size={32} />
                    <span className="font-bold text-slate-700 text-center mb-1">
                      {selfieFile ? selfieFile.name : 'Tap to upload Selfie'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Please take a clear photo of your face</span>
                    <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => {
                       if (e.target.files && e.target.files[0]) setSelfieFile(e.target.files[0]);
                    }} />
                  </label>
                </div>

                <div className="flex items-start gap-3 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <input type="checkbox" id="legal" checked={acceptLegal} onChange={(e) => setAcceptLegal(e.target.checked)} className="mt-1 w-4 h-4 accent-[#0ea5e9]" />
                  <label htmlFor="legal" className="text-sm text-slate-600 font-medium leading-tight">
                    I agree to the <a href="/terms" className="text-[#0ea5e9] hover:underline font-bold">Terms of Service</a> and <a href="/privacy" className="text-[#0ea5e9] hover:underline font-bold">Privacy Policy</a>
                  </label>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-[#0ea5e9] text-white rounded-xl py-4.5 font-bold text-[1.1rem] shadow-[0_8px_20px_rgba(0,168,107,0.25)] transition-all duration-200 active:scale-[0.98] hover:shadow-[0_10px_25px_rgba(0,168,107,0.35)] flex justify-center items-center gap-3 mt-4 disabled:opacity-70 disabled:cursor-not-allowed group"
                  disabled={loading}
                >
                  <UserPlus size={20} />
                  {loading ? "Registering..." : "Create Account"}
                </button>
              </form>
           </div>
         </div>
      </div>
    </div>
  );
}
