/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Terminal, 
  Download, 
  GitBranch, 
  Server, 
  FileText, 
  Layers, 
  Cpu, 
  Code2, 
  ArrowRight,
  ChevronDown,
  Info,
  RefreshCw
} from 'lucide-react';

export default function ArchitectHub() {
  const [schemaSql, setSchemaSql] = useState<string>('');
  const [backendPy, setBackendPy] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeCodeTab, setActiveCodeTab] = useState<'sql' | 'fastapi'>('sql');

  useEffect(() => {
    async function loadFiles() {
      try {
        const res = await fetch('/api/sys/files');
        const data = await res.json();
        setSchemaSql(data.schemaSql || '-- No schema SQL found');
        setBackendPy(data.backendPy || '# No backup python file found');
      } catch (err) {
        console.error("Error reading system architect reference scripts: ", err);
      } finally {
        setLoading(false);
      }
    }
    loadFiles();
  }, []);

  return (
    <div id="architect-hub-root" className="space-y-6">
      
      {/* Header and intro banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-205 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 font-display tracking-tight flex items-center gap-1.5">
            <Layers className="text-indigo-600" size={20} />
            Buildathon Elite HealthTech Architect Suite
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Production-ready PostgreSQL database schemas and high-velocity python FastAPI core logistics code.
          </p>
        </div>
      </div>

      {/* Relational database flow diagram */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h3 className="font-bold text-slate-900 font-display text-sm mb-3 flex items-center gap-2">
          <GitBranch className="text-indigo-500" size={16} />
          Relational ERD & Architecture Matrix Flow
        </h3>
        
        <div className="p-4 bg-slate-900 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto space-y-2 relative border border-slate-950">
          <div className="absolute right-4 top-4 text-[10px] uppercase font-bold text-slate-500">
            PostgreSQL Physical Layout
          </div>

          <pre className="leading-snug text-emerald-400">
{`   +------------------+                   +----------------------+
   |     patients     |                   |      encounters      |
   +------------------+                   +----------------------+
   | id (UUID) [PK]   | -- (1 to many) -> | id (UUID) [PK]       | -- (1 to 1) ---+
   | patient_number   |                   | patient_id [FK]      |                |
   | full_name        |                   | triage_color (Color) |                |
   | age / gender     |                   | sats_score (Points)  |                |
   | is_military [GAF]|                   | chief_complaint      |                |
   +------------------+                   | status (Encounter)   |                |
            |                             +----------------------+                |
            |                                                                     |
      (1 to many)                                                                 |
            |                                                                     |
            v                                                                     v
   +-----------------------+              +----------------------+      +----------------------+
   |   billing_invoices    |              |     prescriptions    |      |     ehr_records      |
   +-----------------------+              +----------------------+      +----------------------+
   | id (UUID) [PK]        |              | id (UUID) [PK]       |      | id (UUID) [PK]       |
   | patient_id [FK]       | <----------- | ehr_record_id [FK]  | <--- | encounter_id [FK]    |
   | encounter_id [FK]     | (many to 1)  | medicine_name        |      | patient_id [FK]      |
   | nhis_covered_total    |              | dosage / duration    |      | symptoms [Doctor Log]|
   | patient_payable_total |              | nhis_copay / price   |      | diagnosis_code       |
   | status ('Paid')       |              +----------------------+      | lab_requests []      |
   +-----------------------+                                            +----------------------+
            |
       (1 to many)
            v
   +-----------------------+              +----------------------+      +----------------------+
   |     billing_items     |              |        wards         |      |         beds         |
   +-----------------------+              +----------------------+      +----------------------+
   | id (UUID) [PK]        |              | id (UUID) [PK]       |      | id (UUID) [PK]       |
   | invoice_id [FK]       |              | name (e.g. ICU)      | ---> | ward_id [FK] (1 to M)|
   | description           |              +----------------------+      | bed_number           |
   | quantity / unit_price |                                            | is_occupied          |
   | patient_net_copay     |                                            | current_patient [FK] |
   +-----------------------+                                            +----------------------+`}
          </pre>
        </div>
      </div>

      {/* Code viewer tabs */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        
        {/* Tab selection menu */}
        <div className="border-b border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex border border-slate-200 bg-white rounded-lg p-1 text-xs font-semibold gap-1.5 text-slate-600">
            <button
              onClick={() => setActiveCodeTab('sql')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1 cursor-pointer ${
                activeCodeTab === 'sql' ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
              }`}
            >
              <Database size={13} /> PostgreSQL Schema Code (schema.sql)
            </button>
            <button
              onClick={() => setActiveCodeTab('fastapi')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1 cursor-pointer ${
                activeCodeTab === 'fastapi' ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
              }`}
            >
              <Server size={13} /> FastAPI Backend Logic (backend_reference.py)
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            📂 Files persist in root workspace context
          </div>
        </div>

        {/* Display source panel */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="animate-spin text-slate-400" size={24} />
            <span className="text-xs font-semibold">Reading workspace reference code ledger...</span>
          </div>
        ) : (
          <div className="relative">
            <div className="max-h-[500px] overflow-y-auto bg-slate-950 font-mono text-xs text-slate-300 p-6 leading-relaxed select-all">
              {activeCodeTab === 'sql' ? (
                <pre className="text-amber-205 text-amber-100">{schemaSql}</pre>
              ) : (
                <pre className="text-blue-105 text-emerald-100">{backendPy}</pre>
              )}
            </div>

            {/* Directives details and annotations */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex gap-3 text-xs text-slate-650">
              <Info className="shrink-0 text-indigo-500 mt-0.5" size={16} />
              <div>
                <span className="font-semibold text-slate-800 block">Lead Architect Deployment Instructions:</span>
                <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-600 list-inside">
                  <li><strong>PostgreSQL:</strong> Run <code>psql -h localhost -U postgres -d hms -f schema.sql</code> inside container environments.</li>
                  <li><strong>Python Backend:</strong> Setup virtual environment <code>pip install fastapi uvicorn pydantic</code> and run <code>uvicorn backend_reference:app --reload</code> on port 8000.</li>
                  <li><strong>Physical Files:</strong> Both scripts exist as physical files at the root of this sandbox. When exporting, you'll receive them in your final ZIP archive!</li>
                </ul>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
