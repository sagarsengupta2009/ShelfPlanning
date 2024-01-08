import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { GridConfig } from 'src/app/shared/components/ag-grid/models/grid';
import { ShelfPowerBiReport } from 'src/app/shared/models';
import { AgGridHelperService, PlanogramStoreService } from 'src/app/shared/services';
import { ShelfPowerbiReportsService } from 'src/app/shared/services/layouts/space-automation/dashboard/shelf-powerbi-reports/shelf-powerbi-reports.service';

@Component({
  selector: 'shelf-shelf-power-bi-reports',
  templateUrl: './shelf-power-bi-reports.component.html',
  styleUrls: ['./shelf-power-bi-reports.component.scss']
})
export class ShelfPowerBiReportsComponent implements OnInit {
  public reportGridConfig: GridConfig;
  private subscriptions: Subscription = new Subscription();
  private reportGridData: ShelfPowerBiReport[];

  //planogramStore Dependency injection is required as we are using that while binding(evaluating) dynamic value of params
  constructor(private readonly shelfPowerbiReportsService: ShelfPowerbiReportsService,
    private readonly agGridHelperService: AgGridHelperService,
    private readonly dialog: MatDialogRef<ShelfPowerBiReportsComponent>,
    private readonly planogramStore: PlanogramStoreService) { }

  ngOnInit(): void {
    this.getReportGridData();
  }

  private getReportGridData(): void {
    this.subscriptions.add(this.shelfPowerbiReportsService.getPoerbiReportData().subscribe((element) => {
      this.reportGridData = element.Data;
      this.bindShelfReportGrid(this.reportGridData);
    }));
  }
  private bindShelfReportGrid(data: ShelfPowerBiReport[]): void {
    this.reportGridConfig = {
      ...this.reportGridConfig,
      id: 'shelf_powerbi_report_grid',
      columnDefs: this.agGridHelperService.getAgGridColumns('shelf_powerbi_report_grid'),
      data,
      height: 'calc(100vh - 20em)',
      hideColumnConfig: true,
      actionFields: ['ReportName']
    }
  }
  public redirectToPowerBIReport(event: { data: ShelfPowerBiReport , fieldName: string}): void {
    let reportURL = event?.data?.ReportUrl;
    event?.data?.Params.forEach((ele) => {
      const paramsValue = ele.ParamValue.toLowerCase().includes('`${') ? eval(ele.ParamValue) : ele.ParamValue;
      reportURL = reportURL +
        (!reportURL.includes('?') ? '?' : '&') +
        ele.ParamName + '=' + paramsValue;
    })

    let reportWindow = window.open(reportURL, '_blank');
    reportWindow.focus();
  }
  public closeDialog(): void {
    this.dialog.close();
  }
}
