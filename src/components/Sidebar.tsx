import React from 'react';
import { LayoutDashboard, BarChart2, Briefcase, Users, Activity, LogOut, Menu, Settings } from 'lucide-react';
import { OwnerTab, CurrentUser } from '../types';

interface SidebarProps {
  currentTab: OwnerTab;
  setTab: (tab: OwnerTab) => void;
  expanded: boolean;
  setExpanded: (ext: boolean) => void;
  currentUser: CurrentUser | null;
  logout: () => void;
}

export default function Sidebar({
  currentTab,
  setTab,
  expanded,
  setExpanded,
  currentUser,
  logout,
}: SidebarProps) {
  const tabs = [
    { id: 'dashboard' as OwnerTab, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'analytics' as OwnerTab, icon: BarChart2, label: 'Analytics' },
    { id: 'businesses' as OwnerTab, icon: Briefcase, label: 'Shops' },
    { id: 'team' as OwnerTab, icon: Users, label: 'Team' },
    { id: 'logs' as OwnerTab, icon: Activity, label: 'Logs' },
    { id: 'settings' as OwnerTab, icon: Settings, label: 'Settings' },
  ];

  return (
    <div
      className={`hidden md:flex flex-col bg-white border-r border-slate-200 h-screen sticky top-0 transition-all duration-300 z-40 shrink-0 ${
        expanded ? 'w-64' : 'w-20'
      }`}
    >
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shrink-0">
            <BarChart2 className="text-white w-4 h-4" />
          </div>
          {expanded && (
            <span className="font-bold text-xl tracking-tight text-slate-900 whitespace-nowrap animate-fade-in">
              TrippleM
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Nav Tabs */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 font-medium transition-all rounded-xl cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              } ${!expanded ? 'justify-center px-2' : ''}`}
              title={!expanded ? tab.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {expanded && <span className="text-sm font-semibold whitespace-nowrap">{tab.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User profile / Logout */}
      <div className="p-4 border-t border-slate-100 overflow-hidden">
        {expanded && currentUser && (
          <div className="mb-3 px-4 py-3 bg-slate-50 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {currentUser.role}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition cursor-pointer ${
            !expanded ? 'justify-center px-2' : ''
          }`}
          title={!expanded ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {expanded && <span className="font-semibold text-sm">Logout</span>}
        </button>
      </div>
    </div>
  );
}
