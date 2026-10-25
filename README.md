# MedLens — Explainable Medical Report Analyzer
**Healthcare & MedTech Hackathon Track Prototype**

> ⚠️ **Educational Prototype Disclaimer**: MedLens is an educational demonstration prototype. Numeric classifications and combination alerts are evaluated deterministically to assist review. Findings require professional medical interpretation and are not intended for clinical diagnosis, treatment decisions, or emergency care.

---

## 📌 Executive Summary

MedLens is an intelligent, explainable medical laboratory report analyzer designed to empower patients and clinicians. It extracts diagnostic parameters from complex clinical documents (text PDFs, scanned printouts, PNG/JPEG images), parses measurements into structured JSON, provides a human-in-the-loop verification table, deterministically classifies values against printed or standard reference intervals, and highlights concerning multi-parameter combinations that may warrant clinical review.

---

## 🔬 Research Attribution & Fidelity

MedLens draws its architectural foundation from the **MEDGPT** research framework (*A Multimodal Medical Assistant for Patient Report Analysis and Explainable Insights*).

### Research Fidelity Statement:
- **Paper Approach**: MEDGPT describes using Optical Character Recognition (OCR), regular expression pattern matching, tabular text extraction, and deterministic rule-based analysis.
- **Published Limitations**: The research paper does **not** provide pre-trained model weights, open clinical training corpora, exact quantitative health-score formulas, critical threshold tables, or reproducible empirical performance benchmarks.
- **Prototype Extensions**: MedLens does **not** claim to reproduce an exact trained proprietary model or published accuracy percentage. Instead, the multi-parameter combination rule engine, critical emergency boundaries, unit normalization catalog, and prototype report indicator are explicitly labeled **prototype extensions**.

### Paper Features vs. Prototype Extensions

| Feature Dimension | MEDGPT Paper Specification | MedLens Prototype Implementation |
| :--- | :--- | :--- |
| **Document Ingestion** | OCR and text extraction for lab reports | Hybrid text-layer extraction + Tesseract.js OCR for scanned PDF pages & images |
| **Parameter Parsing** | Regex and keyword matching | Row-aware pattern matching with extensible alias dictionary and demographic filtering |
| **Unit Normalization** | Mentions parameter alignment | Explicit, tested parameter-specific conversions (e.g. mmol/L $\leftrightarrow$ mg/dL) with strict no-guess fallback |
| **Data Verification** | Discussed in clinical workflow | Interactive editable verification table recording human corrections without overwriting source evidence |
| **Numeric Classification** | Rule-based threshold comparison | Pure deterministic engine with precedence for report-printed intervals over configured defaults |
| **Critical Values** | General abnormal flagging | Separate explicit critical rules (e.g. Platelets < 20k/μL, Glucose < 50 or > 400 mg/dL) |
| **Concerning Combinations**| Suggested as future clinical reasoning | **Implemented Rule Engine** evaluating multi-analyte co-occurrences (e.g. Atherogenic dyslipidemia, bicytopenia, cardiorenal strain) |
| **Overall Score** | Mentions a general score without a formula | **Prototype Report Indicator** with transparent formula: `(Normal / Analyzed) * 100`, clearly disclaimed |
| **AI Explanation** | LLM-generated summaries | **Agent-Led Analysis**: Gemini orchestrating 5 deterministic verification tools with trace logging |
| **Persistence** | Database storage | Automatic dual-mode: in-memory session mode (zero credentials needed) + optional MongoDB |

---

## 🛠️ Unit Normalization Bug Fix & Clinical Verification

### The Verified Bug:
In previous versions, uploading `MedLens_Synthetic_Medical_Report.pdf` extracted 11 measurements correctly, but measurement values were converted to standard units (e.g. `/uL`) while their report-printed reference intervals remained in their original units (e.g. `10^3/uL`):
- **WBC**: `7.4 × 10^3/uL` was converted to `7400 /uL`, but its printed reference interval remained `4.0–11.0` in the comparison logic. `7400 > 11.0`, resulting in a false-positive **HIGH** classification and an unsupported leukocytosis inference.
- **Platelets**: `110 × 10^3/uL` was converted to `110000 /uL`, but its printed reference interval remained `150–450`. `110000 > 450`, resulting in an incorrect **HIGH** classification (thrombocytosis) instead of a true **LOW** classification (thrombocytopenia).
- **False Concerning Combination**: The false HIGH WBC paired with elevated fasting glucose triggered an erroneous `RULE-GLYCEMIC-INFECT-05` (Hyperglycemic Immune Reaction Indicator).

