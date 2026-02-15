// ============================================
// HARMONIQ SAFETY - TYPE DEFINITIONS
// ============================================

// Country and Language Types
export type Country = "NL" | "SE" | "US";
export type Language = "en" | "nl" | "sv";
export type Currency = "USD" | "EUR" | "SEK";

// User Roles
export type SuperAdminRole = "super_admin";
export type CompanyRole = "company_admin" | "manager" | "employee";
export type UserRole = SuperAdminRole | CompanyRole;

// Permission Types
export type Permission = 
  // Incident Management
  | "incidents.view_own"
  | "incidents.view_team"
  | "incidents.view_all"
  | "incidents.create"
  | "incidents.edit_own"
  | "incidents.edit_all"
  | "incidents.delete"
  | "incidents.assign"
  | "incidents.investigate"
  // Checklists & Assessments
  | "checklists.view"
  | "checklists.complete"
  | "checklists.create_templates"
  | "checklists.manage"
  // Reports & Analytics
  | "reports.view_own"
  | "reports.view_team"
  | "reports.view_all"
  | "reports.export"
  // User Management
  | "users.view"
  | "users.create"
  | "users.edit"
  | "users.delete"
  | "users.manage_roles"
  // Team Management
  | "teams.view"
  | "teams.create"
  | "teams.edit"
  | "teams.delete"
  | "teams.manage_members"
  // Settings
  | "settings.view"
  | "settings.edit"
  | "settings.billing";

// Role-based default permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    // Super admin has all permissions
    "incidents.view_own", "incidents.view_team", "incidents.view_all",
    "incidents.create", "incidents.edit_own", "incidents.edit_all",
    "incidents.delete", "incidents.assign", "incidents.investigate",
    "checklists.view", "checklists.complete", "checklists.create_templates", "checklists.manage",
    "reports.view_own", "reports.view_team", "reports.view_all", "reports.export",
    "users.view", "users.create", "users.edit", "users.delete", "users.manage_roles",
    "teams.view", "teams.create", "teams.edit", "teams.delete", "teams.manage_members",
    "settings.view", "settings.edit", "settings.billing",
  ],
  employee: [
    "incidents.view_own",
    "incidents.create",
    "incidents.edit_own",
    "checklists.view",
    "checklists.complete",
    "reports.view_own",
  ],
  manager: [
    "incidents.view_own",
    "incidents.view_team",
    "incidents.create",
    "incidents.edit_own",
    "incidents.edit_all",
    "incidents.assign",
    "incidents.investigate",
    "checklists.view",
    "checklists.complete",
    "checklists.create_templates",
    "reports.view_own",
    "reports.view_team",
    "reports.export",
    "users.view",
    "teams.view",
    "teams.manage_members",
  ],
  company_admin: [
    "incidents.view_own",
    "incidents.view_team",
    "incidents.view_all",
    "incidents.create",
    "incidents.edit_own",
    "incidents.edit_all",
    "incidents.delete",
    "incidents.assign",
    "incidents.investigate",
    "checklists.view",
    "checklists.complete",
    "checklists.create_templates",
    "checklists.manage",
    "reports.view_own",
    "reports.view_team",
    "reports.view_all",
    "reports.export",
    "users.view",
    "users.create",
    "users.edit",
    "users.delete",
    "users.manage_roles",
    "teams.view",
    "teams.create",
    "teams.edit",
    "teams.delete",
    "teams.manage_members",
    "settings.view",
    "settings.edit",
    "settings.billing",
  ],
};

// Status Types
export type CompanyStatus = "trial" | "active" | "suspended" | "cancelled";
export type UserStatus = "active" | "inactive";
export type IncidentStatus = "new" | "in_progress" | "in_review" | "resolved" | "archived";
export type TicketStatus = "new" | "in_progress" | "blocked" | "waiting" | "resolved" | "closed";
export type AssetStatus = "active" | "inactive" | "maintenance" | "retired";
export type ContentStatus = "draft" | "published" | "scheduled";
export type ContentType = "news" | "document" | "faq" | "training" | "event";

// Severity and Priority
export type Severity = "low" | "medium" | "high" | "critical";
export type Priority = "low" | "medium" | "high" | "critical";

// Incident Types
export type IncidentType =
  | "injury"
  | "near_miss"
  | "equipment_failure"
  | "environmental"
  | "fire"
  | "security"
  | "spill"
  | "hazard"
  | "property_damage"
  | "other";

