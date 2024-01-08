import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ScenariosComponent } from './';

const routes: Routes = [
    {
        path: '',
        component: ScenariosComponent,
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ScenarioRoutingModule { }