### The Fix Implemented:
1. **Coupled Interval & Value Normalization**: Reference interval bounds are converted **together** with measurement values (`convertReferenceInterval`), populating `normalizedMin`, `normalizedMax`, and `normalizedUnit`.
2. **Consistent Comparison Space**: Comparisons are evaluated strictly in an aligned unit space:
   - Either original observed value against original printed bounds: e.g. WBC `7.4` against `[4.0, 11.0]` (both in `10^3/uL`) $\rightarrow$ **WITHIN REFERENCE (NORMAL)**.
   - Or normalized observed value against normalized bounds: e.g. Platelets `110,000` against `[150,000, 450,000]` (both in `/uL`) $\rightarrow$ **LOW**.
3. **Unit Compatibility Guard**: Enforces `areUnitsCompatible`. If units are incompatible, the measurement is safely marked `needs_verification` and blocked from comparison.
4. **Critical Threshold Alignment**: Critical alert rules (e.g. Platelets < 20,000/μL) are evaluated strictly in normalized standard unit space.
5. **Accurate Synthetic Report Findings**:
   - **Out of Range (6)**: Hemoglobin (10.2 LOW), Platelets (110 LOW), Fasting Glucose (142 HIGH), Total Cholesterol (228 HIGH), LDL (145 HIGH), Triglycerides (210 HIGH).
   - **Normal (5)**: WBC (7.4 NORMAL), HDL (48 NORMAL), Creatinine (0.9 NORMAL), Systolic BP (118 NORMAL), Diastolic BP (76 NORMAL).
   - **Matched Combinations (2)**:
     - `RULE-METABOLIC-01`: Atherogenic Metabolic Co-Occurrence (High Glucose + High Triglycerides).
     - `RULE-HEMATO-03`: Dual Hematologic Suppression (Low Hemoglobin + Low Platelets).
   - **Not Matched**: `RULE-GLYCEMIC-INFECT-05` is correctly **NOT MATCHED** (no false glucose + WBC alert; no leukocytosis inference; no unsupported critical flags).

---

## 🤖 AI-Agent-Led Analysis Workflow

MedLens replaces rigid prompt-only generation with an **AI-Agent-Led Analysis Workflow** using Gemini (`gemini-3.8-flash` via `@google/genai`, configurable via `GEMINI_MODEL`) orchestrating 5 deterministic tools:

```
                  ┌─────────────────────────────────────────┐
                  │    Human-in-the-Loop Verified Report    │
                  └────────────────────┬────────────────────┘
                                       │ (Explicit Opt-In Consent)
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │      Gemini AI Clinical Agent Loop      │
                  │        (Max 10 Bounded Tool Steps)      │
                  └─┬──────┬──────────┬──────────┬────────┬─┘
                    │      │          │          │        │
  ┌─────────────────┘      │          │          │        └────────────────┐
  ▼                        ▼          ▼          ▼                         ▼
Tool 1:                  Tool 2:    Tool 3:    Tool 4:                   Tool 5:
get_verified_report      normalize  compare    get_reference_context    validate_analysis
                         _measure-  _with_     (Clinical thresholds     (Deterministic
                         ment       reference   & combination rules)     Ground-Truth Guard)
  │                        │          │          │                         │
  └────────────────────────┴──────────┼──────────┴─────────────────────────┘
                                      ▼
                  ┌─────────────────────────────────────────┐
                  │   Grounded Multi-Tool Execution Trace   │
                  │   • Patient-Friendly Narrative          │
                  │   • Clinician Discussion Questions      │
                  │   • Verified Findings Table             │
                  │   • Educational Co-Occurrence Alerts    │
                  └─────────────────────────────────────────┘
```