// Location Types
export type LocationType = "site" | "building" | "floor" | "zone" | "room";

// Subscription Tiers
export type SubscriptionTier = "starter" | "professional" | "enterprise" | "custom";

// UI Style Options
export type UIStyle = "rounded" | "square";

// ============================================
// CORE ENTITIES
// ============================================

export interface Company {
  id: string;
  name: string;
  slug: string;
  app_name: string | null; // Custom display name employees see in the app header
  country: Country;
  language: Language;
  status: CompanyStatus;

  // Branding
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  ui_style: UIStyle;

  // Subscription
  tier: SubscriptionTier;
  seat_limit: number;
  currency: Currency;

  // Metadata
  created_at: string;
  updated_at: string;
  trial_ends_at: string | null;
}

// User Types and Account Types
export type UserType = "internal" | "external" | "contractor" | "visitor";
export type AccountType = "standard" | "admin" | "viewer" | "safety_officer";
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

export interface User {
  id: string;
  company_id: string;
  email: string;
  
  // Name fields
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string; // Computed: first + middle + last
  
  // Classification
  role: UserRole; // Can be super_admin, company_admin, manager, or employee
  user_type: UserType;
  account_type: AccountType;
  gender: Gender | null;
  
  department: string | null;
  job_title: string | null;
  employee_id: string | null;
  status: UserStatus;

  // Location assignment
  location_id: string | null;

  // Preferences
  language: Language;
  theme: "light" | "dark" | "system";

  // Security
  two_factor_enabled: boolean;
  last_login_at: string | null;

  created_at: string;
  updated_at: string;
  
  // Profile photo (base64 data URL or external URL)
  avatar_url?: string | null;
  
  // Notification preferences
  notification_prefs?: {
    push: boolean;
    email: boolean;
    incidents: boolean;
    tasks: boolean;
    news: boolean;
  };
  
  // Team membership (optional - user can belong to multiple teams)
  team_ids?: string[];
  
  // Custom permissions (in addition to role-based defaults)
  custom_permissions?: Permission[];
}

// Team/Group for organizing users
export interface Team {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  color: string; // Hex color for visual identification
  
  // Leadership
  leader_id: string | null; // Team leader/manager user ID
  
  // Members
  member_ids: string[];
  member_count: number;
  
  // Permissions & Settings
  permissions?: string[]; // e.g., ["view_incidents", "create_reports", "approve_assessments"]
  is_default?: boolean; // Default team for new users
  
  // Metadata
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface SuperAdmin {
  id: string;
  email: string;
  full_name: string;
  role: SuperAdminRole;
  two_factor_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
}

// Investigation-related types (used in Incident)
export interface RCAAttachment {
  id: string;
  name: string;
  type: string; // e.g. "image/png", "application/pdf"
  url: string;
  addedAt: string;
}

export interface IncidentWitness {
  name: string;
  statement: string;
  date: string;
}

export interface IncidentInvestigation {
  investigator: string;
  startDate: string;
  status: "not_started" | "in_progress" | "completed";
  rootCauseCategory: string;
  rootCauseOther: string;
  rootCauseDescription: string;
  contributingFactors: string[];
  lessonsLearned: string;
  witnesses: IncidentWitness[];
  notes: string;
  attachments: RCAAttachment[];
}

export interface IncidentAction {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string;
  actionType: "corrective" | "preventive";
  status: "pending" | "in_progress" | "completed";
  ticketId: string;
  ticketStatus: "open" | "in_progress" | "resolved";
  assignee: string;
  resolutionNotes?: string;
  createdAt: string;
}

export interface IncidentComment {
  id: string;
  user: string;
  userId: string;
  text: string;
  date: string;
  avatar: string;
}

export interface IncidentTimelineEvent {
  id: number;
  type: "created" | "status" | "action" | "comment" | "investigation" | "resolution";
  description: string;
  user: string;
  date: string;
}

export interface Incident {
  id: string;
  company_id: string;
  reference_number: string;
  reporter_id: string;

  // Classification
  type: IncidentType;
  type_other: string | null;
  severity: Severity;
  priority: Priority;

  // Details
  title: string;
  description: string;
  incident_date: string;
  incident_time: string;
  lost_time: boolean;
  lost_time_amount: number | null;
  active_hazard: boolean;

