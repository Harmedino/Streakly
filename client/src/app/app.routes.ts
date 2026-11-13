import { Routes } from '@angular/router';
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard/dashboard.component').then((m) => m.Dashboard),
    title: 'Your everyday · Streakly',
  },
  {
    path: 'activities',
    loadComponent: () =>
      import('./features/streaks/pages/activities/activities.component').then((m) => m.Activities),
    title: 'Your activities · Streakly',
  },
  {
    path: 'activities/:id',
    loadComponent: () =>
      import('./features/streaks/pages/detail/detail.component').then((m) => m.Detail),
    title: 'Activity story · Streakly',
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import('./features/calendar/pages/calendar-page/calendar-page.component').then(
        (m) => m.CalendarPage,
      ),
    title: 'Calendar · Streakly',
  },
  {
    path: 'statistics',
    loadComponent: () =>
      import('./features/statistics/pages/statistics/statistics.component').then(
        (m) => m.Statistics,
      ),
    title: 'Insights · Streakly',
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/pages/settings/settings.component').then((m) => m.Settings),
    title: 'Your little corner · Streakly',
  },
  {
    path: 'todos',
    loadComponent: () =>
      import('./features/planner/pages/todos/todos.component').then((m) => m.Todos),
    title: 'Your to-do list · Streakly',
  },
  {
    path: 'finance',
    loadComponent: () =>
      import('./features/finance/pages/finance/finance.component').then((m) => m.Finance),
    title: 'Your finances · Streakly',
  },
  {
    path: 'learning',
    loadComponent: () =>
      import('./features/learning/pages/learning/learning.component').then((m) => m.Learning),
    title: 'Learning journal · Streakly',
  },
  {
    path: 'jobs',
    loadComponent: () => import('./features/jobs/pages/jobs/jobs.component').then((m) => m.Jobs),
    title: 'Job applications · Streakly',
  },
  {
    path: 'jobs/:id',
    loadComponent: () => import('./features/jobs/pages/jobs/jobs.component').then((m) => m.Jobs),
    title: 'Application details · Streakly',
  },
  {
    path: 'goals',
    loadComponent: () =>
      import('./features/goals/pages/goals/goals.component').then((m) => m.Goals),
    title: 'Your goals · Streakly',
  },
  {
    path: 'goals/:id',
    loadComponent: () =>
      import('./features/goals/pages/goals/goals.component').then((m) => m.Goals),
    title: 'Goal details · Streakly',
  },
  {
    path: 'journal',
    loadComponent: () =>
      import('./features/journal/pages/journal/journal.component').then((m) => m.Journal),
    title: 'Personal journal · Streakly',
  },
  {
    path: 'planner',
    loadComponent: () =>
      import('./features/planner/pages/todos/todos.component').then((m) => m.Todos),
    title: 'Daily planner · Streakly',
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./features/reports/pages/reports/reports.component').then((m) => m.Reports),
    title: 'Life reports · Streakly',
  },
  { path: '**', redirectTo: '' },
];
