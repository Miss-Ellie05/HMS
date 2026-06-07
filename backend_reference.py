"""
37 Military Hospital Modernized Hospital Management System (HMS)
Lead Architect Backend Reference: Python FastAPI Edition
SATS Triage Queue Prioritizer & NHIS Copay Processing Engine
Accra, Ghana
"""

from enum import Enum
from typing import List, Optional
from uuid import UUID, uuid4
import datetime
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, Depends, status

app = FastAPI(
    title="37 Military Hospital HMS - Core Integration API",
    description="Buildathon Production-Ready Engine for SATS Triage & NHIS localized billing.",
    version="1.0.0"
)

# -------------------------------------------------------------
# 1. ENUMS & PYDANTIC SCHEMA SCHEMES
# -------------------------------------------------------------

class TriageCategory(str, Enum):
    RED = "RED"         # Immediate (Emergency Trauma / Resuscitation)
    ORANGE = "ORANGE"   # Very Urgent (Cardiovascular symptoms / Acute pain)
    YELLOW = "YELLOW"   # Urgent (Stable but requires urgent clinical attention)
    GREEN = "GREEN"     # Routine Outpatient (Civilian OPD or Routine Active-duty)
    BLUE = "BLUE"       # Non-urgent / Dead on arrival

class EncounterStatus(str, Enum):
    AWAITING_TRIAGE = "AWAITING_TRIAGE"
    AWAITING_CONSULTATION = "AWAITING_CONSULTATION"
    IN_CONSULTATION = "IN_CONSULTATION"
    AWAITING_PHARMACY = "AWAITING_PHARMACY"
    AWAITING_BILLING = "AWAITING_BILLING"
    ADMITTED = "ADMITTED"
    DISCHARGED = "DISCHARGED"

# Patient Record Inputs
class PatientBase(BaseModel):
    full_name: str = Field(..., example="Ekow Mensah-Annan")
    age: int = Field(..., ge=0, le=125)
    gender: str = Field(..., regex="^(M|F|Other)$")
    is_military: bool = Field(default=False)
    military_rank: Optional[str] = Field(None, description="E.g., Captain, Warrant Officer (GAF)")
    service_number: Optional[str] = Field(None, description="Armed Services Force ID number")
    nhis_number: Optional[str] = Field(None, description="Ghana National Health Insurance Card No.")
    phone_number: str = Field(..., example="+233244123456")

class PatientCreate(PatientBase):
    pass

class PatientResponse(PatientBase):
    id: UUID
    patient_number: str
    created_at: datetime.datetime

# Triage & Encounter Inputs (SATS-Compliant)
class TriageIntake(BaseModel):
    patient_id: UUID
    chief_complaint: str
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    heart_rate: Optional[int] = None
    temperature: Optional[float] = None
    resp_rate: Optional[int] = None
    oxygen_sat: Optional[float] = None
    mobility: str = Field("Walking", regex="^(Walking|With Help|Stretcher/Immobile)$")
    pain_score: int = Field(0, ge=0, le=10)

class EncounterResponse(BaseModel):
    id: UUID
    patient_id: UUID
    triage_color: TriageCategory
    sats_score: int
    chief_complaint: str
    status: EncounterStatus
    created_at: datetime.datetime

# NHIS Bill Item Inputs
class BillItemCreate(BaseModel):
    description: str
    quantity: int = Field(1, gt=0)
    unit_price: float = Field(0.0, ge=0.0) # Cost in GHS
    is_nhis_covered: bool = True
    nhis_co_pay_percentage: int = Field(10, description="NHIS Default 10% Patient Co-Pay if covered")

class InvoiceCreate(BaseModel):
    encounter_id: UUID
    patient_id: UUID
    items: List[BillItemCreate]

class BillingItemResponse(BaseModel):
    description: str
    quantity: int
    unit_price: float
    is_nhis_covered: bool
    nhis_co_pay_percentage: int
    nhis_payout: float
    patient_net_copay: float

class InvoiceResponse(BaseModel):
    id: UUID
    patient_id: UUID
    encounter_id: UUID
    items: List[BillingItemResponse]
    nhis_covered_total: float
    patient_payable_total: float
    status: str
    created_at: datetime.datetime

# -------------------------------------------------------------
# 2. SAT SCALE TRIAGE POINT ALGORITHM ENGINE
# Calculates the South African Triage Scale (SATS) score from vitals
# -------------------------------------------------------------

