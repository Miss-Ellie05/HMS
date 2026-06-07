import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { 
  TriageCategory, 
  EncounterStatus, 
  Patient, 
  Encounter, 
  WardBed, 
  Prescription, 
  EHRRecord, 
  BillingInvoice 
} from "./src/types";

// In-Memory Database State
const PATIENTS_DB: Patient[] = [
  {
    id: "p1",
    patient_number: "37MH-2026-1045",
    full_name: "Lieutenant Colonel Samuel Owusu",
    age: 47,
    gender: "M",
    is_military: true,
    military_rank: "Lieutenant Colonel",
    service_number: "GAF-20812-A",
    nhis_number: "9871049281",
    phone_number: "+233244102938"
  },
  {
    id: "p2",
    patient_number: "37MH-2026-1046",
    full_name: "Abena Mansa",
    age: 29,
    gender: "F",
    is_military: false,
    nhis_number: "2239401928",
    phone_number: "+233201948576"
  },
  {
    id: "p3",
    patient_number: "37MH-2026-1047",
    full_name: "Corporal Emmanuel Tetteh",
    age: 33,
    gender: "M",
    is_military: true,
    military_rank: "Corporal",
    service_number: "GAF-29401-T",
    nhis_number: "4451029482",
    phone_number: "+233559102938"
  },
  {
    id: "p4",
    patient_number: "37MH-2026-1048",
    full_name: "Kofi Boateng",
    age: 58,
    gender: "M",
    is_military: false,
    nhis_number: "1104829301",
    phone_number: "+233243112233"
  },
  {
    id: "p5",
    patient_number: "37MH-2026-1049",
    full_name: "Sergeant Patience Gyamfi",
    age: 31,
    gender: "F",
    is_military: true,
    military_rank: "Sergeant",
    service_number: "GAF-19402-G",
    nhis_number: "3321948271",
    phone_number: "+233277104958"
  },
  {
    id: "p6",
    patient_number: "37MH-2026-1050",
    full_name: "Afia Adomah",
    age: 4,
    gender: "F",
    is_military: false,
    nhis_number: "8893104918",
    phone_number: "+233544294819"
  }
];

const ENCOUNTERS_DB: Encounter[] = [
  {
    id: "e1",
    patient_id: "p1",
    triage_color: TriageCategory.ORANGE,
    sats_score: 6,
    mobility: "With Help",
    pain_score: 7,
    chief_complaint: "Acute substernal crushing chest pain radiating to left arm. Dyspnea and diaphoresis.",
    status: EncounterStatus.IN_CONSULTATION,
    created_at: new Date(Date.now() - 30 * 60000).toISOString() // 30 mins ago
  },
  {
    id: "e2",
    patient_id: "p2",
    triage_color: TriageCategory.GREEN,
    sats_score: 1,
    mobility: "Walking",
    pain_score: 3,
    chief_complaint: "Mild fever, joint pains, headache. Suspected uncomplicated malaria.",
    status: EncounterStatus.AWAITING_CONSULTATION,
    created_at: new Date(Date.now() - 50 * 60000).toISOString() // 50 mins ago
  },
  {
    id: "e3",
    patient_id: "p3",
    triage_color: TriageCategory.RED,
    sats_score: 8,
    mobility: "Stretcher/Immobile",
    pain_score: 9,
    chief_complaint: "Shrapnel wound in abdomen from training exercise. Profuse external bleeding, clammy skin.",
    status: EncounterStatus.ADMITTED,
    created_at: new Date(Date.now() - 100 * 60000).toISOString() // 100 mins ago
  },
  {
    id: "e4",
    patient_id: "p4",
    triage_color: TriageCategory.YELLOW,
    sats_score: 4,
    mobility: "Walking",
    pain_score: 5,
    chief_complaint: "Chronic hypertensive patient reporting severe dry cough and visual blurriness.",
    status: EncounterStatus.AWAITING_BILLING,
    created_at: new Date(Date.now() - 90 * 60000).toISOString()
  },
  {
    id: "e5",
    patient_id: "p5",
    triage_color: TriageCategory.ORANGE,
    sats_score: 6,
    mobility: "Stretcher/Immobile",
    pain_score: 8,
    chief_complaint: "Sustained compound dislocation right ankle. Underwent field splinting, high pain.",
    status: EncounterStatus.IN_CONSULTATION,
    created_at: new Date(Date.now() - 15 * 60000).toISOString()
  },
  {
    id: "e6",
    patient_id: "p6",
    triage_color: TriageCategory.YELLOW,
    sats_score: 3,
    mobility: "Walking",
    pain_score: 4,
    chief_complaint: "Pediatric patient presenting with 3-day history of hot body, watery stool, and vomiting.",
    status: EncounterStatus.AWAITING_CONSULTATION,
    created_at: new Date(Date.now() - 40 * 60000).toISOString()
  }
];

