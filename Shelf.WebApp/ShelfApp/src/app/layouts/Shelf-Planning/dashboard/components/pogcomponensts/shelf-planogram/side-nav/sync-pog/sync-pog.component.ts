import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { Products, SyncDashboardData, CheckinCheckout, POGLibraryListItem } from 'src/app/shared/models';
import { KendoGridComponent } from 'src/app/shared/components/kendo-grid/kendo-grid.component';
import { AgGridHelperService, NotifyService, PlanogramStoreService } from 'src/app/shared/services';
import {
    PlanogramService,
    SharedService,
    SyncPogItemsService,
    SaDashboardService,
    PlanogramSaveService,
} from 'src/app/shared/services';
import { ConsoleLogService } from 'src/app/framework.module';
import { GridConfig, GridColumnCustomConfig } from 'src/app/shared/components/ag-grid/models';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { ExcelExportParams } from 'ag-grid-enterprise';
import { AgGridStoreService } from 'src/app/shared/components/ag-grid/services/ag-grid-store.service';
;


@Component({
    selector: 'shelf-sync-pog',
    templateUrl: './sync-pog.component.html',
    styleUrls: ['./sync-pog.component.scss'],
})
export class SyncPogComponent implements OnInit, OnDestroy {
    @ViewChild(`syncPogGrid`) syncPogGrid: KendoGridComponent;
    @ViewChild(`syncPogAnchorGrid`) syncPogAnchorGrid: AgGridComponent;
    @ViewChild(`syncPogStatusGrid`) syncPogStatusGrid: AgGridComponent;
    public preparedPogsData: POGLibraryListItem[] = [];
    public SyncDashBoardData: SyncDashboardData[] = [];
    public syncWithAnchorData: Products[];

    public syncPogGridConfig: GridConfig;
    @ViewChild('agSyncPogGrid') agSyncPogGrid: AgGridComponent;

    public gridConfigStatusGrid: GridConfig;
    public gridConfigAnchorGrid: GridConfig;
    private subscriptions: Subscription = new Subscription();
    public filterText: string = ``;
    public tabIndex: number = 0;
    public anchorPogIDPOG: number;
    public showSyncGrid: boolean;
    public selectedDataItem: POGLibraryListItem[] = [];
    public allowItemFilterPOGSync: string;
    public CheckBoxModel = {
        InsertIntoShoppingCart: true,
        includeShoppingCart: false,
    };
    public pogList: POGLibraryListItem[];
    public selectedRows: POGLibraryListItem[] = [];
    private syncPogAnchorGridSelectedId = [];
    private customCheckboxSelection = [];
    private singleCustomCheckboxSelection = [];
    constructor(
        private readonly syncPogItemsService: SyncPogItemsService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly saDashboardService: SaDashboardService,
        private readonly sharedService: SharedService,
        private readonly planogramService: PlanogramService,
        private readonly notifyService: NotifyService,
        private readonly log: ConsoleLogService,
        private readonly planogramSaveService: PlanogramSaveService,
        public readonly dialog: MatDialogRef<SyncPogComponent>,
        private readonly agGridStoreService: AgGridStoreService,
        private readonly agGridHelperService: AgGridHelperService
    ) { }

    ngOnInit(): void {
        const data: POGLibraryListItem[] = this.planogramStore.mappers;
        this.prepareDataModel(data);
        this.initiateSyncPogStatusGrid(false);
    }

    // SyncPogStatusGrid
    public initiateSyncPogStatusGrid = (synProcessInitiated: boolean): void => {
        this.subscriptions.add(
            this.syncPogItemsService.getSyncDashboardData(this.planogramStore.scenarioId).subscribe(
                (res: any) => {
                    if (res && res['Log']['Summary']['Error'] > 0) {
                        this.notifyService.error(res.Log['Details'][0]['Message']);
                    } else if (res.Data != null) {
                        this.SyncDashBoardData = res.Data;
                        this.syncPogStatusGrid?.gridApi?.setRowData(this.SyncDashBoardData);
                    }
                    if (synProcessInitiated) {
                        this.tabIndex = 1;
                    }
                },
                () => {
                    this.log.error('error in getting Sync Dashboard Data');
                },
            ),
        );
    };

