/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum TriageCategory {
  RED = 'RED',       // Emergency (Immediate)
  ORANGE = 'ORANGE', // Very Urgent (≤ 10 mins)
  YELLOW = 'YELLOW', // Urgent (≤ 60 mins)
  GREEN = 'GREEN',   // Routine (≤ 240 mins)
  BLUE = 'BLUE',     // Non-Urgent / Dead on Arrival
}

export enum EncounterStatus {
  AWAITING_TRIAGE = 'AWAITING_TRIAGE',
  AWAITING_CONSULTATION = 'AWAITING_CONSULTATION',
  IN_CONSULTATION = 'IN_CONSULTATION',
  AWAITING_PHARMACY = 'AWAITING_PHARMACY',
  AWAITING_BILLING = 'AWAITING_BILLING',
  ADMITTED = 'ADMITTED',
  DISCHARGED = 'DISCHARGED',
}

export interface Patient {
  id: string;
  patient_number: string; // e.g. 37MH-10492
  full_name: string;
  age: number;
  gender: 'M' | 'F' | 'Other';
  is_military: boolean;
  military_rank?: string;
  service_number?: string;
  nhis_number?: string; // Ghana National Health Insurance Scheme
  phone_number: string;
}

export interface Encounter {
  id: string;
  patient_id: string;
  triage_color: TriageCategory;
  sats_score: number; // South African Triage Scale Points (0-10)
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  temperature?: number;
  resp_rate?: number;
  oxygen_sat?: number;
  mobility: 'Walking' | 'With Help' | 'Stretcher/Immobile';
  pain_score: number; // 0 to 10
  chief_complaint: string;
  status: EncounterStatus;
  created_at: string;
}

export interface WardBed {
  id: string; // e.g. ICU-01
  ward_name: 'Accident & Emergency' | 'Intensive Care' | 'Maternity' | 'Male Medical' | 'Female Medical';
  bed_number: string;
  is_occupied: boolean;
  patient_id?: string;
  patient_name?: string;
  has_oxygen_port: boolean;
  equipment: string[]; // e.g. ['Ventilator', 'Infusion Pump']
}

export interface Prescription {
  id: string;
  medicine_name: string;
  dosage: string;
  duration: string;
  is_nhis_covered: boolean;
  nhis_copay: number; // GHS copay if NHIS covers part
  full_price: number; // GHS full price if no NHIS
}

export interface EHRRecord {
  id: string;
  encounter_id: string;
  patient_id: string;
  symptoms: string;
  diagnosis_code: string; // ICD-10
  diagnosis_description: string;
  prescriptions: Prescription[];
  lab_requests: string[]; // e.g. ['FBC', 'Malaria RDT', 'Widal test']
  lab_results?: {
    test_name: string;
    status: 'Pending' | 'Completed';
    result_text?: string;
    completed_at?: string;
  }[];
  doctor_notes: string;
  created_at: string;
}

export interface BillingInvoice {
  id: string;
  encounter_id: string;
  patient_id: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    is_nhis_covered: boolean;
    nhis_co_pay_percentage: number; // percentage user pays. e.g. 10%
    nhis_payout: number; // covered by NHIS
    patient_net_copay: number; // paid by patient
  }[];
  nhis_covered_total: number;
  patient_payable_total: number;
  amount_paid: number;
  payment_method?: 'Cash' | 'MTN MoMo' | 'Telecel Cash' | 'Visa';
  status: 'Unpaid' | 'Paid' | 'Partially Paid';
  created_at: string;
}

export interface AdminStats {
  activeEmergency: number;
  bedOccupancy: number; // percentage
  pendingLabs: number;
  totalBillingPaid: number; // GHS
}
