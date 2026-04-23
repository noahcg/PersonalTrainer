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
};

export type Message = {
  id: string;
  from: Role;
  author: string;
  body: string;
  createdAt: string;
};

export type ProgressPoint = {
  label: string;
  weight: number;
  adherence: number;
  sleep: number;
};