    bindSyncPogStatusGrid = (): void => {
        if (this.syncPogStatusGrid) {
            this.syncPogStatusGrid?.gridApi?.setRowData(this.SyncDashBoardData);
        } else {
            this.gridConfigStatusGrid = {
                ...this.gridConfigStatusGrid,
                id: `Sync-Pog-Status-Grid`,
                columnDefs: this.agGridHelperService.getAgGridColumns(`Sync-Pog-Status-Grid`),
                height: 'calc(90vh - 20em)',
                data: this.SyncDashBoardData,
                actionFields: ['Status']
            };
        }
    };

    public prepareDataModel = (data: POGLibraryListItem[]): void => {
        this.preparedPogsData = data.map((element) => {
            return {
                ...element,
                pogDescription: element.Name + ' (' + element.IDPOG + ')',
                RunOn: new Date(element.POGLastModifiedDate)
                    ? element.POGLastModifiedDate && new Date(element.POGLastModifiedDate).toLocaleString()
                    : element.RunOn,
            };
        });
        this.pogList = this.preparedPogsData;
    };

    public handleFilter(value: string): void {
        if (value !== '') {
            this.preparedPogsData = this.sharedService.runFilter(this.pogList, value);
        }
    }

    public prepareColumnsList(item): object {
        return {
            iconName: item['iconName'] ? item['iconName'] : '',
            headerType: item['headerType'] ? item['headerType'] : '',
            field: item['field'],
            title: item['title'],
            width: item['width'] ? item['width'] : '',
            format: item[10] === `number | float` ? `{0:n}` : null,
            type: item['field'] == 'selectedVersionvalue' ? 'dropdown' : 'string',
            editable: item['field'] == 'selectedVersionvalue' ? true : false,
            filterable: {
                multi: true,
                search: true,
            },
            groupable: false,
            groupOrder: item[6] ? item[7] : 0,
            hidden: false,
            isactive: true,
            locked: false,
            orderIndex: item[2] ? item[2] : item[`orderIndex`],
            description: item[11] ? item[11] : ``,
            sortable: { initialDirection: item[12] !== `` ? item[12] : null },
            style: '',
            sortorder: item[12] !== `` ? item[16] : 0,
            columnMenu: false,
            templateDummy: item['templateDummy'] ? item['templateDummy'] : '',
            IsMandatory: item[`IsMandatory`] !== undefined ? item[`IsMandatory`] : true,
            ProjectType: item[`ProjectType`] ? item[`ProjectType`].split(`,`) : [`*`],
        };
    }

    public onchange = (e: number): void => {
        let cols = this.saDashboardService.GetGridColumns(`Sync-Pog-Grid`);
        for (let d of cols) {
            if (d.field == 'syncPogCheckbox') {
                (d.headerType = 'chechbox'), (d.title = '');
            }
        }
        const fData = this.pogList.filter(
            (x) => x[`IDPOG`] !== e && x[`Version`] !== 'Pending' && x[`Version`] !== 'Live',
        );
        const columns = this.agGridHelperService.getAgGridColumns(`Sync-Pog-Grid`);
        this.syncPogGridConfig = {
            ...this.syncPogGridConfig,
            id: `Sync-Pog-Grid`,
            columnDefs: columns,
            height: 'calc(93vh - 30.5em)',
            data: fData,
            firstCheckBoxColumn: { show: true, template: `dataItem.IsMarkedAsDelete || dataItem.IsReadOnly || dataItem.isLoaded` },
            setRowsForSelection: { items: this.selectedRows, field: 'IDPOG' }
        }
    };
    public ChildSearchItems = (response: string): void => {
        if (this.syncPogGridConfig || this.gridConfigAnchorGrid || this.gridConfigAnchorGrid) {
            if (this.tabIndex === 0 && !this.showSyncGrid) {
                this.agSyncPogGrid.gridConfig.data = this.sharedService.runFilter(
                    this.agGridStoreService.gridHoldingData.find((x) => x.id === this.agSyncPogGrid.gridConfig.id)[`data`],
                    response,
                );
            } else if (this.tabIndex === 0 && this.showSyncGrid) {
                this.syncPogAnchorGrid.gridConfig.data = this.sharedService.runFilter(
                    this.agGridStoreService.gridHoldingData.find((x) => x.id === this.syncPogAnchorGrid.gridConfig.id)[`data`],
                    response,
                );
            } else {
                this.syncPogStatusGrid.gridConfig.data = this.sharedService.runFilter(
                    this.agGridStoreService.gridHoldingData.find((x) => x.id === this.syncPogStatusGrid.gridConfig.id)[`data`],
                    response,
                );
            }
        }
    };