  // Location
  location_id: string | null;
  building: string | null;
  floor: string | null;
  zone: string | null;
  room: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  location_description: string | null;
  asset_id: string | null;

  // Media
  media_urls: string[];

  // Status
  status: IncidentStatus;
  flagged: boolean;

  // Resolution
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;

  created_at: string;
  updated_at: string;

  // Investigation & Workflow (persisted)
  investigation?: IncidentInvestigation | null;
  actions?: IncidentAction[];
  comments?: IncidentComment[];
  timeline?: IncidentTimelineEvent[];

  // Relationships (populated)
  reporter?: User;
  location?: Location;
  asset?: Asset;
}

// Location Emergency Contact
export interface LocationEmergencyContact {
  id: string;
  location_id: string;
  name: string;
  role: string;
  phone: string;
  is_primary: boolean;
}

// Location Safety Notice
export interface LocationSafetyNotice {
  id: string;
  location_id: string;
  type: "warning" | "info" | "danger";
  message: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface Location {
  id: string;
  company_id: string;
  parent_id: string | null;
  type: LocationType;
  name: string;
  address: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  qr_code: string | null;
  metadata: Record<string, unknown>;
  created_at: string;

  // Computed/denormalized fields
  employee_count: number;
  asset_count: number;

  // Relationships
  children?: Location[];
  parent?: Location;
  emergency_contacts?: LocationEmergencyContact[];
  safety_notices?: LocationSafetyNotice[];
}

// Asset Category Types (ISO 55000 aligned)
export type AssetCategory = 
  | "machinery" 
  | "vehicle" 
  | "safety_equipment" 
  | "tool" 
  | "electrical" 
  | "hvac"
  | "plumbing"
  | "fire_safety"
  | "lifting_equipment"
  | "pressure_vessel"
  | "ppe"
  | "other";

export type AssetType = "static" | "movable";

// Asset Criticality (for risk-based maintenance)
export type AssetCriticality = "critical" | "high" | "medium" | "low";

// Asset Condition Rating
export type AssetCondition = "excellent" | "good" | "fair" | "poor" | "failed";

export interface Asset {
  id: string;
  company_id: string;
  location_id: string | null;
  
  // Hierarchy (System → Components)
  parent_asset_id: string | null; // If this is a component, points to parent system
  is_system: boolean; // True if this is a system that can have child components

  // Identification (ISO 55000)
  name: string;
  asset_tag: string; // Unique asset tag/ID
  serial_number: string | null;
  barcode: string | null;
  qr_code: string | null;
  
  // Classification
  category: AssetCategory;
  sub_category: string | null;
  asset_type: AssetType;
  criticality: AssetCriticality;
  department: string | null;
  
  // Technical Specifications
  manufacturer: string | null;
  model: string | null;
  model_number: string | null;
  specifications: string | null;
  
  // Lifecycle Dates
  manufactured_date: string | null;
  purchase_date: string | null;
  installation_date: string | null;
  warranty_expiry: string | null;
  expected_life_years: number | null;
  
  // Condition & Performance
  condition: AssetCondition;
  condition_notes: string | null;
  last_condition_assessment: string | null;
  
  // Financial
  purchase_cost: number | null;
  current_value: number | null;
  depreciation_rate: number | null;
  currency: Currency;
  
  // Maintenance
  maintenance_frequency_days: number | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  maintenance_notes: string | null;
  
  // Compliance & Safety
  requires_certification: boolean;
  requires_calibration: boolean;
  calibration_frequency_days: number | null;
  last_calibration_date: string | null;
  next_calibration_date: string | null;
  safety_instructions: string | null;
  
  // Status
  status: AssetStatus;
  decommission_date: string | null;
  disposal_method: string | null;

  created_at: string;
  updated_at: string;

  // Relationships
  location?: Location;
  inspections?: AssetInspection[];
  certifications?: AssetCertification[];
}

export interface AssetInspection {
  id: string;
  asset_id: string;
  inspector_id: string;

  checklist_id: string | null;
  result: "pass" | "fail" | "needs_attention";
  notes: string | null;
  media_urls: string[];

  incident_id: string | null;

  inspected_at: string;
  created_at: string;

  // Relationships
  inspector?: User;
  asset?: Asset;
}

export interface AssetCertification {
  id: string;
  asset_id: string;

  name: string;
  issuer: string | null;
  certificate_number: string | null;
  document_url: string | null;