const BEDS_DB: WardBed[] = [
  // A&E
  { id: "ae-01", ward_name: "Accident & Emergency", bed_number: "A&E-01", is_occupied: true, patient_id: "p3", patient_name: "Corporal Emmanuel Tetteh", has_oxygen_port: true, equipment: ["Defibrillator", "Oxygen Regulator"] },
  { id: "ae-02", ward_name: "Accident & Emergency", bed_number: "A&E-02", is_occupied: false, has_oxygen_port: true, equipment: ["Patient Monitor"] },
  { id: "ae-03", ward_name: "Accident & Emergency", bed_number: "A&E-03", is_occupied: false, has_oxygen_port: false, equipment: [] },
  { id: "ae-04", ward_name: "Accident & Emergency", bed_number: "A&E-04", is_occupied: false, has_oxygen_port: true, equipment: [] },
  
  // ICU
  { id: "icu-01", ward_name: "Intensive Care", bed_number: "ICU-01", is_occupied: true, patient_id: "p1", patient_name: "Lieutenant Colonel Samuel Owusu", has_oxygen_port: true, equipment: ["Ventilator", "Syringe Pump", "ECG Monitor"] },
  { id: "icu-02", ward_name: "Intensive Care", bed_number: "ICU-02", is_occupied: false, has_oxygen_port: true, equipment: ["Ventilator", "Patient Monitor"] },
  { id: "icu-03", ward_name: "Intensive Care", bed_number: "ICU-03", is_occupied: false, has_oxygen_port: true, equipment: [] },

  // Maternity
  { id: "mat-01", ward_name: "Maternity", bed_number: "MAT-01", is_occupied: false, has_oxygen_port: true, equipment: ["Fetal Heart Monitor"] },
  { id: "mat-02", ward_name: "Maternity", bed_number: "MAT-02", is_occupied: false, has_oxygen_port: false, equipment: [] },

  // Male Medical
  { id: "mm-01", ward_name: "Male Medical", bed_number: "MM-01", is_occupied: false, has_oxygen_port: true, equipment: [] },
  { id: "mm-02", ward_name: "Male Medical", bed_number: "MM-02", is_occupied: false, has_oxygen_port: false, equipment: [] },

  // Female Medical
  { id: "fm-01", ward_name: "Female Medical", bed_number: "FM-01", is_occupied: false, has_oxygen_port: true, equipment: [] },
  { id: "fm-02", ward_name: "Female Medical", bed_number: "FM-02", is_occupied: false, has_oxygen_port: false, equipment: [] }
];

const EHR_DB: EHRRecord[] = [
  {
    id: "ehr1",
    encounter_id: "e3",
    patient_id: "p3",
    symptoms: "Penetrating abdominal shrapnel wound. Significant internal bleeding signs. High pain score of 9.",
    diagnosis_code: "S31.8",
    diagnosis_description: "Open wound of abdomen with shrapnel penetration",
    doctor_notes: "Emergency fluid resuscitation completed. Group O negative blood transfused. Urgent surgical debridement scheduled.",
    lab_requests: ["FBC", "Group & Matches", "PT/APTT"],
    lab_results: [
      { test_name: "FBC", status: "Completed", result_text: "Hb: 9.2 g/dL (Low), WBC: 14.5 x10^9/L (Elevated)", completed_at: new Date().toISOString() },
      { test_name: "Group & Matches", status: "Completed", result_text: "Blood Type: O Positive matched", completed_at: new Date().toISOString() }
    ],
    prescriptions: [
      { id: "pr1", medicine_name: "IV Ceftriaxone", dosage: "2g Stat", duration: "1 Day", is_nhis_covered: true, nhis_copay: 5, full_price: 65 },
      { id: "pr2", medicine_name: "IV Tramadol", dosage: "100mg slow IV push", duration: "8 Hourly PRN", is_nhis_covered: true, nhis_copay: 3, full_price: 45 }
    ],
    created_at: new Date().toISOString()
  },
  {
    id: "ehr2",
    encounter_id: "e4",
    patient_id: "p4",
    symptoms: "Chronic Hypertension with headache, dizzy spells, and blurred vision.",
    diagnosis_code: "I10",
    diagnosis_description: "Essential (primary) hypertension",
    doctor_notes: "Review BP is 185/110. Patient admitting to medication non-compliance over last 3 weeks due to supply issue.",
    lab_requests: ["Serum Creatinine", "Urine Routine", "ECG"],
    lab_results: [
      { test_name: "Serum Creatinine", status: "Completed", result_text: "115 umol/L (Mildly elevated)", completed_at: new Date().toISOString() },
      { test_name: "ECG", status: "Completed", result_text: "Left ventricular hypertrophy patterns", completed_at: new Date().toISOString() }
    ],
    prescriptions: [
      { id: "pr3", medicine_name: "Amlodipine", dosage: "10mg Daily", duration: "30 Days", is_nhis_covered: true, nhis_copay: 10, full_price: 120 },
      { id: "pr4", medicine_name: "Lisinopril", dosage: "20mg Daily", duration: "30 Days", is_nhis_covered: true, nhis_copay: 15, full_price: 145 }
    ],
    created_at: new Date().toISOString()
  }
];

