import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import * as CONTEXTMENUCOMPONENTS from './index';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { SharedModule } from 'src/app/shared/shared.module';

const COMPONENTS = [
  CONTEXTMENUCOMPONENTS.ContextModelComponent,
  CONTEXTMENUCOMPONENTS.FixtureContextMenuComponent,
  CONTEXTMENUCOMPONENTS.PanelContextMenuComponent,
  CONTEXTMENUCOMPONENTS.PositionContextMenuComponent,
  CONTEXTMENUCOMPONENTS.SectionContextMenuComponent
 ];

@NgModule({
  declarations: [...COMPONENTS],
  imports: [
    CommonModule,
    FormsModule,
    MatMenuModule,
    TranslateModule,
    MatTooltipModule,
    MatDividerModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSelectModule,
    MatRadioModule,
    MatDialogModule,
    MatIconModule,
    DragDropModule,
    SharedModule
  ],
  exports: [...COMPONENTS]
})
export class ContextMenuModule { }