### The 5 Deterministic Agent Tools:
1. `get_verified_report`: Retrieves human-reviewed parameters, report metadata, and patient context. Rejects unauthorized access.
2. `normalize_measurement`: Converts values and reference bounds together into aligned unit spaces using parameter-specific scientific factors. Rejects incompatible conversions.
3. `compare_with_reference`: Evaluates inclusive interval bounds, respects precedence for printed lab intervals, and evaluates critical emergency thresholds.
4. `get_reference_context`: Retrieves standard adult reference ranges, critical threshold rules, and multi-analyte co-occurrence definitions.
5. `validate_analysis`: Deterministically verifies the agent's proposed classifications against tool outputs. Automatically rejects hallucinations or contradictions.

### Security, Safety, and Privacy Protections:
- **Explicit Consent Required**: Defaults to **OFF** (`hasConsent: false`). Medical parameters are never transmitted to external AI providers without user opt-in.
- **Bounded Tool Calling**: Hard limit of 10 orchestration steps and timeout safeguards to eliminate infinite loops.
- **Prompt Injection Defense**: Untrusted report text and user notes are wrapped in untrusted data containers and stripped of control sequences.
- **Hallucination Rejection**: Any classification proposed by the LLM that contradicts deterministic tool ground truth is rejected with a validation error.
- **Longitudinal History Idempotency**: Repeated analyses of the same report upsert by `reportId`, preventing duplicate visits in historical trend tracking.

---

## 🏛️ System Architecture & Algorithms

MedLens follows a clean, decoupled architecture:

```
[ Upload PDF / Image / Synthetic Sample ]
                   │
                   ▼
       [ Algorithm 1: Extraction ]
  ├── PDF Text Extraction (pdfjs-dist)
  └── Scanned Page OCR (Tesseract.js)
                   │
                   ▼
         [ Text Normalization ]
                   │
                   ▼
        [ Algorithm 2: Parsing ]
  ├── Extensible Alias Matching
  ├── Demographic & Date Isolation
  └── Parameter-Specific Unit Conversion
                   │
                   ▼
    [ Human Verification Table ] ◄── User Edits / Corrections
                   │
                   ▼
       [ Algorithm 3: Analysis ]
  ├── Reference Precedence (Printed > Configured)
  ├── Inclusive Boundary Evaluation
  └── Critical Threshold Rules
                   │
                   ▼
     [ Algorithm 4: Combinations ]
  ├── Multi-analyte Co-occurrence Rules
  └── Missing-Data Distinction (not_evaluable)
                   │
                   ▼
  [ Dashboard & Explainable Summary ]
  ├── Metric Cards & Range Visualizers
  ├── Longitudinal Trend Tracking (Recharts)
  └── Grounded Summary & Q&A Chat (Gemini / Rule Template)
```

### Algorithm 1: Document Extraction
- Accepts PDF, PNG, JPEG with configurable size (15MB) and page limits (15 pages).
- Employs a hybrid extraction strategy: pages with embedded text are extracted directly for 100% fidelity; scanned pages or images lacking selectable text are routed through `Tesseract.js` OCR.
- Preserves original text, line boundaries, page numbers, and OCR confidence metrics.

### Algorithm 2: Medical Parameter Parsing
- Extensible dictionary covering Hemoglobin, Fasting/Random Glucose, Total Cholesterol, LDL, HDL, Triglycerides, Platelets, Creatinine, WBC, and Blood Pressure (systolic/diastolic).
- Robust row-aware extraction filters out patient age (e.g. "Age: 45 Yrs"), dates ("2024-05-15"), and specimen IDs to avoid misidentifying metadata as results.
- Strict unit normalization: never guesses missing units or fasting contexts. If units are omitted in the report, flags `needs_verification` for safety.

### Algorithm 3: Deterministic Rule-Based Abnormality Engine
- Pure, independently testable functions without probabilistic LLM interference.
- **Reference Precedence**:
  1. Primary: Explicit reference interval printed on the patient's lab slip.
  2. Fallback: Configured standard adult reference interval matching analyte and unit.
  3. Indeterminate: Returns `unable_to_classify` if no matching interval exists.
- **Classifications**: `within_reference`, `low`, `high`, `critical`, `needs_verification`, `unable_to_classify`.
- Explicit boundary behavior: inclusive interval limits (`[min, max]`); one-sided limits (`< 200` or `> 40`); and comparator handling (`< 50` vs range bounds).

