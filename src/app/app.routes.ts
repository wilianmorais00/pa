import { Routes } from '@angular/router';
import { AdminOnlyGuard } from './Service/admin-service'; 
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () =>
      import('./Component/logComponent/logComponent').then(
        (m) => m.LoginComponent
      ),
  },

  {
    path: 'home',
    loadComponent: () =>
      import('./Component/homeComponent/homeComponent').then(
        (m) => m.HomeComponent
      ),
  },

  {
    path: 'client/new',
    loadComponent: () =>
      import('./Component/client-component/client-component').then(
        (m) => m.ClientComponent
      ),
  },

  {
    path: 'forms/new',
    loadComponent: () =>
      import('./Component/formscomponent/formscomponent').then(
        (m) => m.FormsComponent
      ),
  },

  {
    path: 'forms/answers/:id',
    loadComponent: () =>
      import('./Component/component-visualizacao/component-visualizacao').then(
        (m) => m.ComponentVisualizacao
      ),
  },

  {
    path: 'public/form',
    loadComponent: () =>
      import(
        './Component/publicform-component/publicform-component'
      ).then((m) => m.PublicFormComponent),
  },

  {
    path: 'users',
    canActivate: [AdminOnlyGuard], 
    loadComponent: () =>
      import('./Component/component-users/component-users').then(
        (m) => m.UsersComponent
      ),
  },

  { path: '**', redirectTo: 'login' },
];
