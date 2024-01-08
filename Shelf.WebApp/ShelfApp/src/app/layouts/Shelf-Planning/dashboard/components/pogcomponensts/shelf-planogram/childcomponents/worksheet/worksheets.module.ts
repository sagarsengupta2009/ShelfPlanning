import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
// import * as WSCOMPONENTS from './index';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TooltipModule } from '@progress/kendo-angular-tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

const COMPONENTS = [
  // WSCOMPONENTS.FixtureWorksheetComponent,
  // WSCOMPONENTS.InventoryModelWsComponent,
  // WSCOMPONENTS.InventoryWorksheetComponent,
  // WSCOMPONENTS.PerformanceWorksheetComponent
 ];

@NgModule({
  declarations: [...COMPONENTS, ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    MatTooltipModule,
    MatIconModule,
    MatMenuModule,
    TranslateModule,
    MatTabsModule,
    MatDialogModule,
    MatRadioModule,
    MatCheckboxModule,
    TooltipModule,
    MatFormFieldModule,
    MatInputModule
  ],
  exports: [...COMPONENTS],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class WorksheetsModule { }
