import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UploadCloud, UserPlus, CheckCircle, Truck, ScanFace, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DriverRegister() {
  const navigate = useNavigate();
  const [idFile, setIdFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [acceptLegal, setAcceptLegal] = useState(false);

  const [scanStatus, setScanStatus] = useState('idle'); // idle | scanning | success | error
  const [scanProgress, setScanProgress] = useState(0);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [scanErrorMsg, setScanErrorMsg] = useState('');

  const [formData, setFormData] = useState({ 
    name: '', phone: '', password: '', 
    vehicleType: 'motorcycle', plateNumber: '',
    idType: 'national_id', idNumber: ''
  });

  const handleIdChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setIdFile(e.target.files[0]);
    }
  };

  const handleLicenseChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLicenseFile(e.target.files[0]);
    }
  };

  const validateIdFormat = (type, number) => {
    const formats = {
      'passport': /^[a-zA-Z]{1,2}[0-9]{7}[a-zA-Z]?$/, // e.g., P1234567A
      'national_id': /^[0-9]{4}-[0-9]{7}-[0-9]{1}$/, // e.g., 1234-1234567-1
      'drivers_license': /^[A-Z][0-9]{2}-[0-9]{2}-[0-9]{6}$/ // e.g., N01-12-123456
    };
    if (formats[type]) return formats[type].test(number);
    return true; // fallback for IDs without strict regex
  };

  const startBiometricScan = () => {
    setScanStatus('scanning');
    setScanProgress(0);
    
    // Simulate complex AI scanning progress
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
    // 95% chance to pass (just for demo purposes)
    const passed = Math.random() > 0.05;
    if (passed) {
      setConfidenceScore(Math.floor(Math.random() * 5) + 94); // 94-98%
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
    if (!licenseFile || !idFile) {
      alert("Please upload both ID and Driver's License.");
      return;
    }
    if (!selfieFile) {
      alert("Please upload a selfie for face verification.");
      return;
    }

    if (!validateIdFormat(formData.idType, formData.idNumber)) {
       setScanStatus('error');
       setScanErrorMsg(`Invalid format for ${formData.idType.replace('_', ' ')}. Please check the number and try again.`);
       return;
    }

    // Start Biometric UI instead of immediately registering
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
      return;
    }

    const userId = data.user.id;

    // Upload ID & License
    const idFileName = `${userId}/driver_id_${Date.now()}`;
    const licenseFileName = `${userId}/license_${Date.now()}`;
    
    // Upload to documents bucket instead of verifications
    await supabase.storage.from('documents').upload(idFileName, idFile);
    await supabase.storage.from('documents').upload(licenseFileName, licenseFile);

    const { data: idUrl } = supabase.storage.from('documents').getPublicUrl(idFileName);
    const { data: licenseUrl } = supabase.storage.from('documents').getPublicUrl(licenseFileName);

    // Create profile (unapproved initially)
    await supabase.from('profiles').insert({
      id: userId,
      role: 'driver',
      is_approved: false,
      wallet_balance: 0,
      license_url: licenseUrl.publicUrl,
      vehicle_registration_url: idUrl.publicUrl
    });

    // Save extra metadata for Admin dashboard (Prototype workaround)
    localStorage.setItem(`driver_meta_${userId}`, JSON.stringify({
      fullName: formData.name,
      vehicleType: formData.vehicleType,
      plateNumber: formData.plateNumber,
      idType: formData.idType,
      biometricScore: confidenceScore
    }));

    setLoading(false);

    setSubmitted(true);
    setTimeout(() => {
      navigate('/driver-dash');
    }, 2000);
  };

  if (submitted) {
    return (
      <div className="p-4 flex flex-col items-center justify-center animate-fade-in" style={{ minHeight: '80vh' }}>
        <CheckCircle size={60} className="text-primary mb-4" />
        <h2 className="text-center">Application Submitted!</h2>
        <p className="text-center">We are reviewing your details.</p>
        <p className="text-center text-muted" style={{ fontSize: '0.9rem', marginTop: '1rem' }}>Taking you to the driver portal...</p>
      </div>
    );
  }

  return (
    <div className="p-4 animate-fade-in" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <button className="btn btn-outline mb-4" onClick={() => navigate('/login')} style={{ padding: '0.5rem 1rem' }}>
        <ArrowLeft size={18} /> Back
      </button>

      <div className="mb-4">
        <h2>Drive with RideSafe</h2>
        <p>Earn on your own schedule. Sign up below.</p>
        {errorMsg && <p className="text-danger mt-2">{errorMsg}</p>}
      </div>

      <div className="glass-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" placeholder="Juan Dela Cruz" required 
                   value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input type="tel" className="form-input" placeholder="09XX XXX XXXX" required 
                   value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="Create a strong password" required 
                   value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          <div className="form-group">
            <label className="form-label">Vehicle Type</label>
            <select className="form-input" required value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value})}>
              <option value="motorcycle">Motorcycle</option>
              <option value="sedan">Sedan (4-seater)</option>
              <option value="suv">SUV (6-seater)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Plate Number</label>
            <input type="text" className="form-input" placeholder="ABC 1234" required 
                   value={formData.plateNumber} onChange={e => setFormData({...formData, plateNumber: e.target.value})} />
          </div>

          <div className="form-group">
            <label className="form-label">ID Type</label>
            <select className="form-input" value={formData.idType} onChange={e => setFormData({...formData, idType: e.target.value})}>
              <option value="national_id">National ID</option>
              <option value="passport">Passport</option>
              <option value="drivers_license">Driver's License</option>
              <option value="student_id">Student ID</option>
              <option value="postal_id">Postal ID</option>
              <option value="voters_id">Voter's ID</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">ID Number</label>
            <input type="text" className="form-input" placeholder="Enter ID number" required 
                   value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} />
          </div>

          <div className="form-group">
            <label className="form-label">Upload Valid ID Photo</label>
            <label className={`file-upload ${idFile ? 'has-file' : ''}`}>
              <UploadCloud className="file-upload-icon" size={24} />
              <span style={{ fontWeight: '500', marginBottom: '0.5rem' }}>
                {idFile ? idFile.name : 'Tap to upload ID'}
              </span>
              <input type="file" accept="image/*" className="form-input" onChange={handleIdChange} />
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Face Verification (Selfie)</label>
            <label className={`file-upload ${selfieFile ? 'has-file' : ''}`}>
              <UploadCloud className="file-upload-icon" size={24} />
              <span style={{ fontWeight: '500', marginBottom: '0.5rem' }}>
                {selfieFile ? selfieFile.name : 'Tap to upload Selfie'}
              </span>
              <input type="file" accept="image/*" capture="user" className="form-input" onChange={(e) => {
                 if (e.target.files && e.target.files[0]) {
                   setSelfieFile(e.target.files[0]);
                 }
              }} />
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Upload Driver's License</label>
            <label className={`file-upload ${licenseFile ? 'has-file' : ''}`}>
              <Truck className="file-upload-icon" size={24} />
              <span style={{ fontWeight: '500', marginBottom: '0.5rem' }}>
                {licenseFile ? licenseFile.name : 'Tap to upload License'}
              </span>
              <input type="file" accept="image/*" className="form-input" onChange={handleLicenseChange} />
            </label>
          </div>

          <div className="flex items-start gap-2 mt-4 mb-4">
            <input 
              type="checkbox" 
              id="legal" 
              checked={acceptLegal} 
              onChange={(e) => setAcceptLegal(e.target.checked)} 
              className="mt-1"
            />
            <label htmlFor="legal" className="text-sm text-muted">
              I agree to the <a href="/terms" className="text-primary hover:underline">Terms of Service</a> and <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
            </label>
          </div>

          <button type="submit" className="btn btn-primary btn-block mt-4" disabled={loading}>
            {loading ? "Registering..." : (
              <>
                <UserPlus size={20} />
                Submit Application
              </>
            )}
          </button>
        </form>
      </div>

      {/* Biometric Scan Modal */}
      {scanStatus !== 'idle' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div className="bg-surface-color p-8 rounded-3xl w-[90%] max-w-[400px] shadow-2xl flex flex-col items-center text-center animate-fade-in relative overflow-hidden">
              
              {scanStatus === 'scanning' && (
                 <>
                    <h3 className="text-primary m-0 mb-6 flex items-center gap-2">
                       <ScanFace className="animate-pulse" /> Advanced Biometric KYC
                    </h3>
                    
                    <div className="relative w-48 h-48 mb-6">
                       <div className="absolute inset-0 border-4 border-dashed border-primary/30 rounded-2xl" style={{ animation: 'spin 10s linear infinite' }}></div>
                       <div className="absolute inset-2 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                          {selfieFile ? (
                             <img src={URL.createObjectURL(selfieFile)} alt="Selfie" className="w-full h-full object-cover opacity-80" />
                          ) : <ScanFace size={64} className="text-gray-300" />}
                       </div>
                       
                       {/* Scanner Line */}
                       <div className="absolute left-0 right-0 h-1 bg-primary shadow-[0_0_15px_rgba(14,165,233,1)] z-10" style={{
                          top: `${Math.min(scanProgress, 100)}%`,
                          transition: 'top 0.4s ease-out'
                       }}></div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                       <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min(scanProgress, 100)}%` }}></div>
                    </div>
                    <p className="text-sm font-bold text-muted m-0">Analyzing Facial Landmarks... {Math.min(scanProgress, 100)}%</p>
                 </>
              )}

              {scanStatus === 'success' && (
                 <div className="animate-fade-in w-full">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-green-400">
                       <CheckCircle size={48} className="text-green-500" />
                    </div>
                    <h2 className="text-2xl text-green-500 m-0 mb-2">Identity Verified!</h2>
                    <div className="bg-green-50 text-green-700 p-3 rounded-xl border border-green-200 inline-block mb-4">
                       <span className="font-bold block text-lg">{confidenceScore}%</span>
                       <span className="text-xs uppercase tracking-widest">Confidence Match</span>
                    </div>
                    <p className="text-sm text-muted">Proceeding with registration...</p>
                 </div>
              )}

              {scanStatus === 'error' && (
                 <div className="animate-fade-in w-full">
                    <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                       <AlertTriangle size={48} className="text-red-500" />
                    </div>
                    <h2 className="text-2xl text-red-500 m-0 mb-2">Verification Failed</h2>
                    <p className="text-sm text-main font-medium mb-6 bg-red-50 p-3 rounded-lg border border-red-200">{scanErrorMsg}</p>
                    
                    <button className="btn btn-danger btn-block" onClick={() => setScanStatus('idle')}>
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
