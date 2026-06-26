import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UploadCloud, UserPlus, CheckCircle, Truck } from 'lucide-react';

export default function DriverRegister() {
  const navigate = useNavigate();
  const [idFile, setIdFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!idFile || !licenseFile) {
      alert("Please upload both a valid ID and your Driver's License.");
      return;
    }
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
      </div>

      <div className="glass-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" placeholder="Juan Dela Cruz" required />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input type="tel" className="form-input" placeholder="+63 9XX XXX XXXX" required />
          </div>

          <div className="form-group">
            <label className="form-label">Vehicle Type</label>
            <select className="form-input" required style={{ appearance: 'none' }}>
              <option value="" disabled selected>Select vehicle type</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="sedan">Car / Sedan</option>
              <option value="suv">SUV</option>
              <option value="tricycle">Tricycle</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Plate Number</label>
            <input type="text" className="form-input" placeholder="ABC 1234" required />
          </div>

          <div className="form-group">
            <label className="form-label">Upload 1 Valid ID</label>
            <label className={`file-upload ${idFile ? 'has-file' : ''}`}>
              <UploadCloud className="file-upload-icon" size={24} />
              <span style={{ fontWeight: '500', marginBottom: '0.5rem' }}>
                {idFile ? idFile.name : 'Tap to upload ID'}
              </span>
              <input type="file" accept="image/*" className="form-input" onChange={handleIdChange} />
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

          <button type="submit" className="btn btn-primary btn-block mt-4">
            <UserPlus size={20} />
            Submit Application
          </button>
        </form>
      </div>
    </div>
  );
}
