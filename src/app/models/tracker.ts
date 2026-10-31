export type Frequency = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'interval' | 'once';
export interface Activity {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  startDate: string;
  frequency: Frequency;
  weekdays: number[];
  periodTarget: number;
  interval: number;
  quantityTarget: number;
  unit: string;
  reminder: string;
  archived: boolean;
  updatedAt: string;
}
export interface Completion {
  activityId: string;
  date: string;
  quantity: number;
  note: string;
}
export interface AppData {
  version: 1;
  preferences: { name: string; theme: 'light' | 'dark'; onboarded: boolean };
  activities: Activity[];
  completions: Completion[];
  categories: string[];
  milestones: string[];
}
export const COLORS = ['#57764b', '#8270b2', '#ce8053', '#568b9e', '#c8677c', '#b19b3a'];
export const EMOJIS = ['🌱', '💻', '📖', '🏃', '💧', '🧠', '🎨', '💰', '🧘', '🎸', '✍️', '🌍'];
export function emptyData(): AppData {
  return {
    version: 1,
    preferences: { name: '', theme: 'light', onboarded: false },
    activities: [],
    completions: [],
    categories: ['Health', 'Learning', 'Fitness', 'Work', 'Finance', 'Personal'],
    milestones: [],
  };
}
