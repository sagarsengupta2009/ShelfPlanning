import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import 'ag-grid-enterprise';
import { AgGridComponent, CellRendererComponent, AGGridColumnFormatterPipe, SafePipe, TooltipComponent, NumericComponent, StringComponent, DropdownComponent, DateComponent, ColorComponent, CheckboxComponent, CheckboxHeaderComponent } from '.';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { DropdownCellEditorComponent } from './Components/grid/cell-editor/dropdown-cell-editor/dropdown-cell-editor.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { GroupCellRendererComponent } from './Components/grid/group-cell-renderer/group-cell-renderer.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CustomHeaderComponent } from './Components/grid/custom-header/custom-header.component';

@NgModule({
  declarations: [
    AGGridColumnFormatterPipe,
    SafePipe,
    AgGridComponent,
    CellRendererComponent,
    TooltipComponent,
    NumericComponent,
    StringComponent,
    DropdownComponent,
    DateComponent,
    ColorComponent,
    DropdownCellEditorComponent,
    CheckboxComponent,
    GroupCellRendererComponent,
    CheckboxHeaderComponent,
    CustomHeaderComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    AgGridModule,
    MatIconModule,
    TranslateModule,
    MatTooltipModule,
    MatCheckboxModule,
    InputsModule,
    MatNativeDateModule,
    MatDatepickerModule,
  ],
  exports: [
    AGGridColumnFormatterPipe,
    SafePipe,
    AgGridComponent,
    CellRendererComponent,
    TooltipComponent,
    CheckboxComponent,
    MatNativeDateModule,
    MatDatepickerModule,
    CheckboxHeaderComponent
  ],
  providers: [
    AGGridColumnFormatterPipe
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ]
})
export class CustomAgGridModule { }
