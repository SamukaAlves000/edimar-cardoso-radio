import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin').then(m => m.AdminComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./admin/dashboard/dashboard').then(m => m.DashboardComponent) },
      { path: 'recados', loadComponent: () => import('./admin/recados/recados-admin').then(m => m.RecadosAdminComponent) },
      { path: 'noticias', loadComponent: () => import('./admin/noticias/noticias-admin').then(m => m.NoticiasAdminComponent) },
      { path: 'patrocinadores', loadComponent: () => import('./admin/patrocinadores/patrocinadores-admin').then(m => m.PatrocinadoresAdminComponent) },
    ],
  },
];
