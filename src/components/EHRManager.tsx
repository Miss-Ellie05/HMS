/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Activity, 
  HelpCircle, 
  AlertCircle, 
  Sparkles, 
  Plus, 
  Trash2, 
  Layers, 
  Stethoscope, 
  RefreshCw,
  FlaskConical,
  CheckCircle
} from 'lucide-react';
import { Patient, Encounter, EHRRecord } from '../types';

interface EHRManagerProps {
  queue: (Encounter & { patient?: Patient })[];
  onCreateEHR: (ehrPayload: any) => Promise<any>;
  selectedEncounterId: string;
  setSelectedEncounterId: (id: string) => void;
  refreshData: () => void;
}

export default function EHRManager({
  queue,
  onCreateEHR,
  selectedEncounterId,
  setSelectedEncounterId,
  refreshData
}: EHRManagerProps) {
  // Tabs: 'clinical-work', 'lab-inquiries'
  const [activeTab, setActiveTab] = useState<'clinical-work' | 'lab-inquiries'>('clinical-work');
  
  const [consults, setConsults] = useState<any[]>([]);
  const [activeEncounter, setActiveEncounter] = useState<(Encounter & { patient?: Patient }) | null>(null);

  // Form Inputs
  const [symptoms, setSymptoms] = useState('');
  const [diagnosisCode, setDiagnosisCode] = useState('');
  const [diagnosisDesc, setDiagnosisDesc] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedLabs, setSelectedLabs] = useState<string[]>([]);
  
  // Prescriptions list state
  const [prescriptions, setPrescriptions] = useState<{ medicine_name: string; dosage: string; duration: string }[]>([]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('');
  const [newMedDuration, setNewMedDuration] = useState('5 Days');

  // Loading States and Inventory
  const [inventory, setInventory] = useState<any[]>([]);
  const [isConsultingAI, setIsConsultingAI] = useState(false);
  const [aiPowered, setAiPowered] = useState<boolean | null>(null);
  const [aiWarning, setAiWarning] = useState('');

  // Labs State
  const [pendingLabs, setPendingLabs] = useState<any[]>([]);
  const [labResultText, setLabResultText] = useState('');
  const [completingLabIndex, setCompletingLabIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchInventory();
    fetchPendingLabs();
  }, []);

  useEffect(() => {
    if (selectedEncounterId) {
      const found = queue.find(e => e.id === selectedEncounterId);
      if (found) {
        setActiveEncounter(found);
        // Pre-fill chief complaints as starting symptoms info
        setSymptoms(found.chief_complaint);
      }
    } else {
      setActiveEncounter(null);
    }
  }, [selectedEncounterId, queue]);

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/pharmacy/catalog');
      const data = await res.json();
      setInventory(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPendingLabs = async () => {
    try {
      const res = await fetch('/api/labs/pending');
      const data = await res.json();
      setPendingLabs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAIConsultTrigger = async () => {
    if (!symptoms) return alert("Please specify patient clinical symptoms first");
    setIsConsultingAI(true);
    setAiPowered(null);
    setAiWarning('');
    try {
      const res = await fetch('/api/gemini/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms })
      });
      const data = await res.json();
      
      setDiagnosisCode(data.diagnosis_code || 'R50.9');
      setDiagnosisDesc(data.diagnosis_description || 'Unspecified malaria');
      setAiWarning(data.interactions || 'No severe pharmaceutical warnings for this regimen layout.');
      setAiPowered(!!data.ai_powered);

      if (data.medicines && data.medicines.length > 0) {
        const meds = data.medicines.map((m: any) => ({
          medicine_name: m.name,
          dosage: m.dose,
          duration: '5 Days'
        }));
        setPrescriptions(meds);
      }
    } catch (err) {
      console.error(err);
      alert("Consultation gateway bypass failed");
    } finally {
      setIsConsultingAI(false);
    }
  };

  const handleAddMedication = () => {
    if (!newMedName) return;
    setPrescriptions([...prescriptions, { 
      medicine_name: newMedName, 
      dosage: newMedDose || '500mg TDS', 
      duration: newMedDuration 
    }]);
    setNewMedName('');
    setNewMedDose('');
  };

  const handleRemoveMedication = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const handleToggleLab = (lab: string) => {
    if (selectedLabs.includes(lab)) {
      setSelectedLabs(selectedLabs.filter(l => l !== lab));
    } else {
      setSelectedLabs([...selectedLabs, lab]);
    }
  };

  const handleConsultationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEncounter) return;

    try {
      await onCreateEHR({
        encounter_id: activeEncounter.id,
        patient_id: activeEncounter.patient_id,
        symptoms,
        diagnosis_code: diagnosisCode,
        diagnosis_description: diagnosisDesc,
        doctor_notes: notes,
        prescriptions,
        lab_requests: selectedLabs
      });

      // Clear Form state
      setSymptoms('');
      setDiagnosisCode('');
      setDiagnosisDesc('');
      setNotes('');
      setPrescriptions([]);
      setSelectedLabs([]);
      setAiWarning('');
      setAiPowered(null);
      setSelectedEncounterId('');
      refreshData();
      fetchPendingLabs();
    } catch (err) {
      alert("Error logging doctor consultation EHR file");
    }
  };

  const handleCompleteLab = async (index: number) => {
    const lab = pendingLabs[index];
    if (!labResultText) return alert("Specify completed test qualitative results text");
    try {
      const res = await fetch('/api/labs/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id: lab.record_id,
          test_name: lab.test_name,
          result_text: labResultText
        })
      });
      await res.json();
      setLabResultText('');
      setCompletingLabIndex(null);
      fetchPendingLabs();
      refreshData();
    } catch (e) {
      alert("Lab entry update error");
    }
  };

  return (
    <div id="ehr-manager-root" className="space-y-6">
      
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-lg gap-2">
        <button
          onClick={() => setActiveTab('clinical-work')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition ${
            activeTab === 'clinical-work' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Stethoscope size={14} className="inline mr-1" />
          Clinical Consultation Sheet
        </button>
        <button
          onClick={() => {
            setActiveTab('lab-inquiries');
            fetchPendingLabs();
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition ${
            activeTab === 'lab-inquiries' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FlaskConical size={14} className="inline mr-1" />
          Pending Laboratory Queue ({pendingLabs.length})
        </button>
      </div>

      {/* VIEW: Clinical Consultations */}
      {activeTab === 'clinical-work' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Patients Waiting Queue Checklist */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-slate-900 tracking-tight font-display text-base">Awaiting Consultation</h3>
              <p className="text-xs text-slate-400">Select triage patient files below to open the clinical intake workbench.</p>
            </div>
            
            <div className="space-y-2 max-h-[450px] overflow-y-auto">
              {queue.filter(e => e.status === 'AWAITING_CONSULTATION').length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  <CheckCircle size={28} className="mx-auto text-emerald-500 mb-2" />
                  All triaged patient consultations complete!
                </div>
              ) : (
                queue
                  .filter(e => e.status === 'AWAITING_CONSULTATION')
                  .map(e => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEncounterId(e.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex justify-between items-start gap-2 ${
                        selectedEncounterId === e.id 
                          ? 'border-slate-905 bg-slate-50 border-slate-900 shadow-xs' 
                          : 'border-slate-100 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-905 leading-snug">{e.patient?.full_name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono font-medium tracking-tight">SATS Score: P-{e.sats_score}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{e.chief_complaint}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase leading-none font-mono ${
                        e.triage_color === 'RED' ? 'bg-red-100 text-red-700' :
                        e.triage_color === 'ORANGE' ? 'bg-amber-100 text-amber-700' :
                        e.triage_color === 'YELLOW' ? 'bg-yellow-105 text-yellow-800' : 'bg-emerald-110 text-emerald-700'
                      }`}>
                        {e.triage_color}
                      </span>
                    </button>
                  ))
              )}
            </div>
          </div>

          {/* Active Decision consult sheet */}
          <div className="lg:col-span-2 space-y-4">
            {!activeEncounter ? (
              <div className="bg-white border border-slate-200 border-dashed rounded-xl p-12 text-center text-slate-500 space-y-3">
                <Stethoscope size={40} className="mx-auto text-slate-300" />
                <h4 className="font-semibold text-slate-805 text-base">Clinical Workbench Offline</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Select a triage queue candidate from the sidebar or click "Doctors Sheet" in the Triage Tab to inspect medical charts.
                </p>
              </div>
            ) : (
              <form onSubmit={handleConsultationSubmit} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                
                {/* Banner Profile */}
                <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-widest text-slate-400 block uppercase font-mono">
                      File {activeEncounter.patient?.patient_number} • Triage SATS P-{activeEncounter.sats_score}
                    </span>
                    <h3 className="text-lg font-bold font-display tracking-tight text-white mt-1">
                      {activeEncounter.patient?.full_name}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5 font-medium">
                      Age: {activeEncounter.patient?.age} • Gender: {activeEncounter.patient?.gender} • Phone: {activeEncounter.patient?.phone_number}
                    </p>
                  </div>
                  {activeEncounter.patient?.is_military && (
                    <span className="text-xs font-bold text-sky-300 bg-sky-950 px-3 py-1 rounded-full font-mono flex items-center gap-1.5 border border-sky-850">
                      🎖️ {activeEncounter.patient.military_rank}
                    </span>
                  )}
                </div>

                {/* Patient Case summary */}
                <div className="p-5 border-b border-slate-200 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-mono block">Intake Vitals Readings:</span>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 font-mono font-bold text-slate-700">
                      <span>BP: {activeEncounter.systolic_bp || '120'}/{activeEncounter.diastolic_bp || '80'}</span>
                      <span>HR: {activeEncounter.heart_rate || '72'} bpm</span>
                      <span>Temp: {activeEncounter.temperature || '36.8'} °C</span>
                      <span>O₂ Sat: {activeEncounter.oxygen_sat || '98'} %</span>
                      <span>Resp: {activeEncounter.resp_rate || '18'} cpm</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-mono block">Intake Mobility & Pain indices:</span>
                    <div className="mt-1 font-semibold text-slate-700">
                      Mobility: <span className="font-bold">{activeEncounter.mobility}</span> • Pain Score: <span className="font-bold">{activeEncounter.pain_score}/10</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Chief Symptom Logs */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Clinical Symptom Intake & Assessment *</label>
                      <button
                        type="button"
                        onClick={handleAIConsultTrigger}
                        disabled={isConsultingAI || !symptoms}
                        className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-200 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition duration-200 flex items-center gap-1.5 shadow-sm"
                      >
                        {isConsultingAI ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <Sparkles size={12} />
                        )}
                        Consult Clinical AI (Gemini)
                      </button>
                    </div>
                    <textarea
                      required
                      rows={3}
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      placeholder="Doctor logs descriptive symptoms, physical findings..."
                      className="w-full text-sm border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-slate-900/10 text-slate-900 font-medium"
                    />
                  </div>

                  {/* ICD-10 Classification */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">ICD-10 Code *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. B54"
                        value={diagnosisCode}
                        onChange={(e) => setDiagnosisCode(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Primary Diagnosis Description *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Unspecified malaria (Plasmodium falciparum endemic)"
                        value={diagnosisDesc}
                        onChange={(e) => setDiagnosisDesc(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-semibold"
                      />
                    </div>
                  </div>

                  {/* AI Copilot feedback */}
                  {aiWarning && (
                    <div className={`p-4 rounded-xl border text-xs flex gap-3 ${
                      aiPowered 
                        ? 'bg-purple-50 border-purple-100 text-purple-950' 
                        : 'bg-amber-50/70 border-amber-100 text-amber-950'
                    }`}>
                      <AlertCircle size={16} className={`shrink-0 mt-0.5 ${aiPowered ? 'text-purple-600' : 'text-amber-600'}`} />
                      <div className="space-y-1">
                        <span className="font-bold block uppercase tracking-wider font-mono text-[10px]">
                          {aiPowered ? '🤖 Gemini Clinical Interaction Engine' : '⚕️ Local Formulary interaction check'}
                        </span>
                        <p className="leading-relaxed">{aiWarning}</p>
                      </div>
                    </div>
                  )}

                  {/* Lab requests tab */}
                  <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-mono">Order Diagnostic Investigations</h4>
                    <div className="flex flex-wrap gap-2.5">
                      {['FBC', 'Malaria RDT', 'Widal test', 'Serum Creatinine', 'ECG Scan', 'Chest X-Ray'].map(lab => {
                        const active = selectedLabs.includes(lab);
                        return (
                          <button
                            key={lab}
                            type="button"
                            onClick={() => handleToggleLab(lab)}
                            className={`px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition ${
                              active 
                                ? 'bg-slate-900 border-slate-900 text-white shadow-xs font-semibold' 
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {lab}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Prescriptions Creator */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider block font-mono">Digital Prescription Issuance</h4>
                    
                    {/* Add Drug block */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50/50 p-4 border border-slate-200 rounded-xl">
                      <div className="md:col-span-2">
                        <label className="text-[10px] text-slate-500 block mb-1 font-bold">Select Medication/Drug</label>
                        <select
                          value={newMedName}
                          onChange={(e) => setNewMedName(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-900 font-medium"
                        >
                          <option value="">-- Choose Formulary Item --</option>
                          {inventory.map(item => (
                            <option key={item.name} value={item.name}>
                              {item.name} {item.coversNHIS ? '(NHIS covered)' : '(Out-of-Pocket)'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1 font-bold">Dosage instructions</label>
                        <input
                          type="text"
                          placeholder="e.g. 500mg TDS"
                          value={newMedDose}
                          onChange={(e) => setNewMedDose(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handleAddMedication}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5"
                        >
                          <Plus size={14} /> Add Medicine
                        </button>
                      </div>
                    </div>

                    {/* Prescribed Items Table */}
                    {prescriptions.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                        No medications prescribed yet. Choose from Ghana essential drug table above.
                      </p>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left divide-y divide-slate-200">
                          <thead className="bg-slate-50 font-mono font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                            <tr>
                              <th className="p-3">Drug Name</th>
                              <th className="p-3">Dosage</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                            {prescriptions.map((med, index) => (
                              <tr key={index}>
                                <td className="p-3">{med.medicine_name}</td>
                                <td className="p-3">{med.dosage}</td>
                                <td className="p-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMedication(index)}
                                    className="p-1 hover:bg-red-50 text-red-500 rounded-md shrink-0 transition"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Doctor Notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Clinical Notes & Surgical Directions</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Schedule surgical fluid resuscitation reviews, outline inpatient parameters..."
                      className="w-full text-sm border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-slate-900/10 font-medium"
                    />
                  </div>

                </div>

                {/* Footer Buttons */}
                <div className="p-5 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEncounterId('')}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition"
                  >
                    Close Sheet
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-850 rounded-lg transition shadow-xs flex items-center gap-1.5"
                  >
                    Complete Consultation & Release
                  </button>
                </div>

              </form>
            )}
          </div>

        </div>
      )}

      {/* VIEW: Labs Queue */}
      {activeTab === 'lab-inquiries' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Laboratory Manifest List</h3>
          </div>

          {pendingLabs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FlaskConical className="mx-auto text-slate-300 mb-2" size={32} />
              <p className="text-sm font-medium">All laboratory test requests completed</p>
              <p className="text-xs text-slate-400 mt-1">Pending lab registers are auto-populated when doctors order examinations.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-sm">
              {pendingLabs.map((lab, index) => (
                <div key={index} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/30 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-amber-50 text-amber-600 rounded-md">
                        <FlaskConical size={14} />
                      </span>
                      <h4 className="font-bold text-slate-900 text-base">{lab.test_name}</h4>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Patient: <span className="font-bold text-slate-850">{lab.patient_name}</span> ({lab.patient_number})
                    </p>
                  </div>

                  <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2 items-center">
                    {completingLabIndex === index ? (
                      <div className="w-full sm:w-auto flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Enter test qualitative results..."
                          value={labResultText}
                          onChange={(e) => setLabResultText(e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg text-xs px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-slate-900"
                        />
                        <button
                          onClick={() => handleCompleteLab(index)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-1.5 rounded-lg font-bold"
                        >
                          Submit
                        </button>
                        <button
                          onClick={() => {
                            setCompletingLabIndex(null);
                            setLabResultText('');
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-2 py-1.5 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCompletingLabIndex(index)}
                        className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-lg transition text-center"
                      >
                        Enter Medical Test Results
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
