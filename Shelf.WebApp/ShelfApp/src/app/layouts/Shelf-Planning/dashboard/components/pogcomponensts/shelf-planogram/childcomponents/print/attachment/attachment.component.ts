import { Component, OnInit, Input, OnDestroy, ViewChild } from '@angular/core';
import { KednoGridConfig } from 'src/app/shared/models/kendoGrid';
import { Subscription } from 'rxjs';
import {
    AgGridHelperService,
    SharedService,
    PlanogramService,
    PanelService,
    ParentApplicationService,
    ReportandchartsService,
    NotifyService,
    PlanogramStoreService,
} from 'src/app/shared/services';
import { AttachmentList,PanelSplitterViewType } from 'src/app/shared/models';
import { SplitterService } from 'src/app/shared/services/layouts/space-automation/dashboard/splitter/splitter.service';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { GridConfig } from 'src/app/shared/components/ag-grid/models';

@Component({
    selector: 'app-attachment',
    templateUrl: './attachment.component.html',
    styleUrls: ['./attachment.component.scss'],
})
export class AttachmentComponent implements OnInit, OnDestroy {
    @ViewChild(`agAttachmentGrid`) agAttachmentGrid: AgGridComponent;
    @Input() panelid: string;
    private subscriptions: Subscription = new Subscription();
    public isUploadSectionOpen = false;
    private newAttachmentName: string;
    private newAttachmentFile: File;
    public selfile = null;
    private objectLoaded; //TODO expecting form another interface
    private panelInfo;
    public attachmentGridConfig: GridConfig;
    public splitterOrientation: number;

    constructor(
        private readonly agGridHelperService: AgGridHelperService,
        private readonly reportService: ReportandchartsService,
        private readonly panelService: PanelService,
        private readonly planogramService: PlanogramService,
        public readonly sharedService: SharedService,
        private readonly notifyService: NotifyService,
        private readonly parentApp: ParentApplicationService,
        public readonly planogramStoreService: PlanogramStoreService,
        public readonly splitterService: SplitterService
    ) {}

    ngOnInit(): void {
        this.initAttachmentTool();
        this.fetchDataAndRefresh();
    }

    ngOnDestroy(): void {
        this.subscriptions?.unsubscribe();
    }

    public onFileChange(files: FileList): void {
        this.newAttachmentName = files[0].name;
        this.newAttachmentFile = files[0];
    }

    public uploadAttachment(): void {
        let tempArr = {
            IdPog: this.objectLoaded.IDPOG,
            Name: this.newAttachmentName,
        };

        let formData = new FormData();
        formData.append('file', this.newAttachmentFile);
        formData.append('json', JSON.stringify(tempArr));
        this.subscriptions.add(
            this.reportService.uploadAttachment(formData).subscribe((res) => {
                if (res && res.Log.Summary.Error) {
                    this.notifyService.error(res.Log.Details[0].Message);
                } else {
                    if (res.Data) {
                        this.fetchDataAndRefresh();
                        this.newAttachmentName = '';
                        this.newAttachmentFile = null;
                        this.selfile = undefined;
                    }
                }
            }),
        );
    }

    private _commandDeleteHandler(dataItem: AttachmentList): void {
        if (dataItem?.IdPogAttachment) {
            this.subscriptions.add(
                this.reportService.deleteAttachment({ idAttachment: dataItem.IdPogAttachment }).subscribe((res) => {
                    if (res && res.Log.Summary.Error) {
                        this.notifyService.error(res.Log.Details[0].Message);
                    } else {
                        this.fetchDataAndRefresh();
                    }
                }),
            );
        }
    }

    private forceDownloadAttachment(link: string): void {
        let ua = window.navigator.userAgent;
        let msie = ua.indexOf('MSIE ');

        if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
            window.open(link, 'Download');
        } else {
            window.open(link, '_self');
        }
    }

    private _commandOpenHandler(dataItem: AttachmentList): void {
        if (!dataItem?.AttachmentURL) {
            return;
        }
        let AttachmentURL = dataItem.AttachmentURL;
        let isHttpUrl = AttachmentURL.indexOf('file');
        if (isHttpUrl == -1) {
            let win = window.open(dataItem.AttachmentURL, '_blank');
            win.focus();
        } else {
            this.forceDownloadAttachment(dataItem.AttachmentURL);
        }
    }

    public SelectedItem(event: { data: AttachmentList, fieldName: string, iconName: string }): void {
        switch (event?.iconName) {
            case 'visibility':
                this._commandOpenHandler(event.data);
                break;
            case 'delete':
                this._commandDeleteHandler(event.data);
                break;
        }
    }

    private _prepareDataModel(rawData: AttachmentList[]): AttachmentList[] {
        let preparedData: AttachmentList[] = [];
        for (let attachemntRow of rawData) {
            //do some manipuulation
            attachemntRow.cDocType = attachemntRow.IsSystemGenerated ? 'System Report' : attachemntRow.DocumentSubType;
        }
        if (this.sharedService.vmode) {
            for (let attachemntRow of rawData) {
                if (attachemntRow.IdStore == this.parentApp.idStore || !attachemntRow.IdStore) {
                    preparedData.push(attachemntRow);
                }
            }
        } else {
            preparedData = rawData;
        }
        preparedData = preparedData.filter((item) => item.IsMarkedForDelete == false);
        return preparedData;
    }

    private reloadGrid(rawData: AttachmentList[]): void {
        this.bindgriddata(this._prepareDataModel(rawData));
    }

    private bindgriddata(data: AttachmentList[]): void {
        if (this.agAttachmentGrid) {
            this.agAttachmentGrid.gridConfig.data = data;
            this.agAttachmentGrid?.gridApi?.setRowData(data);
        } else {
            this.attachmentGridConfig = {
                ...this.attachmentGridConfig,
                id: 'attachment_Grid',
                columnDefs: this.agGridHelperService.getAgGridColumns('attachment_Grid'),
                data,
                height: this.splitterService.splitterOrientation === PanelSplitterViewType.OverUnder? 'calc(100vh - 37em)' : 'calc(100vh - 14em)',
                actionFields: ['Action']
            }
        }
    }

    public fetchDataAndRefresh(): void {
        this.subscriptions.add(
            this.reportService.getAttachmentList(this.objectLoaded.IDPOG).subscribe((res) => {
                if (res && res.Log.Summary.Error) {
                    this.notifyService.error(res.Log.Details[0].Message);
                } else if (res && res.Data) {
                    this.reloadGrid(res.Data);
                }
            }, (error) => {
                if (error) {
                    this.notifyService.error(error, 'GOT IT!');
                }
            }),
        );
    }

    private initAttachmentTool(): void {
        this.isUploadSectionOpen = false;
        this.newAttachmentName = null;
        this.newAttachmentFile = null;
        this.selfile = undefined;
        this.panelInfo = this.panelService.panelPointer[this.panelid];
        this.objectLoaded = this.planogramService.getCurrentObject(this.panelInfo?.globalUniqueID);
        this.splitterOrientation = this.splitterService.splitterOrientation;
    }
}
