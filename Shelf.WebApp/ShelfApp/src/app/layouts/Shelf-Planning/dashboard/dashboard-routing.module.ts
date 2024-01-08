import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { NewProductInventoryComponent, ReportDesignerComponent } from './components/pogcomponensts/shelf-planogram/childcomponents';
import { PogSplitterViewComponent } from './components/pogcomponensts/shelf-planogram/common';
import { UnsavedChangesGuard } from 'src/app/shared/guard/unsaved-changes.guard';

const routes: Routes = [
    {
        path: '',
        component: DashboardComponent,
        children: [
            {
                path: '',
                canDeactivate: [UnsavedChangesGuard],
                loadChildren: () =>
                    import(`./components/scenarios/scenario.module`).then(
                        m => m.ScenarioModule
                    )
            },
            {
                path: 'sp',
                canDeactivate: [UnsavedChangesGuard],
                loadChildren: () =>
                    import(`./components/scenarios/scenario.module`).then(
                        m => m.ScenarioModule
                    )
            },
            {
                path: 'sp/pogs',
                canDeactivate: [UnsavedChangesGuard],
                loadChildren: () =>
                    import(`./components/pogcomponensts/shelf-planogram/shelf-planogram.module`).then(
                        m => m.ShelfPlanogramModule
                    ),
            },
            {
                path: 'sp/pogp',
                component: PogSplitterViewComponent
            },
            {
                path: 'sp/npi',
                component: NewProductInventoryComponent
            },
            {
                path: 'sp/rp',
                component: ReportDesignerComponent
            },
            {
                path: 'sp/pogs',
                canDeactivate: [UnsavedChangesGuard],
                loadChildren: () =>
                    import(`./components/pogcomponensts/shelf-planogram/childcomponents/childcomponent.module`).then(
                        m => m.ChildComponentModule
                    ),
            },
        ]
    },

];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class DashboardRoutingModule { }