const BILLING_INVOICES_DB: BillingInvoice[] = [
  {
    id: "inv1",
    encounter_id: "e4",
    patient_id: "p4",
    items: [
      { description: "General Consultation Fee (OPD)", quantity: 1, unit_price: 80, total_price: 80, is_nhis_covered: true, nhis_co_pay_percentage: 10, nhis_payout: 72, patient_net_copay: 8 },
      { description: "Serum Creatinine Test + Urinalysis", quantity: 1, unit_price: 150, total_price: 150, is_nhis_covered: true, nhis_co_pay_percentage: 10, nhis_payout: 135, patient_net_copay: 15 },
      { description: "ECG Diagnostic Scan", quantity: 1, unit_price: 250, total_price: 250, is_nhis_covered: false, nhis_co_pay_percentage: 100, nhis_payout: 0, patient_net_copay: 250 },
      { description: "Amlodipine 10mg (30 Qty)", quantity: 1, unit_price: 120, total_price: 120, is_nhis_covered: true, nhis_co_pay_percentage: 10, nhis_payout: 108, patient_net_copay: 12 },
      { description: "Lisinopril 20mg (30 Qty)", quantity: 1, unit_price: 145, total_price: 145, is_nhis_covered: true, nhis_co_pay_percentage: 10, nhis_payout: 130.5, patient_net_copay: 14.5 }
    ],
    nhis_covered_total: 445.50,
    patient_payable_total: 299.50,
    amount_paid: 299.50,
    payment_method: "MTN MoMo",
    status: "Paid",
    created_at: new Date().toISOString()
  }
];

// Lazy Initialization of Gemini AI Client
let ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!ai && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

// SATS Points Logic
function calculateSatsPoints(vitals: any): number {
  let pts = 0;
  if (vitals.mobility === "With Help") {
    pts += 1;
  } else if (vitals.mobility === "Stretcher/Immobile") {
    pts += 2;
  }

  if (vitals.resp_rate) {
    const rr = Number(vitals.resp_rate);
    if (rr < 9 || rr > 30) pts += 3;
    else if ((rr >= 9 && rr <= 14) || (rr >= 21 && rr <= 30)) pts += 1;
  }

  if (vitals.systolic_bp) {
    const sbp = Number(vitals.systolic_bp);
    if (sbp < 71 || sbp > 220) pts += 3;
    else if (sbp >= 71 && sbp <= 80) pts += 2;
    else if ((sbp >= 81 && sbp <= 100) || (sbp >= 160 && sbp <= 220)) pts += 1;
  }

  if (vitals.heart_rate) {
    const hr = Number(vitals.heart_rate);
    if (hr < 40 || hr > 130) pts += 3;
    else if (hr >= 110 && hr <= 129) pts += 2;
    else if ((hr >= 40 && hr <= 50) || (hr >= 101 && hr <= 109)) pts += 1;
  }

  if (vitals.temperature) {
    const temp = Number(vitals.temperature);
    if (temp < 35.0 || temp > 38.5) pts += 2;
    else if ((temp >= 35.0 && temp <= 35.9) || (temp >= 37.5 && temp <= 38.4)) pts += 1;
  }

  if (vitals.oxygen_sat) {
    const sp = Number(vitals.oxygen_sat);
    if (sp < 90) pts += 3;
    else if (sp >= 90 && sp < 94) pts += 2;
    else if (sp >= 94 && sp < 96) pts += 1;
  }

  if (Number(vitals.pain_score) >= 8) {
    pts += 1;
  }

  return pts;
}