def calculate_sats_score(vitals: TriageIntake) -> int:
    """
    SATS (South African Triage Scale) points algorithm.
    SATS uses physiological parameters to generate a composite score:
    Heart Rate, Systolic BP, Temperature, Respiration, Oxygen Saturation,
    Pain Score, and Mobility to classify triage color coding.
    """
    pts = 0

    # 1. Mobility Point Scoring
    if vitals.mobility == "With Help":
        pts += 1
    elif vitals.mobility == "Stretcher/Immobile":
        pts += 2

    # 2. Respiration Rate Point Scoring
    if vitals.resp_rate:
        rr = vitals.resp_rate
        if rr < 9 or rr > 30:
            pts += 3
        elif (9 <= rr <= 14) or (21 <= rr <= 30):
            pts += 1

    # 3. Systolic Blood Pressure Point Scoring
    if vitals.systolic_bp:
        sbp = vitals.systolic_bp
        if sbp < 71 or sbp > 220:
            pts += 3
        elif 71 <= sbp <= 80:
            pts += 2
        elif (81 <= sbp <= 100) or (160 <= sbp <= 220):
            pts += 1

    # 4. Heart Rate Point Scoring
    if vitals.heart_rate:
        hr = vitals.heart_rate
        if hr < 40 or hr > 130:
            pts += 3
        elif hr >= 110 and hr <= 129:
            pts += 2
        elif (40 <= hr <= 50) or (101 <= hr <= 109):
            pts += 1

    # 5. Temperature Point Scoring
    if vitals.temperature:
        temp = vitals.temperature
        if temp < 35.0 or temp > 38.5:
            pts += 2
        elif (35.0 <= temp <= 35.9) or (37.5 <= temp <= 38.4):
            pts += 1

    # 6. Oxygen Saturation (Pulmonary hypoxia factor)
    if vitals.oxygen_sat:
        sp = vitals.oxygen_sat
        if sp < 90:
            pts += 3
        elif sp >= 90 and sp < 94:
            pts += 2
        elif sp >= 94 and sp < 96:
            pts += 1

    # 7. Additional Pain Severity Index Offset
    if vitals.pain_score >= 8:
        pts += 1

    return pts

def determine_triage_color(pts: int, is_emergency_trauma: bool, is_active_military: bool) -> TriageCategory:
    """
    Maps the computed SATS points to triage priority flags.
    Overrides are configured here for military trauma or high-velocity cases at 37 Military.
    """
    # Active Military Priority bypass - 37 Military Hospital logistics override
    if is_active_military and pts >= 3:
        # Boost priority level to clear active military personnel quickly back to duty or specialized ward
        pts += 2

    if is_emergency_trauma or pts >= 7:
        return TriageCategory.RED       -- Immediate Resuscitation
    elif 5 <= pts <= 6:
        return TriageCategory.ORANGE    -- Very Urgent (10 minutes)
    elif 3 <= pts <= 4:
        return TriageCategory.YELLOW    -- Urgent (60 minutes)
    elif pts >= 1:
        return TriageCategory.GREEN     -- OPD / Standard Civilian Outpatient
    else:
        return TriageCategory.BLUE      -- Non-urgent

# -------------------------------------------------------------
# 3. LOCAL DATABASES MOCKS (In-Memory for execution demonstration)
# -------------------------------------------------------------
PATIENTS_DB = {}
ENCOUNTERS_DB = {}
INVOICES_DB = {}

# -------------------------------------------------------------
# 4. API ROUTE ENDPOINTS
# -------------------------------------------------------------

