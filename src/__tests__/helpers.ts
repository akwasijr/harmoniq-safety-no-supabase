import type { User, Company, Incident, Location, Team, Ticket } from "@/types";

// ============================================
// Factory functions for test data
// ============================================

let idCounter = 0;
function nextId() {
  return `test-${++idCounter}`;
}

export function resetIdCounter() {
  idCounter = 0;
}

export function createTestCompany(overrides: Partial<Company> = {}): Company {
  const id = nextId();
  return {
    id,
    name: "Test Company",
    slug: "test-company",
    app_name: null,
    country: "US",
    language: "en",
    status: "active",
    logo_url: null,
    hero_image_url: null,
    primary_color: "#8B5CF6",
    secondary_color: "#6D28D9",
    font_family: "Inter",
    ui_style: "rounded",
    tier: "professional",
    seat_limit: 50,
    currency: "USD",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    trial_ends_at: null,
    ...overrides,
  };
}

export function createTestUser(overrides: Partial<User> = {}): User {
  const id = nextId();
  return {
    id,
    company_id: "company-1",
    email: `user-${id}@test.com`,
    first_name: "Test",
    middle_name: null,
    last_name: "User",
    full_name: "Test User",
    role: "employee",
    user_type: "internal",
    account_type: "standard",
    gender: null,
    department: null,
    job_title: null,
    employee_id: null,
    status: "active",
    location_id: null,
    language: "en",
    theme: "system",
    two_factor_enabled: false,
    last_login_at: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createTestIncident(overrides: Partial<Incident> = {}): Incident {
  const id = nextId();
  return {
    id,
    company_id: "company-1",
    reference_number: `INC-2024-${id}`,
    reporter_id: "user-1",
    type: "near_miss",
    type_other: null,
    severity: "medium",
    priority: "medium",
    title: "Test Incident",
    description: "Test incident description",
    incident_date: "2024-01-15",
    incident_time: "10:30",
    lost_time: false,
    lost_time_amount: null,
    active_hazard: false,
    location_id: null,
    building: null,
    floor: null,
    zone: null,
    room: null,
    gps_lat: null,
    gps_lng: null,
    location_description: null,
    asset_id: null,
    media_urls: [],
    status: "new",
    flagged: false,
    resolved_at: null,
    resolved_by: null,
    resolution_notes: null,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
    ...overrides,
  };
}

export function createTestLocation(overrides: Partial<Location> = {}): Location {
  const id = nextId();
  return {
    id,
    company_id: "company-1",
    parent_id: null,
    type: "site",
    name: "Test Location",
    address: null,
    gps_lat: null,
    gps_lng: null,
    qr_code: null,
    metadata: {},
    employee_count: 0,
    asset_count: 0,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createTestTeam(overrides: Partial<Team> = {}): Team {
  const id = nextId();
  return {
    id,
    company_id: "company-1",
    name: "Test Team",
    description: null,
    color: "#6366f1",
    leader_id: null,
    member_ids: [],
    member_count: 0,
    status: "active",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createTestTicket(overrides: Partial<Ticket> = {}): Ticket {
  const id = nextId();
  return {
    id,
    company_id: "company-1",
    title: "Test Ticket",
    description: "Test ticket description",
    priority: "medium",
    status: "new",
    due_date: null,
    assigned_to: null,
    assigned_groups: [],
    incident_ids: [],
    created_by: "user-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

// ============================================
// Mock Supabase client
// ============================================

export function createMockSupabaseClient() {
  const mockData: Record<string, unknown[]> = {};
  const mockError: Record<string, { message: string } | null> = {};

  const chainable = (table: string) => ({
    select: vi.fn().mockReturnValue({
      abortSignal: vi.fn().mockResolvedValue({
        data: mockData[table] || [],
        error: mockError[table] || null,
      }),
      eq: vi.fn().mockResolvedValue({
        data: mockData[table] || [],
        error: mockError[table] || null,
      }),
    }),
    insert: vi.fn().mockResolvedValue({
      data: null,
      error: mockError[table] || null,
    }),
    upsert: vi.fn().mockResolvedValue({
      data: null,
      error: mockError[table] || null,
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: mockError[table] || null,
      }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: mockError[table] || null,
      }),
    }),
  });

  return {
    client: {
      from: vi.fn((table: string) => chainable(table)),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signInWithPassword: vi.fn(),
        signInWithOtp: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        resetPasswordForEmail: vi.fn(),
        updateUser: vi.fn(),
      },
    },
    setMockData: (table: string, data: unknown[]) => {
      mockData[table] = data;
    },
    setMockError: (table: string, error: { message: string } | null) => {
      mockError[table] = error;
    },
  };
}