function determineTriageColor(pts: number, isTrauma: boolean, isMilitary: boolean): TriageCategory {
  if (isMilitary && pts >= 3) {
    pts += 2; // Active duty military gets swift routing offset inside military hospital trauma zones
  }

  if (isTrauma || pts >= 7) {
    return TriageCategory.RED;
  } else if (pts >= 5) {
    return TriageCategory.ORANGE;
  } else if (pts >= 3) {
    return TriageCategory.YELLOW;
  } else if (pts >= 1) {
    return TriageCategory.GREEN;
  } else {
    return TriageCategory.BLUE;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // -------------------------------------------------------------
  // API ROUTE ENDPOINTS
  // -------------------------------------------------------------

  // System Files Inspect API (useful for displaying code and schemas)
  app.get("/api/sys/files", (req, res) => {
    try {
      const schemaSqlPath = path.join(process.cwd(), "schema.sql");
      const backendPyPath = path.join(process.cwd(), "backend_reference.py");

      const schemaSql = fs.existsSync(schemaSqlPath) ? fs.readFileSync(schemaSqlPath, "utf-8") : "";
      const backendPy = fs.existsSync(backendPyPath) ? fs.readFileSync(backendPyPath, "utf-8") : "";

      res.json({ schemaSql, backendPy });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get Admin Stats
  app.get("/api/sys/stats", (req, res) => {
    const activeEmergency = ENCOUNTERS_DB.filter(e => e.triage_color === TriageCategory.RED || e.triage_color === TriageCategory.ORANGE).length;
    const occupiedBeds = BEDS_DB.filter(b => b.is_occupied).length;
    const bedOccupancy = Math.round((occupiedBeds / BEDS_DB.length) * 100);
    const pendingLabs = EHR_DB.reduce((acc, curr) => {
      const pending = (curr.lab_results || []).filter(l => l.status === "Pending").length;
      return acc + pending;
    }, 0);

    const totalBillingPaid = BILLING_INVOICES_DB
      .filter(i => i.status === "Paid")
      .reduce((sum, current) => sum + current.amount_paid, 0);

    res.json({
      activeEmergency,
      bedOccupancy,
      pendingLabs,
      totalBillingPaid
    });
  });

  // Patients Lookups and Register
  app.get("/api/patients", (req, res) => {
    res.json(PATIENTS_DB);
  });

  app.post("/api/patients", (req, res) => {
    const { full_name, age, gender, is_military, military_rank, service_number, nhis_number, phone_number } = req.body;
    
    if (!full_name || !age || !gender || !phone_number) {
      return res.status(400).json({ error: "Missing required patient fields" });
    }

    const uniqueId = `p${PATIENTS_DB.length + 1}`;
    const patient_number = `37MH-${new Date().getFullYear()}-${1045 + PATIENTS_DB.length}`;
    
    const newPatient: Patient = {
      id: uniqueId,
      patient_number,
      full_name,
      age: Number(age),
      gender,
      is_military: !!is_military,
      military_rank: is_military ? military_rank : undefined,
      service_number: is_military ? service_number : undefined,
      nhis_number,
      phone_number
    };

    PATIENTS_DB.push(newPatient);
    res.status(201).json(newPatient);
  });

  // Encounters Lookups and Intake Triage
  app.get("/api/encounters", (req, res) => {
    res.json(ENCOUNTERS_DB);
  });

  app.post("/api/encounters", (req, res) => {
    const { 
      patient_id, 
      chief_complaint, 
      systolic_bp, 
      diastolic_bp, 
      heart_rate, 
      temperature, 
      resp_rate, 
      oxygen_sat, 
      mobility, 
      pain_score 
    } = req.body;

    const patient = PATIENTS_DB.find(p => p.id === patient_id);
    if (!patient) {
      return res.status(404).json({ error: "Patient record not registered" });
    }

    const sats_score = calculateSatsPoints({ systolic_bp, heart_rate, temperature, resp_rate, oxygen_sat, mobility, pain_score });
    
    let isTrauma = false;
    if (Number(pain_score) === 10 || (systolic_bp && Number(systolic_bp) < 80)) {
      isTrauma = true;
    }

    const triage_color = determineTriageColor(sats_score, isTrauma, patient.is_military);

    const encounterId = `e${ENCOUNTERS_DB.length + 1}`;
    const newEncounter: Encounter = {
      id: encounterId,
      patient_id,
      triage_color,
      sats_score,
      systolic_bp: systolic_bp ? Number(systolic_bp) : undefined,
      diastolic_bp: diastolic_bp ? Number(diastolic_bp) : undefined,
      heart_rate: heart_rate ? Number(heart_rate) : undefined,
      temperature: temperature ? Number(temperature) : undefined,
      resp_rate: resp_rate ? Number(resp_rate) : undefined,
      oxygen_sat: oxygen_sat ? Number(oxygen_sat) : undefined,
      mobility: mobility || "Walking",
      pain_score: Number(pain_score) || 0,
      chief_complaint: chief_complaint || "Routine Checkup",
      status: EncounterStatus.AWAITING_CONSULTATION,
      created_at: new Date().toISOString()
    };

    ENCOUNTERS_DB.push(newEncounter);
    res.status(201).json(newEncounter);
  });

  // Triage Queue Prioritized View
  app.get("/api/queue", (req, res) => {
    const triageOrder = {
      [TriageCategory.RED]: 1,
      [TriageCategory.ORANGE]: 2,
      [TriageCategory.YELLOW]: 3,
      [TriageCategory.GREEN]: 4,
      [TriageCategory.BLUE]: 5
    };

    const sortedQueue = [...ENCOUNTERS_DB]
      .filter(e => e.status === EncounterStatus.AWAITING_CONSULTATION || e.status === EncounterStatus.IN_CONSULTATION)
      .map(e => {
        const patient = PATIENTS_DB.find(p => p.id === e.patient_id);
        return { ...e, patient };
      })
      .sort((a, b) => {
        // Clinical priority sorting
        const orderA = triageOrder[a.triage_color] || 9;
        const orderB = triageOrder[b.triage_color] || 9;
        if (orderA !== orderB) return orderA - orderB;

        // If same color, active military personnel get prioritized sorting offset
        const isMilA = a.patient?.is_military ? 1 : 0;
        const isMilB = b.patient?.is_military ? 1 : 0;
        if (isMilA !== isMilB) return isMilB - isMilA;

        // Otherwise FIFO by registration timestamp
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

    res.json(sortedQueue);
  });

  // Bed Allocations (Matrix)
  app.get("/api/beds", (req, res) => {
    res.json(BEDS_DB);
  });

  app.post("/api/beds/allocate", (req, res) => {
    const { bed_id, patient_id } = req.body;
    const bed = BEDS_DB.find(b => b.id === bed_id);
    const patient = PATIENTS_DB.find(p => p.id === patient_id);

    if (!bed) return res.status(404).json({ error: "Bed not identified" });
    if (!patient) return res.status(444).json({ error: "Patient not found" });

    // Free patient from old bed first (if any)
    BEDS_DB.forEach(b => {
      if (b.patient_id === patient_id) {
        b.is_occupied = false;
        b.patient_id = undefined;
        b.patient_name = undefined;
      }
    });

    bed.is_occupied = true;
    bed.patient_id = patient_id;
    bed.patient_name = patient.full_name;

    // Update encounter status to ADMITTED if applicable
    const activeEncounter = ENCOUNTERS_DB.find(e => e.patient_id === patient_id && e.status !== EncounterStatus.DISCHARGED);
    if (activeEncounter) {
      activeEncounter.status = EncounterStatus.ADMITTED;
    }

    res.json({ success: true, bed, beds: BEDS_DB });
  });

  app.post("/api/beds/vacate", (req, res) => {
    const { bed_id } = req.body;
    const bed = BEDS_DB.find(b => b.id === bed_id);
    if (!bed) return res.status(404).json({ error: "Bed not identified" });

    const prevPatientId = bed.patient_id;
    bed.is_occupied = false;
    bed.patient_id = undefined;
    bed.patient_name = undefined;

    if (prevPatientId) {
      const activeEncounter = ENCOUNTERS_DB.find(e => e.patient_id === prevPatientId && e.status === EncounterStatus.ADMITTED);
      if (activeEncounter) {
        activeEncounter.status = EncounterStatus.AWAITING_BILLING;
      }
    }

    res.json({ success: true, bed, beds: BEDS_DB });
  });

  // EHR Records
  app.get("/api/ehr/:patientId", (req, res) => {
    const patientFiles = EHR_DB.filter(record => record.patient_id === req.params.patientId);
    res.json(patientFiles);
  });

  // Prescription List / Drug Intersect (Stock/Prices) in Ghana
  const DRUG_INVENTORY = [
    { name: "Artesunate-Amodiaquine", coversNHIS: true, costGHS: 45, detail: "Standard ACT Firstline treatment of uncomplicated Plasmodium falciparum malaria in Ghana." },
    { name: "Ciprofloxacin 500mg", coversNHIS: true, costGHS: 55, detail: "Fluoroquinolone antibiotic." },
    { name: "Amlodipine 10mg", coversNHIS: true, costGHS: 120, detail: "Calcium channel blocker anti-hypertensive medication." },
    { name: "Lisinopril 20mg", coversNHIS: true, costGHS: 145, detail: "ACE inhibitor anti-hypertensive." },
    { name: "Metformin 500mg", coversNHIS: true, costGHS: 75, detail: "Standard biguanide anti-diabetic agent." },
    { name: "Artemether-Lumefantrine (Coartem)", coversNHIS: true, costGHS: 35, detail: "Antimalarial ACT compound." },
    { name: "Amoxicillin-Clavulanic Acid (Co-Amoxiclav) 625mg", coversNHIS: false, costGHS: 240, detail: "Broad-spectrum beta-lactamase inhibitor combo. Note: Not fully covered on basic NHIS." },
    { name: "Ceftriaxone Injection 1g", coversNHIS: true, costGHS: 65, detail: "Third-generation cephalosporin antibiotic injection." },
    { name: "Diclofenac Sodium 50mg", coversNHIS: true, costGHS: 25, detail: "NSAID pain relief / anti-inflammatory." },
    { name: "Paracetamol 500mg", coversNHIS: true, costGHS: 15, detail: "Analgesic first-line generic." },
    { name: "Insulin Glargine Pen", coversNHIS: false, costGHS: 420, detail: "Long-acting insulin analogue (Out-of-Pocket specialty biologic, GHS 420)." }
  ];

  app.get("/api/pharmacy/catalog", (req, res) => {
    res.json(DRUG_INVENTORY);
  });

  // Handle EHR Consultation Logging combined with NHIS Billing Auto-Generation
  app.post("/api/ehr", (req, res) => {
    const { encounter_id, patient_id, symptoms, diagnosis_code, diagnosis_description, doctor_notes, prescriptions, lab_requests } = req.body;

    const patient = PATIENTS_DB.find(p => p.id === patient_id);
    const encounter = ENCOUNTERS_DB.find(e => e.id === encounter_id);

    if (!patient || !encounter) {
      return res.status(404).json({ error: "Reference Patient or Triage Encounter files not found" });
    }

    const compiledPrescriptionsObj = (prescriptions || []).map((rx: any) => {
      const dbDrug = DRUG_INVENTORY.find(d => d.name.toLowerCase() === rx.medicine_name.toLowerCase());
      const is_nhis_covered = dbDrug ? dbDrug.coversNHIS : true;
      const full_price = dbDrug ? dbDrug.costGHS : 95; // default full price if custom drug
      // Net copay represents 10% co-payment parameter under NHIS if covered. Otherwise full price.
      const nhis_copay = is_nhis_covered ? Math.round(full_price * 0.1) : full_price;

      return {
        id: `rx${Math.floor(Math.random() * 100000)}`,
        medicine_name: rx.medicine_name,
        dosage: rx.dosage || "1 TDS",
        duration: rx.duration || "5 Days",
        is_nhis_covered,
        nhis_copay,
        full_price
      };
    });

    const activeLabs = (lab_requests || []).map((test: string) => ({
      test_name: test,
      status: "Pending" as const
    }));

    const newEhr: EHRRecord = {
      id: `ehr${EHR_DB.length + 1}`,
      encounter_id,
      patient_id,
      symptoms,
      diagnosis_code: diagnosis_code || "R50.9",
      diagnosis_description: diagnosis_description || "Fever of unknown origin",
      doctor_notes,
      prescriptions: compiledPrescriptionsObj,
      lab_requests: lab_requests || [],
      lab_results: activeLabs,
      created_at: new Date().toISOString()
    };

    EHR_DB.push(newEhr);

    // Auto update Encounter Status
    encounter.status = EncounterStatus.AWAITING_BILLING;

    // Billing Engine Integration: Generate Bill
    const billingItems: any[] = [];
    
    // Add physical consultation OPD level charges
    const rawConsultPrice = patient.is_military ? 0 : 80; // Military is 100% free consult at 37 Military
    billingItems.push({
      description: `Outpatient General Consultation - ${patient.is_military ? "GAF Officer Bypass" : "Civilian Standard OP Fee"}`,
      quantity: 1,
      unit_price: rawConsultPrice,
      total_price: rawConsultPrice,
      is_nhis_covered: !patient.is_military, // Military gets 0 co-pay
      nhis_co_pay_percentage: patient.is_military ? 0 : 10,
      nhis_payout: patient.is_military ? 0 : 72,
      patient_net_copay: 0 // GAF gets free, Civilian covered net copay is GHS 8
    });

    // Add diagnostics labs
    (lab_requests || []).forEach((test: string) => {
      const price = test === "FBC" ? 50 : test === "ECG" ? 250 : 80;
      const covers = test !== "ECG"; // ECG not covered by basic NHIS
      const net_copay = patient.is_military ? 0 : (covers ? Math.round(price * 0.1) : price);
      const payout = patient.is_military ? 0 : (covers ? price - net_copay : 0);
      
      billingItems.push({
        description: `Laboratory Diagnostic Test: ${test}`,
        quantity: 1,
        unit_price: price,
        total_price: price,
        is_nhis_covered: covers,
        nhis_co_pay_percentage: covers ? 10 : 100,
        nhis_payout: payout,
        patient_net_copay: net_copay
      });
    });

    // Add prescriptions
    compiledPrescriptionsObj.forEach((rx: any) => {
      const net_copay = patient.is_military ? 0 : rx.nhis_copay;
      const payout = patient.is_military ? 0 : (rx.is_nhis_covered ? rx.full_price - rx.nhis_copay : 0);

      billingItems.push({
        description: `Prescribed Medication: ${rx.medicine_name} (${rx.dosage})`,
        quantity: 1,
        unit_price: rx.full_price,
        total_price: rx.full_price,
        is_nhis_covered: rx.is_nhis_covered,
        nhis_co_pay_percentage: rx.is_nhis_covered ? 10 : 100,
        nhis_payout: payout,
        patient_net_copay: net_copay
      });
    });

    const nhis_covered_total = billingItems.reduce((acc, curr) => acc + curr.nhis_payout, 0);
    const patient_payable_total = billingItems.reduce((acc, curr) => acc + curr.patient_net_copay, 0);

    const invoice: BillingInvoice = {
      id: `inv${BILLING_INVOICES_DB.length + 1}`,
      encounter_id,
      patient_id,
      items: billingItems,
      nhis_covered_total,
      patient_payable_total,
      amount_paid: 0,
      status: patient_payable_total === 0 ? "Paid" : "Unpaid",
      payment_method: patient_payable_total === 0 ? "Cash" : undefined,
      created_at: new Date().toISOString()
    };

    BILLING_INVOICES_DB.push(invoice);

    res.status(201).json({ success: true, ehr: newEhr, invoice });
  });

  // Labs list (for nurses/admins)
  app.get("/api/labs/pending", (req, res) => {
    const list: any[] = [];
    EHR_DB.forEach(record => {
      (record.lab_results || []).forEach(lab => {
        if (lab.status === "Pending") {
          const patient = PATIENTS_DB.find(p => p.id === record.patient_id);
          list.push({
            record_id: record.id,
            patient_name: patient?.full_name,
            patient_number: patient?.patient_number,
            test_name: lab.test_name,
            encounter_id: record.encounter_id,
            patient_id: record.patient_id
          });
        }
      });
    });
    res.json(list);
  });

  app.post("/api/labs/complete", (req, res) => {
    const { record_id, test_name, result_text } = req.body;
    const record = EHR_DB.find(r => r.id === record_id);
    if (!record) return res.status(404).json({ error: "EHR record file not found" });

    const lab = (record.lab_results || []).find(l => l.test_name === test_name);
    if (lab) {
      lab.status = "Completed";
      lab.result_text = result_text || "Within clinical reference levels";
      lab.completed_at = new Date().toISOString();
    }

    res.json({ success: true, record });
  });

  // Billing Invoices (Inquiries & Payments)
  app.get("/api/billing", (req, res) => {
    const detailedInvoices = BILLING_INVOICES_DB.map(invoice => {
      const patient = PATIENTS_DB.find(p => p.id === invoice.patient_id);
      return { ...invoice, patient };
    });
    res.json(detailedInvoices);
  });

  app.post("/api/billing/pay", (req, res) => {
    const { invoice_id, payment_method, amount } = req.body;
    const invoice = BILLING_INVOICES_DB.find(inv => inv.id === invoice_id);

    if (!invoice) return res.status(404).json({ error: "Invoice ledger file not found" });

    const payAmount = Number(amount) || invoice.patient_payable_total;
    invoice.amount_paid = Number((invoice.amount_paid + payAmount).toFixed(2));
    invoice.payment_method = payment_method || "Cash";

    if (invoice.amount_paid >= invoice.patient_payable_total) {
      invoice.status = "Paid";
      // Update encounter status
      const encounter = ENCOUNTERS_DB.find(e => e.id === invoice.encounter_id);
      if (encounter) {
        encounter.status = EncounterStatus.DISCHARGED;
      }
    } else {
      invoice.status = "Partially Paid";
    }

    res.json({ success: true, invoice });
  });


  // -------------------------------------------------------------
  // AI-ASSISTED CLINICAL DIAGNOSIS ENDPOINT (GEMINI API)
  // -------------------------------------------------------------
  app.post("/api/gemini/consult", async (req, res) => {
    const { symptoms } = req.body;
    if (!symptoms) {
      return res.status(400).json({ error: "Symptom description is required" });
    }

    const aiClient = getAI();
    if (!aiClient) {
      // Elegant clinical fallback with typical diagnoses found in high-priority Ghanaian military clinics
      console.log("Gemini API key is not active. Falling back to rule-based clinic triage model.");
      
      const text = symptoms.toLowerCase();
      let code = "R50.9";
      let desc = "Fever, unspecified";
      let medicines = [
        { name: "Paracetamol 500mg", dose: "1g TDS for 3 days" },
        { name: "Diclofenac Sodium 50mg", dose: "50mg BD for 2 days" }
      ];
      let interactions = "No severe clinical interactions recorded for prescribed regimens against standard formulary.";

      if (text.includes("chest pain") || text.includes("crushing")) {
        code = "I21.9";
        desc = "Acute myocardial infarction, unspecified";
        medicines = [
          { name: "Aspirin 300mg", dose: "Stat Chewable dosage chew immediately" },
          { name: "Glyceryl Trinitrate (GTN)", dose: "500mcg sublingual Stat" }
        ];
        interactions = "Contraindicated: Sildenafil or other PDE5-inhibitors use within last 48 hours. Risk of fatal blood pressure crashes.";
      } else if (text.includes("fever") || text.includes("joint") || text.includes("malaria") || text.includes("headache")) {
        code = "B54";
        desc = "Unspecified malaria (Plasmodium falciparum endemic area)";
        medicines = [
          { name: "Artesunate-Amodiaquine", dose: "2 tablets daily for 3 days with food" },
          { name: "Paracetamol 500mg", dose: "1g TDS or 8 hourly PRN for pain" }
        ];
        interactions = "Caution: Amodiaquine component can trigger acute hepatic distress or safety warnings in patients on antiretrovirals or showing impaired hepatocyte profiles.";
      } else if (text.includes("cough") || text.includes("breathing") || text.includes("chest")) {
        code = "J18.9";
        desc = "Pneumonia, unspecified organism";
        medicines = [
          { name: "Amoxicillin-Clavulanic Acid (Co-Amoxiclav) 625mg", dose: "625mg BD for 7 days" },
          { name: "Paracetamol 500mg", dose: "1g TDS if fever exceeds 38°C" }
        ];
        interactions = "May cross-react in penicillin-sensitive patients; monitor closely. Do not administer amoxicillin to patients with a history of ampicillin rash.";
      }

      return res.json({
        diagnosis_code: code,
        diagnosis_description: desc,
        medicines,
        interactions,
        ai_powered: false
      });
    }

    try {
      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `You are an expert military hospital clinical assistant modeled after the Chief of Medicine at 37 Military Hospital in Accra, Ghana.
Review this medical symptom intake: "${symptoms}".
Generate a structured medical consultation assessment in JSON format.
In your response, return an object matching the following TypeScript interface exactly:

interface ClinicalResponse {
  diagnosis_code: string; // The primary ICD-10 code (e.g. B54 for malaria, I10 for hypertension, I21.9 for MI)
  diagnosis_description: string; // Descriptive name of the ICD-10 diagnosis
  medicines: { name: string; dose: string }[]; // Array of 2-3 standard medications from the Accra Ghana National Formulary suitable for this condition
  interactions: string; // Brief, highly clinical warning about drug interaction warnings or contraindications (keep it under 80 words)
}

Ensure your output is valid JSON in plain text only, matching this structure.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              diagnosis_code: { type: Type.STRING, description: "Relevant ICD-10 format medical classification code." },
              diagnosis_description: { type: Type.STRING, description: "Accurate clinical description of diagnosis." },
              medicines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Accredited GHS essential drug name." },
                    dose: { type: Type.STRING, description: "Accurate dosage strength and schedule frequency." }
                  },
                  required: ["name", "dose"]
                }
              },
              interactions: { type: Type.STRING, description: "Crucial drug compatibility warning." }
            },
            required: ["diagnosis_code", "diagnosis_description", "medicines", "interactions"]
          }
        }
      });

      const responseText = response.text || "{}";
      const cleanJson = JSON.parse(responseText.trim());
      res.json({ ...cleanJson, ai_powered: true });
    } catch (e: any) {
      console.error("Gemini Consultation Error:", e);
      res.json({
        diagnosis_code: "R50.9",
        diagnosis_description: "Fever of unknown origins (Clinic General Reserve)",
        medicines: [
          { name: "Paracetamol 500mg", dose: "1g 8 hourly for 3 days" }
        ],
        interactions: "Warning: Medical fallback activated due to downstream gateway timeouts.",
        ai_powered: false,
        error: e.message
      });
    }
  });


  // -------------------------------------------------------------
  // VITE DEV SERVER ENGINE OR PRODUCTION SERVE INTERFACE
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[HMS Server Configured] Running correctly on http://localhost:${PORT}`);
  });
}

startServer();