    public invokeSelectedPog = (event: any): void => {
        this.selectedDataItem = [];
        const selectedRows = this.agSyncPogGrid.params.api.getSelectedRows();
        if (selectedRows?.length) {
            this.selectedDataItem = [...selectedRows];
        }
    };


    public tabClick(event: MatTabChangeEvent): void {
        this.tabIndex = event.index;
        if (this.tabIndex === 0 && !this.showSyncGrid) {
            if (this.anchorPogIDPOG) {
                this.onchange(this.anchorPogIDPOG);
            }
        } else if (this.tabIndex === 0 && this.showSyncGrid) {
            this.bindSyncWithAnchorData(this.syncWithAnchorData, this.allowItemFilterPOGSync);
        } else {
            this.bindSyncPogStatusGrid();
        }
    }

    public markPogObjCheckedout(idpogs: CheckinCheckout[]) {
        idpogs.forEach((pog) => {
            pog.checkedoutManually = true;
        });
        return idpogs;
    }

    public excelExport(): void {
        let params: ExcelExportParams = {};
        if (this.tabIndex === 0 && !this.showSyncGrid) {
            params.fileName = `Sync-Pog-Grid`;
            this.agSyncPogGrid?.exportToExcel(params);
        } else if (this.tabIndex === 0 && this.showSyncGrid) {
            params.fileName = `Sync-Pog-Anchor-Grid`;
            this.syncPogAnchorGrid?.exportToExcel(params);
        } else {
            params.fileName = `Sync-Pog-Status-Grid`;
            this.syncPogStatusGrid?.exportToExcel(params);
        }
    }

    public getSyncConfig = (): void => {
        const SelectedPogs = this.selectedDataItem.map((e) => e.IDPOG);
        const data = {
            anchorPlanogramId: this.anchorPogIDPOG,
            PogsToSync: SelectedPogs,
            isIncludeShoppingCart: this.CheckBoxModel.includeShoppingCart,
        };
        if (this.selectedDataItem.length > 0) {
            for (const selDataItm of this.selectedDataItem) {
                if (selDataItm.isLoaded && (selDataItm.sectionID !== '' || selDataItm.sectionID !== undefined)) {
                    if (this.planogramService.rootFlags[selDataItm.sectionID].asyncSaveFlag.isPOGSavingInProgress) {
                        this.notifyService.warn(
                            `We found that POG# ${selDataItm.IDPOG} is not yet Saved. Unless you Save it will not be possible to continue with Sync operation`,
                        );
                        return;
                    }
                }
            }
            const preparePostObject = this.planogramSaveService.makePreparePostData(
                this.selectedDataItem as any,
                'Checkout',
                '',
            );
            this.subscriptions.add(
                this.syncPogItemsService.requestToCheckInOut(preparePostObject).subscribe(
                    (d: any) => {
                        if (d && d['Log']['Summary']['Error'] > 0) {
                            this.notifyService.error(d['Log']['Details'][0]['Message']);
                        }
                        let cantEditPogs = [];
                        d.Data.forEach((pog) => {
                            pog.canEdit ? this.markPogObjCheckedout([pog]) : cantEditPogs.push(pog);
                        });
                        if (cantEditPogs.length == 0) {
                            this.subscriptions.add(
                                this.syncPogItemsService.getPogsDelta(data).subscribe(
                                    (res: any) => {
                                        this.agSyncPogGrid.gridApi.deselectAll();
                                        this.showSyncGrid = true;
                                        let gridData: Products[] = res.Data.result;
                                        gridData.forEach((item, key) => {
                                            for (let ky of Object.keys(item)) {
                                                if (
                                                    ky != 'Action' &&
                                                    ky != 'IDPackage' &&
                                                    ky != 'IDProduct' &&
                                                    ky != 'Name' &&
                                                    ky != 'Pack' &&
                                                    ky != 'UPC' &&
                                                    ky != 'Facings' &&
                                                    ky != 'PosNo' &&
                                                    ky != 'SKU' &&
                                                    ky != 'IDPOGObject' &&
                                                    ky != 'srno'
                                                ) {
                                                    gridData[key]['IDPOG' + ky] = item[ky];
                                                    delete gridData[key][ky];
                                                }
                                            }
                                        });

                                        gridData.forEach((item, key) => {
                                            item['tempId'] = key;
                                            item['AllowItemFilterPOGSync'] = res.Data.AllowItemFilterPOGSync;
                                            if (item.Facings == null) {
                                                item.Facings = 'NA';
                                            }
                                        });

                                        this.syncWithAnchorData = gridData;
                                        this.allowItemFilterPOGSync = res.Data.AllowItemFilterPOGSync;
                                        this.bindSyncWithAnchorData(gridData, res.Data.AllowItemFilterPOGSync);
                                        //Timeout is necessery as initially grid is not rendered
                                        setTimeout(() => {
                                            this.syncPogAnchorGrid?.params?.api?.selectAll();
                                        });
                                    },
                                    (error) => {
                                        this.log.error('error in getting pogs delta');
                                    },
                                ),
                            );
                        } else {
                            cantEditPogs.forEach((pog) => {
                                this.notifyService.success(pog.message);
                            });
                            this.notifyService.warn('Please unselect the checkedout pogs and try again.');
                        }
                    },
                    (err) => {
                        this.log.error('Error while checking out the pogs');
                        this.notifyService.error('Error while checking out the pogs');
                    },
                ),
            );
        } else {
            this.notifyService.warn('SYNC_SELECT_POG');
        }
    };

