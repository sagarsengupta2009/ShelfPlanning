import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SyncPogComponent, AppendSectionComponent, AnalysisReportComponent, PlanogramInfoComponent } from './';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTabsModule } from '@angular/material/tabs';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SharedModule } from 'src/app/shared/shared.module';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { ShelfPowerBiReportsComponent } from './shelf-power-bi-reports/shelf-power-bi-reports.component';

const COMPONENTS = [
  SyncPogComponent,
  AppendSectionComponent,
  AnalysisReportComponent,
  PlanogramInfoComponent,
  ShelfPowerBiReportsComponent
];

@NgModule({
  declarations: [...COMPONENTS, ShelfPowerBiReportsComponent],
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MatIconModule,
    MatSidenavModule,
    MatTabsModule,
    FlexLayoutModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    SharedModule,
    MatDialogModule,
    MatTooltipModule,
    DragDropModule,
    MatCardModule,
    MatListModule
  ]
})
export class SideNavModule { }