### Algorithm 4: Concerning Combinations (Hackathon Extension)
Evaluates co-occurring findings from the same specimen date across independent organ systems:
1. **Atherogenic Metabolic Co-Occurrence**: Co-occurring elevated Fasting Glucose AND elevated Triglycerides.
2. **Hypertensive Renal Strain**: Co-occurring elevated Creatinine AND elevated Systolic Blood Pressure.
3. **Dual Hematologic Suppression (Bicytopenia)**: Simultaneous low Hemoglobin AND low Platelets.
4. **Atherogenic Lipoprotein Discordance**: Elevated LDL paired with depressed HDL cholesterol.
5. **Hyperglycemic Immune Reaction**: Marked Glucose elevation alongside Leukocytosis (high WBC).
- Distinguishes **Matched**, **Not Matched**, and **Not Evaluable** (explicitly listing missing tests when data is incomplete).
- Strictly prevents cross-date alert contamination.

---

## 🧭 Cost-Aware Next-Step Guidance & Clinical Safety Navigation

MedLens incorporates an intelligent, evidence-grounded **Cost-Aware Next-Step Guidance Engine** (`server/src/services/guidance.ts` and `client/src/components/CostAwareGuidanceCard.tsx`) designed to help users avoid catastrophic or unnecessary out-of-pocket medical expenses while recognizing when clinical review or emergency attention is genuinely warranted.

### The Problem:
An isolated, mild lab deviation (e.g., total cholesterol 215 mg/dL or borderline fasting glucose 102 mg/dL) frequently triggers unnecessary patient anxiety, resulting in visits to emergency rooms or walk-in urgent cares where facility fees often exceed $1,500–$3,000. Conversely, true critical thresholds and acute red flags must never be delayed.

### The 4 Clinician-Sourced Care Tiers:

| Care Tier | Urgency Level | Clinical Criteria & Sourcing | Recommended Care Setting & Navigation |
| :--- | :--- | :--- | :--- |
| **1. Emergency Attention** | `immediate_emergency` | Verified critical laboratory alert thresholds (e.g., Platelets < 20,000/μL, Glucose < 50 or > 400 mg/dL) **OR** acute red-flag symptoms (chest pain, severe dyspnea, syncope, uncontrolled bleeding). Sourced from **College of American Pathologists (CAP)** & **ACEP Emergency Escalation Guidelines**. | **Hospital Emergency Department (ED)** or call emergency services. Explicitly notes EMTALA protections (emergency stabilization regardless of immediate ability to pay) and charity care programs. Seeking outpatient or lower-cost alternatives is unsafe during acute emergencies. |
| **2. Prompt Medical Review** | `prompt_days` (24–72 hours) | Concerning multi-analyte combination patterns (e.g. atherogenic metabolic co-occurrence, bicytopenia), $\ge 2$ abnormal findings, or persistent symptomatic lab changes. Sourced from **ADA Standards of Care, ACC/AHA Primary Prevention, & KDIGO Guidelines**. | **In-Network Primary Care Provider (PCP)**, Federally Qualified Community Health Centers (FQHCs with sliding-fee scale), or Virtual Telehealth Triage. Explicitly avoids unnecessary $1,500+ ER bills when no emergency symptoms are present. |
| **3. Routine Follow-Up** | `routine_scheduled` | Isolated, mild out-of-range deviations without acute symptoms or pre-existing chronic conditions. Sourced from **USPSTF Preventive Services & ACP Adult Health Maintenance Guidelines**. | **Scheduled Annual Wellness Exam** or periodic primary care check-up. Avoids unnecessary urgent care co-pays ($100–$250) or repeat testing fees. |
| **4. General Self-Care & Monitoring** | `monitoring_lifestyle` | All analyzed parameters within printed expected reference intervals and user reports asymptomatic. Sourced from **CDC Health Maintenance & AHA Lifestyle Guidelines**. | **Periodic Preventive Check-Ups**. No doctor visit expense required based on lab numbers alone. |

### Patient Clinical Context Intake & Insufficient Context Guard:
Before finalizing care recommendations, MedLens provides an interactive questionnaire asking about:
- **Current Symptoms**: Presence or absence of symptoms (including emergency red-flags and subacute symptoms).
- **Symptom Duration**: Hours, days, weeks/months, or none/asymptomatic.
- **Pre-Existing Conditions**: Diabetes, hypertension, kidney disease, heart disease, etc.
- **Current Prescribed Medications**: Insulin, anticoagulants, antihypertensives, etc.

