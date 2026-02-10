# Risk Assessment Forms - Country-Specific Specification

## Overview

This document defines the exact form structures for risk assessments in each supported country. Each form type has specific sections, fields, and output requirements that must be consistent across:
1. **Consumer App** - Form filling interface
2. **Dashboard** - Submission viewing/management
3. **PDF Export** - Official format output with **company logo and name**

---

## PDF Branding Requirements

All exported PDFs must:
- Display **company logo** at top left (if available)
- Display **company name** prominently in header (NOT "Harmoniq Safety")
- Show form title and regulatory reference
- Include page numbers and generation date in footer

---

## 🇺🇸 UNITED STATES (OSHA)

### Form Type 1: Job Hazard Analysis (JHA)

**Regulation**: OSHA 29 CFR 1910, OSHA Publication 3071
**Purpose**: Step-by-step hazard identification and control for specific tasks
**When to use**: Before starting new or modified tasks, after incidents, periodic reviews
**Language**: English

#### Sections & Fields:

**Section 1: Administrative Information**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Task/Operation Name | Text | Yes | Specific job or task being analyzed |
| Location | Location picker | Yes | Where the task occurs |
| Department | Dropdown | Yes | Department performing the task |
| Job Title(s) | Text | Yes | Worker titles involved |
| Date Prepared | Date | Yes | Analysis date |
| Prepared By | Auto (current user) | Yes | Analyst name |
| Supervisor | User picker | Yes | Responsible supervisor |

**Section 2: Job Steps & Hazard Analysis** (Repeating section - add multiple)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Step Number | Auto-increment | Yes | Sequential step number |
| Step Description | Textarea | Yes | What action is performed (start with action verb) |
| Potential Hazards | Multi-select + text | Yes | Hazard types: Struck-by, Fall, Caught-in, Electrical, Chemical, Ergonomic, Other |
| Hazard Description | Textarea | No | Detailed description of hazard |
| Severity (S) | Scale 1-5 | Yes | 1=Minor, 5=Catastrophic |
| Probability (P) | Scale 1-5 | Yes | 1=Rare, 5=Almost certain |
| Risk Score | Calculated | Yes | S × P (auto-calculated) |
| Existing Controls | Textarea | No | Controls already in place |
| Recommended Controls | Textarea | Yes | Following hierarchy: Elimination > Substitution > Engineering > Administrative > PPE |

**Section 3: PPE Requirements**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| PPE Checklist | Checkbox list | Yes | Hard Hat, Safety Glasses, Face Shield, Hearing Protection, Gloves, Steel-toe Boots, High-vis Vest, Respirator, Fall Protection, Chemical Suit |
| Other PPE | Text | No | Additional PPE not in list |

**Section 4: Training Requirements**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Required Training | Multi-select | No | List of required training courses |
| Special Precautions | Textarea | No | Additional safety notes |

**Section 5: Approval & Sign-off**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Prepared By Signature | Signature | Yes | Analyst signature |
| Date | Date | Yes | Sign date |
| Reviewed By | User picker | Yes | Supervisor/manager |
| Reviewer Signature | Signature | Yes | Reviewer signature |
| Review Date | Date | Yes | Review date |
| Employee Acknowledgment | Multi-signature | No | Workers who reviewed the JHA |

---

### Form Type 2: Job Safety Analysis (JSA)

**Regulation**: OSHA general duty clause, industry best practice
**Purpose**: Quick task-based safety analysis (simpler than JHA)
**When to use**: Daily/shift pre-work safety review, simpler tasks
**Language**: English

#### Key Differences from JHA:
- **Simpler structure** - No risk scoring matrix required
- **Focus on immediate controls** - What PPE and precautions for today
- **Crew-based** - Often completed by work crew together
- **Shorter form** - Typically single page

#### Sections & Fields:

**Section 1: Job Information**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Job/Task Name | Text | Yes | Task being performed today |
| Location | Location picker | Yes | Work location |
| Date | Date | Yes | Work date |
| Crew Members | Multi-user picker | Yes | Who is doing the work |
| Supervisor | User picker | Yes | Responsible supervisor |