    public bindSyncWithAnchorData = (data: any, AllowItemFilterPOGSync: string): void => {

        let actionFieldsList: string[] = []
        let checkboxCol;
        let cols = [];
        if (data.length > 0) {
            for (let key of Object.keys(data[0])) {
                if (
                    key != 'Action' &&
                    key != 'IDPackage' &&
                    key != 'IDProduct' &&
                    key != 'Name' &&
                    key != 'Pack' &&
                    key != 'UPC' &&
                    key != 'Facings' &&
                    key != 'PosNo' &&
                    key != 'SKU' &&
                    key != 'IDPOGObject' &&
                    key != 'tempId' &&
                    key != 'AllowItemFilterPOGSync'
                ) {

                    checkboxCol = {
                        0: key.replace('IDPOG', ''),
                        1: key,
                        2: 8,
                        3: false,
                        4: false,
                        5: true,
                        6: false,
                        7: 0,
                        8: 60,
                        9: false,
                        10: "custom",
                        11: "IDPOG",
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
                        field: key,
                        title: key.replace('IDPOG', ''),
                        width: 50
                    };

                    actionFieldsList.push(key)
                    if (AllowItemFilterPOGSync == 'N') {
                        checkboxCol['Template'] = "(params.data[params.column.colId] == null) ? `` :  `<input class=\\\"syncAnchorpog \\\" type=\\\"checkbox\\\"  style=\\\"cursor: pointer;\\\margin-left: 45%;\\\"\\\\ checked id=`+'store'+params.data.tempId + params.data.IDProduct+` tempId=`+params.data.tempId+`   value=`+dataItem.IDProduct+` disabled>`";
                        cols.push(checkboxCol);
                    } else {
                        checkboxCol['Template'] = "(params.data[params.column.colId] == null) ? `` :  `<input class=\\\"syncAnchorpog \\\" type=\\\"checkbox\\\"  style=\\\"cursor: pointer;\\\margin-left: 45%;\\\"\\\\ checked id=`+'store'+params.data.tempId + params.data.IDProduct+` tempId=`+params.data.tempId+`   value=`+dataItem.IDProduct+`>`";
                        cols.push(checkboxCol);
                    }
                }

            }
        }
        let gridColumnCustomConfig: GridColumnCustomConfig = {
            customCol: cols
        };
        let col = this.agGridHelperService.getAgGridColumns(`Sync-With-Anchor-Grid`, gridColumnCustomConfig);
        if (AllowItemFilterPOGSync == 'N') {
            this.gridConfigAnchorGrid = {
                ...this.gridConfigAnchorGrid,
                id: `Sync-With-Anchor-Grid`,
                columnDefs: col,
                data: data,
                height: 'calc(90vh - 25.3em)',
                actionFields: actionFieldsList,
                setRowsForSelection: { items: this.selectedRows, field: 'UPC' },
                isSelectAll: true
            }
        }
        else {
            this.gridConfigAnchorGrid = {
                ...this.gridConfigAnchorGrid,
                id: `Sync-With-Anchor-Grid`,
                columnDefs: col,
                data: data,
                height: 'calc(90vh - 25.3em)',
                firstCheckBoxColumn: { show: true, template: '<input class=\\\"syncAnchorpog k-checkbox\\\" type=\\\"checkbox\\\"  style=\\\"cursor: pointer\\\"\\\\ checked id=`+dataItem.tempId + dataItem.IDProduct+` tempId=`+dataItem.tempId+`   value=`+dataItem.IDProduct+`>' },
                actionFields: actionFieldsList,
                setRowsForSelection: { items: this.selectedRows, field: 'UPC' },
                isSelectAll: true
            }
        }
        //Need this for checkbox selection
        if (this.gridConfigAnchorGrid.isSelectAll) {
            //Remove old items for array then add data 
            this.customCheckboxSelection = [] = data;
        }

    }

