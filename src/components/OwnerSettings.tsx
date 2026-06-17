import React, { useState } from 'react';
import { Sliders, Save, RotateCcw, Shield, ShieldCheck, Mail, Phone, Lock, User } from 'lucide-react';

interface OwnerSettingsProps {
  enterpriseName: string;
  lowStockThreshold: number;
  onSaveSettings: (
    name: string, 
    lowStock: number, 
    phone?: string, 
    pin?: string, 
    username?: string, 
    googleEmail?: string
  ) => void;
  ownerPhone?: string;
  ownerPin?: string;
  ownerUsername?: string;
  ownerGoogleEmail?: string;
}

export default function OwnerSettings({
  enterpriseName,
  lowStockThreshold,
  onSaveSettings,
  ownerPhone = '0712345678',
  ownerPin = '4321',
  ownerUsername = 'admin',
  ownerGoogleEmail = 'micahprincemicah001@gmail.com',
}: OwnerSettingsProps) {
  const [name, setName] = useState(enterpriseName);
  const [lowStock, setLowStock] = useState(lowStockThreshold);
  
  // Admin Login credentials form states
  const [phone, setPhone] = useState(ownerPhone);
  const [pin, setPin] = useState(ownerPin);
  const [username, setUsername] = useState(ownerUsername);
  const [googleEmail, setGoogleEmail] = useState(ownerGoogleEmail);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(
      name, 
      lowStock, 
      phone.trim(), 
      pin.trim(), 
      username.trim(), 
      googleEmail.trim().toLowerCase()
    );
  };

  const handleReset = () => {
    setName('TrippleM');
    setLowStock(15);
    setPhone('0712345678');
    setPin('4321');
    setUsername('admin');
    setGoogleEmail('micahprincemicah001@gmail.com');
  };

  return (
    <div id="settings-page" className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Title Header */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Sliders className="w-5 h-5 text-slate-500" /> Administrative Settings
        </h2>
        <p className="text-slate-500 text-xs mt-0.5">
          Configure general preferences, enterprise operational parameters, and administrator authentication.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Admin Profile Info */}
        <div className="col-span-1 space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-[0.1]">
              <Shield className="w-24 h-24 text-white" />
            </div>
            <span className="bg-white/10 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
              Control Station
            </span>
            <h3 className="font-bold text-sm mt-3 text-white">System Controller</h3>
            <p className="text-[11px] text-slate-350 mt-1 leading-relaxed">
              These settings safely persist in your browser environment to dynamically transform your shop registers.
            </p>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-150 p-5 rounded-2xl space-y-3">
            <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Active Credentials
            </h4>
            <p className="text-[11px] text-emerald-850 leading-relaxed">
              To log in as the system owner from any device or register, use any of the configured identifiers and PIN:
            </p>
            <div className="bg-white p-3 rounded-lg border border-emerald-100 text-xs font-mono text-slate-705 space-y-1.5 shadow-xs">
              <div>Username: <strong className="text-slate-900">{ownerUsername}</strong></div>
              <div>Phone: <strong className="text-slate-900">{ownerPhone}</strong></div>
              <div className="truncate">Email: <strong className="text-slate-900">{ownerGoogleEmail}</strong></div>
              <div>PIN Code: <strong className="text-slate-900">{ownerPin}</strong></div>
            </div>
          </div>
        </div>

        {/* Right Side: Form Inputs */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden divide-y divide-slate-100">
            {/* Setting Item 1: Name */}
            <div className="p-5 md:p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Enterprise Brand Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-250 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium"
                  placeholder="e.g. TrippleM"
                />
                <p className="text-[10px] text-slate-400 mt-1.5 leading-normal">
                  Sets the global header brand name printed on dashboards, summaries, and receipts.
                </p>
              </div>
            </div>

            {/* Setting Item 2: Stock warnings */}
            <div className="p-5 md:p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Low Stock Threshold Warning
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={1000}
                  value={lowStock}
                  onChange={(e) => setLowStock(Number(e.target.value))}
                  className="w-full border border-slate-250 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-semibold"
                  placeholder="e.g. 15"
                />
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Triggers warning badges for products whose counts drop below this current quantity.
                </p>
              </div>
            </div>

            {/* Setting Item 3: Admin User Credentials */}
            <div className="p-5 md:p-6 space-y-5">
              <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-105 pb-2">
                <Shield className="w-4 h-4 text-slate-500" /> Executive Authentication Profiles
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" /> Admin Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full border border-slate-250 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium"
                    placeholder="e.g. admin"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> Admin Phone
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-slate-250 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium"
                    placeholder="e.g. 0712345678"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" /> Google Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    className="w-full border border-slate-250 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium"
                    placeholder="e.g. micahprincemicah001@gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Admin PIN (Password)
                  </label>
                  <input
                    type="text"
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full border border-slate-250 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium"
                    placeholder="e.g. 4321"
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-450 leading-relaxed italic bg-slate-50 p-3 rounded-lg border border-slate-100">
                Tip: Once linked, you can log in securely using your configured standard credentials (Username, PIN, or Phone) or authenticate instantly with Google!
              </p>
            </div>

            {/* Bottom Form Actions */}
            <div className="p-5 md:p-6 flex items-center justify-between gap-4 bg-slate-50/50">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs rounded-xl transition cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" /> Save Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
