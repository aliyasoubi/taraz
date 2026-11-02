import { inject } from '@angular/core';
import { ResolveFn, Routes } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { authGuard, guestGuard } from './core/guards/auth.guard';

const title =
  (key: string): ResolveFn<string> =>
  () =>
    `${inject(TranslateService).instant(key)} · ${inject(TranslateService).instant('app.title')}`;

/** Every screen loads on demand; the month sheet is the one opened first. */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
    title: title('route.login'),
  },
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'month' },
      {
        path: 'month',
        loadComponent: () => import('./features/month/month-page').then((m) => m.MonthPage),
        title: title('route.month'),
      },
      {
        path: 'patients',
        loadComponent: () =>
          import('./features/patients/patients-page').then((m) => m.PatientsPage),
        title: title('route.patients'),
      },
      {
        path: 'patients/:id',
        loadComponent: () => import('./features/patients/patient-page').then((m) => m.PatientPage),
        title: title('route.patient'),
      },
      {
        path: 'debtors',
        loadComponent: () => import('./features/debtors/debtors-page').then((m) => m.DebtorsPage),
        title: title('route.debtors'),
      },
      {
        path: 'entries/new',
        loadComponent: () => import('./features/entries/entry-form').then((m) => m.EntryForm),
        title: title('route.newEntry'),
      },
      {
        path: 'entries/:id/edit',
        loadComponent: () => import('./features/entries/entry-form').then((m) => m.EntryForm),
        title: title('route.editEntry'),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings-page').then((m) => m.SettingsPage),
        title: title('route.settings'),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
