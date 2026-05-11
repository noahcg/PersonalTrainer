export type Role = "trainer" | "client";

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  email: string;
  avatar_url: string | null;
};

export type CoachingEntry = {
  id: string;
  body: string;
  createdAt: string;
};

export type ClientStatus = "active" | "needs_attention" | "paused" | "archived";
export type ClientAccessStatus = "account_active" | "invite_pending" | "not_invited";
export type ClientPortalAccess = "full" | "data_only";

export type PricingTier = "intro_session" | "ongoing_coaching" | "high_touch_coaching";

export type ClientSessionStatus = "active" | "completed" | "cancelled";
export type TrainingPackageKind = "one_on_one" | "partner_training";
export type TrainingPackageStatus = "pending" | "active" | "paused" | "completed" | "cancelled";
export type PackageAppointmentStatus = "completed" | "cancelled";
export type PackageAttendanceStatus = "attending" | "absent" | "late_cancelled" | "excused";
export type PackageDebitPolicy = "charged" | "not_charged" | "converted_to_one_on_one";

export type ClientSession = {
  id: string;
  clientId: string;
  startedAt: string;
  startedAtIso: string;
  completedAt: string | null;
  completedAtIso: string | null;
  status: ClientSessionStatus;
  location: string;
  notes: string;
  durationMinutes: number | null;
  createdBy: Role;
};

export type ClientSessionPackage = {
  total: number | null;
  used: number;
  remaining: number | null;
  activeSessionId: string | null;
  lastSessionAt: string | null;
};

export type TrainingPackageMember = {
  clientId: string;
  name: string;
  email: string;
  photo: string;
};

export type PackageAppointment = {
  id: string;
  packageId: string;
  status: PackageAppointmentStatus;
  startedAtIso: string;
  startedAt: string;
  completedAtIso: string | null;
  completedAt: string | null;
  location: string;
  notes: string;
  debitPolicy: PackageDebitPolicy;
  attendance: Array<{
    clientId: string;
    status: PackageAttendanceStatus;
  }>;
};

export type TrainingPackage = {
  id: string;
  kind: TrainingPackageKind;
  status: TrainingPackageStatus;
  title: string;
  totalSessions: number | null;
  usedSessions: number;
  remainingSessions: number | null;
  priceCents: number | null;
  currency: string;
  billingTerms: string;
  sharedLocation: string;
  sharedSchedule: string;
  policyNotes: string;
  internalNotes: string;
  startedOn: string;
  createdAt: string;
  members: TrainingPackageMember[];
  appointments: PackageAppointment[];
};

export type PackageType = {
  id: string;
  kind: TrainingPackageKind;
  name: string;
  sessionCount: number | null;
  priceCents: number | null;
  currency: string;
  billingTerms: string;
  policyNotes: string;
  internalNotes: string;
  defaultLocation: string;
  defaultSchedule: string;
  active: boolean;
};

export type Client = {
  id: string;
  name: string;
  email: string;
  photo: string;
  goals: string;
  level: "Foundation" | "Intermediate" | "Advanced";
  injuries: string;
  notes: string;
  style: string;
  availability: string;
  startDate: string;
  status: ClientStatus;
  accessStatus: ClientAccessStatus;
  inviteSentAt: string | null;
  pricingTier: PricingTier;
  sessionPackage: ClientSessionPackage;
  partnerPackage?: Pick<TrainingPackage, "id" | "title" | "status" | "totalSessions" | "usedSessions" | "remainingSessions" | "sharedLocation" | "sharedSchedule"> & {
    partnerName: string;
  };
  adherence: number;
  metrics: {
    bodyWeight: string;
    workouts: number;
    streak: number;
    lastCheckIn: string;
  };
};

export type ClientIntake = {
  id: string;
  clientId: string;
  completedAt: string | null;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  goals: {
    primary: string;
    success: string;
    timeline: string;
    barriers: string;
  };
  training: {
    experience: string;
    currentActivity: string;
    equipmentAccess: string;
    preferredLocation: string;
    likes: string;
    dislikes: string;
    fitnessLevel: Client["level"];
  };
  readiness: {
    injuries: string;
    currentPain: string;
    surgeries: string;
    conditions: string;
    medications: string;
    parqFlags: string[];
    medicalClearance: string;
  };
  lifestyle: {
    sleep: string;
    stress: string;
    nutrition: string;
    hydration: string;
    schedule: string;
    coachingStyle: string;
    communication: string;
  };
  metrics: {
    height: string;
    weight: string;
    measurements: string;
    progressPhotos: string;
  };
};

export type Exercise = {
  id: string;
  name: string;
  category: string;
  muscleGroups: string[];
  equipment: string[];
  pattern: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  instructions: string;
  cues: string[];
  mistakes: string[];
  substitutions: string[];
  demoUrl: string;
  tags: string[];
  editable?: boolean;
};

export type WorkoutExercise = {
  id: string;
  exerciseId: string;
  name: string;
  sets: number;
  reps: string;
  tempo: string;
  rest: string;
  rpe: string;
  load: string;
  duration?: string;
  notes: string;
};

export type WorkoutBlock = {
  id: string;
  label: string;
  intent: string;
  exercises: WorkoutExercise[];
};

export type Workout = {
  id: string;
  trainingPlanId?: string;
  name: string;
  dayLabel: string;
  duration: string;
  warmup: string;
  cooldown: string;
  coachNotes: string;
  blocks: WorkoutBlock[];
};

export type Plan = {
  id: string;
  title: string;
  description: string;
  duration: string;
  goal: string;
  weeklyStructure: string;
  notes: string;
  template: boolean;
  assignedClients: string[];
  workouts: Workout[];
};

export type CheckIn = {
  id: string;
  clientId: string;
  client: string;
  date: string;
  energy: number;
  soreness: number;
  sleep: number;
  stress: number;
  motivation: number;
  mood: string;
  notes: string;
  reviewed: boolean;
  trainerResponse?: string;
  reviewedAt?: string;
};

export type Message = {
  id: string;
  from: Role;
  author: string;
  body: string;
  createdAt: string;
  clientId?: string;
  clientName?: string;
};

export type ConversationParticipant = {
  id: string;
  name: string;
  photo: string;
};

export type ProgressPoint = {
  label: string;
  weight: number;
  adherence: number;
  sleep: number;
};

export type ResourceAudience = "all" | "personal";

export type Resource = {
  id: string;
  title: string;
  description: string;
  type: string;
  url: string;
  content: string;
  tags: string[];
  audience: ResourceAudience;
  assignedClientIds: string[];
  assignedClientNames: string[];
  estimatedTime: string;
  updatedAt: string;
};

export type BulletinPost = {
  id: string;
  title: string;
  body: string;
  author: string;
  publishedAt: string;
  pinned: boolean;
  status?: "active" | "archived";
  postType: "announcement" | "session";
  requiresRsvp: boolean;
  sessionStartsAt?: string | null;
  sessionLocation?: string | null;
  sessionLocationDetails?: {
    placeName: string;
    meetingPoint: string;
    address: string;
    notes: string;
    mapUrl: string;
  } | null;
  sessionCapacity?: number | null;
  reminderEnabled?: boolean;
  reminderMinutesBefore?: number | null;
  reminderAudience?: "attending" | "all";
  reminderTrainerEnabled?: boolean;
  clientRsvp?: "attending" | "not_attending" | null;
  rsvpSummary?: {
    attending: number;
    notAttending: number;
  };
  rsvps?: Array<{
    clientId: string;
    clientName: string;
    status: "attending" | "not_attending";
  }>;
};
