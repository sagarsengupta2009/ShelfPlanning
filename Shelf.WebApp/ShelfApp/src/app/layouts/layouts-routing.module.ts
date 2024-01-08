import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
// import { AuthenticationGuard } from 'microsoft-adal-angular6';
import { LayoutsComponent } from './layouts.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutsComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import(`./Shelf-Planning/dashboard/dashboard.module`).then(
            m => m.SpaceAutomationDashboardModule
          ),
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LayoutsRoutingModule { }
