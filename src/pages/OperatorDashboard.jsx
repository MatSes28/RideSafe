import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Settings, BarChart2, Users, Map as MapIcon, Compass, Bell, Shield, TrendingUp, Key, LogOut, ChevronRight, Activity, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Simulated Fleet Data
  const fleetData = [
    { id: 'MOT-001', driver: 'Juan Dela Cruz', status: 'Active', todayEarnings: 1250, currentLoc: 'BGC, Taguig' },
    { id: 'MOT-002', driver: 'Pedro Penduko', status: 'Offline', todayEarnings: 0, currentLoc: 'Quezon City' },
    { id: 'CAR-001', driver: 'Maria Makiling', status: 'Active', todayEarnings: 3400, currentLoc: 'Makati CBD' },
  ];

  return (
    <div className="h-full w-full bg-surface-color flex flex-col text-main relative">
      {/* Header */}
      <div className="p-4 bg-primary text-white shadow-md flex justify-between items-center z-10 sticky top-0">
        <div>
          <h2 className="m-0 text-xl font-bold flex items-center gap-2">
            <Key size={24} /> Operator Portal
          </h2>
          <span className="text-xs opacity-80">Fleet Management Dashboard</span>
        </div>
        <button className="btn btn-outline border-white text-white py-1 px-3 text-xs" onClick={() => navigate('/')}>
          <LogOut size={14}/> Exit
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface-color shadow-sm border-b border-gray-200 overflow-x-auto sticky top-[72px] z-10" style={{ scrollbarWidth: 'none' }}>
        <button className={`flex-1 py-3 px-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all ${activeTab === 'overview' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted hover:bg-gray-50'}`} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button className={`flex-1 py-3 px-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all ${activeTab === 'fleet' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted hover:bg-gray-50'}`} onClick={() => setActiveTab('fleet')}>
          My Fleet
        </button>
        <button className={`flex-1 py-3 px-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all ${activeTab === 'earnings' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted hover:bg-gray-50'}`} onClick={() => setActiveTab('earnings')}>
          Earnings
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {activeTab === 'overview' && (
          <div className="animate-fade-in flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-color p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 text-muted mb-2"><Users size={16}/> <span className="text-xs font-bold uppercase">Total Drivers</span></div>
                <h2 className="m-0 text-3xl font-black text-primary">3</h2>
              </div>
              <div className="bg-surface-color p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 text-muted mb-2"><Activity size={16}/> <span className="text-xs font-bold uppercase">Active Now</span></div>
                <h2 className="m-0 text-3xl font-black text-green-500">2</h2>
              </div>
            </div>

            <div className="bg-surface-color p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-primary">
               <div className="flex items-center gap-2 text-muted mb-1"><DollarSign size={16}/> <span className="text-xs font-bold uppercase">Fleet Earnings (Today)</span></div>
               <h1 className="m-0 text-4xl font-black text-main">₱ 4,650</h1>
               <div className="text-xs text-green-500 font-bold flex items-center gap-1 mt-1"><TrendingUp size={12}/> +12% from yesterday</div>
            </div>

            <h4 className="text-secondary mt-2 mb-0">Live Activity Log</h4>
            <div className="bg-surface-color rounded-xl shadow-sm border border-gray-100 overflow-hidden">
               {[
                 { time: '10:42 AM', msg: 'MOT-001 completed a ride (₱150)' },
                 { time: '10:15 AM', msg: 'CAR-001 accepted a premium booking' },
                 { time: '09:00 AM', msg: 'MOT-002 went offline' }
               ].map((log, i) => (
                  <div key={i} className="p-3 border-b border-gray-100 flex items-start gap-3 last:border-0">
                     <span className="text-xs text-muted w-16 whitespace-nowrap">{log.time}</span>
                     <span className="text-sm font-medium">{log.msg}</span>
                  </div>
               ))}
            </div>
          </div>
        )}

        {activeTab === 'fleet' && (
          <div className="animate-fade-in flex flex-col gap-3">
             <div className="flex justify-between items-center mb-2">
                <h4 className="text-secondary m-0">Managed Vehicles</h4>
                <button className="btn btn-outline py-1 px-3 text-xs border-primary text-primary">Add Vehicle</button>
             </div>
             
             {fleetData.map((vehicle, i) => (
                <div key={i} className="bg-surface-color p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                         <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">{vehicle.id.split('-')[1]}</div>
                         <div>
                            <h4 className="m-0 text-primary">{vehicle.id}</h4>
                            <span className="text-xs text-muted font-medium">{vehicle.driver}</span>
                         </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${vehicle.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                         {vehicle.status}
                      </span>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-gray-100">
                      <div>
                         <span className="text-xs text-muted block mb-1">Today's Earnings</span>
                         <span className="font-bold text-sm">₱{vehicle.todayEarnings}</span>
                      </div>
                      <div>
                         <span className="text-xs text-muted block mb-1">Last Location</span>
                         <span className="font-bold text-sm truncate max-w-[120px] inline-block">{vehicle.currentLoc}</span>
                      </div>
                   </div>
                   
                   <button className="btn btn-outline w-full py-2 mt-2 text-sm flex items-center justify-center gap-2">
                      <MapIcon size={14}/> View on Map
                   </button>
                </div>
             ))}
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="animate-fade-in text-center p-6 text-muted">
             <BarChart2 size={48} className="mx-auto mb-4 opacity-50" />
             <h3>Earnings Reports</h3>
             <p className="text-sm">Detailed operator payout reports and analytics will be available in the next billing cycle.</p>
          </div>
        )}
      </div>
    </div>
  );
}
