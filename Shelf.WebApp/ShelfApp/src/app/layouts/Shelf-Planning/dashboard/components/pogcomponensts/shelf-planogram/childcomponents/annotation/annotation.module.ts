import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { SharedModule } from 'src/app/shared/shared.module';
import { InputsModule } from "@progress/kendo-angular-inputs";
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';

import * as ANNOTATIONSCOMPONENTS from './index';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SpDragDropModule } from 'src/app/shared/drag-drop.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatTooltipModule } from '@angular/material/tooltip';

const COMPONENTS = [
  ANNOTATIONSCOMPONENTS.AnnotationComponent,
  ANNOTATIONSCOMPONENTS.AnnotationConnectorComponent,
  ANNOTATIONSCOMPONENTS.AnnotationDialogComponent,
  ANNOTATIONSCOMPONENTS.AnnotationImageDialogComponent,
  ANNOTATIONSCOMPONENTS.AnnotationDropperComponent,
  ANNOTATIONSCOMPONENTS.AnnotationEditorComponent,
  ANNOTATIONSCOMPONENTS.FreeflowDialogComponent
];

@NgModule({
  declarations: [...COMPONENTS],
  imports: [
    CommonModule,
    FormsModule,
    MatMenuModule,
    TranslateModule,
    MatIconModule,
    MatDialogModule,
    SharedModule,
    InputsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSelectModule,
    MatSidenavModule,
    MatSliderModule,
    MatSlideToggleModule,
    SpDragDropModule,
    FlexLayoutModule,
    DragDropModule,
    MatTooltipModule
  ],
  exports: [...COMPONENTS],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class AnnotationModule { }