**Section 2: Hazard Identification** (Checklist format)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Struck-by hazards present? | Yes/No | Yes | Moving objects, falling materials |
| Fall hazards present? | Yes/No | Yes | Heights, slips, trips |
| Caught-in/between hazards? | Yes/No | Yes | Moving machinery, pinch points |
| Electrical hazards present? | Yes/No | Yes | Exposed wiring, high voltage |
| Chemical hazards present? | Yes/No | Yes | Fumes, spills, exposure |
| Ergonomic hazards present? | Yes/No | Yes | Lifting, repetitive motion |
| Environmental hazards? | Yes/No | Yes | Heat, cold, weather |
| Other hazards | Textarea | No | Additional identified hazards |

**Section 3: Controls & PPE**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Control measures | Textarea | Yes | How hazards will be controlled |
| PPE Required | Checkbox list | Yes | Required PPE for this job |

**Section 4: Crew Sign-off**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| All hazards discussed | Checkbox | Yes | Confirm crew briefing |
| Crew signatures | Multi-signature | Yes | All crew members sign |

---

## 🇳🇱 NETHERLANDS (Arbowet)

### Form Type 1: RI&E (Risico-Inventarisatie en -Evaluatie)

**Regulation**: Arbowet Article 5
**Purpose**: Comprehensive risk inventory and evaluation for the organization
**When to use**: Initial assessment, annual review, after significant changes
**Note**: External review required for companies >25 employees
**Language**: Nederlands (Dutch)

#### Sections & Fields:

**Section 1: Bedrijfsgegevens (Company Information)**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Bedrijfsnaam | Text | Yes | Company name |
| KvK-nummer | Text | Yes | Chamber of Commerce number |
| Vestigingsadres | Text | Yes | Location address |
| Sector | Dropdown | Yes | Industry sector |
| Aantal werknemers | Number | Yes | Number of employees |
| Datum beoordeling | Date | Yes | Assessment date |
| Beoordelaar | Auto (current user) | Yes | Assessor name |
| Preventiemedewerker | User picker | Yes | Prevention officer |

**Section 2: Risico-identificatie per Categorie** (For each category below)

**2a. Fysieke Risico's (Physical Risks)**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Aanwezig? | Yes/No/N.A. | Yes | Is this risk present? |
| Machines en arbeidsmiddelen | Checklist | If yes | Machinery hazards |
| Geluid | Checklist | If yes | Noise exposure |
| Trillingen | Checklist | If yes | Vibration exposure |
| Klimaat | Checklist | If yes | Temperature, ventilation |
| Fysieke belasting | Checklist | If yes | Physical workload |
| Gevaarlijke stoffen | Checklist | If yes | Hazardous substances |
| Beschrijving risico | Textarea | If yes | Detailed risk description |

**2b. Psychosociale Risico's (Psychosocial Risks)**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Werkdruk | Scale 1-5 | Yes | Work pressure level |
| Agressie en geweld | Yes/No | Yes | Aggression/violence risk |
| Seksuele intimidatie | Yes/No | Yes | Sexual harassment risk |
| Pesten | Yes/No | Yes | Bullying risk |
| Discriminatie | Yes/No | Yes | Discrimination risk |
| Beschrijving | Textarea | If any yes | Details |

**2c. Biologische Risico's**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Aanwezig? | Yes/No/N.A. | Yes | Is this risk present? |
| Type | Multi-select | If yes | Viruses, Bacteria, Parasites, Other |
| Beschrijving | Textarea | If yes | Details |

**2d. Ergonomische Risico's**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Beeldschermwerk | Yes/No | Yes | Screen work risks |
| Tillen en dragen | Yes/No | Yes | Lifting/carrying risks |
| Repeterende bewegingen | Yes/No | Yes | Repetitive motion |
| Werkhouding | Yes/No | Yes | Work posture issues |
| Beschrijving | Textarea | If any yes | Details |

**Section 3: Risico-evaluatie (Risk Evaluation)**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Per identified risk: | | | |
| Ernst (Severity) | Scale 1-3 | Yes | 1=Minor, 3=Serious |
| Waarschijnlijkheid (Probability) | Scale 1-3 | Yes | 1=Rare, 3=Likely |
| Blootstelling (Exposure) | Scale 1-3 | Yes | 1=Yearly, 3=Daily |
| Risicoscore | Calculated | Yes | E × W × B (1-27) |
| Prioriteit | Calculated | Yes | High(18-27)/Medium(9-17)/Low(1-8) |

