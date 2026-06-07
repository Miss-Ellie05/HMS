/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  DollarSign, 
  TrendingUp, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  PhoneCall, 
  Smartphone, 
  Layers, 
  Scale, 
  Calculator, 
  Check
} from 'lucide-react';
import { BillingInvoice, Patient } from '../types';

interface NHISBillingProps {
  invoices: (BillingInvoice & { patient?: Patient })[];
  onPayInvoice: (invoiceId: string, paymentMethod: string, amount: number) => Promise<any>;
  refreshData: () => void;
}

export default function NHISBilling({
  invoices,
  onPayInvoice,
  refreshData
}: NHISBillingProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  
  // Pay states
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'MTN MoMo' | 'Telecel Cash' | 'Visa'>('MTN MoMo');
  const [payAmountInput, setPayAmountInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const activeInvoice = invoices.find(inv => inv.id === selectedInvoiceId);

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice) return;

    try {
      const amount = payAmountInput ? Number(payAmountInput) : activeInvoice.patient_payable_total - activeInvoice.amount_paid;
      await onPayInvoice(activeInvoice.id, paymentMethod, amount);
      setPayAmountInput('');
      setSelectedInvoiceId('');
      refreshData();
    } catch (e) {
      alert("Error processing local billing payment");
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-100 border-emerald-200 text-emerald-800';
      case 'Partially Paid':
        return 'bg-amber-100 border-amber-200 text-amber-800';
      default:
        return 'bg-red-100 border-red-200 text-red-800';
    }
  };

  const filteredInvoices = invoices.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
      item.patient?.full_name.toLowerCase().includes(query) ||
      item.patient?.patient_number.toLowerCase().includes(query) ||
      item.status.toLowerCase().includes(query)
    );
  });

  return (
    <div id="nhis-billing-root" className="space-y-6">
      
      {/* Banner info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 font-display tracking-tight">NHIS & National Copay Billing Engine</h2>
          <p className="text-xs text-slate-500 mt-1">
            Reconciles GAF exemptions, NHIS 10% co-payments, and logs Mobile Money (MTN MoMo, Telecel Cash) transactions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Invoice selection panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 tracking-tight font-display text-base">Invoices Ledger</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search invoices by patient name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[450px] overflow-y-auto">
            {filteredInvoices.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">No bill invoices issued.</p>
            ) : (
              filteredInvoices.map(invoice => (
                <button
                  key={invoice.id}
                  onClick={() => setSelectedInvoiceId(invoice.id)}
                  className={`w-full text-left p-4 rounded-xl border transition flex flex-col gap-2 ${
                    selectedInvoiceId === invoice.id 
                      ? 'border-slate-905 bg-slate-50 border-slate-900' 
                      : 'border-slate-100 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-slate-900 font-display truncate leading-tight">{invoice.patient?.full_name}</h4>
                      <p className="text-[10px] text-slate-405 font-mono text-slate-500">{invoice.patient?.patient_number}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getStatusStyle(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center w-full text-xs border-t border-slate-100 pt-2 font-mono">
                    <span className="text-slate-405 text-slate-500">Patient Due GHS</span>
                    <span className="font-bold text-slate-900">₵{invoice.patient_payable_total.toFixed(2)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Invoice breakdown invoice template */}
        <div className="lg:col-span-2 space-y-4">
          {!activeInvoice ? (
            <div className="bg-white border border-slate-205 border-dashed rounded-xl p-16 text-center text-slate-500 space-y-3">
              <Calculator size={40} className="mx-auto text-slate-300" />
              <h4 className="font-semibold text-slate-800 text-base">Billing Receipt Terminal</h4>
              <p className="text-xs text-slate-405 max-w-xs mx-auto">
                Select an issued invoice ledger entry from the list to display claims calculations and Mobile Money interfaces.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-4">
              
              {/* Receipt Header styling */}
              <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest font-mono">Official GAF HMS Ledger Invoice</span>
                  <h3 className="text-lg font-bold font-display tracking-tight text-slate-900 mt-1">37 Military Hospital Registry</h3>
                  <p className="text-xs text-slate-500">P.O. Box GP 194, Neghelli Cantonments, Accra</p>
                </div>
                <div className="text-left sm:text-right text-xs font-mono">
                  <span className="text-slate-400 block">Invoice Serial Code:</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{activeInvoice.id.toUpperCase()}</p>
                  <p className="text-slate-505 text-slate-504 mt-1">Date: {new Date(activeInvoice.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Patient data overview */}
              <div className="px-6 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-medium text-slate-700">
                <div>
                  <span className="text-slate-405 text-slate-400 block font-mono">Billed Subject:</span>
                  <p className="font-bold text-slate-900 font-display mt-0.5">{activeInvoice.patient?.full_name}</p>
                  <p className="text-[10px] uppercase font-mono mt-0.5">File No. {activeInvoice.patient?.patient_number}</p>
                </div>
                <div>
                  <span className="text-slate-405 text-slate-400 block font-mono">National Cover Details:</span>
                  <p className="font-semibold mt-0.5 text-slate-900">
                    {activeInvoice.patient?.is_military ? 'GAF Medical Shield' : activeInvoice.patient?.nhis_number ? `NHIS Card: ${activeInvoice.patient.nhis_number}` : 'No Insurance Coverage'}
                  </p>
                </div>
              </div>

              {/* Items grid */}
              <div className="px-6 py-2 border-t border-slate-100">
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left divide-y divide-slate-100">
                    <thead className="bg-slate-50 font-mono text-[10px] text-slate-405 uppercase font-bold text-slate-500">
                      <tr>
                        <th className="p-3">Fee Item Description</th>
                        <th className="p-3 text-right">Standard Price</th>
                        <th className="p-3 text-right">NHIS Covered</th>
                        <th className="p-3 text-right">Patient Net Copay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {activeInvoice.items.map((item, index) => (
                        <tr key={index}>
                          <td className="p-3">{item.description}</td>
                          <td className="p-3 text-right font-mono">₵{item.unit_price.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono text-indigo-700">
                            {item.is_nhis_covered ? `₵${item.nhis_payout.toFixed(2)}` : '₵0.00'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-905">₵{item.patient_net_copay.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calculations ledger claim totals */}
              <div className="px-6 py-4 bg-slate-50/50 border-y border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono font-medium">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">NHIMA Reclaims:</span>
                    <span className="text-indigo-700 font-bold">₵{activeInvoice.nhis_covered_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Patient Invoice Bill Cost:</span>
                    <span className="text-slate-900 font-bold">₵{activeInvoice.patient_payable_total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-slate-200 pt-3 md:border-t-0 md:pt-0 md:border-l md:pl-4">
                  <div className="flex justify-between text-base font-bold">
                    <span className="text-slate-800">Outstanding GHS:</span>
                    <span className="text-red-650 text-red-600">
                      ₵{(activeInvoice.patient_payable_total - activeInvoice.amount_paid).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-505">Total Amount Collected:</span>
                    <span className="text-emerald-700 font-bold">₵{activeInvoice.amount_paid.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Processing Payment and MoMo panel */}
              {activeInvoice.status !== 'Paid' ? (
                <div className="p-6">
                  <form onSubmit={handleProcessPayment} className="space-y-4 max-w-md">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Accra Mobile Money & Cash Terminal</h4>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {['MTN MoMo', 'Telecel Cash', 'Cash', 'Visa'].map(method => {
                        const active = paymentMethod === method;
                        return (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method as any)}
                            className={`p-3 border rounded-xl flex items-center gap-2 text-xs font-semibold select-none transition ${
                              active 
                                ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350'
                            }`}
                          >
                            <Smartphone size={14} className={active ? 'text-white' : 'text-slate-400'} />
                            {method}
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-semibold text-slate-500 block uppercase">Log Pay Slip Amount (₵)</label>
                        <span className="text-[10px] text-slate-400">Leave blank to clear full outstanding amount</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder={`Optionally enter partial, e.g. ${(activeInvoice.patient_payable_total / 2).toFixed(2)}`}
                          value={payAmountInput}
                          onChange={(e) => setPayAmountInput(e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg p-2 text-xs w-full text-slate-900"
                        />
                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2 rounded-lg py-1 flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <Check size={14} /> Reconcile GHC
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="p-6 flex items-center gap-2 bg-emerald-50/50 border-t border-emerald-100 text-xs font-semibold text-emerald-800">
                  <Check size={16} className="text-emerald-600" />
                  Bill cleared successfully via {activeInvoice.payment_method} ledger receipt parameters.
                </div>
              )}

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
