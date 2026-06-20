import React, { useState } from 'react';
import {
  Users,
  UserMinus,
  Plus,
  ShieldCheck,
  ShieldAlert,
  X,
  ArrowLeft,
  Calendar,
  Search,
  TrendingUp,
  TrendingDown,
  Clock,
  ShoppingBag,
  Landmark,
  FileSpreadsheet,
  ChevronRight,
  Filter
} from 'lucide-react';
import { TeamMember, Business, Transaction } from '../types';

interface OwnerTeamProps {
  team: TeamMember[];
  businesses: Business[];
  transactions: Transaction[];
  currencySymbol?: string;
  onAddTeamMember: (name: string, role: string, bizId: string, phone: string, pin: string, googleEmail?: string, username?: string) => boolean;
  onToggleStatus: (memberId: string) => void;
  onRemoveMember: (memberId: string) => void;
  onShowToast: (msg: string, isError?: boolean) => void;
}

export default function OwnerTeam({
  team,
  businesses,
  transactions,
  currencySymbol = 'KSh',
  onAddTeamMember,
  onToggleStatus,
  onRemoveMember,
  onShowToast,
}: OwnerTeamProps) {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'expense' | 'cash_count'>('all');
  const [portfolioTab, setPortfolioTab] = useState<'ledger' | 'movement'>('ledger');

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
    const success = onAddTeamMember(name, role, bizId, phone.trim(), '12345678', googleEmail.trim() || "", username.trim() || undefined);
    if (success) {
      setModalOpen(false);
      setName('');
      setRole('');
      setBizId('');
      setPhone('');
      setPin('12345678');
      setGoogleEmail('');
      setUsername('');
    }
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

  if (selectedMember) {
    const memberTxs = transactions.filter((t) => t.userId === selectedMember.id);
    const memberBranch = businesses.find((b) => b.id === selectedMember.bizId);

    // Apply filters
    const filteredTxs = memberTxs.filter((t) => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesCategory = t.category?.toLowerCase().includes(query);
        const matchesDetails = t.details?.toLowerCase().includes(query);
        const matchesType = t.type.toLowerCase().includes(query);
        const matchesAmount = t.amount.toString().includes(query);
        if (!matchesCategory && !matchesDetails && !matchesType && !matchesAmount) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // Time filter
      const txDate = new Date(t.time);
      const now = new Date();

      if (timeFilter === 'today') {
        return txDate.toDateString() === now.toDateString();
      } else if (timeFilter === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday start week
        startOfWeek.setHours(0, 0, 0, 0);
        return txDate >= startOfWeek;
      } else if (timeFilter === 'month') {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === 'custom') {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (txDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (txDate > end) return false;
        }
      }
      return true;
    });

    // Sort transactions reverse chronological order (newest first)
    const sortedTxs = [...filteredTxs].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // Stats calculations
    const totalSales = sortedTxs
      .filter((t) => t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = sortedTxs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const salesCount = sortedTxs.filter((t) => t.type === 'sale').length;
    const expensesCount = sortedTxs.filter((t) => t.type === 'expense').length;

    const netPortfolioCash = totalSales - totalExpenses;
    const symbol = currencySymbol || 'KSh';

    return (
      <div className="space-y-4 animate-fade-in font-sans">
        {/* Minimalized horizontal portfolio top bar */}
        <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                setSelectedMember(null);
                setTimeFilter('all');
                setTypeFilter('all');
                setSearchTerm('');
              }}
              className="p-1.5 bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition cursor-pointer flex items-center justify-center shrink-0"
              title="Return to list"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
            </button>
            
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 truncate text-slate-500 font-medium">
              <span className="font-extrabold text-slate-950 text-sm leading-none">{selectedMember.name}</span>
              <span className="text-slate-300">|</span>
              <span>Shop: <strong className="text-slate-850 font-bold">{memberBranch?.name || 'HQ Floating'}</strong></span>
              <span className="text-slate-300">|</span>
              <span className="capitalize">Role: <strong className="text-slate-850 font-bold">{selectedMember.role}</strong></span>
            </div>

            
              <div className="flex items-center gap-2">
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value as any)}
                  className="border border-slate-200 px-2.5 py-1.5 rounded-lg outline-none focus:border-slate-900 bg-white font-medium text-slate-700 cursor-pointer"
                >
                  <option value="all">All Records</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range...</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                 <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="border border-slate-200 px-2.5 py-1.5 rounded-lg outline-none focus:border-slate-900 bg-white font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="sale">Sales Only</option>
                  <option value="expense">Expenses Only</option>
                  <option value="cash_count">Cash Counts</option>
                </select>
              </div>
          
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search cashier receipts by amount, category name, or statement details..."
                className="w-50 border border-slate-205 p-2 pr-4 pl-10 text-xs rounded-xl outline-none focus:border-slate-905 font-sans font-medium bg-slate-50/50"
              />
            </div>
            
        </div>

        {/* Dropdown filters and search ledger option */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-3">

          {/* Date range inputs */}
          {timeFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-150 animate-slide-up">
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Start:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-slate-200 bg-white p-1 rounded text-[10px] font-semibold outline-none focus:border-slate-905"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase">End:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-slate-200 bg-white p-1 rounded text-[10px] font-semibold outline-none focus:border-slate-905"
                />
              </div>
            </div>
          )}
        </div>

        {/* Performance / Bento Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Sales Registered ({salesCount})
              </span>
              <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight leading-none">
                {symbol} {totalSales.toLocaleString()}
              </h2>
              
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Expenses Logged ({expensesCount})
              </span>
              <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight leading-none">
                {symbol} {totalExpenses.toLocaleString()}
              </h2>
            </div>
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Net Cash Balance Impact
              </span>
              <h2 className={`text-lg md:text-xl font-black tracking-tight leading-none ${
                netPortfolioCash >= 0 ? 'text-slate-905' : 'text-rose-650'
              }`}>
                {symbol} {netPortfolioCash.toLocaleString()}
              </h2>

            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              netPortfolioCash >= 0 
                ? 'bg-slate-50 border-slate-100 text-slate-705' 
                : 'bg-rose-50 border-rose-150 text-rose-700'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Toggle navigation for Ledger vs. Product Movement */}
        <div className="flex border border-slate-200 bg-white p-1 rounded-xl shadow-xs gap-1 max-w-sm mb-4">
          <button
            type="button"
            onClick={() => setPortfolioTab('ledger')}
            className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg cursor-pointer transition ${
              portfolioTab === 'ledger'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Cashier Ledger
          </button>
          <button
            type="button"
            onClick={() => setPortfolioTab('movement')}
            className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg cursor-pointer transition ${
              portfolioTab === 'movement'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Product Movement
          </button>
        </div>

        {portfolioTab === 'ledger' ? (
          /* Fully arranged Transaction Record Logs */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Timestamped Transactions Ledger ({sortedTxs.length})
              </h3>
              <span className="bg-white px-2.5 py-1 border border-slate-200 text-slate-505 text-[10px] rounded-lg font-bold">
                Sorted by Newest
              </span>
            </div>

            {sortedTxs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-xs space-y-1 bg-white/50">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>No transactions match the selected filters.</p>
                <p className="text-[10px] font-normal text-slate-405">Change date settings or clear filters to look again.</p>
              </div>
            ) : (
            <div className="divide-y divide-slate-100">
              {sortedTxs.map((tx) => {
                const dateObj = new Date(tx.time);
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'numeric',
                  day: 'numeric',
                  year: 'numeric',
                });
                const formattedTime = dateObj.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <div key={tx.id} className="p-4 px-5 hover:bg-slate-50/30 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                        tx.type === 'sale'
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                          : tx.type === 'expense'
                          ? 'bg-rose-50 border-rose-100 text-rose-600'
                          : 'bg-slate-50 border-slate-100 text-slate-600'
                      }`}>
                        {tx.type === 'sale' ? (
                          <ShoppingBag className="w-5 h-5" />
                        ) : tx.type === 'expense' ? (
                          <FileSpreadsheet className="w-5 h-5" />
                        ) : (
                          <Landmark className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border leading-none ${
                            tx.type === 'sale'
                              ? 'bg-emerald-100 border-emerald-200 text-emerald-800'
                              : tx.type === 'expense'
                              ? 'bg-rose-100 border-rose-200 text-rose-800'
                              : 'bg-slate-100 border-slate-200 text-slate-800'
                          }`}>
                            {tx.type}
                          </span>
                          {tx.category && (
                            <span className="text-[10px] font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                              {tx.category}
                            </span>
                          )}
                          {tx.type === 'sale' && tx.items && (
                            <span className="text-[10px] font-medium text-slate-500">
                              ({tx.items} items)
                            </span>
                          )}
                        </div>

                        {tx.details && (
                          <p className="text-xs text-slate-600 font-medium mt-1.5 leading-snug">
                            {tx.details}
                          </p>
                        )}

                        {tx.cart && tx.cart.length > 0 && (
                          <div className="mt-2 bg-slate-50/50 rounded-xl border border-slate-100 p-2.5 max-w-md">
                            <span className="block text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1 leading-none">
                              Line Details
                            </span>
                            <div className="space-y-1">
                              {tx.cart.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[10px] font-semibold text-slate-600">
                                  <span>
                                    {item.qty}x <strong className="text-slate-805">{item.name}</strong>
                                  </span>
                                  <span className="font-mono text-slate-500">
                                    @{symbol} {item.price.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mt-2 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-350" />
                          <span>{formattedDate}</span>
                          <span className="text-slate-300">•</span>
                          <span>{formattedTime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-sm md:text-base font-black tracking-tight leading-none block ${
                        tx.type === 'sale'
                          ? 'text-emerald-700'
                          : tx.type === 'expense'
                          ? 'text-rose-650'
                          : 'text-slate-800'
                      }`}>
                        {tx.type === 'sale' ? '+' : tx.type === 'expense' ? '-' : ''} {symbol} {tx.amount.toLocaleString()}
                      </span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mt-1">
                        TX ID: {tx.id.substring(0, 10).toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        ) : (
          /* Product Movement Details Log */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Product Movement Flow Audit ({
                  sortedTxs.reduce((acc, tx) => acc + (tx.type === 'sale' && tx.cart ? tx.cart.length : (tx.type === 'expense' && tx.category === 'Stock' ? 1 : 0)), 0)
                })
              </h3>
              <span className="bg-white px-2.5 py-1 border border-slate-200 text-slate-505 text-[10px] rounded-lg font-bold">
                Itemized Audit
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {(() => {
                const movements: any[] = [];
                sortedTxs.forEach((tx) => {
                  if (tx.type === 'sale' && tx.cart) {
                    tx.cart.forEach((item) => {
                      movements.push({
                        id: tx.id + '_' + item.id,
                        time: tx.time,
                        name: item.name,
                        qty: -item.qty,
                        type: 'sale',
                        details: `Customer purchase transaction. Sold out ${item.qty} units at cashier point.`,
                      });
                    });
                  } else if (tx.type === 'expense' && tx.category === 'Stock') {
                    movements.push({
                      id: tx.id,
                      time: tx.time,
                      name: 'Stock Replenishment',
                      qty: 0, 
                      type: 'restock',
                      details: tx.details || 'Procured standard inventory stock replenishment.',
                    });
                  }
                });

                if (movements.length === 0) {
                  return (
                    <div className="p-12 text-center text-slate-400 font-bold text-xs space-y-1 bg-white/50">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p>No product movements logged in selected window.</p>
                    </div>
                  );
                }

                return movements.map((m) => {
                  const dateObj = new Date(m.time);
                  const formattedD = dateObj.toLocaleDateString();
                  const formattedT = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={m.id} className="p-4 px-5 hover:bg-slate-50/30 transition flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs truncate">{m.name}</h4>
                        <p className="text-[10px] text-slate-450 leading-relaxed mt-0.5">{m.details}</p>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold mt-1.5 font-mono">
                          <span>{formattedD}</span>
                          <span>•</span>
                          <span>{formattedT}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xs md:text-sm font-black font-mono tracking-tight ${
                          m.qty < 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                          {m.qty < 0 ? `${m.qty} Units` : m.qty > 0 ? `+${m.qty} Units` : 'Stock Replenished'}
                        </span>
                        <span className="block text-[8px] font-semibold text-slate-400 mt-0.5">
                          Accounted Log
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" /> Team
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Add staff, manage clear status, and click any card to view their business sales portfolio & history.
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
              onClick={() => setSelectedMember(t)}
              className="bg-white p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl shadow-sm hover:shadow-md transition cursor-pointer hover:border-slate-300 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 text-slate-800 rounded-full flex items-center justify-center font-black text-base uppercase shrink-0 border border-slate-200/55">
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
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center text-[15px] text-slate-500 mt-1.5 font-mono">
                    {t.username && <span className="bg-slate-50 px-1.5 py-0.5 border border-slate-100 rounded text-slate-600">User: <strong>{t.username}</strong></span>}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 border-t border-slate-100 pt-3.5 sm:pt-0 sm:border-0 shrink-0" onClick={(e) => e.stopPropagation()}>
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