> 🛡️ **Insufficient Context Safeguard**: If clinical context is missing or incomplete, MedLens explicitly declares `Context Completeness: Insufficient` and refuses to offer false reassurance solely based on normal or non-critical numbers.

### Core Epistemic Principles & Medical Safeguards:
1. **Reference Range Disclaimer**: *"Within the printed reference range" does NOT guarantee that a person is healthy or free of disease.* Many systemic illnesses do not reflect early in routine screening panels.
2. **Isolated Abnormal Finding Disclaimer**: *An isolated out-of-range result does NOT automatically establish a disease.* Transient biological fluctuations, hydration, diet, and stress affect lab markers.
3. **Self-Care Limitations**: General self-care (hydration, diet, sleep) is supportive health maintenance only and is **never** presented as treatment for an unconfirmed condition.
4. **Prohibition of Medication Alteration**: MedLens strictly **never** prescribes, diagnoses, suggests dosages, or advises stopping/altering medications.
5. **No "Wait Until Critical" Rule**: MedLens strictly **never** instructs users to delay care until their condition becomes critical.
6. **No Invented Services or Prices**: Navigation provides structured categories (PCP, FQHC sliding-scale clinics, public health departments, accredited telehealth) without fabricating local clinic names or commercial prices.

---

## 🚀 Quickstart & Setup

MedLens runs out of the box **without requiring database credentials or third-party AI API keys**.

### Prerequisites
- Node.js v18+ (tested on Node v24.21.0)
- npm v9+

### 1. Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/pdbmnm7sxy-svg/Apexpredator.git medlens
cd medlens
npm install
```

### 2. Environment Configuration (Optional)
MedLens includes default zero-setup settings and offline mock fallback for AI agent workflows. To customize:
```bash
cp .env.example .env
```
Key configuration parameters:
- `PORT=5001`: Backend server port.
- `GEMINI_API_KEY`: (Optional) Google Gemini API key. When present, enables live AI agent analysis using `@google/genai`. If omitted or offline, MedLens safely falls back to offline deterministic mock orchestration with identical verification tools.
- `GEMINI_MODEL=gemini-3.8-flash`: Configurable Gemini model name (defaults to `gemini-3.8-flash`).
- `MONGODB_URI`: (Optional) MongoDB connection string. If omitted, MedLens automatically runs in **Temporary Session Mode (In-Memory)** with clear UI feedback.

### 3. Run Development Server
Start both backend (Express on `:5001`) and frontend (Vite on `:5173`) concurrently:
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### 4. Run Automated Test Suite
Execute the comprehensive 44 automated unit, integration, and bug-fix tests:
```bash
npm run test
```

---

## 🧪 Automated Test Results

All 44 test cases across 7 test suites pass with 100% success:

```
 ✓ src/tests/costAwareGuidance.test.ts (10 tests)
   - Tier 1: Emergency attention on CAP critical thresholds (e.g. Platelets < 20k/uL)
   - Tier 1: Emergency attention on acute red-flag symptoms (chest pain, syncope, dyspnea)
   - Tier 2: Prompt medical review on concerning multi-analyte combinations (ADA, ACC/AHA)
   - Tier 2: Lower-cost alternatives (PCP, Telehealth, FQHC) avoiding unnecessary ER bills
   - Tier 2: Prompt review for multiple abnormal findings
   - Tier 3: Routine follow-up for isolated mild out-of-range deviations in asymptomatic users
   - Tier 4: Self-care and monitoring when all parameters within reference and asymptomatic
   - Epistemic Safeguards: Enforces reference range and isolated abnormal disclaimers
   - Safety Restrictions: Enforces medication non-alteration and no-wait-until-critical rules
   - Context Completeness: Flags insufficient context when symptoms or duration are missing

 ✓ src/tests/parser.test.ts (7 tests)
   - Tabular lab row extraction with aliases
   - Compound blood pressure parsing into systolic & diastolic
   - Demographic & date isolation (avoids age/year misidentifications)
   - Comparator handling ("< 50")
   - Parameter-specific unit conversions
   - Strict no-guess behavior on incompatible units
   - Two-sided and one-sided reference interval parsing

 ✓ src/tests/analyzer.test.ts (6 tests)
   - Inclusive reference interval boundaries
   - Low and high classifications in aligned unit space
   - Critical classification strictly on normalized thresholds
   - Precedence of report-printed intervals over defaults
   - Missing unit safety guard triggering needs_verification
   - Dynamic re-analysis following human verification

 ✓ src/tests/combinations.test.ts (5 tests)
   - Atherogenic metabolic co-occurrence match
   - Non-match when single analyte is normal
   - Missing-data handling with explicit missing test list
   - Multi-lineage bicytopenia match
   - Hypertensive renal strain match

 ✓ src/tests/syntheticReportBugFix.test.ts (4 tests)
   - Correctly extracts all 11 measurements from MedLens_Synthetic_Medical_Report.pdf
   - Verifies 6 out-of-range and 5 normal measurements (WBC is normal, Platelets is low)
   - Verifies matched combinations: Glucose+Triglycerides & Hemoglobin+Platelets
   - Asserts NO false Glucose+WBC alert and rejects incompatible units

 ✓ src/tests/aiAgent.test.ts (5 tests)
   - Orchestrates bounded deterministic tool calls with trace logging
   - Rejects hallucinated findings conflicting with deterministic tools
   - Blocks data transmission without explicit user consent
   - Resists prompt injection from untrusted document text
   - Upserts report findings without creating duplicate longitudinal visits

 ✓ src/tests/fixtures.test.ts (7 tests)
   - Fixture 1: Routine normal health panel
   - Fixture 2: Isolated impaired fasting glucose
   - Fixture 3: Metabolic combination risk
   - Fixture 4: Dual cytopenia suppression
   - Fixture 5: Incomplete lab slip with missing units
   - Fixture 6: Scanned thermal emergency lab OCR
   - Fixtures 7 & 8: Longitudinal trend tracking & report date separation