  issued_date: string;
  expiry_date: string;

  created_at: string;
}

// ============================================
// INSPECTION TEMPLATES
// ============================================

export interface InspectionTemplateItem {
  id: string;
  label: string;
  type: "checkbox" | "rating" | "text" | "number" | "photo";
  required: boolean;
  options?: string[]; // For rating scale labels
}

export interface InspectionTemplate {
  id: string;
  name: string;
  description: string;
  category: AssetCategory;
  items: InspectionTemplateItem[];
}

// Default inspection templates for each asset category
export const INSPECTION_TEMPLATES: Record<AssetCategory, InspectionTemplateItem[]> = {
  machinery: [
    { id: "m1", label: "Visual condition - no damage or corrosion", type: "checkbox", required: true },
    { id: "m2", label: "Guards and safety covers in place", type: "checkbox", required: true },
    { id: "m3", label: "Emergency stop functional", type: "checkbox", required: true },
    { id: "m4", label: "Lubrication adequate", type: "checkbox", required: true },
    { id: "m5", label: "No abnormal noise or vibration", type: "checkbox", required: true },
    { id: "m6", label: "Condition rating", type: "rating", required: true, options: ["Poor", "Fair", "Good", "Excellent"] },
    { id: "m7", label: "Notes / observations", type: "text", required: false },
  ],
  vehicle: [
    { id: "v1", label: "Exterior condition - no damage", type: "checkbox", required: true },
    { id: "v2", label: "Lights functional (headlights, indicators, brake)", type: "checkbox", required: true },
    { id: "v3", label: "Tires - adequate tread and pressure", type: "checkbox", required: true },
    { id: "v4", label: "Brakes functional", type: "checkbox", required: true },
    { id: "v5", label: "Fluid levels adequate (oil, coolant, washer)", type: "checkbox", required: true },
    { id: "v6", label: "First aid kit present", type: "checkbox", required: true },
    { id: "v7", label: "Fire extinguisher present and valid", type: "checkbox", required: true },
    { id: "v8", label: "Mileage / odometer reading", type: "number", required: true },
    { id: "v9", label: "Notes / observations", type: "text", required: false },
  ],
  safety_equipment: [
    { id: "s1", label: "Equipment accessible and clearly marked", type: "checkbox", required: true },
    { id: "s2", label: "No visible damage or tampering", type: "checkbox", required: true },
    { id: "s3", label: "Operational (test if applicable)", type: "checkbox", required: true },
    { id: "s4", label: "Within expiry/service date", type: "checkbox", required: true },
    { id: "s5", label: "Notes / observations", type: "text", required: false },
  ],
  tool: [
    { id: "t1", label: "Clean and free of damage", type: "checkbox", required: true },
    { id: "t2", label: "Electrically safe (cord, plug)", type: "checkbox", required: true },
    { id: "t3", label: "Guards and safety features intact", type: "checkbox", required: true },
    { id: "t4", label: "Stored correctly", type: "checkbox", required: true },
    { id: "t5", label: "Notes / observations", type: "text", required: false },
  ],
  electrical: [
    { id: "e1", label: "No exposed wiring or damage", type: "checkbox", required: true },
    { id: "e2", label: "Panels accessible and labeled", type: "checkbox", required: true },
    { id: "e3", label: "GFCI/RCD functional (test button)", type: "checkbox", required: true },
    { id: "e4", label: "No signs of overheating or burning", type: "checkbox", required: true },
    { id: "e5", label: "Notes / observations", type: "text", required: false },
  ],
  hvac: [
    { id: "h1", label: "Filters clean or replaced", type: "checkbox", required: true },
    { id: "h2", label: "No unusual noises", type: "checkbox", required: true },
    { id: "h3", label: "Thermostat functioning", type: "checkbox", required: true },
    { id: "h4", label: "Vents unobstructed", type: "checkbox", required: true },
    { id: "h5", label: "Notes / observations", type: "text", required: false },
  ],
  plumbing: [
    { id: "p1", label: "No leaks or drips", type: "checkbox", required: true },
    { id: "p2", label: "Water pressure adequate", type: "checkbox", required: true },
    { id: "p3", label: "Drains flowing freely", type: "checkbox", required: true },
    { id: "p4", label: "Hot water functional", type: "checkbox", required: true },
    { id: "p5", label: "Notes / observations", type: "text", required: false },
  ],
  fire_safety: [
    { id: "f1", label: "Fire extinguisher charged (gauge in green)", type: "checkbox", required: true },
    { id: "f2", label: "Extinguisher accessible and signage visible", type: "checkbox", required: true },
    { id: "f3", label: "Safety seal intact", type: "checkbox", required: true },
    { id: "f4", label: "Last service date within 1 year", type: "checkbox", required: true },
    { id: "f5", label: "Fire alarm tested", type: "checkbox", required: true },
    { id: "f6", label: "Emergency exit signs illuminated", type: "checkbox", required: true },
    { id: "f7", label: "Notes / observations", type: "text", required: false },
  ],
  lifting_equipment: [
    { id: "l1", label: "Load rating label visible", type: "checkbox", required: true },
    { id: "l2", label: "No cracks, deformation or wear", type: "checkbox", required: true },
    { id: "l3", label: "Hooks and latches functional", type: "checkbox", required: true },
    { id: "l4", label: "Chains/slings in good condition", type: "checkbox", required: true },
    { id: "l5", label: "Certification current", type: "checkbox", required: true },
    { id: "l6", label: "Notes / observations", type: "text", required: false },
  ],
  pressure_vessel: [
    { id: "pv1", label: "Pressure gauge functional and in range", type: "checkbox", required: true },
    { id: "pv2", label: "Safety valve operational", type: "checkbox", required: true },
    { id: "pv3", label: "No visible corrosion or damage", type: "checkbox", required: true },
    { id: "pv4", label: "Certification current", type: "checkbox", required: true },
    { id: "pv5", label: "Notes / observations", type: "text", required: false },
  ],
  ppe: [
    { id: "pp1", label: "Clean and hygienic", type: "checkbox", required: true },
    { id: "pp2", label: "No damage or excessive wear", type: "checkbox", required: true },
    { id: "pp3", label: "Fits correctly", type: "checkbox", required: true },
    { id: "pp4", label: "Within expiry date (if applicable)", type: "checkbox", required: true },
    { id: "pp5", label: "Stored correctly", type: "checkbox", required: true },
    { id: "pp6", label: "Notes / observations", type: "text", required: false },
  ],
  other: [
    { id: "o1", label: "Visual inspection - condition acceptable", type: "checkbox", required: true },
    { id: "o2", label: "Functional (if applicable)", type: "checkbox", required: true },
    { id: "o3", label: "Safety concerns identified", type: "checkbox", required: true },
    { id: "o4", label: "Notes / observations", type: "text", required: false },
  ],
};

// ============================================
// MAINTENANCE SCHEDULES (Preventive Maintenance)
// ============================================

export type MaintenanceFrequencyUnit = "days" | "weeks" | "months" | "years";
export type MaintenancePriority = "low" | "medium" | "high" | "critical";

export interface MaintenanceSchedule {
  id: string;
  asset_id: string;
  company_id: string;