    public selectedAnchorPogItem(event): void {
        if (this.allowItemFilterPOGSync === 'N') {
            return;
        }
        if (event.data.IDProduct !== undefined) {
            this.syncWithAnchorData.forEach((item) => {
                if (Number(event.data.tempId) == item.tempId) {
                    //This is for the row on which we have clicked
                    let isCheckedNodeList = document.querySelectorAll(
                        `#store${event.data.tempId}${event.data.IDProduct}`
                    ) as NodeListOf<HTMLInputElement>;
                    if (Number(`${event.data.tempId}${event.data.IDProduct}`) == item.tempId.toString() + item.IDProduct) {
                        let isChecked = this.customCheckboxSelection.some(ele => ele.tempId === item.tempId);
                        if (!isChecked) {
                            //If we select custom checkbox
                            let isAllCheckboxChecked = true;
                            isCheckedNodeList.forEach(isChecked => {
                                if (!isChecked.checked) {
                                    isAllCheckboxChecked = false;
                                }
                            });
                            if (isAllCheckboxChecked) {
                                event.node.setSelected(true, false, true);
                                Object.keys(event.node.data).forEach(key => {
                                    if (key.includes('IDPOG') && !key.includes('IDPOGObject') && event.node.data[key] !== null) {
                                        event.node.data[key] = event.node.data.Action === 'DELETE' ? 'D' : 'I';
                                    }
                                });
                                this.customCheckboxSelectionAdd(item);
                            } else {
                                event.node.setSelected(false, false, true);
                                Object.keys(event.node.data).forEach(key => {
                                    if (key.includes('IDPOG') && !key.includes('IDPOGObject') && event.node.data[key] !== null && key === event.fieldName) {
                                        if (event.node.data[key]) {
                                            event.node.data[key] = false;
                                        } else {
                                            event.node.data[key] = event.node.data.Action === 'DELETE' ? 'D' : 'I';
                                        }
                                    }
                                });
                            }
                        } else {
                            //If we unselect custom checkbox
                            event.node.setSelected(false, false, true);
                            this.customCheckboxSelection = this.customCheckboxSelection.filter(ele => ele.tempId !== event.data.tempId);
                            Object.keys(event.node.data).forEach(key => {
                                if (key.includes('IDPOG') && !key.includes('IDPOGObject') && event.node.data[key] !== null && key === event.fieldName) {
                                    //Need this check to decide previous value of checkbox
                                    if (event.node.data[key]) {
                                        event.node.data[key] = false;
                                    } else {
                                        event.node.data[key] = event.node.data.Action === 'DELETE' ? 'D' : 'I';
                                    }
                                }
                            });
                        }
                    }
                    this.singleCustomCheckboxSelectionAddDelete(isCheckedNodeList, item);
                } else {
                    //This logic is for checkbox rows other than selected rows
                    const node = this.syncPogAnchorGrid.gridApi.getRowNode(item.tempId);
                    let isCheckedNodeList = document.querySelectorAll(
                        `#store${item.tempId}${item.IDProduct}`,
                    ) as NodeListOf<HTMLInputElement>;
                    if (node && isCheckedNodeList) {
                        if (this.customCheckboxSelection.some(ele => ele.tempId === item.tempId)) {
                            //If the custom checckbox is selected
                            node.setSelected(true, false, true);
                        } else {
                            //If the custom checckbox is not selected
                            node.setSelected(false, false, true);
                            this.customCheckboxSelection = this.customCheckboxSelection.filter(ele => ele.tempId !== item.tempId);
                        }
                    }
                }
            });
        } else {
            const selectedRows = this.syncPogAnchorGrid?.gridApi.getSelectedRows();
            if (selectedRows) {
                selectedRows.forEach((element) => {
                    if (this.syncWithAnchorData.includes(element)) {
                        element.setSelected(true);
                    }
                })
            }
        }

        const checkboxHeaderEle = document.querySelector(
            `shelf-ag-grid ag-grid-angular#${this.gridConfigAnchorGrid.id} .ag-header-cell .ag-checkbox.ag-input-field .ag-checkbox-input-wrapper`,
        );
        const selectedRowsLength = this.syncPogAnchorGrid.gridApi.getSelectedRows().length;
        if (selectedRowsLength === 0) {
            checkboxHeaderEle.classList.remove('ag-checked');
            checkboxHeaderEle.classList.remove('ag-indeterminate');
        }
        else if (selectedRowsLength < this.gridConfigAnchorGrid.data.length) {
            checkboxHeaderEle.classList.add('ag-indeterminate');
            checkboxHeaderEle.classList.remove('ag-checked');
        } else {
            checkboxHeaderEle.classList.add('ag-checked');
            checkboxHeaderEle.classList.remove('ag-indeterminate');
        }
    };
    private customCheckboxSelectionAdd(item: Products): void {
        if (this.customCheckboxSelection.some(element => element.tempId === item.tempId) !== true) {
            this.customCheckboxSelection.push(item);
        }
    }
    private singleCustomCheckboxSelectionAddDelete(isCheckedNodeList: NodeListOf<HTMLInputElement>, item: Products) {
        let checkboxValues = [];
        isCheckedNodeList.forEach(ele => {
            checkboxValues.push(ele.checked);
        });
        if (checkboxValues.every(ele => ele === true) || checkboxValues.every(ele => ele === false)) {
            this.singleCustomCheckboxSelection = this.singleCustomCheckboxSelection.filter(ele => ele.tempId !== item.tempId)
        } else {
            this.singleCustomCheckboxSelection.push(item);
        }
    }
    public invokeSelectedAnchorPog(): void {
        if (this.allowItemFilterPOGSync === 'N') {
            return;
        }
        const selectedRows = this.syncPogAnchorGrid?.gridApi.getSelectedRows();
        this.syncWithAnchorData.forEach((item) => {
            const node = this.syncPogAnchorGrid.gridApi.getRowNode(item.tempId)
            let isCheckedNodeList = document.querySelectorAll(
                `#store${item.tempId}${item.IDProduct}`,
            ) as NodeListOf<HTMLInputElement>;
            if (isCheckedNodeList) {
                selectedRows.forEach((element) => {
                    if (Number(element.tempId) == item.tempId) {
                        node.setSelected(true, false, true);
                        isCheckedNodeList.forEach(isChecked => {
                            isChecked.checked = true;
                            this.customCheckboxSelectionAdd(element);
                        });
                        this.singleCustomCheckboxSelectionAddDelete(isCheckedNodeList, element);
                        Object.keys(node.data).forEach(key => {
                            if (key.includes('IDPOG') && !key.includes('IDPOGObject') && node.data[key] !== null) {
                                node.data[key] = node.data.Action === 'DELETE' ? 'D' : 'I';
                            }
                        });
                    }
                });

                //if rows are deselected then need this logic to deselect the checkbox
                this.syncPogAnchorGridSelectedId = !selectedRows.length ? this.syncPogAnchorGridSelectedId :
                    this.syncPogAnchorGridSelectedId.filter(ele => !selectedRows.some(sEle => sEle.tempId === ele.tempId));

                if (!selectedRows.some(element => Number(element.tempId) == item.tempId) &&
                    !this.singleCustomCheckboxSelection.some(element => Number(element.tempId) == item.tempId)
                ) {
                    node.setSelected(false, false, true);
                    isCheckedNodeList.forEach(isChecked => {
                        isChecked.checked = false;
                    });
                    Object.keys(node.data).forEach(key => {
                        if (key.includes('IDPOG') && !key.includes('IDPOGObject') && node.data[key] !== null) {
                            node.data[key] = false;
                        }
                    });
                    this.customCheckboxSelection = this.customCheckboxSelection.filter(ele => ele.tempId != item.tempId);
                }
            }
        });
        this.syncPogAnchorGridSelectedId = selectedRows;
    };

