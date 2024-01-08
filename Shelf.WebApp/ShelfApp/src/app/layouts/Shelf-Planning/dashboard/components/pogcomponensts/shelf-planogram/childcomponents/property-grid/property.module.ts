import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LayoutModule } from "@progress/kendo-angular-layout";
import { MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { SharedModule } from 'src/app/shared/shared.module';

import * as PROPERTYCOMPONENTS from './index';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { ScrollingModule } from '@angular/cdk/scrolling';
const COMPONENTS = [
  PROPERTYCOMPONENTS.PropertyGridComponent,
  PROPERTYCOMPONENTS.ChangeHierarchyComponent,
  PROPERTYCOMPONENTS.UprightEditorComponent,
  PROPERTYCOMPONENTS.DividerEditorComponent,
  PROPERTYCOMPONENTS.GrillEditorComponent,
  PROPERTYCOMPONENTS.ImageryComponent,
  PROPERTYCOMPONENTS.PogProfileEditorComponent,
  PROPERTYCOMPONENTS.PogqualifierEditorComponent,
  PROPERTYCOMPONENTS.SeparatorEditorComponent,
  PROPERTYCOMPONENTS.PropertyGridTemplateComponent
 ];

@NgModule({
  declarations: [...COMPONENTS],
  imports: [
    CommonModule,
    TranslateModule,
    LayoutModule,
    MatDialogModule,
    MatRadioModule,
    FormsModule,
    MatIconModule,
    MatMenuModule,
    SharedModule,
    FlexLayoutModule,
    MatSelectModule,
    MatTabsModule,
    DragDropModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatTableModule,
    MatListModule,
    MatExpansionModule,
    ScrollingModule
  ],
  exports: [...COMPONENTS]
})
export class PropertyModule { }