  // Schedule details
  name: string; // e.g., "Oil Change", "Filter Replacement", "Safety Inspection"
  description: string | null;
  
  // Frequency
  frequency_value: number; // e.g., 3
  frequency_unit: MaintenanceFrequencyUnit; // e.g., "months" → every 3 months
  
  // Tracking
  last_completed_date: string | null;
  next_due_date: string;
  
  // Assignment
  assigned_to_user_id: string | null;
  assigned_to_team_id: string | null;
  
  // Priority & notifications
  priority: MaintenancePriority;
  notify_days_before: number; // e.g., 7 = notify 7 days before due
  
  // Status
  is_active: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface MaintenanceLog {
  id: string;
  schedule_id: string;
  asset_id: string;
  
  completed_by_user_id: string;
  completed_date: string;
  
  notes: string | null;
  parts_used: string | null;
  labor_hours: number | null;
  
  created_at: string;
}

// ============================================
// ALERTS & NOTIFICATIONS
// ============================================

export type AlertType = 
  | "maintenance_due"
  | "maintenance_overdue"
  | "certification_expiring"
  | "certification_expired"
  | "warranty_expiring"
  | "warranty_expired"
  | "calibration_due"
  | "calibration_overdue"
  | "inspection_due"
  | "inspection_overdue";

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  company_id: string;
  
  // Source
  type: AlertType;
  asset_id: string | null;
  schedule_id: string | null; // For maintenance alerts
  
  // Content
  title: string;
  description: string;
  
