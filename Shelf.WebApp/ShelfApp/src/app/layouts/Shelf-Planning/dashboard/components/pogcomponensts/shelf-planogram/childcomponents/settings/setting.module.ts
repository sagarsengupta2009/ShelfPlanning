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

import * as SETTINGSCOMPONENTS from './index';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatExpansionModule } from '@angular/material/expansion';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { LabelTemplateComponent } from './label-template/label-template/label-template.component';
import { SaveTemplateDialog } from './label-template/label-template/dialog-template.component'
import { MatRadioModule } from '@angular/material/radio';
import {MatTooltipModule} from '@angular/material/tooltip';
import { LabelPreviewComponent} from './label-template/label-preview/label-preview-component'
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
const COMPONENTS = [
  SETTINGSCOMPONENTS.SettingsComponent,
  SETTINGSCOMPONENTS.FixtureTemplateComponent,
  SETTINGSCOMPONENTS.GroupTemplateComponent,
  SETTINGSCOMPONENTS.SettingTemplateComponent
 ];

@NgModule({
  declarations: [...COMPONENTS, LabelTemplateComponent,LabelPreviewComponent,SaveTemplateDialog],
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
    MatTabsModule,
    MatExpansionModule,
    FlexLayoutModule,
    DragDropModule,
    MatRadioModule,
    MatTooltipModule,
    MatChipsModule,
    MatAutocompleteModule
  ],
  exports: [...COMPONENTS],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class SettingsModule { }
