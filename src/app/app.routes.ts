import { Routes } from '@angular/router';
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
    title: 'Your everyday · Streakly',
  },
  {
    path: 'activities',
    loadComponent: () => import('./features/activities/activities').then((m) => m.Activities),
    title: 'Your activities · Streakly',
  },
  {
    path: 'activities/:id',
    loadComponent: () => import('./features/activities/detail').then((m) => m.Detail),
    title: 'Activity story · Streakly',
  },
  {
    path: 'calendar',
    loadComponent: () => import('./features/calendar/calendar-page').then((m) => m.CalendarPage),
    title: 'Calendar · Streakly',
  },
  {
    path: 'statistics',
    loadComponent: () => import('./features/statistics/statistics').then((m) => m.Statistics),
    title: 'Insights · Streakly',
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
    title: 'Your little corner · Streakly',
  },
  {
    path: 'todos',
    loadComponent: () => import('./features/todos/todos').then((m) => m.Todos),
    title: 'Your to-do list · Streakly',
  },
  {
    path: 'finance',
    loadComponent: () => import('./features/finance/finance').then((m) => m.Finance),
    title: 'Your finances · Streakly',
  },
  {
    path: 'learning',
    loadComponent: () => import('./features/records/records').then((m) => m.Records),
    data: { kind: 'learning' },
    title: 'Learning journal · Streakly',
  },
  {
    path: 'jobs',
    loadComponent: () => import('./features/records/records').then((m) => m.Records),
    data: { kind: 'jobs' },
    title: 'Job applications · Streakly',
  },
  {
    path: 'goals',
    loadComponent: () => import('./features/records/records').then((m) => m.Records),
    data: { kind: 'goals' },
    title: 'Goals · Streakly',
  },
  {
    path: 'journal',
    loadComponent: () => import('./features/records/records').then((m) => m.Records),
    data: { kind: 'journal' },
    title: 'Personal journal · Streakly',
  },
  {
    path: 'planner',
    loadComponent: () => import('./features/todos/todos').then((m) => m.Todos),
    title: 'Daily planner · Streakly',
  },
  {
    path: 'reports',
    loadComponent: () => import('./features/reports/reports').then((m) => m.Reports),
    title: 'Life reports · Streakly',
  },
  { path: '**', redirectTo: '' },
];
