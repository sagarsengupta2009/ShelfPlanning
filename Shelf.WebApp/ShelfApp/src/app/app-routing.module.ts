import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
// import { AuthenticationGuard } from 'microsoft-adal-angular6';
import { ServerErrorComponent } from './shared/ErrorComponents/server-error/server-error.component';
import { AccessDeniedComponent } from './shared/ErrorComponents/access-denied/access-denied.component';
import { NotFoundComponent } from './shared/ErrorComponents/not-found/not-found.component';

const routes: Routes = [
  {
    path: ``,
    loadChildren: () =>
      import(`./layouts/layouts.module`).then(m => m.LayoutsModule),
    // canActivate: [AuthenticationGuard]
  },
  {
    path: `sp`,
    loadChildren: () =>
      import(`./layouts/layouts.module`).then(m => m.LayoutsModule),
    // canActivate: [AuthenticationGuard]
  },
  {
    path: `error`,
    component: ServerErrorComponent
  },
  {
    path: `access-denied`,
    component: AccessDeniedComponent
  },
  {
    path: `not-found`,
    // component: NotFoundComponent
    loadChildren: () =>
      import(`./layouts/layouts.module`).then(m => m.LayoutsModule),
    // canActivate: [AuthenticationGuard]
  },
  { path: '**', redirectTo: 'not-found' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