@app.post("/patients", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def triage_register_patient(patient_in: PatientCreate):
    """
    Registers a new patient inside the 37 Military Hospital system ledger.
    Assigns a unique physical file catalog number prefix '37MH-' with sequential identifier.
    """
    p_id = uuid4()
    # Mock Ghana ID serial code
    serial = f"37MH-{datetime.datetime.now().year}-{len(PATIENTS_DB) + 1045}"
    
    patient_record = PatientResponse(
        id=p_id,
        patient_number=serial,
        created_at=datetime.datetime.now(),
        **patient_in.dict()
    )
    PATIENTS_DB[p_id] = patient_record
    return patient_record


@app.post("/encounters", response_model=EncounterResponse, status_code=status.HTTP_201_CREATED)
def intake_triage_encounter(intake: TriageIntake):
    """
    Inputs triage measurements, assesses SATS score points, determines triage routing 
    and appends patient to the prioritized military ward dashboard queue.
    """
    p_id = intake.patient_id
    if p_id not in PATIENTS_DB:
         raise HTTPException(status_code=404, detail="Patient file record not found in system")
    
    patient = PATIENTS_DB[p_id]
    
    # Run structural diagnostics
    sats_score = calculate_sats_score(intake)
    
    # Trauma bypass if BP is dangerously low or pain score is absolute max
    is_trauma = False
    if intake.pain_score == 10 or (intake.systolic_bp and intake.systolic_bp < 80):
        is_trauma = True

    color = determine_triage_color(sats_score, is_emergency_trauma=is_trauma, is_active_military=patient.is_military)
    
    encounter_id = uuid4()
    encounter_record = EncounterResponse(
        id=encounter_id,
        patient_id=p_id,
        triage_color=color,
        sats_score=sats_score,
        chief_complaint=intake.chief_complaint,
        status=EncounterStatus.AWAITING_CONSULTATION,
        created_at=datetime.datetime.now()
    )
    ENCOUNTERS_DB[encounter_id] = encounter_record
    return encounter_record


@app.post("/billing/process", response_model=InvoiceResponse)
def nhis_calculate_invoice(billing_in: InvoiceCreate):
    """
    National Health Insurance Scheme (NHIS) localized Billing Engine.
    Examines each fee structure, checks if NHIS covers the treatment item under the standard
    medicines/reimbursement list, computes the 10% co-pay percentage where applicable, 
    and handles cash or GHS Mobile Money invoice summaries.
    """
    invoice_id = uuid4()
    computed_items = []
    
    nhis_claimable_sum = 0.0
    patient_payable_sum = 0.0
    
    for item in billing_in.items:
        qty = item.quantity
        gross_cost = qty * item.unit_price
        
        if item.is_nhis_covered:
            # Under Ghana National Health Insurance Authority Guidelines:
            # Patients with active NHIS cards are only responsible for a regulated co-payment percent
            factor = item.nhis_co_pay_percentage / 100.0
            p_copay = round(gross_cost * factor, 2)
            claim = round(gross_cost * (1.0 - factor), 2)
        else:
            # Item is out-of-pocket (e.g. specialized imported biologics, non-formulary medications)
            p_copay = gross_cost
            claim = 0.0
            
        nhis_claimable_sum += claim
        patient_payable_sum += p_copay
        
        computed_items.append(
            BillingItemResponse(
                description=item.description,
                quantity=qty,
                unit_price=item.unit_price,
                is_nhis_covered=item.is_nhis_covered,
                nhis_co_pay_percentage=item.nhis_co_pay_percentage if item.is_nhis_covered else 0,
                nhis_payout=claim,
                patient_net_copay=p_copay
            )
        )
        
    invoice = InvoiceResponse(
        id=invoice_id,
        patient_id=billing_in.patient_id,
        encounter_id=billing_in.encounter_id,
        items=computed_items,
        nhis_covered_total=round(nhis_claimable_sum, 2),
        patient_payable_total=round(patient_payable_sum, 2),
        status="Unpaid",
        created_at=datetime.datetime.now()
    )
    INVOICES_DB[invoice_id] = invoice
    return invoice

@app.get("/triage/queue", response_model=List[EncounterResponse])
def get_prioritized_triage_queue():
    """
    Returns the real-time Triage dashboard queue sorted strictly by clinical risk.
    RED (Emergency) patients are immediately bubbled to top, followed by ORANGE,
    YELLOW, and GREEN. Ties in the same category prioritize military service files.
    """
    color_priority = {
        TriageCategory.RED: 1,
        TriageCategory.ORANGE: 2,
        TriageCategory.YELLOW: 3,
        TriageCategory.GREEN: 4,
        TriageCategory.BLUE: 5
    }
    
    encounters = list(ENCOUNTERS_DB.values())
    
    # Sort key computes: primary triage priority score, secondary GAF military identification, tertiary timestamp
    def sort_logic(x: EncounterResponse):
        color_val = color_priority.get(x.triage_color, 9)
        patient_info = PATIENTS_DB.get(x.patient_id)
        military_priority = 0 if (patient_info and patient_info.is_military) else 1
        return (color_val, military_priority, x.created_at)
        
    sorted_queue = sorted(encounters, key=sort_logic)
    return sorted_queue
