import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ShelfPlanogramComponent } from './shelf-planogram.component';

const routes: Routes = [
    {
        path: '',
        component: ShelfPlanogramComponent,
        children: []
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ShelfRoutingModule { }