**Section 4: Plan van Aanpak (Action Plan)**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Per identified risk: | | | |
| Huidige maatregelen | Textarea | Yes | Current control measures |
| Aanvullende maatregelen | Textarea | Yes | Additional measures needed |
| Verantwoordelijke | User picker | Yes | Responsible person |
| Deadline | Date | Yes | Target completion date |
| Status | Dropdown | Yes | Niet gestart, In behandeling, Afgerond |
| Kosten (estimated) | Currency | No | Estimated cost |

**Section 5: Ondertekening (Signatures)**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Beoordelaar handtekening | Signature | Yes | Assessor signature |
| Datum | Date | Yes | Date |
| Directie/OR goedkeuring | Signature | Yes | Management/Works council approval |
| Externe toetsing | Checkbox + text | If >25 emp | External review certification |
| Volgende evaluatiedatum | Date | Yes | Next review date |

---

### Form Type 2: Arbowet Compliance Check

**Regulation**: Arbowet Articles 3, 5, 8, 13, 14
**Purpose**: Quick compliance verification checklist
**When to use**: Periodic compliance audit, pre-inspection preparation
**Language**: Nederlands (Dutch)

#### Sections & Fields:

**Section 1: Algemene Gegevens**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Bedrijfsnaam | Text | Yes | Company name |
| Locatie | Text | Yes | Location |
| Datum controle | Date | Yes | Check date |
| Controleur | Auto (current user) | Yes | Checker name |

**Section 2: Artikel 3 - Arbobeleid (Policy)**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Arbobeleid aanwezig? | Yes/No | Yes | Is there a safety policy? |
| Beleid is gedocumenteerd | Yes/No | Yes | Is it documented? |
| Beleid is gecommuniceerd | Yes/No | Yes | Is it communicated to staff? |
| Opmerkingen | Textarea | No | Notes |

**Section 3: Artikel 5 - RI&E**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| RI&E is uitgevoerd | Yes/No | Yes | Has RI&E been done? |
| RI&E is actueel (<1 jaar) | Yes/No | Yes | Is it current? |
| Plan van Aanpak aanwezig | Yes/No | Yes | Is there an action plan? |
| PvA wordt gevolgd | Yes/No | Yes | Is action plan being followed? |
| Opmerkingen | Textarea | No | Notes |

**Section 4: Artikel 8 - Voorlichting**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Medewerkers geïnformeerd | Yes/No | Yes | Are employees informed? |
| Instructies gegeven | Yes/No | Yes | Are instructions provided? |
| Trainingen verzorgd | Yes/No | Yes | Is training provided? |
| Opmerkingen | Textarea | No | Notes |

**Section 5: Artikel 13 - BHV (Emergency Response)**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| BHV geregeld | Yes/No | Yes | Is emergency response organized? |
| Voldoende BHV'ers | Yes/No | Yes | Sufficient emergency responders? |
| BHV materiaal aanwezig | Yes/No | Yes | Equipment available? |
| Opmerkingen | Textarea | No | Notes |

**Section 6: Artikel 14 - Arbodienst**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Contract met arbodienst | Yes/No | Yes | Contract with occupational health service? |
| Bedrijfsarts toegankelijk | Yes/No | Yes | Company doctor accessible? |
| Basiscontract aanwezig | Yes/No | Yes | Basic contract in place? |
| Opmerkingen | Textarea | No | Notes |

**Section 7: Conclusie**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Algemene beoordeling | Dropdown | Yes | Compliant, Gedeeltelijk, Niet-compliant |
| Tekortkomingen | Textarea | If not compliant | List of gaps |
| Vereiste acties | Textarea | If not compliant | Required actions |
| Handtekening controleur | Signature | Yes | Checker signature |

---

## 🇸🇪 SWEDEN (Arbetsmiljöverket)

### Form Type 1: SAM Risk Assessment (Systematiskt Arbetsmiljöarbete)

