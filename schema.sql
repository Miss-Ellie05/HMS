-- ==========================================
-- 37 MILITARY HOSPITAL HMS - DATABASE SCHEMA
-- Target Database: PostgreSQL 14+
-- Modernized System Architecture and Records Ledger
-- Accra, Ghana
-- ==========================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PATIENTS REGISTER
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., '37MH-2026-6102'
    full_name VARCHAR(255) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('M', 'F', 'Other')),
    is_military BOOLEAN DEFAULT FALSE NOT NULL,
    military_rank VARCHAR(100), -- e.g., 'Captain', 'Warrant Officer'
    service_number VARCHAR(100), -- Service ID number for Ghana Armed Forces verification
    nhis_number VARCHAR(50), -- Ghana National Health Insurance Scheme ID
    phone_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexing for quick patient lookups
CREATE INDEX idx_patients_number ON patients(patient_number);
CREATE INDEX idx_patients_name ON patients(full_name);
CREATE INDEX idx_patients_military ON patients(is_military, service_number);

-- 2. TRIAGE & ENCOUNTERS (SATS-Compliant)
CREATE TYPE triage_color_enum AS ENUM ('RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE');
CREATE TYPE encounter_status_enum AS ENUM (
    'AWAITING_TRIAGE', 
    'AWAITING_CONSULTATION', 
    'IN_CONSULTATION', 
    'AWAITING_PHARMACY', 
    'AWAITING_BILLING', 
    'ADMITTED', 
    'DISCHARGED'
);

CREATE TABLE encounters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    triage_color triage_color_enum NOT NULL DEFAULT 'GREEN',
    sats_score INT NOT NULL DEFAULT 0, -- SATS Score calculator integer (0-10)
    systolic_bp DECIMAL(5,2),
    diastolic_bp DECIMAL(5,2),
    heart_rate INT,
    temperature DECIMAL(4,2),
    resp_rate INT,
    oxygen_sat DECIMAL(5,2),
    mobility VARCHAR(50) CHECK (mobility IN ('Walking', 'With Help', 'Stretcher/Immobile')),
    pain_score INT CHECK (pain_score BETWEEN 0 AND 10),
    chief_complaint TEXT NOT NULL,
    status encounter_status_enum NOT NULL DEFAULT 'AWAITING_CONSULTATION',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_encounters_status ON encounters(status);
CREATE INDEX idx_encounters_triage_color ON encounters(triage_color);
CREATE INDEX idx_encounters_patient ON encounters(patient_id);

-- 3. WARD & BED ALLOCATION MATRIX
CREATE TABLE wards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'Accident & Emergency', 'Intensive Care Unit (ICU)'
    total_beds INT NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE beds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
    bed_number VARCHAR(20) NOT NULL, -- e.g., 'ICU-B01', 'A&E-B12'
    is_occupied BOOLEAN DEFAULT FALSE NOT NULL,
    current_patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    has_oxygen_port BOOLEAN DEFAULT FALSE NOT NULL,
    equipment JSONB DEFAULT '[]'::jsonb NOT NULL, -- list of equipment, e.g. ["Ventilator", "Infusion Pump", "ECG Monitor"]
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_ward_bed UNIQUE (ward_id, bed_number)
);

CREATE INDEX idx_beds_occupancy ON beds(ward_id, is_occupied);
CREATE INDEX idx_beds_patient ON beds(current_patient_id);

-- 4. CLINICAL EHR AND RECORD LEDGER (Doctors Consultation/Prescriptions)
CREATE TABLE ehr_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID UNIQUE NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    symptoms TEXT NOT NULL,
    diagnosis_code VARCHAR(20) NOT NULL, -- ICD-10 Code
    diagnosis_description VARCHAR(255) NOT NULL,
    doctor_notes TEXT,
    lab_requests VARCHAR(100)[] DEFAULT '{}' NOT NULL, -- List of requests e.g. {'FBC', 'Widal test'}
    lab_results JSONB DEFAULT '[]'::jsonb NOT NULL, -- Result logs: [{"test": "FBC", "status": "Completed", "value": "Hb: 12.1"}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_ehr_patient ON ehr_records(patient_id);

CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ehr_record_id UUID NOT NULL REFERENCES ehr_records(id) ON DELETE CASCADE,
    medicine_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL, -- e.g., '500mg TDS'
    duration VARCHAR(50) NOT NULL, -- e.g., '5 Days'
    is_nhis_covered BOOLEAN DEFAULT TRUE NOT NULL,
    nhis_copay DECIMAL(10,2) DEFAULT 0.00 NOT NULL, -- co-pay amount in GHS payable by NHIS holders
    full_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 -- retail price in GHS if patient has no insurance
);

CREATE INDEX idx_prescriptions_record ON prescriptions(ehr_record_id);

-- 5. BILLING ENGINE & INVOICES (NHIS & Cash/MoMo Integration)
CREATE TYPE payment_method_enum AS ENUM ('Cash', 'MTN MoMo', 'Telecel Cash', 'Visa');
CREATE TYPE payment_status_enum AS ENUM ('Unpaid', 'Paid', 'Partially Paid');

CREATE TABLE billing_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    nhis_covered_total DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Amount claimed from Ghana NHIA
    patient_payable_total DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Total GHS net patient cost
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_method payment_method_enum,
    status payment_status_enum NOT NULL DEFAULT 'Unpaid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE billing_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES billing_invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_nhis_covered BOOLEAN DEFAULT TRUE NOT NULL,
    nhis_co_pay_percentage INT DEFAULT 10 NOT NULL, -- e.g. 10% co-payment under NHIS rules
    nhis_payout DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    patient_net_copay DECIMAL(10,2) DEFAULT 0.00 NOT NULL
);

CREATE INDEX idx_invoices_patient ON billing_invoices(patient_id);
CREATE INDEX idx_invoices_status ON billing_invoices(status);
CREATE INDEX idx_items_invoice ON billing_items(invoice_id);

-- Trigger to automate updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_encounters_updated_at BEFORE UPDATE ON encounters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_invoices_updated_at BEFORE UPDATE ON billing_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
