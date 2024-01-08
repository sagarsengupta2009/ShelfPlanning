import { Component, OnInit, Input, ViewChild, Output, EventEmitter, OnDestroy } from '@angular/core';
import { PanelService, ReportandchartsService } from 'src/app/shared/services';
import { ReportChartsComponent } from './report-charts/report-charts.component';

@Component({
    selector: 'sp-print',
    templateUrl: './print.component.html',
    styleUrls: ['./print.component.scss'],
})
export class PrintComponent implements OnInit, OnDestroy {
    @ViewChild(`reportsCntnr`) reportsCntnr: ReportChartsComponent;
    @Output() onClose = new EventEmitter();
    @Input() compData;
    public pogObj;
    public panelId: string;
    public reportsView: boolean = false;
    public config = {
        reportsandcharts: false,
        attachment: false,
    };
    private previousPanelView: string;
    constructor(
      public reportchartsService: ReportandchartsService,
      private readonly panel:PanelService) {}

    ngOnInit(): void {
        this.pogObj = this.compData.pogObj;
        this.panelId = this.compData.panelId;
        this.previousPanelView = this.panel.panelPointer[this.panelId].view;
        this.panel.panelPointer[this.panelId].view = 'PrintAndReport';
        this.onTabChanged({ index: this.reportchartsService.selectedIndex });
    }

    ngOnDestroy(): void {
      this.panel.panelPointer[this.panelId].view = this.previousPanelView;
    }
    
    public onTabChanged(event: { index: number }): void {
        this.reportsView = false;
        switch (event.index) {
            case 0:
                this.reportsView = true;
                if (!this.config.reportsandcharts) {
                    this.config.reportsandcharts = true;
                }
                break;
            case 1:
                if (!this.config.attachment) {
                    this.config.attachment = true;
                }
                break;
        }
    }

    public closePrint(): void {
        this.onClose.emit(false);
    }

    public refreshReportGrid(): void {
        if (this.reportsCntnr) {
            this.reportsCntnr.refreshReport();
        }
    }
}