Test Files  7 passed (7)
Tests       44 passed (44)
Duration    2.93s
```

---

## ⏱️ 2-Minute Judge Demo Script

Follow this step-by-step walkthrough to experience the complete MedLens workflow:

1. **Launch the Application**:
   - Open `http://localhost:5173`. Note the **Temporary Session Mode** and **Deterministic Rule Engine Active** pills in the header.
2. **Load Synthetic Sample 3 (Metabolic Risk)**:
   - Click **"Try Sample Report"** in the top navigation bar.
   - Select **"3. Cardiometabolic Risk Panel (Glucose + Triglycerides Alert)"**.
   - Watch the 5-step processing visualizer complete.
3. **Inspect the Summary & Concerning Combination Alert**:
   - Notice the prominent **"Atherogenic Metabolic Co-Occurrence Alert"** card with **HIGH Review Priority**.
   - Note the contributing analytes: Fasting Glucose (158 mg/dL) and Triglycerides (285 mg/dL).
   - Read the plain-language clinical rationale.
4. **Inspect Findings & "Why was this flagged?" Evidence**:
   - Scroll down to the Findings Table. Notice the status badges (Normal, High, Critical).
   - Click **"Why?"** next to Fasting Glucose to expand the rule explanation, clinical discussion prompt, and the exact supporting document snippet.
5. **Demonstrate Human-in-the-Loop Re-Analysis**:
   - In the **Verification Table**, locate **Triglycerides** (currently 285 mg/dL).
   - Click the **Edit (pencil)** icon and change the value from `285` to `120` (a normal level).
   - Click **"Save"**, then click **"Re-Run Rule Engine"**.
   - Observe how the combination alert immediately updates from **Matched** to **Conditions Not Met**, demonstrating true dynamic deterministic re-evaluation!
6. **Inspect Scanned OCR & Longitudinal Trends**:
   - Click **"Try Sample Report"** and select **"6. Scanned Thermal Printout (OCR Simulation)"** to verify OCR noise handling.
   - Click **"Load 2-Visit Follow-Up Sample"** in the Trend Tracking section to see the Recharts longitudinal line chart comparing baseline vs. 3-month follow-up with shaded normal reference bands.
7. **Ask the Grounded Assistant**:
   - Click on the question: *"Why is my blood glucose flagged?"* in the Grounded Q&A section to view an explanation grounded strictly in verified findings.

---

## 📦 Directory Structure