**Regulation**: AFS 2023:1 (updated from AFS 2001:1)
**Purpose**: Systematic work environment risk assessment
**When to use**: Regular risk assessment, before changes, after incidents
**Note**: Documentation required for organizations ≥10 employees
**Language**: Svenska (Swedish)

#### Sections & Fields:

**Section 1: Grundinformation (Basic Information)**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Företag | Text | Yes | Company name |
| Arbetsplats | Text | Yes | Workplace |
| Avdelning | Text | Yes | Department |
| Datum | Date | Yes | Assessment date |
| Utförare | Auto (current user) | Yes | Assessor |
| Deltagare | Multi-user picker | Yes | Participants (employee involvement) |
| Skyddsombud | User picker | If applicable | Safety representative |

**Section 2: Riskidentifiering (Risk Identification)**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Arbetsmoment/Område | Text | Yes | Work task or area being assessed |
| Typ av risk | Multi-select | Yes | Fysisk, Kemisk, Ergonomisk, Organisatorisk, Social |
| Beskrivning av risken | Textarea | Yes | Detailed risk description |
| Vem påverkas? | Multi-select | Yes | Who is affected |
| Hur ofta uppstår risken? | Dropdown | Yes | Dagligen, Veckovis, Månadsvis, Årligen, Sällan |

**Section 3: Riskbedömning (Risk Evaluation)**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Allvarlighetsgrad (Severity) | Scale 1-4 | Yes | 1=Minimal, 4=Allvarlig |
| Sannolikhet (Probability) | Scale 1-4 | Yes | 1=Osannolikt, 4=Mycket troligt |
| Riskpoäng | Calculated | Yes | S × P (1-16) |
| Risknivå | Calculated | Yes | Låg (1-4), Medel (5-8), Hög (9-16) |

**Section 4: Åtgärder (Measures)**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Befintliga åtgärder | Textarea | Yes | Current control measures |
| Planerade åtgärder | Textarea | Yes | Planned additional measures |
| Ansvarig person | User picker | Yes | Responsible person |
| Deadline | Date | Yes | Target completion |
| Uppföljningsdatum | Date | Yes | Follow-up date |

**Section 5: Godkännande (Approval)**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Utförare signatur | Signature | Yes | Assessor signature |
| Datum | Date | Yes | Date |
| Arbetsgivare/Chef godkännande | Signature | Yes | Employer/Manager approval |
| Skyddsombud noterad | Checkbox | If applicable | Safety rep notified |
| Nästa granskning | Date | Yes | Next review date |

---

### Form Type 2: OSA Assessment (Organisatorisk och Social Arbetsmiljö)

**Regulation**: AFS 2015:4
**Purpose**: Organizational and social work environment assessment (psychosocial)
**When to use**: Annual OSA assessment, after organizational changes, on employee request
**Language**: Svenska (Swedish)

#### Sections & Fields:

**Section 1: Grundinformation**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Företag | Text | Yes | Company name |
| Arbetsplats/Avdelning | Text | Yes | Workplace/Department |
| Datum | Date | Yes | Assessment date |
| Utförare | Auto (current user) | Yes | Assessor |
| Antal medarbetare i gruppen | Number | Yes | Number of employees assessed |

**Section 2: Arbetsbelastning (Workload)**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Rimlig arbetsbelastning? | Scale 1-5 | Yes | 1=Alltför hög, 5=Väl balanserad |
| Krav och resurser i balans? | Scale 1-5 | Yes | Demands vs resources balance |
| Möjlighet att påverka arbetet? | Scale 1-5 | Yes | Ability to influence work |
| Tydliga arbetsuppgifter? | Scale 1-5 | Yes | Clear work tasks |
| Möjlighet till återhämtning? | Scale 1-5 | Yes | Recovery opportunity |
| Kommentarer | Textarea | No | Comments |

**Section 3: Arbetstid (Working Hours)**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Hälsosamma arbetstider? | Scale 1-5 | Yes | Healthy working hours |
| Oregelbundna arbetstider problem? | Ja/Nej | Yes | Irregular hours issues |
| Övertid förekommande? | Dropdown | Yes | Aldrig, Sällan, Ibland, Ofta, Alltid |
| Möjlighet att ta raster? | Scale 1-5 | Yes | Ability to take breaks |
| Kommentarer | Textarea | No | Comments |

