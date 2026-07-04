// Mock data for Personal Health & Prescription Tracker
const INITIAL_MOCK_DATA = {
  patient: {
    name: "Sarah Jenkins",
    dob: "1978-08-20",
    bloodGroup: "A+",
    allergies: "Sulfa Drugs",
    emergencyContact: "David Jenkins (Spouse) - +1 555-0199",
    phone: "+1 555-0144"
  },
  doctors: [
    {
      id: "doc-1",
      name: "Dr. Robert Chen",
      specialty: "Cardiologist",
      hospital: "Metro Cardiology Center",
      phone: "+1 555-0211",
      email: "r.chen@metrohealth.org"
    },
    {
      id: "doc-2",
      name: "Dr. Helen Vance",
      specialty: "Endocrinologist",
      hospital: "City Care Endocrinology",
      phone: "+1 555-0222",
      email: "h.vance@citycare.org"
    },
    {
      id: "doc-3",
      name: "Dr. Mark Davis",
      specialty: "General Practitioner",
      hospital: "Family Health Clinic",
      phone: "+1 555-0233",
      email: "m.davis@familyclinic.com"
    }
  ],
  prescriptions: [
    {
      id: "rx-1",
      medicineName: "Metformin 500mg",
      doctorId: "doc-2",
      dosage: "1 tablet after breakfast, 1 after dinner",
      instructions: "Take with food to avoid stomach upset.",
      scheduleType: "continuous", // continuous, fixed_period, interval
      startDate: "2026-01-10",
      endDate: "", // empty for continuous
      intervalValue: 1, // daily
      intervalUnit: "days",
      active: true
    },
    {
      id: "rx-2",
      medicineName: "Atorvastatin 10mg",
      doctorId: "doc-1",
      dosage: "1 tablet before sleeping",
      instructions: "Avoid eating grapefruit while on this medication.",
      scheduleType: "continuous",
      startDate: "2026-03-15",
      endDate: "",
      intervalValue: 1,
      intervalUnit: "days",
      active: true
    },
    {
      id: "rx-3",
      medicineName: "Amoxicillin 500mg",
      doctorId: "doc-3",
      dosage: "1 tablet 3 times a day",
      instructions: "Complete the full 7-day course.",
      scheduleType: "fixed_period",
      startDate: "2026-06-20",
      endDate: "2026-06-27",
      intervalValue: 1,
      intervalUnit: "days",
      active: true
    },
    {
      id: "rx-4",
      medicineName: "Vitamin D3 (Cholecalciferol) 40,000 IU",
      doctorId: "doc-2",
      dosage: "1 capsule with fatty meal",
      instructions: "Take once a week, preferably Sunday morning.",
      scheduleType: "interval",
      startDate: "2026-05-03",
      endDate: "2026-06-28", // 8 weeks course
      intervalValue: 7, // every 7 days
      intervalUnit: "days",
      active: true
    }
  ],
  tests: [
    {
      id: "test-1",
      name: "Fasting Blood Sugar (FBS)",
      doctorId: "doc-2",
      datePrescribed: "2026-06-24",
      datePerformed: "2026-06-25",
      status: "completed", // pending, completed
      resultValue: "6.2",
      resultUnit: "mmol/L",
      referenceRange: "4.0 - 5.6 mmol/L",
      notes: "Slightly elevated. Continue Metformin and maintain low-carb diet.",
      category: "Blood"
    },
    {
      id: "test-2",
      name: "HbA1c (Glycated Hemoglobin)",
      doctorId: "doc-2",
      datePrescribed: "2026-06-24",
      datePerformed: "2026-06-25",
      status: "completed",
      resultValue: "6.5",
      resultUnit: "%",
      referenceRange: "< 5.7% (Normal), 5.7% - 6.4% (Prediabetes)",
      notes: "Borderline diabetic range. Good control compared to last test.",
      category: "Blood"
    },
    {
      id: "test-3",
      name: "Serum Cholesterol",
      doctorId: "doc-1",
      datePrescribed: "2026-06-12",
      datePerformed: "2026-06-15",
      status: "completed",
      resultValue: "185",
      resultUnit: "mg/dL",
      referenceRange: "< 200 mg/dL",
      notes: "In normal range. Atorvastatin is working well.",
      category: "Blood"
    },
    {
      id: "test-4",
      name: "Echocardiogram",
      doctorId: "doc-1",
      datePrescribed: "2026-03-18",
      datePerformed: "2026-03-20",
      status: "completed",
      resultValue: "60",
      resultUnit: "% (EF)",
      referenceRange: "55% - 70% (LVEF)",
      notes: "Normal left ventricular systolic function. No heart chamber enlargement.",
      category: "Cardiology"
    },
    {
      id: "test-5",
      name: "Complete Blood Count (CBC)",
      doctorId: "doc-3",
      datePrescribed: "2026-06-20",
      datePerformed: "2026-06-20",
      status: "completed",
      resultValue: "12.1",
      resultUnit: "g/dL (Hemoglobin)",
      referenceRange: "12.0 - 15.5 g/dL",
      notes: "Normal range. No signs of anemia.",
      category: "Blood"
    },
    {
      id: "test-6",
      name: "Thyroid Stimulating Hormone (TSH)",
      doctorId: "doc-2",
      datePrescribed: "2026-06-24",
      datePerformed: "2026-06-25",
      status: "completed",
      resultValue: "2.8",
      resultUnit: "mIU/L",
      referenceRange: "0.4 - 4.0 mIU/L",
      notes: "Euthyroid state. Normal thyroid function.",
      category: "Blood"
    },
    {
      id: "test-7",
      name: "Fasting Blood Sugar (FBS)",
      doctorId: "doc-2",
      datePrescribed: "2026-05-18",
      datePerformed: "2026-05-20",
      status: "completed",
      resultValue: "6.8",
      resultUnit: "mmol/L",
      referenceRange: "4.0 - 5.6 mmol/L",
      notes: "High. Advised to adjust diet and maintain regular walks.",
      category: "Blood"
    },
    {
      id: "test-8",
      name: "Fasting Blood Sugar (FBS)",
      doctorId: "doc-2",
      datePrescribed: "2026-04-15",
      datePerformed: "2026-04-18",
      status: "completed",
      resultValue: "7.2",
      resultUnit: "mmol/L",
      referenceRange: "4.0 - 5.6 mmol/L",
      notes: "Significantly high. Amit Sen adjusted Metformin dosage.",
      category: "Blood"
    },
    {
      id: "test-9",
      name: "HbA1c (Glycated Hemoglobin)",
      doctorId: "doc-2",
      datePrescribed: "2026-03-10",
      datePerformed: "2026-03-12",
      status: "completed",
      resultValue: "6.8",
      resultUnit: "%",
      referenceRange: "< 5.7% (Normal)",
      notes: "Slightly elevated. Monitor closely.",
      category: "Blood"
    },
    {
      id: "test-10",
      name: "Kidney Function Test (Serum Creatinine)",
      doctorId: "doc-2",
      datePrescribed: "2026-06-24",
      datePerformed: "",
      status: "pending",
      resultValue: "",
      resultUnit: "mg/dL",
      referenceRange: "0.5 - 1.1 mg/dL",
      notes: "Scheduled for next week.",
      category: "Kidney"
    }
  ],
  history: [
    {
      id: "hist-1",
      condition: "Type 2 Diabetes Mellitus",
      diagnosedDate: "2022-10-15",
      status: "active", // active, resolved
      notes: "Diagnosed by Dr. Helen Vance. Controlled with Metformin 500mg and dietary lifestyle modifications.",
      doctorId: "doc-2"
    },
    {
      id: "hist-2",
      condition: "Mild Essential Hypertension",
      diagnosedDate: "2024-04-12",
      status: "active",
      notes: "Diagnosed by Dr. Robert Chen. Prescribed daily monitoring. Well-controlled.",
      doctorId: "doc-1"
    },
    {
      id: "hist-3",
      condition: "Acute Appendicitis - Appendectomy",
      diagnosedDate: "2015-08-22",
      status: "resolved",
      notes: "Surgical removal of the appendix at Family Health Clinic. Complete recovery with no complications.",
      doctorId: "doc-3"
    }
  ]
};

// Export to window if running in browser
if (typeof window !== "undefined") {
  window.INITIAL_MOCK_DATA = INITIAL_MOCK_DATA;
}
