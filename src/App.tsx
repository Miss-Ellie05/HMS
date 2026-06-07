/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Activity, 
  Bed, 
  FileText, 
  DollarSign, 
  Layers, 
  Menu, 
  X, 
  ShieldAlert, 
  HeartHandshake 
} from 'lucide-react';
import { Patient, Encounter, WardBed, BillingInvoice, AdminStats } from './types';

// Import components
import CommandCenter from './components/CommandCenter';
import TriageQueue from './components/TriageQueue';
import EHRManager from './components/EHRManager';
import WardBedMatrix from './components/WardBedMatrix';
import NHISBilling from './components/NHISBilling';
import ArchitectHub from './components/ArchitectHub';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // States
  const [patients, setPatients] = useState<Patient[]>([]);
  const [queue, setQueue] = useState<(Encounter & { patient?: Patient })[]>([]);
  const [beds, setBeds] = useState<WardBed[]>([]);
  const [invoices, setInvoices] = useState<(BillingInvoice & { patient?: Patient })[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    activeEmergency: 0,
    bedOccupancy: 0,
    pendingLabs: 0,
    totalBillingPaid: 0
  });

  const [selectedEncounterId, setSelectedEncounterId] = useState<string>('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // Parallel fetch arrays
      const [patientsRes, queueRes, bedsRes, billingRes, statsRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/queue'),
        fetch('/api/beds'),
        fetch('/api/billing'),
        fetch('/api/sys/stats')
      ]);

      const [patientsData, queueData, bedsData, billingData, statsData] = await Promise.all([
        patientsRes.json(),
        queueRes.json(),
        bedsRes.json(),
        billingRes.json(),
        statsRes.json()
      ]);

      setPatients(patientsData);
      setQueue(queueData);
      setBeds(bedsData);
      setInvoices(billingData);
      setStats(statsData);
    } catch (e) {
      console.error("Error connecting fullstack data endpoints: ", e);
    }
  };

  const handleAddPatient = async (patientPayload: Partial<Patient>): Promise<Patient> => {
    const res = await fetch('/api/patients', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patientPayload)
    });
    const data = await res.json();
    fetchInitialData();
    return data;
  };

  const handleIntakeEncounter = async (encounterPayload: any): Promise<any> => {
    const res = await fetch('/api/encounters', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(encounterPayload)
    });
    const data = await res.json();
    fetchInitialData();
    return data;
  };

  const handleCreateEHR = async (ehrPayload: any): Promise<any> => {
    const res = await fetch('/api/ehr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ehrPayload)
    });
    const data = await res.json();
    fetchInitialData();
    return data;
  };

  const handleAllocateBed = async (bedId: string, patientId: string): Promise<any> => {
    const res = await fetch('/api/beds/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bed_id: bedId, patient_id: patientId })
    });
    const data = await res.json();
    fetchInitialData();
    return data;
  };

  const handleVacateBed = async (bedId: string): Promise<any> => {
    const res = await fetch('/api/beds/vacate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bed_id: bedId })
    });
    const data = await res.json();
    fetchInitialData();
    return data;
  };

  const handlePayInvoice = async (invoiceId: string, paymentMethod: string, amount: number): Promise<any> => {
    const res = await fetch('/api/billing/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice_id: invoiceId, payment_method: paymentMethod, amount })
    });
    const data = await res.json();
    fetchInitialData();
    return data;
  };

  // Menu items config
  const navItems = [
    { id: 'dashboard', name: 'Command Center', icon: Building2 },
    { id: 'triage', name: 'SATS Triage Queue', icon: Activity },
    { id: 'ehr', name: 'Doctors Consultation', icon: FileText },
    { id: 'beds', name: 'Ward Bed Matrix', icon: Bed },
    { id: 'billing', name: 'NHIS Billing Engine', icon: DollarSign },
    { id: 'arch', name: 'Architect Suite', icon: Layers },
  ];

  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const day = now.getUTCDate().toString().padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[now.getUTCMonth()];
      const year = now.getUTCFullYear();
      const hours = now.getUTCHours().toString().padStart(2, '0');
      const mins = now.getUTCMinutes().toString().padStart(2, '0');
      setTimeStr(`${day} ${month} ${year} | ${hours}:${mins} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="app-root" className="min-h-screen bg-slate-100 flex flex-col lg:flex-row font-sans text-slate-900 lg:h-screen lg:overflow-hidden">
      
      {/* Mobile Top Header */}
      <header className="lg:hidden bg-slate-900 text-white border-b border-slate-800 h-16 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="font-bold text-white text-sm">37</span>
          </div>
          <div>
            <h1 className="text-xs font-bold leading-none tracking-wide text-white">37 MILITARY</h1>
            <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-widest leading-none">Hospital HMS</p>
          </div>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white transition cursor-pointer"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Left Sidebar */}
      <aside className={`w-full lg:w-64 bg-slate-900 text-white flex flex-col shrink-0 border-r border-slate-800 select-none ${mobileMenuOpen ? 'flex' : 'hidden lg:flex'}`}>
        <div className="p-6 border-b border-slate-800 hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-lg shadow-blue-600/30">
              <span className="font-bold text-white text-sm">37</span>
            </div>
            <div>
              <h1 className="text-sm font-bold leading-none tracking-wide text-white uppercase font-display">37 MILITARY</h1>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest leading-none">Hospital HMS</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-3 mb-2 block font-mono">
            Core Modules
          </span>
          
          {navItems.map(item => {
            const active = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                  active 
                    ? 'bg-blue-600/20 text-blue-400 border-l-4 border-blue-600' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={14} className={active ? 'text-blue-400' : 'text-slate-500'} />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Accra Cantonments context banner */}
        <div className="p-4 mx-4 mb-4 bg-slate-800/40 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1.5 hidden lg:block">
          <div className="flex items-center gap-1.5 font-bold text-slate-300 font-display">
            <HeartHandshake className="text-blue-500 shrink-0" size={12} />
            Buildathon Accolade
          </div>
          <p className="leading-snug">
            37 Military Joint Emergency Care layouts. Fully compliant with active-duty exemptions & NHIS claims.
          </p>
        </div>

        {/* Major profile footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-blue-400 uppercase font-mono">
              DM
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate text-slate-200">Maj. Dr. Mensah</p>
              <p className="text-[10px] text-slate-500">Medical Officer</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Viewport Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 lg:h-screen lg:overflow-hidden lg:relative">
        
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 bg-white border-b border-slate-200 justify-between items-center px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide font-display">
              {navItems.find(n => n.id === activeTab)?.name || 'Command Center'}
            </h2>
            <span className="px-2.5 py-1 bg-green-150 bg-green-50 text-green-700 text-[10px] font-mono font-bold rounded uppercase">
              System Live
            </span>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-mono font-bold rounded uppercase">
              NHIS Claims: Online
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 leading-none">37 MH Accra, Ghana</p>
              <p className="text-xs font-bold text-slate-700 font-mono mt-1">{timeStr}</p>
            </div>
          </div>
        </header>

        {/* Mobile View Title Helper */}
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-display">
            {navItems.find(n => n.id === activeTab)?.name}
          </span>
          <span className="text-[10px] bg-green-100 text-green-800 font-bold font-mono px-2 py-0.5 rounded uppercase">
            Live
          </span>
        </div>

        {/* Scrollable Workplace area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' && (
            <CommandCenter stats={stats} onNavigate={setActiveTab} />
          )}
          {activeTab === 'triage' && (
            <TriageQueue 
              patients={patients} 
              queue={queue} 
              onAddPatient={handleAddPatient} 
              onIntakeEncounter={handleIntakeEncounter}
              refreshData={fetchInitialData}
              onNavigate={setActiveTab}
              setSelectedEncounterId={setSelectedEncounterId}
            />
          )}
          {activeTab === 'ehr' && (
            <EHRManager 
              queue={queue} 
              onCreateEHR={handleCreateEHR} 
              selectedEncounterId={selectedEncounterId}
              setSelectedEncounterId={setSelectedEncounterId}
              refreshData={fetchInitialData}
            />
          )}
          {activeTab === 'beds' && (
            <WardBedMatrix 
              beds={beds} 
              patients={patients} 
              onAllocateBed={handleAllocateBed} 
              onVacateBed={handleVacateBed}
              refreshData={fetchInitialData}
            />
          )}
          {activeTab === 'billing' && (
            <NHISBilling 
              invoices={invoices} 
              onPayInvoice={handlePayInvoice} 
              refreshData={fetchInitialData}
            />
          )}
          {activeTab === 'arch' && (
            <ArchitectHub />
          )}
        </div>
      </main>

    </div>
  );
}
