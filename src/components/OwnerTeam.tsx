import React, { useState } from 'react';
import { Users, UserMinus, Plus, ShieldCheck, ShieldAlert, X } from 'lucide-react';
import { TeamMember, Business } from '../types';

interface OwnerTeamProps {
  team: TeamMember[];
  businesses: Business[];
  onAddTeamMember: (name: string, role: string, bizId: string, phone: string, pin: string, googleEmail?: string, username?: string) => void;
  onToggleStatus: (memberId: string) => void;
  onRemoveMember: (memberId: string) => void;
  onShowToast: (msg: string, isError?: boolean) => void;
}

export default function OwnerTeam({
  team,
  businesses,
  onAddTeamMember,
  onToggleStatus,
  onRemoveMember,
  onShowToast,
}: OwnerTeamProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [bizId, setBizId] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('12345678');
  const [googleEmail, setGoogleEmail] = useState('');
  const [username, setUsername] = useState('');

  const getBusinessName = (id: string) => {
    return businesses.find((b) => b.id === id)?.name || 'HQ Floating / Unassigned';
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim() || !bizId || !phone.trim()) {
      onShowToast('All input fields, including Phone, are required.', true);
      return;
    }
    onAddTeamMember(name, role, bizId, phone.trim(), '12345678', googleEmail.trim() || undefined, username.trim() || undefined);
    setModalOpen(false);
    setName('');
    setRole('');
    setBizId('');
    setPhone('');
    setPin('12345678');
    setGoogleEmail('');
    setUsername('');
  };

  const openAddForm = () => {
    setName('');
    setRole('');
    setBizId(businesses[0]?.id || '');
    setPhone('');
    setPin('12345678');
    setGoogleEmail('');
    setUsername('');
    setModalOpen(true);
  };

  // Safe crew entries that hide administrator
  const visibleTeam = team.filter((t) => t.id !== 'admin' && t.role !== 'owner');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" /> Team
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Add staff and lock or unlock accounts.
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="px-3 py-2 bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition rounded-xl cursor-pointer shadow-sm shrink-0"
        >
          + Add Person
        </button>
      </div>

      {/* Staff lists card grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleTeam.map((t) => {
          const isActive = t.status === 'active';
          return (
            <div
              key={t.id}
              className="bg-white p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 text-slate-800 rounded-full flex items-center justify-center font-black text-base uppercase shrink-0 border border-slate-200/50">
                  {t.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-950 text-sm leading-tight truncate">{t.name}</h4>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider flex items-center gap-0.5 border ${
                        isActive
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                          : 'bg-rose-50 border-rose-100 text-rose-800'
                      }`}
                    >
                      {isActive ? <ShieldCheck className="w-2 h-2" /> : <ShieldAlert className="w-2 h-2" />}
                      {t.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Role:{' '}
                    <span className="font-bold text-slate-700">
                      {t.role}
                    </span>{' '}
                    <span className="mx-1 text-slate-350">•</span> Shop:{' '}
                    <span className="font-bold text-slate-700">
                      {getBusinessName(t.bizId)}
                    </span>
                  </p>
                  <div className="flex gap-2 flex-wrap items-center text-[10px] text-slate-500 mt-1.5 font-mono">
                    {t.username && <span className="bg-slate-50 px-1.5 py-0.5 border border-slate-100 rounded text-slate-600">User: <strong>{t.username}</strong></span>}
                    <span className="bg-slate-50 px-1.5 py-0.5 border border-slate-100 rounded text-slate-600">Phone: <strong>{t.phone}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 border-t border-slate-100 pt-3.5 sm:pt-0 sm:border-0 shrink-0">
                <button
                  onClick={() => onToggleStatus(t.id)}
                  className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border rounded cursor-pointer transition ${
                    isActive
                      ? 'border-rose-200 text-rose-600 hover:bg-rose-50 bg-white'
                      : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 bg-white'
                  }`}
                >
                  {isActive ? 'Lock' : 'Unlock'}
                </button>
                <button
                  onClick={() => setMemberToDelete(t)}
                  className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 hover:bg-rose-100 transition border border-rose-100 rounded cursor-pointer"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {visibleTeam.length === 0 && (
          <div className="lg:col-span-2 bg-white/40 border border-slate-200 rounded-2xl p-12 text-center text-slate-400 italic text-xs font-medium">
            No registered staff. Click Add Person to start.
          </div>
        )}
      </div>

      {/* Confirmation delete modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setMemberToDelete(null)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col z-10 border border-slate-100 animate-slide-up font-sans">
            <div className="px-5 py-4 border-b border-rose-100 flex justify-between items-center bg-rose-50/50">
              <h3 className="font-extrabold text-rose-900 text-xs tracking-wider uppercase">
                Accidental Delete Protection
              </h3>
              <button
                onClick={() => setMemberToDelete(null)}
                className="text-rose-400 hover:text-rose-600 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-slate-600 text-xs font-medium leading-relaxed">
                Are you absolutely sure you want to permanently delete <strong className="text-slate-900 font-extrabold">"{memberToDelete.name}"</strong>? Under security guidelines, all their linked permissions and schedule references will be removed.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMemberToDelete(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRemoveMember(memberToDelete.id);
                    setMemberToDelete(null);
                  }}
                  className="flex-1 py-2 bg-rose-650 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-xs"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
          <form
            onSubmit={handleAddSubmit}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col z-10 border border-slate-100 animate-slide-up"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-xs tracking-wider uppercase">
                Add Person
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium"
                  placeholder="e.g. Jane Nabossa"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Role
                </label>
                <input
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border border-slate-200 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium"
                  placeholder="e.g. Cashier"
                />
              </div>

               <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Select Shop
                </label>
                <select
                  required
                  value={bizId}
                  onChange={(e) => setBizId(e.target.value)}
                  className="w-full border border-slate-200 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium appearance-none bg-white font-semibold"
                >
                  <option value="" disabled>--- Select shop ---</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Username (Optional)
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full border border-slate-200 p-3 text-xs rounded-xl outline-none focus:border-slate-900 font-sans font-semibold"
                    placeholder="e.g. janedoe"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Google Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    className="w-full border border-slate-200 p-3 text-xs rounded-xl outline-none focus:border-slate-900 font-sans font-semibold"
                    placeholder="e.g. name@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-slate-200 p-3 text-xs rounded-xl outline-none focus:border-slate-900 font-sans font-semibold"
                  placeholder="e.g. 0787654321"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Employee password is system-assigned to <span className="font-bold">12345678</span>. They can update it using the "Forgot Password" link on login.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold py-3 text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md mt-2"
              >
                Save Person
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
