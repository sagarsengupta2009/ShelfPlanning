import { Component, OnInit, Output, Inject, EventEmitter } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ChartSettingData } from 'src/app/shared/models';

@Component({
    selector: 'sp-analysis-setting',
    templateUrl: './analysis-setting.component.html',
    styleUrls: ['./analysis-setting.component.scss'],
})
export class AnalysisSettingComponent implements OnInit {
    public data: ChartSettingData;
    @Output() emitSelectedTemplate = new EventEmitter();
    constructor(
        private readonly dialog: MatDialogRef<AnalysisSettingComponent>,
        @Inject(MAT_DIALOG_DATA) private readonly settingdata: ChartSettingData,
    ) {
        this.data = settingdata;
    }

    ngOnInit(): void {}

    closeDialog() {
        this.dialog.close();
    }

    public refreshAnalysisCharts() {
        this.emitSelectedTemplate.emit({ data: this.data, emitTYpe: 'refreshAnalysisCharts' });
    }
    public changeAttributeType() {
        this.emitSelectedTemplate.emit({ data: this.data, emitTYpe: 'changeAttributeType' });
    }
    public oncheckboxChange() {
        this.emitSelectedTemplate.emit({ data: this.data, emitTYpe: 'oncheckboxChange' });
    }
    public onChartTypeChange() {
        this.emitSelectedTemplate.emit({ data: this.data, emitTYpe: 'onChartTypeChange' });
    }
}
