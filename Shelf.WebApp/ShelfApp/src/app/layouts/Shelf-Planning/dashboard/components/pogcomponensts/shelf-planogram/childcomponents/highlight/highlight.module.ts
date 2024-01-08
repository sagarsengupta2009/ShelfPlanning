import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SharedModule } from 'src/app/shared/shared.module';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import * as HIGHLIGHTSCOMPONENTS from './index';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {DragDropModule} from '@angular/cdk/drag-drop';

const COMPONENTS = [
  HIGHLIGHTSCOMPONENTS.HighlightComponent,
  HIGHLIGHTSCOMPONENTS.HighlightSettingComponent,
  HIGHLIGHTSCOMPONENTS.StringMatchComponent,
  HIGHLIGHTSCOMPONENTS.NumericRangeComponent,
  HIGHLIGHTSCOMPONENTS.QuadrantAnalysisComponent,
  HIGHLIGHTSCOMPONENTS.RangeModelComponent,
  HIGHLIGHTSCOMPONENTS.SpectrumComponent,
  HIGHLIGHTSCOMPONENTS.TwoDigitDecimaNumberDirective
 ];

@NgModule({
  declarations: [...COMPONENTS],
  imports: [
    CommonModule,
    MatMenuModule,
    SharedModule,
    MatCheckboxModule,
    TranslateModule,
    MatRadioModule,
    MatSelectModule,
    FormsModule,
    MatSlideToggleModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    FlexLayoutModule,
    MatTooltipModule,
    MatProgressBarModule,
    DragDropModule
  ],
  exports: [...COMPONENTS]
})
export class HighlightModule { }
