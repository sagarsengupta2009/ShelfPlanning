import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { ChartsModule } from '@progress/kendo-angular-charts';
import { MatTooltipModule } from '@angular/material/tooltip';

import * as PRINTCOMPONENTS from './index';
import { SharedModule } from 'src/app/shared/shared.module';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCheckboxModule } from '@angular/material/checkbox';

const COMPONENTS = [
    PRINTCOMPONENTS.AnalysisComponent,
    PRINTCOMPONENTS.AnalysisSettingComponent,
    PRINTCOMPONENTS.AttachmentComponent,
    PRINTCOMPONENTS.BatchPrintComponent,
    PRINTCOMPONENTS.ParamMPCardComponent,
    PRINTCOMPONENTS.PrintComponent,
    PRINTCOMPONENTS.ReportChartsComponent,
    PRINTCOMPONENTS.ReportTemplateComponent,
    PRINTCOMPONENTS.StoreCardComponent,
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
        MatSelectModule,
        MatTabsModule,
        MatButtonModule,
        ChartsModule,
        MatTooltipModule,
        MatSlideToggleModule,
        FlexLayoutModule,
        MatCheckboxModule,
    ],
    exports: [...COMPONENTS],
})
export class PrintModule {}
