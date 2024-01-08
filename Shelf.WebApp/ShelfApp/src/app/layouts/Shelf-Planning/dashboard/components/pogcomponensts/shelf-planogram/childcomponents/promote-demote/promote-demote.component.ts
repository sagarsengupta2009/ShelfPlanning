import {
    Component,
    OnInit,
    Inject,
    Output,
    OnDestroy,
    ViewChild,
    EventEmitter
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { filter } from 'lodash-es';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import {
    PromoteDataList,
    PogPromoteDemote,
    PogCheckinCheckout,
    PogPromoteDemoteData,
    ILogDetails,
    IApiResponse,
} from 'src/app/shared/models';
import { PromoteDemoteService } from 'src/app/shared/services/layouts/space-automation/dashboard/shelf-planogram/promote_demote/promote-demote.service';
import {
    AgGridHelperService, UserPermissionsService, NotifyService,
    PlanogramLibraryService,
} from 'src/app/shared/services';
import { GridConfig, GridColumnCustomConfig, GridColumnSettings } from 'src/app/shared/components/ag-grid/models';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { LogDetailsType } from 'src/app/shared/models/apiResponseMapper';
import { ColDef } from 'ag-grid-community';
import { PromotegridRowData } from 'src/app/shared/models/promoteDemote/promoteDemoteData';

@Component({
    selector: 'srp-promote-demote',
    templateUrl: './promote-demote.component.html',
    styleUrls: ['./promote-demote.component.scss'],
})
export class PromoteDemoteComponent implements OnInit, OnDestroy {

    public pogGridConfig: GridConfig;
    @ViewChild('agPogGrid') agPogGrid: AgGridComponent;

    public toggleName: any = 'Promote';
    public toggleClickforpromote: Boolean = true;
    public detailExpandRequired = false;
    private readonly _subscriptions: Subscription = new Subscription();
    @Output() promoteDemot: EventEmitter<any> = new EventEmitter();
    public detailgrid = false;
    public logData = [];
    public radioButtonGroup = [
        { Name: 'Promote', Value: 1 },
        { Name: 'Demote', Value: 2 },
    ];
    public columnsList: any[] = [];
    public pogRecords: any[] = [];
    public promoteFlag = 1;
    public toggleClick = false;
    public gridList: any[] = [];
    public onRowSelect = (args) => args.dataItem.IdPog;
    public selectedRows: PromotegridRowData[] = [];
    public expandedDetailKeys: any[] = [];
    public iconsColumn: GridColumnSettings[] = [
        {
            0: this.translate.instant('INFORMATION'),
            1: 'information',
            2: 14,
            3: false,
            4: false,
            5: true,
            6: false,
            7: 0,
            8: 60,
            9: false,
            10: "customAction",
            11: "INFORMATION",
            12: "",
            13: "True",
            14: "",
            15: "",
            16: 0,
            17: 0,
            18: 0,
            ColumnMenu: false,
            IsMandatory: false,
            ProjectType: "",
            SkipTemplateForExport: false,
            SortByTemplate: false,
            FilterTemplate: "",
            Template: ""
        },
        {
            0: this.translate.instant('WARNING'),
            1: 'warning',
            2: 15,
            3: false,
            4: false,
            5: true,
            6: false,
            7: 0,
            8: 60,
            9: false,
            10: "customAction",
            11: "WARNING",
            12: "",
            13: "True",
            14: "",
            15: "",
            16: 0,
            17: 0,
            18: 0,
            ColumnMenu: false,
            IsMandatory: false,
            ProjectType: "",
            SkipTemplateForExport: false,
            SortByTemplate: false,
            FilterTemplate: "",
            Template: ""
        },
        {
            0: this.translate.instant('ERROR'),
            1: 'error',
            2: 16,
            3: false,
            4: false,
            5: true,
            6: false,
            7: 0,
            8: 60,
            9: false,
            10: "customAction",
            11: "ERROR",
            12: "",
            13: "True",
            14: "",
            15: "",
            16: 0,
            17: 0,
            18: 0,
            ColumnMenu: false,
            IsMandatory: false,
            ProjectType: "",
            SkipTemplateForExport: false,
            SortByTemplate: false,
            FilterTemplate: "",
            Template: ""
        },
    ];
    //Todo: move these configuration to db
    public iconsColumnHeaderType = [
        { field: 'information', headerType: 'icon', data: { iconName: 'info', iconColor: '#555758' } },
        { field: 'warning', headerType: 'icon', data: { iconName: 'warning', iconColor: '#f6c301' } },
        { field: 'error', headerType: 'icon', data: { iconName: 'block', iconColor: 'red' } }
    ];
    public rowData: any[] = [];
    constructor(
        public dialog: MatDialogRef<PromoteDemoteComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private readonly promotedemoteService: PromoteDemoteService,
        private readonly translate: TranslateService,
        private readonly notifyService: NotifyService,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly planogramLibraryService: PlanogramLibraryService,
        private readonly userPermissions: UserPermissionsService
    ) {
        this.rowData = this.data.rowData;
    }
    public valueChange(event, data, dataItem) {
        let id = event;
        for (let d of data) {
            if (d.Value == id) {
                dataItem.selectedVersion = d;
            }
        }
    }

    public closeDialog(): void {
        this.dialog.close();
    }

    public SelectedItem(event: { data: any, fieldName: string, classList: DOMTokenList }): void {
        const idPog = Number(event.data.IdPog);
        if (event?.fieldName === 'IsOverridable') {
            this.overRideCheckbox(event?.data);
        } else if (event?.fieldName === 'Message' && event?.data?.Code && event?.data?.IsReport && event?.data?.SubType == 6) {
            this._subscriptions.add(
                this.promotedemoteService.getPromoteBRReport(event?.data).subscribe((response: IApiResponse<string>) => {
                    window.open('/api/print/Download?IsAttachment=false&url=' + response.Data, '_blank');
                }),
            );
        }
    }

    public invokeSelectedRow(): void {
        this.selectedRows = [];
        const selectedRows: PromotegridRowData[] = this.agPogGrid.gridApi.getSelectedRows();
        if (selectedRows?.length) {
            this.selectedRows = [...selectedRows];
        }
    }

    public calculateTimeElapsed(d) {
        let now = new Date();
        let past = new Date(d);
        let timeDiff = Math.abs(now.getTime() - past.getTime());
        timeDiff = timeDiff / (1000 * 60);
        return timeDiff;
    }

    public markPogObjCheckedout(idpogs) {
        idpogs.forEach((pog) => {
            pog.checkedoutManually = true;
        });
        return idpogs;
    }

    private preparePostData() {
        const dataToPost: PogPromoteDemoteData[] = [];
        let promoteLivePog = false;
        let demoteExpPog = false;
        let demoteLivePog = false;

        let LiveCount = 0;
        let isPromotingToLiveAllowed = true;
        let UnselectedVersions = 0;
        for (let item of this.selectedRows) {
            let status = this.logData.filter((logs) => logs['IdPog'] == item['IdPog'] && logs['IsOverridable']);
            if (status.length == 0) {
                status = null;
            }
            if (this.promoteFlag == 1) {
                if (item.POGStatusFrom == 'Live') {
                    promoteLivePog = true;
                }
            } else if (this.promoteFlag == 2) {
                if (item.POGStatusFrom == 'Experimental') {
                    demoteExpPog = true;
                }
                if (item.POGStatusFrom == 'Live') {
                    demoteLivePog = true;
                }
            }
            if (!demoteExpPog && !promoteLivePog && !demoteLivePog) {
                dataToPost.push({
                    IdPog: item.IdPog,
                    IdPogStatus: typeof item.selectedVersionvalue === 'object' ? item.selectedVersionvalue?.key : item.selectedVersionvalue,
                    Log: status,
                    isLoaded: item.isLoaded,
                });
                if (item.selectedVersionvalue == 5) {
                    LiveCount = LiveCount + 1;
                }
            } else {
                dataToPost.push({ IdPog: item.IdPog, Log: status });
            }
            if (item.selectedVersion == this.translate.instant('BR_DASHBRD_SELECT_VERSION')) {
                UnselectedVersions++;
            }
        }
        const promoteToLivePermission = this.userPermissions.hasUpdatePermission('POG_PROMOTE_TO_LIVE');
        if (!promoteToLivePermission && LiveCount > 0) {
            isPromotingToLiveAllowed = false;
        }
        if (dataToPost.length > 0) {
            if (isPromotingToLiveAllowed) {
                if (!promoteLivePog) {
                    if (!demoteExpPog) {
                        if (!demoteLivePog) {
                            if (UnselectedVersions == 0) {
                                return dataToPost;
                            } else {
                                this.notifyService.warn('PRM_SEL_POGVER');
                            }
                        } else {
                            this.notifyService.warn('DEMOTE_LIVE_NOT_ALLOWED');
                        }
                    } else {
                        this.notifyService.warn('DEMOTE_EXPERIMENTAL_NOT_ALLOWED');
                    }
                } else {
                    this.notifyService.warn('PROMOTE_LIVE_NOT_ALLOWED');
                }
            } else {
                this.notifyService.warn('BR_PROMOTE_LIVE_MSG');
            }
        }
        return [];
    }

    public invokePromoteDemote() {
        if (this.selectedRows.length == 0) {
            this.notifyService.warn('Please Select a planogram to Promote/demote');
            return;
        }

        this.expandedDetailKeys = [];
        const obj: PogCheckinCheckout = { Comments: '', IsCheckedOut: true, data: [] };
        obj.data = this.selectedRows.map((item) => {
            return { IDPOG: item.IdPog, Version: '' };
        });
        this._subscriptions.add(
            this.promotedemoteService.pogCheckinCheckout(obj).subscribe((res: any) => {
                this.expandedDetailKeys = this.selectedRows.map((item) => item.IdPog);
                // added missing code and permission check for post data in this.preparePostData()
                const postobj: PogPromoteDemote = {
                    enableHistory: this.toggleClick,
                    promote: this.promoteFlag,
                    data: this.preparePostData(),
                };
                if (res.Data) {
                    for (let itm of res.Data) {
                        // if pog cannot be edited remove from post array
                        if (postobj.data.findIndex((obj) => obj.IdPog == itm.idPog && !itm.canEdit) > -1) {
                            postobj.data.splice(
                                postobj.data.findIndex((obj) => obj.IdPog == itm.idPog && !itm.canEdit),
                                1,
                            );
                        }
                    }
                }
                if (postobj.data.length > 0) {
                    this._subscriptions.add(
                        this.promotedemoteService.pogPromoteDemote(postobj).subscribe((res: any) => {
                            if (res && res['Log']['Summary']['Error'] > 0) {
                                this.notifyService.error(res['Log']['Details'][0]['Message']);
                            } else {
                                let data = filter(res.Log.Details, { Type: 8 });
                                if (data.length == 1) {
                                    this.planogramLibraryService.promotedemoteUpdate(res);
                                    if (data[0].Message && data[0].Message.length > 0) {
                                      this.notifyService.success(data[0].Message);
                                    } else {
                                      this.notifyService.success('ASYNC_PROMOTE_SUCCESS_MSG');
                                    }
                                    this.dialog.close(true);
                                } else {
                                    this.logData = this.preparelogdetails(res.Log.Details);
                                    this.detailgrid = true;
                                    this.detailExpandRequired = true;
                                    // send the selected rows, pog should be updated in planogram library
                                    this.getGridData(this.selectedRows);
                                }
                            }
                            obj.IsCheckedOut = false;
                            this._subscriptions.add(
                                this.promotedemoteService.pogCheckinCheckout(obj).subscribe((res) => {}),
                            );
                        }),
                    );
                }
            }),
        );
    }

    public selectionchange(value) {
        this.detailExpandRequired = false;
        this.expandedDetailKeys = [];
        this.toggleClick = false;
        if (value == 1) {
            this.toggleName = 'Promote';
        } else {
            this.toggleName = 'Demote';
        }
        this.getGridData();
    }

    public excelExport() {
        this.agPogGrid.exportToExcel();
    }

    public toggleChange() {
        this.toggleClick = !this.toggleClick;
        if (!this.toggleClick) {
            this.expandedDetailKeys = [];
            //this.prmoteDemoteData.detailExpand = false;
            this.detailExpandRequired = false;
            this.bindgriddata(this.pogRecords);
        }
        if (this.toggleClick) {
            this.logData = [];
            this.expandedDetailKeys = [];
            let IdpogList = '';
            this.rowData.forEach((value, key) => {
                if (key == 0) {
                    IdpogList = value.IDPOG;
                } else {
                    IdpogList = IdpogList + ',' + value.IDPOG;
                }
            });
            this._subscriptions.add(
                this.promotedemoteService.getLogs(IdpogList).subscribe((res: any) => {
                    this.logData = this.preparelogdetails(res.Log.Details);
                    for (let d of this.pogRecords) {
                        d.logDetails = this.logData.filter((item) => item.IdPog == d.IdPog);
                        if (this.expandedDetailKeys.indexOf(d.IdPog) < 0) {
                            this.expandedDetailKeys.push(d.IdPog);
                        }
                        let brCount: any = this.getBrLogCount(d.IdPog);
                        d['error'] = brCount.error == 0 ? null : brCount.error;
                        d['information'] = brCount.information == 0 ? null : brCount.information;
                        d['warning'] = brCount.warning == 0 ? null : brCount.warning;
                    }
                    this.detailExpandRequired = true;
                    this.bindgriddata(this.pogRecords);
                }),
            );
        }
    }

    public getBrLogCount(id) {
        let data: any[] = this.logData.filter((item) => item['IdPog'] == id);
        let brCount = { warning: 0, information: 0, error: 0 };
        for (let item of data) {
            if (item.Type == 3) {
                if (item.SubType == 6) {
                    brCount.error++;
                } else if (item.SubType == 7) {
                    brCount.warning++;
                } else if (item.SubType == 8) {
                    brCount.information++;
                }
            }
        }
        return brCount;
    }

    public getGridData(edittedRows?) {
        this.pogRecords = [];
        const obj: PromoteDataList = { IDPogs: this.rowData.map((x) => x.IDPOG), promoteFlag: this.promoteFlag };
        this._subscriptions.add(
            this.promotedemoteService.getPromoteData(obj).subscribe((res: any) => {
                this.pogRecords = res.Data;
                //for (let d of this.pogRecords) {
                //  if (d.IDPOGStatusTo.length == 0) {
                //    let index = this.pogRecords.indexOf(d);
                //    this.pogRecords.splice(index, 1)
                //  }
                //}
                this.pogRecords.forEach((value, key) => {
                    if (typeof value.IDPOGStatusTo[0] != 'undefined') {
                        this.pogRecords[key]['selectedVersionname'] = value.IDPOGStatusTo[0].Name;
                        this.pogRecords[key]['selectedVersionvalue'] = value.IDPOGStatusTo[0].Value;
                    } else {
                        this.pogRecords[key]['selectedVersion'] = '';
                    }
                    this.rowData.forEach((item, ky) => {
                        if (value.IdPog == item.IDPOG) {
                            this.pogRecords[key]['logDetails'] = this.logData.filter(
                                (item) => value.IdPog == item.IdPog,
                            );
                            this.pogRecords[key]['isLoaded'] = this.rowData[ky].isLoaded;
                            this.pogRecords[key]['IsReadOnly'] =
                                [4, 5].indexOf(this.pogRecords[key].IDPOGStatusFrom) > -1 ? true : false; //this.rowData[ky].IsReadOnly;
                            this.pogRecords[key]['isCheckInOutEnable'] = this.rowData[ky].isCheckInOutEnable;
                            this.pogRecords[key]['isCheckedOut'] = this.rowData[ky].isCheckedOut;
                            this.pogRecords[key]['POGLastModifiedBy'] = this.rowData[ky].POGLastModifiedBy;
                            this.pogRecords[key]['POGLastModifiedDate'] = this.rowData[ky].POGLastModifiedDate;
                            this.pogRecords[key]['EffectiveFrom'] = this.rowData[ky].EffectiveFrom;
                            this.pogRecords[key]['EffectiveTo'] = this.rowData[ky].EffectiveTo;
                            this.pogRecords[key]['L3'] = this.rowData[ky].L3;
                            this.pogRecords[key]['L4'] = this.rowData[ky].L4;
                            this.pogRecords[key]['L5'] = this.rowData[ky].L5;
                            this.pogRecords[key]['L6'] = this.rowData[ky].L6;
                        }
                    });
                    let brCount: any = this.getBrLogCount(value.IdPog);
                    this.pogRecords[key]['error'] = brCount.error == 0 ? null : brCount.error;
                    this.pogRecords[key]['information'] = brCount.information == 0 ? null : brCount.information;
                    this.pogRecords[key]['warning'] = brCount.warning == 0 ? null : brCount.warning;
                });
                //this.prmoteDemoteData.data = this.pogRecords;
                if (this.data.failedFlag) {
                    this.data.failedFlag = false;
                    this.toggleChange();
                }
                this.bindgriddata(this.pogRecords);
                if (edittedRows) {
                    this.updatePLanogramLIbrary(edittedRows);
                }
            }),
        );
    }

    ngOnInit(): void {
        this.radioButtonGroup = [
            { Name: this.translate.instant('BR_DASHBRD_PROMOTE'), Value: 1 },
            { Name: this.translate.instant('PRM_DEMOTE'), Value: 2 },
        ];
        this.selectedRows = [];
        this.getGridData();
    }

    ngOnDestroy() {
        if (this._subscriptions) {
            this._subscriptions.unsubscribe();
        }
    }
    bindgriddata(data) {
        let gridColumnCustomConfig: GridColumnCustomConfig = {
            customCol: this.iconsColumn,
            headerParams: this.iconsColumnHeaderType
        }
        let cols: ColDef[] = this.agGridHelperService.getAgGridColumns('promoteDemoteGrid', gridColumnCustomConfig);
        cols.forEach((col) => {
            if (col.field == 'selectedVersionvalue') {
                col['headerName'] = this.promoteFlag == 1 ? this.translate.instant('BR_DASHBRD_PROMOTE_TO') : this.translate.instant('PRM_DEMOTE_TO');
            }
        })
        if (this.agPogGrid) {
            setTimeout(() => {
                //called to retain selection while switching promote/demote
                this.invokeSelectedRow();
                this.agPogGrid.gridConfig.columnDefs = cols;
                if (this.agPogGrid.gridConfig?.firstCheckBoxColumn) {
                    this.agPogGrid.addCheckboxColumn();
                }
                this.agPogGrid?.gridApi?.setRowData(data);
                this.agPogGrid?.params.api.forEachNode((node) => {
                    node.setSelected(this.selectedRows.some(x => x.IdPog === node.data.IdPog), false, true);
                    if (node?.data?.logDetails?.length) {
                        node.setExpanded(this.detailExpandRequired);
                    } else {
                        node.setExpanded(false);
                    }
                });
                //called to bind latest values after data loaded into grid
                this.invokeSelectedRow();
            });

        } else {
            this.selectedRows = this.pogRecords.filter((item) => item['IDPOGStatusTo'].length != 0);
            this.pogGridConfig = {
                ...this.pogGridConfig,
                id: `promoteDemoteGrid`,
                columnDefs: cols,
                height: 'calc(90vh - 25.3em)',
                data,
                masterDetails: { show: true, id: 'br-DashBoardGrid' },
                firstCheckBoxColumn: { show: true, template: `dataItem.IDPOGStatusTo.length == 0` },
                setRowsForSelection: { items: this.selectedRows, field: 'IdPog' },
                actionFields: ['IsOverridable', 'Message'],
                supressSrNo: true,
                gridColumnCustomConfig: gridColumnCustomConfig
            }
        }
    }

    public menuButtonClick_PromoteDemote = (response) => {
        let selectedMenu = response[`data`];
        if (selectedMenu) {
            switch (selectedMenu[`key`].trim()) {
                case 'pogPromoteDemote_DOWNLOADTEMPLATE':
                    this.toggleChange();
                    break;
                case 'pogPromoteDemote_EXPORT':
                    this.excelExport();
                    break;
                case 'pogPromoteDemote_CLOSE':
                    this.closeDialog();
                    break;
            }
        }
    };

    public updatePLanogramLIbrary(edittedRows) {
        let ediitedpog: any[] = [];
        for (let d of edittedRows) {
            let index = this.planogramLibraryService.mapper.findIndex((item) => item.IDPOG == d.IdPog);
            if (index > -1) {
                ediitedpog.push(this.planogramLibraryService.mapper[index]);
            }
        }
        if (edittedRows) {
            this._subscriptions.add(this.planogramLibraryService.updateMapperObject(ediitedpog).subscribe(() =>{  this.promoteDemot.emit(true);}));
        }
       
    }

    public isPromoteDisabled() {
        return !this.userPermissions.hasUpdatePermission('POGPROMOTE');
    }

    private overRideCheckbox(dataItem) {
        if (dataItem) {
            //TODO @Keerthi need to remove below 2 lines once hanled in ag-grid component 
            const ele = document.getElementById(dataItem.IdPogLog) as HTMLInputElement;
            dataItem.IsCheck = (ele?.checked) ? true : false;
            let index = this.logData.findIndex((item) => item['IdPogLog'] == dataItem.IdPogLog);
            if (index > -1) {
                this.logData[index].IsCheck = dataItem.IsCheck;
            }
        }
    }

    private preparelogdetails(logDetails: ILogDetails[]) {
        let promoteDemoteLogDetails = logDetails.filter(l => l.Type === LogDetailsType.BR);
        for (let d of promoteDemoteLogDetails) {
            if (d.SubType == 6) {
                d.subTypeName = this.translate.instant('ERROR');
                d.subTypeRow = 'error-row';
            } else if (d.SubType == 7) {
                d.subTypeName = this.translate.instant('WARNING');
                d.subTypeRow = 'warning-row';
            } else if (d.SubType == 8) {
                d.subTypeName = this.translate.instant('INFORMATION');
                d.subTypeRow = 'info-row';
            }
            if (this.calculateTimeElapsed(d.RunOn) < 5) {
                d.excutedEarlier = 'Now';
            } else {
                d.excutedEarlier = 'Earlier';
            }
        }
        return promoteDemoteLogDetails;
    }
}