  // Timing
  due_date: string;
  severity: AlertSeverity;
  
  // Status
  is_dismissed: boolean;
  dismissed_by_user_id: string | null;
  dismissed_at: string | null;
  
  // Auto-resolved when action taken
  is_resolved: boolean;
  resolved_at: string | null;
  
  created_at: string;
}

// ============================================
// DOWNTIME TRACKING
// ============================================

export interface DowntimeLog {
  id: string;
  asset_id: string;
  company_id: string;
  
  // Timing
  start_date: string;
  end_date: string | null; // null if ongoing
  duration_hours: number | null; // calculated when ended
  
  // Details
  reason: string;
  category: "breakdown" | "maintenance" | "safety" | "external" | "other";
  
  // People
  reported_by_user_id: string;
  resolved_by_user_id: string | null;
  
  // Impact
  production_impact: "none" | "partial" | "full"; // How much production affected
  
  notes: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  question: string;
  type: "yes_no_na" | "pass_fail" | "rating" | "text";
  required: boolean;
  order: number;
}

export interface ChecklistTemplate {
  id: string;
  company_id: string;

  name: string;
  description: string | null;
  category?: string;
  assignment?: "all" | "department" | "role";
  recurrence?: "daily" | "weekly" | "monthly" | "once";
  items: ChecklistItem[];

  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistResponse {
  item_id: string;
  value: string | number | boolean | null;
  comment: string | null;
  photo_urls?: string[];
}

export interface ChecklistSubmission {
  id: string;
  company_id: string;
  template_id: string;
  submitter_id: string;

  location_id: string | null;
  responses: ChecklistResponse[];
  general_comments: string | null;

  status: "draft" | "submitted";
  submitted_at: string | null;
  created_at: string;

  // Relationships
  template?: ChecklistTemplate;
  submitter?: User;
  location?: Location;
}

export interface RiskEvaluation {
  id: string;
  company_id: string;
  submitter_id: string;

  country: Country;
  form_type: string;

  location_id: string | null;
  responses: Record<string, unknown>;

  status: "draft" | "submitted" | "reviewed";
  reviewed_by: string | null;
  reviewed_at: string | null;

  submitted_at: string;
  created_at: string;

  // Relationships
  submitter?: User;
  location?: Location;
}

export interface Ticket {
  id: string;
  company_id: string;

  title: string;
  description: string;
  priority: Priority;
  status: TicketStatus;

  due_date: string | null;
  assigned_to: string | null;
  assigned_groups: string[];

  incident_ids: string[];

  created_by: string;
  created_at: string;
  updated_at: string;

  // Relationships
  assignee?: User;
  creator?: User;
  incidents?: Incident[];
}

export interface Content {
  id: string;
  company_id: string;

  type: ContentType;

  title: string;
  content: string | null;
  file_url: string | null;
  video_url: string | null;

  // FAQ specific
  question: string | null;
  answer: string | null;

  // Event specific
  event_date: string | null;
  event_time: string | null;
  event_location: string | null;

  category: string | null;
  featured_image: string | null;

  status: ContentStatus;
  published_at: string | null;
  scheduled_for: string | null;

  created_by: string;
  created_at: string;
  updated_at: string;

  // Relationships
  creator?: User;
}

export interface AuditLog {
  id: string;
  company_id: string | null;

  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;

  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;

  ip_address: string | null;
  user_agent: string | null;

  created_at: string;

  // Relationships
  user?: User | SuperAdmin;
}

export interface QRCode {
  id: string;
  company_id: string;
  location_id: string;

  default_incident_type: IncidentType | null;
  instructions: string | null;

  scan_count: number;
  last_scanned_at: string | null;

  created_at: string;

