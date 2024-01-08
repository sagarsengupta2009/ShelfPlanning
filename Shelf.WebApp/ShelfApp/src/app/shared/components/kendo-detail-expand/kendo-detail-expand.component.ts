import { Component, OnInit, Input, OnDestroy, ViewChild, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';
import { IApiResponse, KednoGridConfig, PromoteLog } from '../../models';
import { SaDashboardService, InformationConsoleLogService } from '../../services';
import { KendoGridComponent } from '../kendo-grid/kendo-grid.component';
import { PromoteDemoteService } from '../../services/layouts/space-automation/dashboard/shelf-planogram/promote_demote/promote-demote.service';

@Component({
    selector: 'srp-kendo-detail-expand',
    templateUrl: './kendo-detail-expand.component.html',
    styleUrls: ['./kendo-detail-expand.component.scss'],
})
/**
 * TODO @karthik this needs to be generic. There is currently a very tight coupling between how the promote log and kendo detail grid are bound.
 *  Needs analysis to seperate responsbility and seperate detail expand as
 *  */
export class KendoDetailExpandComponent implements OnInit, OnDestroy {
    @Input() config: { dataItem: object; gridId: string };
    @Output() onActionEmit = new EventEmitter<{ dataItem: object; id: string }>();
    @ViewChild('grid') grid: KendoGridComponent;

    public gridConfig: KednoGridConfig;
    private subscriptions: Subscription = new Subscription();

    constructor(
        private readonly saDashboardService: SaDashboardService,
        private readonly consoleLogService: InformationConsoleLogService,
        private readonly promoteDemoteService: PromoteDemoteService,
    ) {}

    ngOnInit(): void {
        this.loadData();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        // TODO @og will create on notify service
        //this.snackBar.dismiss();
    }

    public SelectedItem(event: { element: string; dataItem: PromoteLog }): void {
        if (event.element && event.dataItem) {
            switch (event.element) {
                case 'errorReport':
                    this.GeneratePromoteBRReport(event.dataItem);
                    break;
                case 'overRideCheckbox':
                    this.overRideCheckbox(event.dataItem);
                    break;
                default:
                    break;
            }
        }
    }

    private loadData() {
        if (this.config) {
            switch (this.config.gridId) {
                case 'promoteDemoteGrid':
                    {
                        this.gridConfig = {
                            id: `br-DashBoardGrid`,
                            data: this.config.dataItem['logDetails'],
                            columns: this.saDashboardService.GetGridColumns(`br-DashBoardGrid`),
                            height: '200px',
                            uniqueColumn: 'IdPogLog',
                            columnConfig: false,
                        };
                    }
                    break;
                default:
                    break;
            }
        }
    }

    private overRideCheckbox(log: PromoteLog): void {
        let checked = false;
        const ele = document.getElementById(log.IdPogLog) as HTMLInputElement;
        if (ele) {
            ele.checked = ele.checked ? false : true;
        }
        checked = ele?.checked ? true : false;
        log.IsCheck = checked;
        this.onActionEmit.emit({ dataItem: log, id: 'overRideCheckbox' });
        this.consoleLogService.updateLog(log, checked);
    }

    private GeneratePromoteBRReport(log: PromoteLog): void {
        this.subscriptions.add(
            this.promoteDemoteService.getPromoteBRReport(log).subscribe((response: IApiResponse<string>) => {
                window.open('/api/print/Download?IsAttachment=false&url=' + response.Data, '_blank');
            }),
        );
    }
}
