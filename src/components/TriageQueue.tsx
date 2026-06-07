/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Activity, 
  Search, 
  ShieldCheck, 
  ArrowRight, 
  Plus, 
  Clipboard, 
  Flame, 
  Users, 
  CheckCircle,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { Patient, Encounter, TriageCategory, EncounterStatus } from '../types';

interface TriageQueueProps {
  onAddPatient: (patient: Partial<Patient>) => Promise<Patient>;
  onIntakeEncounter: (encounter: any) => Promise<any>;
  queue: (Encounter & { patient?: Patient })[];
  patients: Patient[];
  refreshData: () => void;
  onNavigate: (tab: string) => void;
  setSelectedEncounterId: (id: string) => void;
}

export default function TriageQueue({
  onAddPatient,
  onIntakeEncounter,
  queue,
  patients,
  refreshData,
  onNavigate,
  setSelectedEncounterId
}: TriageQueueProps) {
  // Tabs: 'active-queue' | 'register-patient' | 'intake-triage'
  const [activeSubTab, setActiveSubTab] = useState<'active-queue' | 'register-patient' | 'intake-triage'>('active-queue');
  const [searchQuery, setSearchQuery] = useState('');

  // Register Patient form
  const [patientForm, setPatientForm] = useState({
    full_name: '',
    age: '',
    gender: 'M' as 'M' | 'F' | 'Other',
    is_military: false,
    military_rank: '',
    service_number: '',
    nhis_number: '',
    phone_number: ''
  });

  // Intake Triage form
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [triageForm, setTriageForm] = useState({
    chief_complaint: '',
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    temperature: '',
    resp_rate: '',
    oxygen_sat: '',
    mobility: 'Walking' as 'Walking' | 'With Help' | 'Stretcher/Immobile',
    pain_score: 0
  });

  const [liveSatsPoints, setLiveSatsPoints] = useState(0);
  const [liveTriageColor, setLiveTriageColor] = useState<TriageCategory>(TriageCategory.GREEN);

  // Live points calculator
  useEffect(() => {
    let pts = 0;
    
    // Mobility
    if (triageForm.mobility === 'With Help') pts += 1;
    else if (triageForm.mobility === 'Stretcher/Immobile') pts += 2;

    // Resp Rate
    if (triageForm.resp_rate) {
      const rr = Number(triageForm.resp_rate);
      if (rr < 9 || rr > 30) pts += 3;
      else if ((rr >= 9 && rr <= 14) || (rr >= 21 && rr <= 30)) pts += 1;
    }

    // BP
    if (triageForm.systolic_bp) {
      const sbp = Number(triageForm.systolic_bp);
      if (sbp < 71 || sbp > 220) pts += 3;
      else if (sbp >= 71 && sbp <= 80) pts += 2;
      else if ((sbp >= 81 && sbp <= 100) || (sbp >= 160 && sbp <= 220)) pts += 1;
    }

    // Heart Rate
    if (triageForm.heart_rate) {
      const hr = Number(triageForm.heart_rate);
      if (hr < 40 || hr > 130) pts += 3;
      else if (hr >= 110 && hr <= 129) pts += 2;
      else if ((hr >= 40 && hr <= 50) || (hr >= 101 && hr <= 109)) pts += 1;
    }

    // Temp
    if (triageForm.temperature) {
      const temp = Number(triageForm.temperature);
      if (temp < 35.0 || temp > 38.5) pts += 2;
      else if ((temp >= 35.0 && temp <= 35.9) || (temp >= 37.5 && temp <= 38.4)) pts += 1;
    }

    // Oxygen
    if (triageForm.oxygen_sat) {
      const sp = Number(triageForm.oxygen_sat);
      if (sp < 90) pts += 3;
      else if (sp >= 90 && sp < 94) pts += 2;
      else if (sp >= 94 && sp < 96) pts += 1;
    }

    // Pain Score
    if (Number(triageForm.pain_score) >= 8) {
      pts += 1;
    }

    setLiveSatsPoints(pts);

    // Color mapper
    const patientObj = patients.find(p => p.id === selectedPatientId);
    let finalPts = pts;
    if (patientObj?.is_military && pts >= 3) {
      finalPts += 2; // Military GAF prioritised offset
    }

    let isTrauma = Number(triageForm.pain_score) === 10 || (triageForm.systolic_bp && Number(triageForm.systolic_bp) < 80);

    if (isTrauma || finalPts >= 7) {
      setLiveTriageColor(TriageCategory.RED);
    } else if (finalPts >= 5) {
      setLiveTriageColor(TriageCategory.ORANGE);
    } else if (finalPts >= 3) {
      setLiveTriageColor(TriageCategory.YELLOW);
    } else if (finalPts >= 1) {
      setLiveTriageColor(TriageCategory.GREEN);
    } else {
      setLiveTriageColor(TriageCategory.BLUE);
    }
  }, [triageForm, selectedPatientId, patients]);

  const handleRegisterPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await onAddPatient({
        ...patientForm,
        age: Number(patientForm.age)
      });
      // Move directly to Intake Triage with this patient auto-selected!
      setSelectedPatientId(created.id);
      setPatientForm({
        full_name: '',
        age: '',
        gender: 'M',
        is_military: false,
        military_rank: '',
        service_number: '',
        nhis_number: '',
        phone_number: ''
      });
      setActiveSubTab('intake-triage');
    } catch (e) {
      alert("Error registering patient ledger");
    }
  };

  const handleIntakeTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return alert("Select patient file first");
    try {
      await onIntakeEncounter({
        patient_id: selectedPatientId,
        ...triageForm
      });
      setTriageForm({
        chief_complaint: '',
        systolic_bp: '',
        diastolic_bp: '',
        heart_rate: '',
        temperature: '',
        resp_rate: '',
        oxygen_sat: '',
        mobility: 'Walking',
        pain_score: 0
      });
      setSelectedPatientId('');
      refreshData();
      setActiveSubTab('active-queue');
    } catch (e) {
      alert("Error logging intake triage");
    }
  };

  const getTriageColorStyles = (color: TriageCategory) => {
    switch (color) {
      case TriageCategory.RED:
        return 'bg-red-500 border-red-600 text-white';
      case TriageCategory.ORANGE:
        return 'bg-amber-500 border-amber-600 text-white';
      case TriageCategory.YELLOW:
        return 'bg-yellow-400 border-yellow-500 text-slate-900';
      case TriageCategory.GREEN:
        return 'bg-emerald-500 border-emerald-600 text-white';
      default:
        return 'bg-blue-500 border-blue-600 text-white';
    }
  };

  const getTriagePillStyles = (color: TriageCategory) => {
    switch (color) {
      case TriageCategory.RED:
        return 'bg-red-100 text-red-800 border-red-200';
      case TriageCategory.ORANGE:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case TriageCategory.YELLOW:
        return 'bg-yellow-105 text-yellow-800 border-yellow-200';
      case TriageCategory.GREEN:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
  };

  const filteredQueue = queue.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
      item.patient?.full_name.toLowerCase().includes(query) ||
      item.patient?.patient_number.toLowerCase().includes(query) ||
      item.chief_complaint.toLowerCase().includes(query) ||
      item.triage_color.toLowerCase().includes(query)
    );
  });

  return (
    <div id="triage-queue-root" className="space-y-6">
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-lg gap-2">
        <button
          onClick={() => setActiveSubTab('active-queue')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition ${
            activeSubTab === 'active-queue' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Active Prioritized Queue ({filteredQueue.length})
        </button>
        <button
          onClick={() => setActiveSubTab('register-patient')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition ${
            activeSubTab === 'register-patient' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <UserPlus size={14} className="inline mr-1" />
          Primary Patient Registration
        </button>
        <button
          onClick={() => setActiveSubTab('intake-triage')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition ${
            activeSubTab === 'intake-triage' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Activity size={14} className="inline mr-1" />
          SATS Intake Triage Setup
        </button>
      </div>

      {/* VIEW: Active Queue */}
      {activeSubTab === 'active-queue' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search triage cases by name, complaint or color..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder-slate-400"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setActiveSubTab('register-patient')}
                className="flex-1 sm:flex-none py-2 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Plus size={14} /> Intake Patient Register
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Triage Manifest</h3>
              <span className="text-[10px] font-medium bg-slate-200 px-2.5 py-0.5 rounded-md text-slate-700 font-mono">
                臨床分類: SATS System
              </span>
            </div>

            {filteredQueue.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Clipboard className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-sm font-medium">No patients found in active triage manifests</p>
                <p className="text-xs text-slate-400 mt-1">Register new civilian OPD or military transfers to pop the queue</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredQueue.map((item, index) => (
                  <div key={item.id} className="p-5 hover:bg-slate-50/50 transition duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Priority block rating */}
                      <div className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center font-bold text-lg font-display tracking-tight shrink-0 shadow-sm border ${getTriageColorStyles(item.triage_color)}`}>
                        <span className="text-xs font-semibold leading-none mb-0.5 font-mono">{item.triage_color}</span>
                        <span className="text-[10px] opacity-90 leading-none">P-{item.sats_score}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-slate-950 font-display text-base leading-tight">
                            {item.patient?.full_name}
                          </h4>
                          <span className="text-xs text-slate-500">
                            Age: {item.patient?.age} • Gender: {item.patient?.gender}
                          </span>
                          {item.patient?.is_military && (
                            <span className="text-[10px] font-semibold text-sky-800 bg-sky-100 border border-sky-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                              <ShieldCheck size={10} /> {item.patient?.military_rank || "Force Duty"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                          File ID: {item.patient?.patient_number} • Clinic Rank: #{index + 1} SATS Priority
                        </p>
                        <p className="text-xs text-slate-600 mt-2 font-medium bg-slate-50 p-2 rounded-md border border-slate-100">
                          <span className="font-semibold text-slate-600">Chief Complaint:</span> {item.chief_complaint}
                        </p>
                        
                        {/* Vitals Summary row */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 italic pt-1.5 font-mono">
                          {item.systolic_bp && <span>BP: {item.systolic_bp}/{item.diastolic_bp} mmHg</span>}
                          {item.heart_rate && <span>HR: {item.heart_rate} bpm</span>}
                          {item.temperature && <span>Temp: {item.temperature}°C</span>}
                          {item.oxygen_sat && <span>O₂ Sat: {item.oxygen_sat}%</span>}
                          {item.resp_rate && <span>Resp: {item.resp_rate} cpm</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex md:flex-col items-end gap-2 justify-between md:justify-center border-t border-slate-100 pt-3 md:border-0 md:pt-0">
                      <span className="text-xs text-slate-400 font-mono">
                        Intake: {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {item.status === 'IN_CONSULTATION' ? (
                        <span className="text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-lg">
                          Consulting Now
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedEncounterId(item.id);
                            onNavigate('ehr');
                          }}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg transition active:scale-98 flex items-center gap-1"
                        >
                          Doctors Sheet <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: Register Patient */}
      {activeSubTab === 'register-patient' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs max-w-3xl mx-auto">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50">
            <h3 className="font-semibold text-slate-900 font-display text-base">Accra 37 Military Primary Patient Registry</h3>
            <p className="text-xs text-slate-500 mt-1">Logs a patient record ledger. Required before triage clinical intake vitals initialization.</p>
          </div>
          <form onSubmit={handleRegisterPatientSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Full Patient Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yaw Preko Boateng"
                  value={patientForm.full_name}
                  onChange={(e) => setPatientForm({ ...patientForm, full_name: e.target.value })}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder-slate-400 text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Mobile Line / Phone *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +233 24 412 3456"
                  value={patientForm.phone_number}
                  onChange={(e) => setPatientForm({ ...patientForm, phone_number: e.target.value })}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder-slate-400 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Age in Years *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 34"
                  value={patientForm.age}
                  onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder-slate-400 text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Sex / Gender *</label>
                <select
                  value={patientForm.gender}
                  onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value as any })}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-slate-900 font-medium"
                >
                  <option value="M">Male (M)</option>
                  <option value="F">Female (F)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Ghana NHIS Serial Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 10938491"
                  value={patientForm.nhis_number}
                  onChange={(e) => setPatientForm({ ...patientForm, nhis_number: e.target.value })}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder-slate-400 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Registry Type Classification</label>
                <div className="flex items-center gap-4 py-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={patientForm.is_military}
                      onChange={(e) => setPatientForm({ ...patientForm, is_military: e.target.checked })}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    GAF Military Personnel Active Taskforce
                  </label>
                </div>
              </div>
            </div>

            {patientForm.is_military && (
              <div className="p-4 bg-sky-50 border border-sky-100 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-sky-800 uppercase tracking-wider block mb-1">Officers Rank *</label>
                  <select
                    required={patientForm.is_military}
                    value={patientForm.military_rank}
                    onChange={(e) => setPatientForm({ ...patientForm, military_rank: e.target.value })}
                    className="w-full text-sm bg-white border border-sky-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-slate-900"
                  >
                    <option value="">Select Military Rank</option>
                    <option value="Lieutenant Colonel">Lieutenant Colonel</option>
                    <option value="Major">Major</option>
                    <option value="Captain">Captain</option>
                    <option value="Lieutenant">Lieutenant</option>
                    <option value="Warrant Officer">Warrant Officer</option>
                    <option value="Sergeant">Sergeant</option>
                    <option value="Corporal">Corporal</option>
                    <option value="Private">Private</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-sky-800 uppercase tracking-wider block mb-1">GAF Force ID Number *</label>
                  <input
                    type="text"
                    required={patientForm.is_military}
                    placeholder="e.g. GAF-29402-B"
                    value={patientForm.service_number}
                    onChange={(e) => setPatientForm({ ...patientForm, service_number: e.target.value })}
                    className="w-full text-sm bg-white border border-sky-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder-slate-400 text-slate-900 font-mono uppercase"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100 gap-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('active-queue')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
              >
                Back to Manifest
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-850 rounded-lg transition shadow-xs flex items-center gap-1.5"
              >
                <Plus size={14} /> Register Patient Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: SATS Triage Intake Setup */}
      {activeSubTab === 'intake-triage' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs max-w-4xl mx-auto">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50">
            <h3 className="font-semibold text-slate-900 font-display text-base">South African Triage Scale (SATS) Clinical Intake</h3>
            <p className="text-xs text-slate-500 mt-1">Logs primary patient vitals. Automatically evaluates priority level parameters.</p>
          </div>
          <form onSubmit={handleIntakeTriageSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Vitals Form Column */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Select Patient File *</label>
                  <select
                    required
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-slate-900 font-medium"
                  >
                    <option value="">-- Choose Registered Patient (File Number) --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.patient_number}) {p.is_military ? '🎖️ GAF' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Chief Clinical Complaint *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Sustained compound dislocation right ankle..."
                    value={triageForm.chief_complaint}
                    onChange={(e) => setTriageForm({ ...triageForm, chief_complaint: e.target.value })}
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-slate-900 placeholder-slate-450"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Mobility Index *</label>
                    <select
                      value={triageForm.mobility}
                      onChange={(e) => setTriageForm({ ...triageForm, mobility: e.target.value as any })}
                      className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-slate-900"
                    >
                      <option value="Walking">Walking (+0 SATS Points)</option>
                      <option value="With Help">With Help (+1 SATS Points)</option>
                      <option value="Stretcher/Immobile">Stretcher/Immobile (+2 SATS Points)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Pain Score (0 to 10) *</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={triageForm.pain_score}
                        onChange={(e) => setTriageForm({ ...triageForm, pain_score: Number(e.target.value) })}
                        className="w-full accent-slate-900"
                      />
                      <span className="font-mono text-xs font-bold bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                        {triageForm.pain_score}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vitals Inputs */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Physiological Vitals Parameters</h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">Systolic BP (mmHg)</label>
                      <input
                        type="number"
                        placeholder="e.g. 120"
                        value={triageForm.systolic_bp}
                        onChange={(e) => setTriageForm({ ...triageForm, systolic_bp: e.target.value })}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">Diastolic BP (mmHg)</label>
                      <input
                        type="number"
                        placeholder="e.g. 80"
                        value={triageForm.diastolic_bp}
                        onChange={(e) => setTriageForm({ ...triageForm, diastolic_bp: e.target.value })}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">Heart Rate (bpm)</label>
                      <input
                        type="number"
                        placeholder="e.g. 72"
                        value={triageForm.heart_rate}
                        onChange={(e) => setTriageForm({ ...triageForm, heart_rate: e.target.value })}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 36.8"
                        value={triageForm.temperature}
                        onChange={(e) => setTriageForm({ ...triageForm, temperature: e.target.value })}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1 font-mono">O₂ Saturation (%)</label>
                      <input
                        type="number"
                        placeholder="e.g. 98"
                        value={triageForm.oxygen_sat}
                        onChange={(e) => setTriageForm({ ...triageForm, oxygen_sat: e.target.value })}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">Resp Rate (cpm)</label>
                      <input
                        type="number"
                        placeholder="e.g. 18"
                        value={triageForm.resp_rate}
                        onChange={(e) => setTriageForm({ ...triageForm, resp_rate: e.target.value })}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SATS Live Calculator display column */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-6">
                <div>
                  <h4 className="font-bold text-xs text-slate-600 font-display tracking-tight flex items-center gap-1">
                    <Clipboard size={14} /> Triage Score Calculator
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">SATS point compilation algorithm.</p>
                </div>

                <div className="text-center py-6 border-y border-slate-200 bg-white shadow-xs rounded-xl relative overflow-hidden">
                  <div className={`absolute left-0 top-0 w-2 h-full ${
                    liveTriageColor === TriageCategory.RED ? 'bg-red-500' :
                    liveTriageColor === TriageCategory.ORANGE ? 'bg-amber-500' :
                    liveTriageColor === TriageCategory.YELLOW ? 'bg-yellow-400' :
                    liveTriageColor === TriageCategory.GREEN ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}></div>
                  
                  <span className="text-[10px] font-bold tracking-widest text-slate-400 block uppercase font-mono">Live SATS Core Score</span>
                  <span className="text-5xl font-extrabold text-slate-950 font-display leading-none mt-2 block">{liveSatsPoints}</span>
                  <span className="text-[10px] font-mono text-slate-500 mt-1 block">Points Calculated</span>

                  <div className="mt-4 px-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 font-semibold text-xs rounded-full border ${getTriagePillStyles(liveTriageColor)}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping"></span>
                      Category: {liveTriageColor}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-500 font-medium">
                  <div className="flex justify-between">
                    <span>Mobility Points</span>
                    <span className="font-mono text-slate-900">
                      {triageForm.mobility === 'Walking' ? '0' : triageForm.mobility === 'With Help' ? '1' : '2'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Clinical Trauma Bypass</span>
                    <span className="font-mono text-slate-900">
                      {Number(triageForm.pain_score) === 10 || (triageForm.systolic_bp && Number(triageForm.systolic_bp) < 80) ? 'ACTIVE' : 'NO'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    {/* Check if current patient is military */}
                    <span>Force Priority Offset</span>
                    <span className="font-mono text-sky-700 font-semibold">
                      {patients.find(p => p.id === selectedPatientId)?.is_military ? '+2 (SATS 3+)' : '0'}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!selectedPatientId}
                  className={`w-full py-2.5 text-xs font-semibold rounded-lg text-white font-display uppercase tracking-widest transition shadow-xs flex items-center justify-center gap-1.5 ${
                    !selectedPatientId ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-950 hover:bg-slate-850'
                  }`}
                >
                  <Activity size={14} /> Assign Triage & Queue
                </button>
              </div>

            </div>
          </form>
        </div>
      )}
    </div>
  );
}
