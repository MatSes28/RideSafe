import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UploadCloud, UserPlus, CheckCircle, Truck, ScanFace, XCircle, AlertTriangle, Shield, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import logo from '../assets/ridesafe_logo.png';

export default function DriverRegister() {
  const navigate = useNavigate();
  const [idFile, setIdFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [acceptLegal, setAcceptLegal] = useState(false);

  const [scanStatus, setScanStatus] = useState('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [scanErrorMsg, setScanErrorMsg] = useState('');

  const [formData, setFormData] = useState({ 
    name: '', phone: '', password: '', 
    vehicleType: 'motorcycle', plateNumber: '',
    idType: 'national_id', idNumber: ''
  });

  const validateIdFormat = (type, number) => {
    const formats = {
      'passport': /^[a-zA-Z]{1,2}[0-9]{7}[a-zA-Z]?$/,
      'national_id': /^[0-9]{4}-[0-9]{7}-[0-9]{1}$/,
      'drivers_license': /^[A-Z][0-9]{2}-[0-9]{2}-[0-9]{6}$/
    };
    if (formats[type]) return formats[type].test(number);
    return true;
  };

  const startBiometricScan = () => {
    setScanStatus('scanning');
    setScanProgress(0);
    
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          finishBiometricScan();
          return 100;
        }
        return prev + (Math.floor(Math.random() * 15) + 5);
      });
    }, 400);
  };

  const finishBiometricScan = () => {
    const passed = Math.random() > 0.05;
    if (passed) {
      setConfidenceScore(Math.floor(Math.random() * 5) + 94);
      setScanStatus('success');
      setTimeout(() => {
        executeRegistration();
      }, 2000);
    } else {
      setScanStatus('error');
      setScanErrorMsg("Biometric mismatch detected. The selfie does not match the provided ID document.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!acceptLegal) {
      alert("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }
    if (!licenseFile || !idFile || !selfieFile) {
      alert("Please upload all required documents (ID, License, and Selfie).");
      return;
    }
    if (!validateIdFormat(formData.idType, formData.idNumber)) {
       setScanStatus('error');
       setScanErrorMsg(`Invalid format for ${formData.idType.replace('_', ' ')}. Please check the number and try again.`);
       return;
    }
    startBiometricScan();
  };

  const executeRegistration = async () => {
    setLoading(true);
    setErrorMsg("");

    const email = `${formData.phone.replace(/[^0-9]/g, '')}@ridesafe.com`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password: formData.password,
      options: {
        data: {
          role: 'driver',
          full_name: formData.name,
          phone: formData.phone,
          vehicle_type: formData.vehicleType,
          plate_number: formData.plateNumber
        }
      }
    });

    if (error) {
      setLoading(false);
      setErrorMsg(error.message);
      setScanStatus('idle');
      return;
    }

    const userId = data.user.id;
    const idFileName = `${userId}/driver_id_${Date.now()}`;
    const licenseFileName = `${userId}/license_${Date.now()}`;
    
    await supabase.storage.from('documents').upload(idFileName, idFile);
    await supabase.storage.from('documents').upload(licenseFileName, licenseFile);

    const { data: idUrl } = supabase.storage.from('documents').getPublicUrl(idFileName);
    const { data: licenseUrl } = supabase.storage.from('documents').getPublicUrl(licenseFileName);

    await supabase.from('profiles').insert({
      id: userId,
      role: 'driver',
      is_approved: false,
      wallet_balance: 0,
      license_url: licenseUrl.publicUrl,
      vehicle_registration_url: idUrl.publicUrl
    });

    localStorage.setItem(`driver_meta_${userId}`, JSON.stringify({
      fullName: formData.name,
      vehicleType: formData.vehicleType,
      plateNumber: formData.plateNumber,
      idType: formData.idType,
      biometricScore: confidenceScore
    }));

    setLoading(false);
    setScanStatus('idle');
    setSubmitted(true);
    setTimeout(() => {
      navigate('/driver-dash');
    }, 2000);
  };

  if (submitted) {
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center font-sans">
        <div className="bg-white p-12 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center animate-fade-in text-center max-w-md w-full border border-slate-100">
          <CheckCircle size={80} className="text-[#0ea5e9] mb-6 animate-pulse" />
          <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Application Submitted!</h2>
          <p className="text-slate-500 font-medium text-lg mb-4">We are reviewing your details.</p>
          <div className="w-8 h-8 border-4 border-[#0ea5e9] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-4">Taking you to driver portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex font-sans box-border overflow-hidden">
      
      {/* LEFT COLUMN: BRANDING & MARKETING */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] bg-gradient-to-br from-[#020617] via-[#0F172A] to-[#0ea5e9]/30 relative overflow-hidden flex-col justify-between p-16 xl:p-24 shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-10">
         
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
               Drive with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8]">RideSafe.</span>
             </h1>
             <p className="text-slate-300 text-xl max-w-lg leading-relaxed mb-12 font-medium drop-shadow-md">
               Earn on your own schedule. Be your own boss. Access millions of customers in your city.
             </p>
             
             <div className="flex flex-col gap-6 mt-4">
                <div className="flex items-center gap-5 text-white font-bold transition-transform hover:-translate-y-1">
                   <div className="bg-[#0ea5e9]/20 p-4 rounded-2xl shadow-[inset_0_0_15px_rgba(0,168,107,0.2)] border border-[#0ea5e9]/30">
                     <CheckCircle2 className="text-[#38bdf8] w-6 h-6 shrink-0"/>
                   </div>
                   <span className="text-lg tracking-wide drop-shadow-md">Instant payouts after every ride</span>
                </div>
                <div className="flex items-center gap-5 text-white font-bold transition-transform hover:-translate-y-1">
                   <div className="bg-[#0ea5e9]/20 p-4 rounded-2xl shadow-[inset_0_0_15px_rgba(0,168,107,0.2)] border border-[#0ea5e9]/30">
                     <Shield className="text-[#38bdf8] w-6 h-6 shrink-0"/>
                   </div>
                   <span className="text-lg tracking-wide drop-shadow-md">24/7 Driver Support & SOS Tracking</span>
                </div>
             </div>
           </div>
           
           <div className="text-slate-500 font-medium text-sm mt-8">
              © {new Date().getFullYear()} RideSafe Philippines.
           </div>
         </div>
      </div>

      {/* RIGHT COLUMN: REGISTRATION FORM */}
      <div className="w-full lg:w-[55%] xl:w-[60%] flex flex-col relative bg-slate-50 overflow-y-auto">
         
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
         <div className="flex-1 flex flex-col p-8 sm:p-12 animate-fade-in items-center">
           <div className="w-full max-w-[600px] bg-white p-8 sm:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
              
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8]"></div>

              <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Driver Registration</h2>
                <p className="text-slate-500 text-[1.05rem] font-medium leading-relaxed">Fill in your details and upload requirements below.</p>
                {errorMsg && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl font-bold text-sm shadow-sm flex items-center">
                    {errorMsg}
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                
                {/* 2-Column Grid inside the form for wider screens */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Basic Info */}
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
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Vehicle Type</label>
                    <select className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 px-5 py-3.5 rounded-xl text-[1.05rem] font-semibold transition-all focus:bg-white focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 outline-none appearance-none" required value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value})}>
                      <option value="motorcycle">Motorcycle</option>
                      <option value="sedan">Sedan (4-seater)</option>
                      <option value="suv">SUV (6-seater)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Plate Number</label>
                    <input type="text" className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 px-5 py-3.5 rounded-xl text-[1.05rem] font-semibold transition-all focus:bg-white focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 outline-none placeholder-slate-300 uppercase" placeholder="ABC 1234" required value={formData.plateNumber} onChange={e => setFormData({...formData, plateNumber: e.target.value})} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">ID Type</label>
                    <select className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 px-5 py-3.5 rounded-xl text-[1.05rem] font-semibold transition-all focus:bg-white focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 outline-none appearance-none" value={formData.idType} onChange={e => setFormData({...formData, idType: e.target.value})}>
                      <option value="national_id">National ID</option>
                      <option value="passport">Passport</option>
                      <option value="drivers_license">Driver's License</option>
                      <option value="student_id">Student ID</option>
                      <option value="postal_id">Postal ID</option>
                      <option value="voters_id">Voter's ID</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">ID Number</label>
                  <input type="text" className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 px-5 py-3.5 rounded-xl text-[1.05rem] font-semibold transition-all focus:bg-white focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 outline-none placeholder-slate-300" placeholder="Enter ID number" required value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} />
                </div>

                {/* File Uploads (Full width spanning) */}
                <div className="flex flex-col md:flex-row gap-4 mt-2">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Valid ID Photo</label>
                    <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all h-full ${idFile ? 'border-[#0ea5e9] bg-[#0ea5e9]/5' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-[#0ea5e9]/50'}`}>
                      <UploadCloud className={`mb-3 ${idFile ? 'text-[#0ea5e9]' : 'text-slate-400'}`} size={28} />
                      <span className="font-bold text-slate-700 text-center text-sm mb-1">{idFile ? idFile.name : 'Tap to upload ID'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) setIdFile(e.target.files[0]); }} />
                    </label>
                  </div>

                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Face Verification (Selfie)</label>
                    <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all h-full ${selfieFile ? 'border-[#0ea5e9] bg-[#0ea5e9]/5' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-[#0ea5e9]/50'}`}>
                      <ScanFace className={`mb-3 ${selfieFile ? 'text-[#0ea5e9]' : 'text-slate-400'}`} size={28} />
                      <span className="font-bold text-slate-700 text-center text-sm mb-1">{selfieFile ? selfieFile.name : 'Tap to upload Selfie'}</span>
                      <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) setSelfieFile(e.target.files[0]); }} />
                    </label>
                  </div>

                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Driver's License</label>
                    <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all h-full ${licenseFile ? 'border-[#0ea5e9] bg-[#0ea5e9]/5' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-[#0ea5e9]/50'}`}>
                      <Truck className={`mb-3 ${licenseFile ? 'text-[#0ea5e9]' : 'text-slate-400'}`} size={28} />
                      <span className="font-bold text-slate-700 text-center text-sm mb-1">{licenseFile ? licenseFile.name : 'Tap to upload License'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) setLicenseFile(e.target.files[0]); }} />
                    </label>
                  </div>
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
                  Submit Application
                </button>
              </form>
           </div>
         </div>
      </div>

      {/* Biometric Scan Modal - Rebuilt for new premium layout */}
      {scanStatus !== 'idle' && (
        <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
           <div className="bg-white p-10 rounded-[2rem] w-full max-w-[420px] shadow-2xl flex flex-col items-center text-center animate-fade-in relative border border-slate-100">
              
              {scanStatus === 'scanning' && (
                 <>
                    <h3 className="text-slate-900 text-2xl font-black mb-8 flex items-center justify-center gap-3">
                       <ScanFace className="text-[#0ea5e9] animate-pulse" size={32} /> Biometric KYC
                    </h3>
                    
                    <div className="relative w-56 h-56 mb-8">
                       <div className="absolute inset-0 border-[6px] border-dashed border-[#0ea5e9]/30 rounded-3xl" style={{ animation: 'spin 10s linear infinite' }}></div>
                       <div className="absolute inset-3 bg-slate-100 rounded-[1.25rem] overflow-hidden flex items-center justify-center shadow-inner">
                          {selfieFile ? (
                             <img src={URL.createObjectURL(selfieFile)} alt="Selfie" className="w-full h-full object-cover opacity-90" />
                          ) : <ScanFace size={64} className="text-slate-300" />}
                       </div>
                       
                       {/* Scanner Line */}
                       <div className="absolute left-0 right-0 h-1.5 bg-[#0ea5e9] shadow-[0_0_20px_rgba(0,168,107,1)] z-10 rounded-full" style={{
                          top: `${Math.min(scanProgress, 100)}%`,
                          transition: 'top 0.4s ease-out'
                       }}></div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-3 mb-3 shadow-inner">
                       <div className="bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] h-3 rounded-full transition-all duration-300" style={{ width: `${Math.min(scanProgress, 100)}%` }}></div>
                    </div>
                    <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest">Analyzing Facial Landmarks... {Math.min(scanProgress, 100)}%</p>
                 </>
              )}

              {scanStatus === 'success' && (
                 <div className="animate-fade-in w-full flex flex-col items-center">
                    <div className="w-28 h-28 bg-[#0ea5e9]/10 rounded-full flex items-center justify-center mb-6 border-[6px] border-[#0ea5e9]/20">
                       <CheckCircle size={56} className="text-[#0ea5e9]" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Identity Verified!</h2>
                    <div className="bg-[#0ea5e9]/5 text-[#0ea5e9] p-4 rounded-2xl border border-[#0ea5e9]/20 inline-block mb-6">
                       <span className="font-black block text-3xl">{confidenceScore}%</span>
                       <span className="text-xs uppercase tracking-widest font-bold">Confidence Match</span>
                    </div>
                    <p className="text-slate-500 font-medium">Proceeding with registration securely...</p>
                 </div>
              )}

              {scanStatus === 'error' && (
                 <div className="animate-fade-in w-full flex flex-col items-center">
                    <div className="w-28 h-28 bg-red-50 rounded-full flex items-center justify-center mb-6 border-[6px] border-red-100 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
                       <AlertTriangle size={56} className="text-red-500" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Verification Failed</h2>
                    <p className="text-[1.05rem] text-slate-700 font-medium mb-8 bg-red-50 p-4 rounded-xl border border-red-100">{scanErrorMsg}</p>
                    
                    <button 
                      className="w-full bg-white border-2 border-slate-200 text-slate-700 rounded-xl py-4 font-bold transition-all hover:bg-slate-50 hover:border-slate-300" 
                      onClick={() => setScanStatus('idle')}
                    >
                       Retry Verification
                    </button>
                 </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
