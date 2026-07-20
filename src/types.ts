export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface Profile {
  id: number;
  user_id: number;
  name: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  activity_level: string; // 'sedentary', 'lightly_active', 'moderately_active', 'very_active'
  pregnancy_status: string; // 'none', 'pregnant', 'lactating'
  medical_history: string; // Comma separated or JSON list
  allergies: string;
  lifestyle_preferences: string;
  created_at: string;
}

export interface Biomarker {
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  status: 'Normal' | 'High' | 'Low' | 'Critical';
  meaning: string;
  short_term: string;
  long_term: string;
  foods_to_increase: string;
  foods_to_reduce: string;
  lifestyle: string;
  exercise: string;
  hydration: string;
  sleep: string;
  stress: string;
}

export interface OrganHealthStatus {
  status: 'Healthy' | 'Needs Monitoring' | 'Potentially Affected';
  explanation: string;
}

export interface OrganHealth {
  brain: OrganHealthStatus;
  heart: OrganHealthStatus;
  kidney: OrganHealthStatus;
  liver: OrganHealthStatus;
  lungs: OrganHealthStatus;
  blood: OrganHealthStatus;
  bones: OrganHealthStatus;
  eyes: OrganHealthStatus;
  skin: OrganHealthStatus;
  nerves: OrganHealthStatus;
  digestive_system: OrganHealthStatus;
}

export interface Specialist {
  name: string;
  why: string;
}

export interface Report {
  id: number;
  user_id: number;
  profile_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  uploaded_at: string;
}

export interface Analysis {
  id: number;
  report_id: number;
  profile_id: number;
  user_id: number;
  biomarkers: Biomarker[];
  vitals: { [key: string]: string };
  diagnoses: string[];
  clinical_notes: string;
  health_score: number;
  organ_health: OrganHealth;
  specialist: Specialist[];
  created_at: string;
}

export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  message: string;
  created_at?: string;
}

export interface NutrientItem {
  name: string;
  value: string;
  status: 'Normal' | 'Increase Needed' | 'Adequate' | 'High';
  unit: string;
  category: 'Macro' | 'Micro' | 'Vitamins' | 'Minerals';
}

export interface TimelineEvent {
  id: number;
  profile_id: number;
  event_type: 'report_upload' | 'analysis' | 'alert' | 'milestone';
  title: string;
  description: string;
  event_date: string;
  created_at: string;
}