    public pageChangeAnchorPog(): void {
        const selectedRows = this.syncPogAnchorGrid.gridApi.getSelectedRows();
        setTimeout(() => {
            if (selectedRows.length) {
                this.syncWithAnchorData.forEach((item) => {
                    const index = selectedRows.findIndex(
                        (tempId) => Number(tempId) === Number(item.tempId),
                    );
                    if (index != -1) {
                        const ischecked = document.getElementById(
                            JSON.stringify(item.tempId) + item.IDProduct,
                        ) as HTMLInputElement;
                        ischecked != null ? (ischecked.checked = true) : '';
                        for (let key of Object.keys(item)) {
                            if (
                                key != 'Action' &&
                                key != 'IDPackage' &&
                                key != 'IDProduct' &&
                                key != 'Name' &&
                                key != 'Pack' &&
                                key != 'UPC' &&
                                key != 'Facings' &&
                                key != 'PosNo' &&
                                key != 'SKU' &&
                                key != 'IDPOGObject' &&
                                key != 'tempId' &&
                                key != 'AllowItemFilterPOGSync'
                            ) {
                                const ele1 = document.getElementById(
                                    JSON.stringify(item.tempId) + key,
                                ) as HTMLInputElement;
                                if (ischecked != null && ischecked.checked) {
                                    if (ele1 != null) {
                                        if (item.Action == 'INSERT') {
                                            item[key] = 'I';
                                        } else if (item.Action == 'DELETE') {
                                            item[key] = 'D';
                                        }
                                        ele1.checked = true;
                                    }
                                }
                            }
                        }
                    } else {
                        const ischecked = document.getElementById(
                            JSON.stringify(item.tempId) + item.IDProduct,
                        ) as HTMLInputElement;
                        ischecked != null ? (ischecked.checked = false) : '';
                        for (let key of Object.keys(item)) {
                            if (
                                key != 'Action' &&
                                key != 'IDPackage' &&
                                key != 'IDProduct' &&
                                key != 'Name' &&
                                key != 'Pack' &&
                                key != 'UPC' &&
                                key != 'Facings' &&
                                key != 'PosNo' &&
                                key != 'SKU' &&
                                key != 'IDPOGObject' &&
                                key != 'tempId' &&
                                key != 'AllowItemFilterPOGSync'
                            ) {
                                const ele1 = document.getElementById(
                                    JSON.stringify(item.tempId) + key,
                                ) as HTMLInputElement;
                                item[key] = false;
                                if (ele1 != null) {
                                    ele1.checked = false;
                                }
                            }
                        }
                    }
                });
            } else {
                this.syncWithAnchorData.forEach((item, ke: any) => {
                    const ischecked = document.getElementById(
                        JSON.stringify(item.tempId) + item.IDProduct,
                    ) as HTMLInputElement;
                    ischecked != null ? (ischecked.checked = false) : '';
                    for (let key of Object.keys(item)) {
                        if (
                            key != 'Action' &&
                            key != 'IDPackage' &&
                            key != 'IDProduct' &&
                            key != 'Name' &&
                            key != 'Pack' &&
                            key != 'UPC' &&
                            key != 'Facings' &&
                            key != 'PosNo' &&
                            key != 'SKU' &&
                            key != 'IDPOGObject' &&
                            key != 'tempId' &&
                            key != 'AllowItemFilterPOGSync'
                        ) {
                            const ele1 = document.getElementById(JSON.stringify(item.tempId) + key) as HTMLInputElement;
                            item[key] = false;
                            if (ele1 != null) {
                                ele1.checked = false;
                            }
                        }
                    }
                });
            }
        });
    }

