import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  AlertTriangle,
  Building2,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Award
} from 'lucide-react';
import { Business, Transaction, AuditLog } from '../types';

interface OwnerDashboardProps {
  businesses: Business[];
  transactions: Transaction[];
  logs: AuditLog[];
  setTab: (tab: any) => void;
  currencySymbol?: string;
}

export default function OwnerDashboard({
  businesses,
  transactions,
  logs,
  setTab,
  currencySymbol = 'KSh',
}: OwnerDashboardProps) {
  const [period, setPeriod] = React.useState<'today' | 'week' | 'month' | 'all'>('today');

  // Filter transactions based on selected period
  const filteredTransactions = transactions.filter((t) => {
    const tTime = new Date(t.time).getTime();
    const now = new Date();
    if (period === 'today') {
      return new Date(t.time).toDateString() === now.toDateString();
    }
    if (period === 'week') {
      const startOfPeriod = Date.now() - 7 * 86400000;
      return tTime >= startOfPeriod;
    }
    if (period === 'month') {
      const startOfPeriod = Date.now() - 30 * 86400000;
      return tTime >= startOfPeriod;
    }
    if (period === 'all') {
      const startOfPeriod = new Date(now.getFullYear(), 0, 1).getTime();
      return tTime >= startOfPeriod;
    }
    return true;
  });

  // Compute portfolio statistics
  let totalRevenue = 0;
  let totalExpenses = 0;

  filteredTransactions.forEach((t) => {
    if (t.type === 'sale') {
      totalRevenue += t.amount;
    } else if (t.type === 'expense') {
      totalExpenses += t.amount;
    }
  });

  const totalProfit = totalRevenue - totalExpenses;

  // Calculate stats for each business
  const getBranchStats = (bizId: string) => {
    let rev = 0;
    let exp = 0;
    filteredTransactions.forEach((t) => {
      if (t.bizId === bizId) {
        if (t.type === 'sale') rev += t.amount;
        if (t.type === 'expense') exp += t.amount;
      }
    });
    return { rev, exp, profit: rev - exp };
  };

  const formatCurrency = (val: number) => {
    return currencySymbol + ' ' + (val || 0).toLocaleString('en-US');
  };

  // Filter alerts from audit log (max 5)
  const alerts = logs.filter((l) => l.isAlert).slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Period Selection Controls - Thin, Minimal, and Simple */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'Generally' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPeriod(opt.id as any)}
              className={`pb-0.5 transition-all cursor-pointer ${
                period === opt.id
                  ? 'text-slate-900 font-bold border-b border-slate-900'
                  : 'border-b border-transparent hover:text-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards Structure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* REVENUE CARD */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-115 transition-transform duration-500">
            <TrendingUp className="w-32 h-32 text-emerald-950" />
          </div>
          <div className="flex items-center gap-2.5 mb-2 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100/50">
              <ArrowUpRight className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Sales
            </p>
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 relative z-10 tracking-tight">
            {formatCurrency(totalRevenue)}
          </h3>
        </div>

        {/* EXPENSES CARD */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-rose-100 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-115 transition-transform duration-500">
            <TrendingDown className="w-32 h-32 text-rose-950" />
          </div>
          <div className="flex items-center gap-2.5 mb-2 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center border border-rose-100/50">
              <ArrowDownRight className="w-4.5 h-4.5 text-rose-650" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Expenses
            </p>
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 relative z-10 tracking-tight">
            {formatCurrency(totalExpenses)}
          </h3>
        </div>

        {/* NET PROFIT CARD */}
        <div className="bg-slate-900 p-4 md:p-5 rounded-2xl shadow-lg shadow-slate-950/20 relative overflow-hidden group hover:translate-y-[-2px] transition-all duration-300">
          <div className="absolute -right-4 -top-4 opacity-[0.1] group-hover:scale-115 transition-transform duration-500">
            <DollarSign className="w-32 h-32 text-white" />
          </div>
          <div className="flex items-center gap-2.5 mb-2 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center border border-white/10">
              <Award className="w-4.5 h-4.5 text-white" />
            </div>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              Total Profit
            </p>
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold text-white relative z-10 tracking-tight">
            {formatCurrency(totalProfit)}
          </h3>
        </div>
      </div>

      {/* Main sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branch listing column */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 overflow-hidden rounded-2xl shadow-xs">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" /> Shops Performance
              </h3>
              <button
                onClick={() => setTab('businesses')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer transition"
              >
                Edit
              </button>
            </div>
            <div className="flex flex-col divide-y divide-slate-100 bg-slate-50/20">
              {businesses.map((b) => {
                const bStats = getBranchStats(b.id);
                const isActive = b.status === 'active';
                return (
                  <div
                    key={b.id}
                    onClick={() => setTab('businesses')}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full inline-block shrink-0 ${
                          isActive
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                            : 'bg-slate-300'
                        }`}
                      />
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{b.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold">
                          {b.location}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-extrabold text-sm ${bStats.profit >= 0 ? 'text-emerald-600' : 'text-rose-605'}`}>
                        {formatCurrency(bStats.profit)}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5 uppercase font-bold tracking-wider">
                        Profit
                      </p>
                    </div>
                  </div>
                );
              })}
              {businesses.length === 0 && (
                <div className="p-8 text-center text-slate-400 italic text-xs">No shops configured.</div>
              )}
            </div>
          </div>
        </div>

        {/* Attention Column */}
        <div>
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
            <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" /> Alerts
            </h3>
            <div className="space-y-3">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  onClick={() => setTab('logs')}
                  className="bg-white p-3.5 rounded-xl shadow-xs border border-rose-100 flex gap-2.5 items-start hover:shadow-md transition cursor-pointer"
                >
                  <div className="bg-rose-50 p-1.5 rounded-lg shrink-0 border border-rose-100/50">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-900 font-bold text-xs truncate">{a.action}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5 line-clamp-2 leading-relaxed">
                      {a.details}
                    </p>
                    <p className="text-slate-400 text-[8px] mt-1.5 font-bold uppercase tracking-wider">
                      {new Date(a.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <p className="text-slate-400 text-xs italic p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  All good. No alerts.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
