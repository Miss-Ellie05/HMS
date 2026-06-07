/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Bed, 
  Cpu, 
  Wind, 
  ShieldAlert, 
  Plus, 
  Minus, 
  CheckCircle, 
  Bookmark, 
  Activity, 
  Users,
  Grid
} from 'lucide-react';
import { WardBed, Patient } from '../types';

interface WardBedMatrixProps {
  beds: WardBed[];
  patients: Patient[];
  onAllocateBed: (bedId: string, patientId: string) => Promise<any>;
  onVacateBed: (bedId: string) => Promise<any>;
  refreshData: () => void;
}

export default function WardBedMatrix({
  beds,
  patients,
  onAllocateBed,
  onVacateBed,
  refreshData
}: WardBedMatrixProps) {
  // Filter by Ward
  const [activeWardFilter, setActiveWardFilter] = useState<string>('All');
  
  // Selection States for Allocation
  const [allocatingBedId, setAllocatingBedId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  const wards = ['All', 'Accident & Emergency', 'Intensive Care', 'Maternity', 'Male Medical', 'Female Medical'];

  const filteredBeds = activeWardFilter === 'All' 
    ? beds 
    : beds.filter(bed => bed.ward_name === activeWardFilter);

  const handleAllocateSubmit = async (bedId: string) => {
    if (!selectedPatientId) return alert("Select patient to assign first");
    try {
      await onAllocateBed(bedId, selectedPatientId);
      setAllocatingBedId(null);
      setSelectedPatientId('');
      refreshData();
    } catch (e) {
      alert("Error allocating bed in registry");
    }
  };

  const handleVacateSubmit = async (bedId: string) => {
    if (!window.confirm("Are you sure you want to vacate this ward bed?")) return;
    try {
      await onVacateBed(bedId);
      refreshData();
    } catch (e) {
      alert("Error vactating bed parameters");
    }
  };

  // Vactant check
  const vacantPatientOptions = patients.filter(p => !beds.some(b => b.patient_id === p.id));

  return (
    <div id="bed-matrix-root" className="space-y-6">
      
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 font-display tracking-tight">37MH Ward Occupancy & Bed Matrix</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time allocation layout monitor. Tracks active oxygen ports and ventilator equipment.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs font-medium">
          {wards.map(ward => (
            <button
              key={ward}
              onClick={() => setActiveWardFilter(ward)}
              className={`px-3 py-1.5 rounded-md transition ${
                activeWardFilter === ward ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {ward === 'All' ? 'Whole Registry' : ward}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Dashboard representation of beds */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredBeds.map(bed => {
          const isAllocatingThis = allocatingBedId === bed.id;
          return (
            <div 
              key={bed.id} 
              className={`bg-white border p-5 rounded-2xl transition shadow-xs hover:shadow-md flex flex-col justify-between relative overflow-hidden ${
                bed.is_occupied 
                  ? 'border-indigo-100 ring-2 ring-indigo-50/50 bg-indigo-50/10' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Occupied highlight banner */}
              <div className={`absolute top-0 left-0 w-full h-1.5 ${
                bed.is_occupied ? 'bg-indigo-500' : 'bg-emerald-500'
              }`}></div>

              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block font-mono uppercase tracking-wider">{bed.ward_name}</span>
                    <h3 className="font-bold text-slate-900 font-display text-base tracking-tight mt-0.5">{bed.bed_number}</h3>
                  </div>
                  <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full font-mono uppercase border ${
                    bed.is_occupied 
                      ? 'bg-indigo-50 border-indigo-100 text-indigo-700' 
                      : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                  }`}>
                    {bed.is_occupied ? 'Occupied' : 'Vacant'}
                  </span>
                </div>

                {/* Vitals metrics inside bedside */}
                <div className="space-y-2">
                  {bed.is_occupied ? (
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono block">Assigned Tenant</span>
                      <p className="text-sm font-bold text-slate-800 font-display truncate">{bed.patient_name}</p>
                      <button
                        onClick={() => handleVacateSubmit(bed.id)}
                        className="text-[10px] text-red-650 font-bold hover:text-red-700 underline mt-1 block"
                      >
                        Release / Vacate Bed
                      </button>
                    </div>
                  ) : isAllocatingThis ? (
                    <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <select
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-slate-900 font-medium"
                      >
                        <option value="">-- Assign Patient Ledger --</option>
                        {vacantPatientOptions.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.full_name} ({p.patient_number})
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => handleAllocateSubmit(bed.id)}
                          className="flex-1 bg-slate-900 text-white font-bold text-[10px] py-1 rounded-md"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => {
                            setAllocatingBedId(null);
                            setSelectedPatientId('');
                          }}
                          className="flex-1 bg-white border border-slate-200 text-slate-500 text-[10px] py-1 rounded-md"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAllocatingBedId(bed.id)}
                      className="w-full py-2 border border-dashed border-slate-200 hover:border-slate-300 rounded-xl text-center text-xs text-slate-500 font-bold transition flex items-center justify-center gap-1.5 bg-slate-50/50"
                    >
                      <Plus size={14} /> Assign Patient
                    </button>
                  )}
                </div>

                {/* Ward Ports Status Indicators */}
                <div className="flex flex-wrap gap-2 text-xs py-1.5 border-t border-slate-100">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium font-mono ${
                    bed.has_oxygen_port ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md' : 'text-slate-400 line-through'
                  }`}>
                    <Wind size={10} /> Oxygen Port
                  </span>
                  {bed.equipment.map(eq => (
                    <span key={eq} className="inline-flex items-center gap-1 text-[10px] font-medium font-mono text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md">
                      <Cpu size={10} /> {eq}
                    </span>
                  ))}
                  {bed.equipment.length === 0 && !bed.has_oxygen_port && (
                    <span className="text-[10px] text-slate-400 italic font-mono">- Standard Clinical Bed -</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