  // Relationships
  location?: Location;
}

// ============================================
// API TYPES
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// ============================================
// FORM TYPES
// ============================================

export interface IncidentFormData {
  type: IncidentType;
  type_other?: string;
  severity: Severity;
  description: string;
  incident_date: string;
  incident_time: string;
  lost_time: boolean;
  lost_time_amount?: number;
  active_hazard: boolean;
  location_id?: string;
  building?: string;
  floor?: string;
  zone?: string;
  room?: string;
  gps_lat?: number;
  gps_lng?: number;
  location_description?: string;
  asset_id?: string;
  media_files?: File[];
}

export interface UserFormData {
  email: string;
  full_name: string;
  role: CompanyRole;
  department?: string;
}

export interface CompanyFormData {
  name: string;
  slug: string;
  app_name?: string;
  country: Country;
  language: Language;
  tier: SubscriptionTier;
  seat_limit: number;
  currency: Currency;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  ui_style: UIStyle;
}

// ============================================
// DASHBOARD STATS
// ============================================

export interface DashboardStats {
  total_incidents: number;
  open_incidents: number;
  resolved_today: number;
  avg_resolution_time_hours: number;
  ltir: number;
  compliance_rate: number;
}

export interface PlatformStats {
  total_companies: number;
  active_companies: number;
  total_users: number;
  active_users: number;
  total_incidents: number;
}

// Corrective Actions (from failed inspections)
export type CorrectiveActionStatus = "open" | "in_progress" | "completed" | "overdue";

export interface CorrectiveAction {
  id: string;
  company_id: string;
  asset_id: string;
  inspection_id: string | null;
  description: string;
  severity: Severity;
  assigned_to: string | null;
  due_date: string;
  status: CorrectiveActionStatus;
  resolution_notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Work Orders
export type WorkOrderStatus = "requested" | "approved" | "in_progress" | "completed" | "cancelled";
export type WorkOrderPriority = Priority;

export interface WorkOrderPartUsage {
  part_id: string;
  quantity: number;
}

export interface WorkOrder {
  id: string;
  company_id: string;
  asset_id: string | null;
  title: string;
  description: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  requested_by: string;
  assigned_to: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  parts_cost: number | null;
  labor_cost: number | null;
  corrective_action_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  
  // Parts tracking (persisted)
  parts_used?: WorkOrderPartUsage[];
}

// Meter Readings
export type MeterUnit = "hours" | "miles" | "km" | "cycles" | "psi" | "rpm" | "gallons" | "liters";

export interface MeterReading {
  id: string;
  asset_id: string;
  meter_type: string;
  unit: MeterUnit;
  value: number;
  recorded_by: string;
  recorded_at: string;
  notes: string | null;
  created_at: string;
}

// Parts
export interface Part {
  id: string;
  company_id: string;
  name: string;
  part_number: string;
  unit_cost: number;
  quantity_in_stock: number;
  minimum_stock: number;
  supplier: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartUsage {
  id: string;
  part_id: string;
  asset_id: string;
  work_order_id: string | null;
  quantity: number;
  used_by: string;
  used_at: string;
  notes: string | null;
}

// ============================================
// INSPECTION ROUNDS
// ============================================

export type InspectionCheckType = "visual" | "auditory" | "measurement" | "functional" | "safety";

export interface InspectionCheckpoint {
  id: string;
  asset_id: string;
  order: number;
  label: string;
  check_type: InspectionCheckType;
  acceptable_min: number | null;
  acceptable_max: number | null;
  unit: string | null;
  instructions: string | null;
  required: boolean;
}

export type InspectionRouteStatus = "active" | "inactive" | "draft";

export interface InspectionRoute {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  status: InspectionRouteStatus;
  recurrence: "daily" | "weekly" | "monthly" | "once";
  assigned_to_user_id: string | null;
  assigned_to_team_id: string | null;
  checkpoints: InspectionCheckpoint[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CheckpointResult = "pass" | "fail" | "needs_attention";

export interface InspectionCheckpointResult {
  checkpoint_id: string;
  asset_id: string;
  result: CheckpointResult;
  measured_value: number | null;
  out_of_range: boolean;
  photo_url: string | null;
  notes: string | null;
}

export type InspectionRoundStatus = "in_progress" | "completed" | "synced";

export interface InspectionRound {
  id: string;
  route_id: string;
  company_id: string;
  inspector_id: string;
  status: InspectionRoundStatus;
  started_at: string;
  completed_at: string | null;
  checkpoint_results: InspectionCheckpointResult[];
  alerts_created: string[];
  created_at: string;
  updated_at: string;
}

// ============================================
// OFFLINE SYNC
// ============================================

export type SyncItemType = "inspection_round" | "work_order" | "photo";
export type SyncItemStatus = "pending" | "syncing" | "synced" | "conflict";

export interface SyncQueueItem {
  id: string;
  type: SyncItemType;
  payload: Record<string, unknown>;
  status: SyncItemStatus;
  created_at: string;
  synced_at: string | null;
  error: string | null;
}
