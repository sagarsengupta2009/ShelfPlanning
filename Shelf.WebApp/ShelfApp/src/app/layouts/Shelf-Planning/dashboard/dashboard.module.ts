import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared/shared.module';
import { DashboardComponent } from './dashboard.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { MaterialModule } from 'src/app/material-module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { TranslateModule } from '@ngx-translate/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { OrganizationChartModule } from 'primeng/organizationchart';
import { TooltipModule } from '@progress/kendo-angular-tooltip';
import { EditorModule } from '@progress/kendo-angular-editor';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import { ChartsModule } from '@progress/kendo-angular-charts';
import 'hammerjs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ParamMPCardComponent, PrintComponent, ReportChartsComponent, StoreCardComponent } from './components/pogcomponensts/shelf-planogram/childcomponents/print';
import { ScenarioModule } from './components/scenarios/scenario.module';


@NgModule({
    declarations: [
        DashboardComponent,
    ],
    imports: [
        CommonModule,
        DashboardRoutingModule,
        SharedModule,
        MaterialModule,
        FlexLayoutModule,
        TranslateModule,
        OrganizationChartModule,
        TooltipModule,
        EditorModule,
        DropDownsModule,
        ChartsModule,
        MatSidenavModule,
        MatProgressBarModule,
        ScenarioModule,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class SpaceAutomationDashboardModule { }
