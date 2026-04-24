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

export type PricingTier = "intro_session" | "ongoing_coaching" | "high_touch_coaching";

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
  adherence: number;
  metrics: {
    bodyWeight: string;
    workouts: number;
    streak: number;
    lastCheckIn: string;
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
  postType: "announcement" | "session";
  requiresRsvp: boolean;
  sessionStartsAt?: string | null;
  sessionLocation?: string | null;
  sessionCapacity?: number | null;
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