```
Apexpredator/
├── client/                     # Vite + React + TypeScript + Tailwind CSS Frontend
│   ├── src/
│   │   ├── api/                # API client functions
│   │   ├── components/         # Modular clinical UI components
│   │   │   ├── Header.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   ├── ProcessingProgress.tsx
│   │   │   ├── VerificationTable.tsx
│   │   │   ├── SummaryMetrics.tsx
│   │   │   ├── CombinationAlerts.tsx
│   │   │   ├── FindingsTable.tsx
│   │   │   ├── TrendChart.tsx
│   │   │   ├── GroundedSummaryChat.tsx
│   │   │   ├── DocumentPreviewModal.tsx
│   │   │   └── SampleSelector.tsx
│   │   ├── types/              # Client TypeScript interfaces
│   │   ├── App.tsx             # Main dashboard workflow
│   │   ├── main.tsx            # React DOM root
│   │   └── index.css           # Clinical design system & Tailwind styling
│   └── package.json
│
├── server/                     # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/             # Reference intervals & combination rules
│   │   │   ├── referenceRanges.ts
│   │   │   └── combinationRules.ts
│   │   ├── fixtures/           # 8 Synthetic clinical test fixtures
│   │   │   └── syntheticSamples.ts
│   │   ├── routes/             # REST API routes
│   │   │   └── api.ts
│   │   ├── services/           # Core clinical algorithms
│   │   │   ├── extractor.ts    # Algorithm 1: PDF & Image OCR extraction
│   │   │   ├── parser.ts       # Algorithm 2: Row & alias medical parser
│   │   │   ├── analyzer.ts     # Algorithm 3: Pure deterministic rule engine
│   │   │   ├── combinations.ts # Algorithm 4: Concerning combinations engine
│   │   │   ├── store.ts        # Storage (In-Memory session + MongoDB)
│   │   │   └── llm.ts          # Grounded AI summary & Q&A
│   │   ├── tests/              # Vitest test suite
│   │   ├── app.ts              # Express application setup
│   │   └── index.ts            # Server entrypoint
│   └── package.json
│
├── sample_reports/             # Text format test reports for manual upload
├── .env.example                # Environment configuration template
├── package.json                # Monorepo orchestration scripts
└── README.md                   # Full documentation & demo guide
```

---

## ⚖️ Implemented Features vs. Deferred Scope

### ✅ Implemented Core Features:
- Complete MERN stack with TypeScript across frontend, backend, and tests.
- PDF embedded text parsing and Tesseract.js image/scanned page OCR.
- Row-aware regex medical parameter extraction for all 10 core lab markers.
- Parameter-specific explicit unit normalization.
- Human-in-the-loop editable verification table with instant re-analysis.
- Deterministic reference interval analysis preferring printed lab ranges.
- Separate explicit critical threshold rules.
- Multi-analyte concerning combination rule engine (5 clinical rules).
- Longitudinal trend chart using Recharts with reference bands.
- Server-side explainable summary and interactive grounded chat.
- Zero-setup in-memory session mode with explicit UI labeling.
- 8 pre-loaded synthetic clinical fixtures and manual sample files.
- 25 automated unit tests with 100% pass rate.

### ⏸️ Deferred Stretch Scope (Out of 3-Hour Hackathon Window):
- Persistent multi-tenant user accounts with JWT authentication (kept optional as instructed to protect build priority).
- Cloud Kubernetes/Docker deployment scripts.

---

*MedLens — Built for the Healthcare & MedTech Hackathon Track and to benefit mankind.*


## Render deployment

Deploy `render.yaml` as a Blueprint, or create a **Node Web Service** with the repository root left blank. Build command: `npm ci --include=dev && npm run build`. Start command: `npm run start --workspace=server`. Health check: `/api/status`. Set `NODE_ENV=production`. The backend serves the built frontend and `/api` from the same public URL. This is not a static-site-only deployment.

Add `GEMINI_API_KEY` only through Render environment variables; never commit its value. Optionally set `GEMINI_MODEL`. Without a key, basic reference comparisons remain available but live agent analysis does not. Existing Gemini quota limits may still prevent agent responses.

This hackathon prototype is for synthetic reports only. Its report history is currently shared server memory, not an authenticated private patient record system. Do not upload real patient data to a public demo. Do not configure a real patient database for this deployment.
