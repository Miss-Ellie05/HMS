/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  AlertOctagon, 
  Bed, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  ShieldCheck, 
  Activity, 
  Clock 
} from 'lucide-react';
import { AdminStats } from '../types';

interface CommandCenterProps {
  stats: AdminStats;
  onNavigate: (tab: string) => void;
}

export default function CommandCenter({ stats, onNavigate }: CommandCenterProps) {
  return (
    <div id="command-center-root" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 font-display tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-red-600 rounded-full animate-pulse inline-block"></span>
            GAF 37 Military Joint Command Center
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time status monitor of clinical intake, trauma queuing, bed registry & NHIS billing.
          </p>
        </div>
        <div className="flex items-center gap-2 ring-1 ring-slate-200 bg-white px-3 py-1.5 rounded-lg text-xs font-mono text-slate-600">
          <Clock size={14} className="text-slate-400 animate-spin" />
          <span>Accra Main Node Live</span>
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
        </div>
      </div>

      {/* Grid Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Trauma Cases */}
        <button 
          onClick={() => onNavigate('triage')}
          className="text-left bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md hover:border-slate-300 transition duration-200 group active:scale-98"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-100 transition duration-200">
              <AlertOctagon size={24} className="animate-pulse" />
            </div>
            <span className="text-[10px] font-semibold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full font-mono uppercase">
              Emergency
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{stats.activeEmergency}</h3>
            <p className="text-xs text-slate-500 font-medium mt-1 group-hover:text-slate-700">Active High-Priority Emergencies</p>
          </div>
        </button>

        {/* Card 2: Bed Occupancy */}
        <button 
          onClick={() => onNavigate('beds')}
          className="text-left bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md hover:border-slate-300 transition duration-200 group active:scale-98"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition duration-200">
              <Bed size={24} />
            </div>
            <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full font-mono uppercase ${
              stats.bedOccupancy > 80 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {stats.bedOccupancy > 80 ? 'Critical' : 'Stable'}
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{stats.bedOccupancy}%</h3>
            <p className="text-xs text-slate-500 font-medium mt-1 group-hover:text-slate-700">Bed Occupancy Status</p>
          </div>
        </button>

        {/* Card 3: Pending Lab Reports */}
        <button 
          onClick={() => onNavigate('ehr')}
          className="text-left bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md hover:border-slate-300 transition duration-200 group active:scale-98"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-100 transition duration-200">
              <FileText size={24} />
            </div>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full font-mono uppercase">
              Pending
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{stats.pendingLabs}</h3>
            <p className="text-xs text-slate-500 font-medium mt-1 group-hover:text-slate-700">Awaiting Lab Reports (FBC/Widal)</p>
          </div>
        </button>

        {/* Card 4: Billing Output */}
        <button 
          onClick={() => onNavigate('billing')}
          className="text-left bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md hover:border-slate-300 transition duration-200 group active:scale-98"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition duration-200">
              <DollarSign size={24} />
            </div>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full font-mono uppercase">
              GHS (₵)
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">₵{stats.totalBillingPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-xs text-slate-500 font-medium mt-1 group-hover:text-slate-700">Total Cleared Bills (Cash/MoMo)</p>
          </div>
        </button>
      </div>

      {/* Main Grid: Logistics Map and Notifications banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-xs p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 bg-slate-800/80 w-fit px-3 py-1 rounded-full text-xs font-mono font-medium text-slate-300">
              <ShieldCheck size={14} className="text-emerald-400" />
              Ghana Armed Forces Command Directives
            </div>
            <h3 className="text-xl md:text-2xl font-bold font-display tracking-tight text-white mb-2 leading-tight">
              SATS Triage Compliance is Mandatory for All 37 MH OPD Units
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed max-w-xl">
              By order of military surgical directors, active-duty service encounters are prioritised via SATS scoring overrides. Bed matrix must be kept updated to track essential oxygen supply lines and ventilation limits.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button 
              onClick={() => onNavigate('triage')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 rounded-lg transition duration-200 active:scale-98 flex items-center gap-1.5 shadow-sm"
            >
              <Activity size={14} /> Handle Triage Queue
            </button>
            <button 
              onClick={() => onNavigate('arch')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs px-4 py-2 rounded-lg transition duration-200 active:scale-98"
            >
              Examine System Architecture Schema
            </button>
          </div>
        </div>

        {/* Notifications and Priority Advisories */}
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs">
          <h3 className="font-semibold text-slate-900 font-display tracking-tight text-base mb-4 flex items-center justify-between">
            Active Priority Advisories
            <span className="w-2 h-2 bg-red-500 rounded-full inline-block animate-ping"></span>
          </h3>
          <div className="space-y-4">
            <div className="flex gap-3 border-l-4 border-amber-500 pl-3 py-1">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block font-mono">Bed Registry Advisory</span>
                <p className="text-xs text-slate-700 leading-tight">
                  A&E high-activity flow imminent. Confirm availability of Oxygen port monitors in A&E-02.
                </p>
              </div>
            </div>

            <div className="flex gap-3 border-l-4 border-red-500 pl-3 py-1">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block font-mono">SATS Triage Flag</span>
                <p className="text-xs text-slate-700 leading-tight">
                  Special military training trauma cases redirected to ICU. Ensure triage queues remain active.
                </p>
              </div>
            </div>

            <div className="flex gap-3 border-l-4 border-indigo-500 pl-3 py-1">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block font-mono">NHIS Integration</span>
                <p className="text-xs text-slate-700 leading-tight">
                  NHIS copay engine configured. Out-of-pocket pricing defaults in place for non-formulary biologics (e.g. Insulin Glargine).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
