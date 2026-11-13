import { LifeData, emptyLife } from './life';
export type Frequency = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'interval' | 'once';
export type ProgressType = 'binary' | 'quantity' | 'duration' | 'amount';
export interface Pause {
  start: string;
  end: string | null;
}
export type AutomationTrigger = 'learning' | 'jobs' | 'expenses' | 'journal' | 'planning';
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
  progressType?: ProgressType;
  restDays?: string[];
  freezes?: string[];
  pauses?: Pause[];
  automation?: { trigger: AutomationTrigger; minimum?: number };
  pinned?: boolean;
  order?: number;
}
export interface Completion {
  activityId: string;
  date: string;
  quantity: number;
  note: string;
}
export interface Todo {
  id: string;
  title: string;
  done: boolean;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  scheduledDate?: string;
  priority?: 'low' | 'medium' | 'high';
  completedOn?: string;
}
export interface AppData {
  version: 1 | 2 | 3;
  life?: LifeData;
  autoCredits?: {
    activityId: string;
    date: string;
    baseQuantity: number;
    baseNote: string;
    sources: string[];
    trigger: AutomationTrigger;
  }[];
  revision?: number;
  todos?: Todo[];
  dailyNotes?: Record<string, string>;
  reminderLog?: string[];
  preferences: {
    name: string;
    theme: 'light' | 'dark';
    onboarded: boolean;
    currency?: string;
    timeZone?: string;
    compact?: boolean;
    remindersEnabled?: boolean;
  };
  activities: Activity[];
  completions: Completion[];
  categories: string[];
  milestones: string[];
}
export const COLORS = ['#57764b', '#8270b2', '#ce8053', '#568b9e', '#c8677c', '#b19b3a'];
export const EMOJIS = ['🌱', '💻', '📖', '🏃', '💧', '🧠', '🎨', '💰', '🧘', '🎸', '✍️', '🌍'];
export function emptyData(): AppData {
  return {
    version: 3,
    life: emptyLife(),
    revision: 0,
    todos: [],
    dailyNotes: {},
    reminderLog: [],
    preferences: { name: '', theme: 'light', onboarded: false },
    activities: [],
    completions: [],
    categories: ['Health', 'Learning', 'Fitness', 'Work', 'Finance', 'Personal'],
    milestones: [],
  };
}
