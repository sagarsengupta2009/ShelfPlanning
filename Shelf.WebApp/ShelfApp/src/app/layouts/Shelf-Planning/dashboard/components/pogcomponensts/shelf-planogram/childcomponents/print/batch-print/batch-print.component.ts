import { Component, OnInit, Inject, ViewChild, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AgGridHelperService, BatchPrintService } from 'src/app/shared/services';
import {
    BatchPrintAccess,
    BatchPrintPogsInput,
    BatchReport,
    IDPogStoreCollection,
} from 'src/app/shared/models/print/batch-print';
import { IApiResponse } from 'src/app/shared/models';
import { GridConfig } from 'src/app/shared/components/ag-grid/models';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-batch-print',
    templateUrl: './batch-print.component.html',
    styleUrls: ['./batch-print.component.scss'],
})
export class BatchPrintComponent implements OnInit, OnDestroy {

    @ViewChild(`agReportGrid`) agReportGrid: AgGridComponent;
    public reportGridConfig: GridConfig;
    public selectedRows: BatchReport[] = [];
    private idPogCollection: IDPogStoreCollection[];
    private idStore: number;
    private selectedIDPOG: number[];
    private reportCollection: BatchReport[];
    private subscription: Subscription = new Subscription();
    constructor(
        public readonly dialog: MatDialogRef<BatchPrintComponent>,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly batchPrintService: BatchPrintService,
        @Inject(MAT_DIALOG_DATA) private data: { IdPogCollection: IDPogStoreCollection[]; idStore?: number },
    ) { }

    ngOnInit() {
        this.fetchReport(this.data.IdPogCollection, this.data.idStore);
    }

    public closeDialog(): void {
        this.dialog.close();
    }

    public excelAsExport(): void {
        this.agReportGrid.exportToExcel();
    }

    public SelectedItem(event: { data: any, fieldName: string, classList: DOMTokenList }): void {
        if (event.fieldName == 'action' && event.data) {
            this.openReport(event.data);
        }
    }

    public printPogs(): void {
        if (this.selectedRows.length == 0) {
            return;
        }
        this.selectedRows.sort((a, b) => {
            if (a.IDPOG < b.IDPOG) return -1;
            if (a.IDPOG > b.IDPOG) return 1;
            if (a.seqNo < b.seqNo) return -1;
            if (a.seqNo > b.seqNo) return 1;
            return 0;
        });

        const sortedIdPogList = this.selectedRows.map((item) => item['IDPOGAttachment']);
        const batchPrintPogs: BatchPrintPogsInput = {
            IDReports: sortedIdPogList,
            IsRegenerate: false,
            IDPOGList: this.selectedIDPOG,
        };
        this.subscription.add(this.batchPrintService
            .getReportsInBatch(batchPrintPogs)
            .subscribe((response: IApiResponse<BatchPrintAccess>) => {
                if (response.Data) {
                    var reportUrl = response.Data.URL;
                    var isHttpUrl = reportUrl.indexOf('file');
                    if (isHttpUrl == -1) {
                        const win = window.open('/api/print/Download?IsAttachment=false&url=' + reportUrl, '_blank');
                        win.focus();
                    } else {
                        this.forceDownload('/api/print/Download?IsAttachment=false&url=' + reportUrl);
                    }
                }
            }));
    }

    public InvokeSelectedRow(): void {
        this.selectedRows = [];
        const selectedRows = this.agReportGrid.gridApi.getSelectedRows();
        if (selectedRows?.length) {
            this.selectedRows = [...selectedRows];
        }
    }



    public refreshGrid() {
        this.fetchReport(this.data.IdPogCollection, this.data.idStore);
    }

    private openReport(dataItem: BatchReport): void {
        if (dataItem.IDReportStatus == 2 || dataItem.IDReportStatus == 4) {
            let reportUrl = dataItem.URL;
            let isHttpUrl = reportUrl.indexOf('file');
            if (isHttpUrl == -1) {
                var win = window.open('/api/print/Download?IsAttachment=false&url=' + dataItem.URL, '_blank');
                win.focus();
            } else {
                this.forceDownload('/api/print/Download?IsAttachment=false&url=' + dataItem.URL);
            }
        }
    }

    private forceDownload(link: string): void {
        let myTempWindow = window.open(link, '_blank');
        myTempWindow.focus();
    }

    private fetchReport(idPogCollection: IDPogStoreCollection[], idStore: number): void {
        this.idPogCollection = idPogCollection ? idPogCollection : this.idPogCollection;
        this.idStore = idStore ? idStore : this.idStore;
        this.selectedIDPOG = this.idPogCollection.map((idpog) => {
            return idpog.IDPog;
        });
        this.subscription.add(this.batchPrintService.getReportList(this.selectedIDPOG).subscribe((res: IApiResponse<BatchReport[]>) => {
            let c = 1;
            for (let obj of res.Data) {
                obj['seqNo'] = c;
                c++;
            }
            this.reportCollection = res.Data;
            this.bindGridData(this.reportCollection);
        }));
    }

    private bindGridData(data: BatchReport[]): void {
        this.selectedRows = [...data.filter(x => x.IDReportStatus === 2 || x.IDReportStatus === 4)];

        if (this.agReportGrid) {
            this.agReportGrid?.gridApi?.setRowData(data);
            this.agReportGrid?.gridApi?.selectAll();
        } else {
            this.reportGridConfig = {
                ...this.reportGridConfig,
                id: `BATCH_PRINT_GRID`,
                columnDefs: this.agGridHelperService.getAgGridColumns('BATCH_PRINT_GRID'),
                height: 'calc(95vh - 18rem)',
                data,
                setRowsForSelection: { items: this.selectedRows, field: 'IDPOGAttachment' },
                firstCheckBoxColumn: { show: true, template: `dataItem.IDReportStatus !== 2 && dataItem.IDReportStatus !== 4` },
                actionFields: ['action']
            }
        }
    }
    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}