**Section 4: Socialt Stöd (Social Support)**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Stöd från kollegor | Scale 1-5 | Yes | Support from colleagues |
| Stöd från chef | Scale 1-5 | Yes | Support from manager |
| Fungerar kommunikationen? | Scale 1-5 | Yes | Communication working |
| Positivt socialt klimat? | Scale 1-5 | Yes | Positive social climate |
| Kommentarer | Textarea | No | Comments |

**Section 5: Kränkande Särbehandling (Victimization)**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Förekommer kränkningar? | Ja/Nej | Yes | Does victimization occur? |
| Förekommer mobbning? | Ja/Nej | Yes | Does bullying occur? |
| Förekommer trakasserier? | Ja/Nej | Yes | Does harassment occur? |
| Förekommer diskriminering? | Ja/Nej | Yes | Does discrimination occur? |
| Finns rutiner för att hantera? | Ja/Nej | Yes | Are there handling procedures? |
| Beskrivning av problem | Textarea | If any yes | Description of issues |

**Section 6: Ledarskap (Leadership)**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Tydligt ledarskap? | Scale 1-5 | Yes | Clear leadership |
| Får feedback på arbetet? | Scale 1-5 | Yes | Receive work feedback |
| Chefer har rätt kunskap? | Scale 1-5 | Yes | Managers have right knowledge |
| Kommentarer | Textarea | No | Comments |

**Section 7: Sammanfattning och Åtgärder**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Övergripande bedömning | Dropdown | Yes | Bra, Acceptabelt, Behöver förbättras, Dåligt |
| Identifierade problem | Textarea | Yes | Identified issues summary |
| Prioriterade åtgärder | Textarea | Yes | Priority actions |
| Ansvarig | User picker | Yes | Responsible person |
| Deadline | Date | Yes | Target completion |
| Uppföljning | Date | Yes | Follow-up date |

**Section 8: Signering**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Utförare signatur | Signature | Yes | Assessor signature |
| Chef signatur | Signature | Yes | Manager signature |
| Skyddsombud signatur | Signature | If applicable | Safety rep signature |

---

## Risk Score Calculation

### US Forms (JHA/JSA)
**Formula**: Severity × Probability
**Scale**: 1-5 each = 1-25 total

| Score | Level | Color | Action |
|-------|-------|-------|--------|
| 1-5 | Low | Green | Monitor, address when practical |
| 6-11 | Medium | Yellow | Plan corrective action |
| 12-25 | High | Red | Immediate action required |

### NL Forms (RI&E)
**Formula**: Ernst × Waarschijnlijkheid × Blootstelling
**Scale**: 1-3 each = 1-27 total

| Score | Prioriteit | Kleur | Actie |
|-------|-----------|-------|-------|
| 1-8 | Laag | Groen | Monitoren |
| 9-17 | Gemiddeld | Oranje | Actieplan maken |
| 18-27 | Hoog | Rood | Directe actie vereist |

### SE Forms (SAM)
**Formula**: Allvarlighetsgrad × Sannolikhet
**Scale**: 1-4 each = 1-16 total

| Poäng | Risknivå | Färg | Åtgärd |
|-------|----------|------|--------|
| 1-4 | Låg | Grön | Bevaka |
| 5-8 | Medel | Gul | Planera åtgärder |
| 9-16 | Hög | Röd | Omedelbar åtgärd |

### SE Forms (OSA)
Uses Likert scale ratings (1-5) focused on organizational and social factors.
No numerical risk score - instead uses categorical assessment.

---

## Implementation Status

### Consumer App Forms ✅
- [x] US JHA form with all sections
- [x] US JSA form (simplified)
- [x] NL RI&E form with all categories
- [x] NL Arbowet compliance check
- [x] SE SAM risk assessment
- [x] SE OSA psychosocial assessment

### PDF Templates ✅
- [x] Company logo support added
- [x] Company name in header (not app name)
- [x] All 6 form types have PDF export
- [x] Risk score visualization
- [x] Regulatory badges per country

### Dashboard Views ✅
- [x] Template viewer showing form structure
- [x] Submission viewer with all responses
- [x] Risk score visualization
- [x] Proper submission-to-template mapping