    public SaveSyncData = (): void => {
        let ds = this.syncWithAnchorData;
        let idPogs = [];
        let POGLibraryListItem = {};
        let syncDetails = [];
        let isloaded = false;
        for (let key of Object.keys(ds[0])) {
            if (
                key != 'Action' &&
                key != 'IDPackage' &&
                key != 'IDProduct' &&
                key != 'Name' &&
                key != 'Pack' &&
                key != 'UPC' &&
                key != 'Facings' &&
                key != 'PosNo' &&
                key != 'SKU' &&
                key != 'IDPOGObject' &&
                key != 'tempId' &&
                key != 'AllowItemFilterPOGSync'
            ) {
                idPogs.push(key);
            }
        }

        idPogs.forEach((val, ky) => {
            this.preparedPogsData.forEach((item, key) => {
                const title = val.replace('IDPOG', '');
                if (item.IDPOG == title) {
                    if (item.isLoaded) {
                        isloaded = true;
                    }
                }
            });
            let PogGroup = [];
            ds.forEach((item, key) => {
                if (item[val] != null && item[val] != false) {
                    PogGroup.push({ IDPOGObject: item.IDPOGObject, Action: item.Action });
                }
            });
            POGLibraryListItem[val] = PogGroup;
        });
        syncDetails.push(POGLibraryListItem);
        let dataToPost = {
            Syncdata: syncDetails,
            IDPOGScenario: this.planogramStore.scenarioId,
            IDProject: this.planogramStore.projectId,
            InsertIntoShoppingCart: this.CheckBoxModel.InsertIntoShoppingCart,
            AnchorPogId: this.anchorPogIDPOG,
        };
        if (!isloaded) {
            this.subscriptions.add(
                this.syncPogItemsService.insertPogSyncData(dataToPost).subscribe(
                    (response) => {
                        if (response.Log.Summary.Error > 0) {
                            this.notifyService.error(response.Log.Details[0].Message);
                        } else if (response.Log.Summary.Error <= 0) {
                            this.goBack();
                            this.initiateSyncPogStatusGrid(true);
                            //after sync pog process done, it will automatically checked-in, no need to handled the checkin now.
                            this.notifyService.success('SYNC_PROCESS_INITIATED');
                        }
                    },
                    (error) => {
                        this.log.error('error ocurred while syncing', error);
                    },
                ),
            );
        } else {
            this.notifyService.warn(
                'One or more planogram is loaded. please unload or select different planogram to sync',
            );
        }
    };

    public SelectedStatusGridItem = (event: { data: any, fieldName: string, classList: DOMTokenList, iconName: string }): void => {
        if (event.data && event.iconName) {
            switch (event.iconName) {
                case 'picture_as_pdf':
                    if (event.data.PDFAttachment !== undefined) {
                        window.open(event.data.PDFAttachment);
                    }
                    break;
                case 'file_download':
                    if (event.data.XLSAttachment !== undefined) {
                        window.open(event.data.XLSAttachment);
                    }
                    break;
                default:
                    break;
            }
        }
    };

    public goBack = (): void => {
        this.showSyncGrid = false;
        this.selectedDataItem.length = 0;
        this.selectedRows.length = 0;
        this.onchange(this.anchorPogIDPOG);
    };

    public onCloseMethod(): void {
        this.filterText = '';
        this.preparedPogsData = [...this.pogList];
    }

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        // TODO @og will create on notify service
        //this.snackBar.dismiss();
    }
}
