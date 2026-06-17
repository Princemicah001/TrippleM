import React, { useState } from 'react';
import { Activity, AlertTriangle, ShieldCheck, Calendar, Search, Check, X, ArrowRight } from 'lucide-react';
import { AuditLog, Business, LogEditRequest } from '../types';

interface OwnerLogsProps {
  logs: AuditLog[];
  businesses: Business[];
  editRequests?: LogEditRequest[];
  onHandleEditRequest?: (id: string, action: 'accept' | 'reject') => void;
}

export default function OwnerLogs({ logs, businesses, editRequests, onHandleEditRequest }: OwnerLogsProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const getBusinessName = (id?: string | null) => {
    if (!id) return null;
    return businesses.find((b) => b.id === id)?.name || null;
  };

  const getLogTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getLogDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Filter logs by search term
  const filteredLogs = logs.filter((l) => {
    const term = searchTerm.toLowerCase();
    const actionMatch = l.action.toLowerCase().includes(term);
    const detailsMatch = l.details.toLowerCase().includes(term);
    return actionMatch || detailsMatch;
  });

  const pendingRequests = editRequests ? editRequests.filter((r) => r.status === 'pending') : [];

  return (
    <div className="space-y-6">
      {/* Pending Edit Requests Queue */}
      {pendingRequests.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-4 animate-fade-in">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
              Pending Log Edit Requests ({pendingRequests.length})
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Employees requested adjustments on past historical registers. Review and authorize below.
            </p>
          </div>

          <div className="grid gap-4">
            {pendingRequests.map((req) => {
              const hasBranch = getBusinessName(req.bizId);
              return (
                <div key={req.id} id={`req-${req.id}`} className="border border-slate-200 bg-slate-50/50 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                  <div className="space-y-2 flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-amber-100 border border-amber-200 text-amber-800 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded">
                        Pending Approval
                      </span>
                      <span className="font-bold text-slate-800">By {req.userName}</span>
                      {hasBranch && (
                        <span className="text-slate-400 font-medium">({hasBranch})</span>
                      )}
                      <span className="text-[10px] text-slate-400 font-bold ml-auto md:ml-0">
                        {new Date(req.time).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-slate-100 p-3 rounded-lg">
                      <div>
                        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Original Record</p>
                        <p className="font-bold text-slate-700 capitalize mt-1">{req.originalData.type}</p>
                        <p className="text-slate-500 font-extrabold text-xs mt-0.5">KSh {req.originalData.amount.toLocaleString()}</p>
                        {req.originalData.category && (
                          <p className="text-slate-500 text-[10px] mt-1 font-bold">{req.originalData.category}</p>
                        )}
                        {req.originalData.details && (
                          <p className="text-slate-400 text-[10px] italic truncate mt-0.5">{req.originalData.details}</p>
                        )}
                      </div>

                      <div className="border-t md:border-t-0 md:border-l border-slate-150 pt-3 md:pt-0 md:pl-4">
                        <p className="text-[9px] font-extrabold text-amber-600 uppercase tracking-widest flex items-center gap-1">
                          Proposed Adjustment <ArrowRight className="w-3 h-3 text-amber-400" />
                        </p>
                        <p className="font-bold text-slate-900 capitalize mt-1">{req.originalData.type}</p>
                        <p className="text-emerald-600 font-black text-xs mt-0.5">KSh {req.proposedData.amount.toLocaleString()}</p>
                        {req.proposedData.category && (
                          <p className="text-slate-700 text-[10px] mt-1 font-bold">{req.proposedData.category}</p>
                        )}
                        {req.proposedData.details && (
                          <p className="text-slate-800 text-[11px] italic mt-1 bg-amber-50/50 p-1.5 rounded border border-amber-100/30">
                            Reason: "{req.proposedData.details}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto shrink-0 self-end md:self-center">
                    <button
                      id={`reject-${req.id}`}
                      onClick={() => onHandleEditRequest && onHandleEditRequest(req.id, 'reject')}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-rose-50 border border-rose-100 text-rose-650 hover:bg-rose-100 text-xs font-bold rounded-xl cursor-pointer transition"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button
                      id={`accept-${req.id}`}
                      onClick={() => onHandleEditRequest && onHandleEditRequest(req.id, 'accept')}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Accept
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
        <div className="min-w-0">
          <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-500" /> Action Log
          </h2>
          <p className="text-slate-550 text-xs mt-0.5">
            List of all actions on the app.
          </p>
        </div>

        {/* Search Audit field */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 text-slate-800 text-xs font-semibold p-2.5 pl-9 rounded-xl outline-none border border-slate-200 focus:border-slate-405 focus:bg-white"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredLogs.map((l) => {
            const hasBranch = getBusinessName(l.bizId);
            return (
              <div
                key={l.id}
                className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 hover:bg-slate-50/50 transition animate-fade-in"
              >
                {/* Log Event Icon */}
                <div
                  className={`p-2 rounded-xl border shrink-0 ${
                    l.isAlert
                      ? 'bg-rose-50 border-rose-100 text-rose-500'
                      : 'bg-slate-50 border-slate-100 text-slate-600'
                  }`}
                >
                  {l.isAlert ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                </div>

                {/* Log Details content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">{l.action}</h4>
                      {hasBranch && (
                        <span className="px-1.5 py-0.2 bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-bold uppercase tracking-wider rounded">
                          {hasBranch}
                        </span>
                      )}
                    </div>
                    {/* Timestamp block */}
                    <div className="text-left sm:text-right shrink-0 flex items-center sm:block gap-2">
                      <span className="text-[10px] text-slate-900 font-extrabold uppercase tracking-wide flex items-center sm:justify-end gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" /> {getLogDate(l.time)}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5 sm:mt-0">
                        {getLogTime(l.time)}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed font-sans">{l.details}</p>
                </div>
              </div>
            );
          })}

          {filteredLogs.length === 0 && (
            <div className="p-16 text-center text-slate-400 italic text-xs">
              No actions found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
