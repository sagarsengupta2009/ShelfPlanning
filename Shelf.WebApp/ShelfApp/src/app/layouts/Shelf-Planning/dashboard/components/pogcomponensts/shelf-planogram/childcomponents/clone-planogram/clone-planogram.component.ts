import { Component, OnInit, Inject, ViewChild, OnDestroy, Output, EventEmitter } from '@angular/core';
import * as _ from 'lodash';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import {
    NodeData,
    PlanogramType,
    RowDeleteData,
    SelectedStoreData,
    PostDataForClone,
    StoreData,
    Menu,
} from 'src/app/shared/models';
import {
    ClonePlanogramService,
    AgGridHelperService,
    PlanogramStoreService,
    NotifyService,
} from 'src/app/shared/services';
import { GridConfig, GridColumnCustomConfig } from 'src/app/shared/components/ag-grid/models';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { RowNode } from 'ag-grid-community';


@Component({
    selector: 'srp-clone-planogram',
    templateUrl: './clone-planogram.component.html',
    styleUrls: ['./clone-planogram.component.scss'],
})
export class ClonePlanogramComponent implements OnInit, OnDestroy {
    @ViewChild(`selectedstoregrid`) selectedstoregrid: AgGridComponent;
    @ViewChild(`storegrid`) storegrid: AgGridComponent;
    @Output() storeChange: EventEmitter<SelectedStoreData[]> = new EventEmitter();
    private subscriptions: Subscription = new Subscription();
    public toggleClick: boolean = true;
    public toggleName: string = '';
    public selectedType = 0;
    private storeHierarchy: NodeData[];
    public parsedData: NodeData[];
    private selectedRows: number[] = [];
    private storeData: StoreData[] = [];
    public storegridConfig: GridConfig;
    public selectedstoregridConfig: GridConfig;
    private todayDate: Date = new Date();
    public changeDate: Date = new Date();
    private minimunDate: Date = new Date(this.todayDate);
    public planogramType: PlanogramType[] = [];
    public searchText: string = '';
    public selectedstoreData: SelectedStoreData[] = [];
    private pogData; //TODO expecting form another interface
    public fromPanel: boolean = false;
    private selectedIDSTORE: number[] = [];
    public copyOfSelectedStore: SelectedStoreData[] = [];
    public expandedKeys: number[] = [];
    private currentNode: number;
    constructor(
        private readonly planogramStore: PlanogramStoreService,
        private readonly translate: TranslateService,
        private readonly clonePlanogramService: ClonePlanogramService,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly dialog: MatDialogRef<ClonePlanogramComponent>,
        private readonly notifyService: NotifyService,
        @Inject(MAT_DIALOG_DATA) private readonly rowData
    ) {
        this.pogData = rowData.pogData;
        this.fromPanel = rowData.fromPanel;
    }

    public ngOnInit(): void {
        this.selectedType = this.planogramStore.appSettings.default_pog_type;
        if (this.fromPanel) {
            this.selectedstoreData = this.rowData.selectedStores;
            for (let storeRow of this.selectedstoreData) {
                this.selectedRows.push(storeRow.idStore);
            }
            this.toggleClick = false;
        } else {
            this.toggleClick = true;
            this.getPogStores();
        }
        this.toggleName = this.translate.instant('SELECTED_STORES');
        this.getplanogramTypeArray();
        this.storeHierarchyTree();
    }

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    public disabledDates(date: Date): boolean {
        return date < new Date();
    }

    public getContextMenu(): Menu[] {
        return [{ description: `Delete`, icon: 'delete', key: 'STORE_ROW_DELETE', order: 1, text: 'Delete' }];
    }

    public ontoggleChange(): void {
        if (this.toggleClick) {
            this.toggleName = this.translate.instant('SELECTED_STORES');
            this.bindselectedStoreDataGrid(this.selectedstoreData);
        } else {
            this.toggleName = this.translate.instant('STORES');
            if (this.storegrid) {
                this.bindStoreDataGrid(this.storeData)
            }
        }
    }

    public deleteselectedRows(): void {
        for (let storeRow of this.copyOfSelectedStore) {
            let index = this.selectedstoreData.findIndex((item) => item.idStore == storeRow.idStore);
            if (index >= 0) {
                this.selectedstoreData.splice(index, 1);
                this.selectedstoregrid.gridApi.setRowData(this.selectedstoreData);
            }
            let indexobj = this.selectedRows.indexOf(storeRow.idStore);
            if (indexobj > -1) {
                this.selectedRows.splice(index, 1);
            }
        }
        if (this.storegrid) {
            this.storegrid.gridApi?.setRowData(this.storeData);
        }
        this.selectedIDSTORE = [];
        this.copyOfSelectedStore = [];
        this.selectedstoregrid.gridApi.deselectAll();
        this.selectedIDSTORE = [];
        this.selectedstoregrid.gridConfig.menuItems = this.selectedstoreData.length ? this.getContextMenu() : null;
    }

    public onDateChange(): void {
        for (let storeRow of this.copyOfSelectedStore) {
            let index = this.selectedstoreData.findIndex((item) => item.idStore == storeRow.idStore);
            if (index >= 0) {
                this.selectedstoreData[index].EffectiveFrom = this.changeDate.toDateString();
                this.selectedstoregrid.skipTo('idstore', storeRow.idStore);
            }
        }
        this.selectedstoregrid.gridApi.setRowData(this.selectedstoreData);
    }

    public clonePlanogram(): void {
        for (let storeRow of this.selectedstoreData) {
            let effectiveDate = storeRow.EffectiveFrom.toLocaleString();
            storeRow.EffectiveFrom = effectiveDate;
        }
        const postApiData: PostDataForClone = {
            IDPOG: this.pogData.IDPOG,
            IdPogScenario: this.planogramStore.scenarioId,
            IdProject: this.planogramStore.projectId,
            pogType: this.selectedType,
            StoreData: this.selectedstoreData,
        };

        this.subscriptions.add(
            this.clonePlanogramService.postCloneData(postApiData).subscribe((res) => {
                if (res.Log.Summary.Error > 0) {
                    this.notifyService.error(res.Log.Details[0].Message);
                }
                this.dialog.close(res);
            }, (error) => {
                if (error) {
                    this.notifyService.error(error, 'GOT IT!');
                }
            }),
        );
    }

    public onNodeSelect(evt: { dataItem: NodeData; index: string }): void {
        this.subscriptions.add(
            this.clonePlanogramService.getStores(evt.dataItem.IdHierStr).subscribe((res) => {
                this.storeData = res.Table;
                this.currentNode = evt.dataItem.IdHierStr;
                this.bindStoreDataGrid(this.storeData);
            }),
        );
    }

    public storeHierarchyTree(): void {
        this.subscriptions.add(
            this.clonePlanogramService.getStoreHierarchy().subscribe((res) => {
                this.storeHierarchy = res;
                this.parsedData = this.storeHierarchy;
            }),
        );
    }

    public fetchChildren = (item: NodeData) => of(item.Children);

    public hasChildren = (item: NodeData) => item.Children && item.Children.length;

    private getplanogramTypeArray(): void {
        if (this.planogramStore.lookUpHolder) {
            let data = this.planogramStore.lookUpHolder;
            for (let d of data.POGType.options) {
                if (d.value > -1) this.planogramType.push(d);
            }
            let pogTypeObj = this.planogramType.find((item) => item.value == this.selectedType);
            if (!pogTypeObj) {
                this.selectedType = 0;
            }
        }
    }

    private getPogStores(): void {
        this.pogData = this.rowData.pogData;
        this.minimunDate.setDate(this.todayDate.getDate() + 1);
        this.changeDate.setDate(this.todayDate.getDate() + 1);
        this.subscriptions.add(
            this.clonePlanogramService
                .getpogstores(this.pogData.IDPOG, this.planogramStore.scenarioId)
                .subscribe((res) => {
                    if (res && res.Log.Summary.Error) {
                        this.notifyService.error(res.Log.Details[0].Message);
                    } else {
                        for (let storeRow of res.Data) {
                            storeRow.EffectiveFrom = Date.parse(storeRow.EffectiveFrom.toString()) > Date.parse(this.minimunDate.toString())
                                ? this.planogramStore.DateFormat(storeRow.EffectiveFrom.toString().split('T')[0]) : this.minimunDate.toDateString();
                            storeRow.IDStore = storeRow.idStore;
                            storeRow.EffectiveTo = null;
                        }
                        this.selectedstoreData = res.Data;
                        for (let i in this.selectedstoreData) {
                            this.selectedRows.push(this.selectedstoreData[i].idStore);
                        }
                        this.bindselectedStoreDataGrid(this.selectedstoreData);
                    }
                }),
        );
    }

    public invokeGridSelectedRow(): void {
        let selectedRows: any = this.storegrid.gridApi.getSelectedRows();
        let rowNodes: RowNode[] = [];
        this.storegrid?.gridApi?.forEachNodeAfterFilterAndSort(ele => {
            rowNodes.push(ele);
        });
        const data = Object.assign([], rowNodes)
        if (rowNodes.length) {
            selectedRows = [];
            data.forEach((ele) => {
                if (ele.selected) {
                    selectedRows.push(ele.data);
                }
            })
        }
        // Added this reassignent becouse getting wrong value of Effecting from after selection
        //@TODO Need to eliminate following reassingment of Effective from
        if (this.selectedstoreData.length) {
            this.selectedstoreData.forEach((ele) => {
                let index = selectedRows.findIndex((x) => x.IDStore == ele.idStore);
                if (index !== -1) {
                    selectedRows[index]['EffectiveFrom'] = ele.EffectiveFrom;
                }
            })
        }

        if (selectedRows) {
            selectedRows.forEach((element) => {
                element.EffectiveTo = null;
                element.idStore = element.IDStore;
                if (this.selectedRows.indexOf(element.IDStore) === -1) {
                    element.EffectiveFrom = this.getEffectiveDate();
                    this.selectedstoreData.push(element);
                }
            });
        }

        this.selectedRows = [];
        this.selectedstoreData = this.selectedstoreData.filter((ele) => {
            if (this.storeData.some(x => x.IDStore == ele.IDStore) && !selectedRows.some(x => x.IDStore == ele.IDStore)) {
                return false;
            }
            this.selectedRows.push(ele.IDStore);
            return true;
        });
        
        if (this.selectedstoregrid) {
            this.selectedstoregrid.gridConfig.data = this.selectedstoreData;
            if (this.selectedIDSTORE.length == 0) {
                this.selectedstoregrid.gridApi.deselectAll();
            }
        }
        if (this.fromPanel) {
            this.storeChange.emit(this.selectedstoreData);
        }
    }

    public editedValue(event): void {
        let editedDate = new Date(event.event.value);
        let index = this.selectedstoreData.findIndex((item) => item.idStore == event.event.data.idStore);
        if (index > -1) {
            this.selectedstoreData[index].EffectiveFrom
                = this.planogramStore.DateFormat((new Date(Date.parse((editedDate.getFullYear() + '-'
                    + (("0" + (editedDate.getMonth() + 1)).slice(-2)) + '-'
                    + ("0" + editedDate.getDate()).slice(-2)))).toISOString()).split('T')[0]);
            this.selectedstoregrid.skipTo('idstore', this.selectedstoreData[index]['idStore']);
        }
        this.selectedstoregrid.gridApi.setRowData(this.selectedstoreData); //update grid data
    }

    private getEffectiveDate(): string {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (this.planogramStore.allPlanogramApisData?.planogramScenariosPogs?.StartDate) {
            const effectiveFrom = Date.parse(this.planogramStore.allPlanogramApisData.planogramScenariosPogs.StartDate) > Date.parse(tomorrow.toString())
                ? this.planogramStore.DateFormat(this.planogramStore.allPlanogramApisData.planogramScenariosPogs.StartDate.toString().split('T')[0]) : tomorrow.toDateString();
            return effectiveFrom;
        }
        else {
            return tomorrow.toDateString();
        }

    }

    public closeDialog(): void {
        this.dialog.close(this.selectedstoreData);
    }

    public resetSelectedData(): void {
        this.selectedRows = [];
        if (this.storegrid) {
            this.storegrid.gridApi.deselectAll();
        }
        if (this.selectedstoregrid) {
            this.copyOfSelectedStore = [];
            this.selectedIDSTORE = [];
            this.selectedstoregrid.gridApi.deselectAll();
            this.bindselectedStoreDataGrid(this.selectedstoreData);
        }
        this.selectedstoreData = [];
        this.bindStoreDataGrid(this.storeData);
        if (this.fromPanel) {
            this.storeChange.emit(this.selectedstoreData);
        }
    }

    public getSearhitem(value: string): void {
        this.parsedData = this.search(this.storeHierarchy, value);
        this.expandedKeys = this.expandedKeys.slice();
    }

    public search(items: NodeData[], term: string): NodeData[] {
        return items.reduce((acc, item) => {
            if (this.contains(item.Name, term)) {
                let index = this.expandedKeys.indexOf(item.IdHierStr);
                if (index < 0) {
                    if (item.Children && item.Children.length > 0)
                        this.expandedKeys = this.expandedKeys.concat(item.IdHierStr);
                }
                acc.push(item);
            } else if (item.Children && item.Children.length > 0) {
                const newItems = this.search(item.Children, term);
                let index = this.expandedKeys.indexOf(item.IdHierStr);
                if (index < 0) {
                    if (item.Children && item.Children.length > 0)
                        this.expandedKeys = this.expandedKeys.concat(item.IdHierStr);
                }
                if (newItems.length > 0) {
                    acc.push({ Name: item.Name, IdHierStr: item.IdHierStr, Children: newItems });
                }
            }

            return acc;
        }, []);
    }

    private contains(text: string, term: string): boolean {
        return text && text.toLowerCase().indexOf(term.toLowerCase()) >= 0;
    }

    public handleCollapse(node: { dataItem: NodeData; index: string }): void {
        for (let i in this.expandedKeys)
            if (this.expandedKeys[i] == node.dataItem.IdHierStr) {
                this.expandedKeys.splice(Number(i), 1);
            }
    }

    public handleExpand(node: { dataItem: NodeData; index: string }): void {
        let index = this.expandedKeys.indexOf(node.dataItem.IdHierStr);
        if (index < 0) {
            this.expandedKeys = this.expandedKeys.concat(node.dataItem.IdHierStr);
        }
    }

    public onkeyup(value: string): void {
        if (value == '') {
            this.expandedKeys = [];
            this.parsedData = this.storeHierarchy;
        }
    }

    public deleteselectedRow(dataItem: SelectedStoreData): void {
        let index = this.selectedstoreData.findIndex((item) => item.idStore == dataItem.idStore);
        if (index >= 0) {
            this.selectedstoreData.splice(index, 1);
            this.selectedstoregrid.gridApi.setRowData(this.selectedstoreData);
        }
        let indexobj = this.selectedRows.indexOf(dataItem.idStore);
        if (indexobj > -1) {
            this.selectedRows.splice(index, 1);
        }
        let indexforselected = this.selectedIDSTORE.indexOf(dataItem.idStore);
        if (indexforselected > -1) {
            this.selectedIDSTORE.splice(indexforselected, 1);
        }
        if (this.selectedstoregrid) {
            const selectedRows = this.selectedstoregrid.gridApi.getSelectedRows();
            if (selectedRows.length == 0) {
                this.copyOfSelectedStore = [];
            }
        }
        this.selectedstoregrid.gridConfig.menuItems = this.selectedstoreData.length ? this.getContextMenu() : null;
    }

    public excelasexportstoregrid(): void {
        this.storegrid.exportToExcel();
    }

    public excelasexportselectdstoregrid(): void {
        this.selectedstoregrid.exportToExcel();
    }

    public invokeSelectedstoreRow(): void {
        this.copyOfSelectedStore = [];
        const selectedRows = this.selectedstoregrid?.gridApi?.getSelectedRows();
        this.selectedIDSTORE = selectedRows;
        if (selectedRows && selectedRows.length) {
            selectedRows.forEach((element) => {
                let storeRow = this.selectedstoreData.find((item) => item.idStore == element.idStore);
                if (storeRow) this.copyOfSelectedStore.push(storeRow);
            });
        } else {
            this.copyOfSelectedStore = [];
            this.selectedIDSTORE = [];
        }
    }

    public bindStoreDataGrid(data: StoreData[]): void {
        data = data.filter(item => item.IsActive == true);
        this.storegridConfig = {
            id: `shelf_store_screen_details`,
            columnDefs: this.agGridHelperService.getAgGridColumns(`shelf_store_screen_details`),
            data: data,
            firstCheckBoxColumn: { show: true, template: `dataItem.IsMarkedAsDelete || dataItem.IsReadOnly || dataItem.isLoaded` },
            setRowsForSelection: { field: 'Name', items: this.selectedstoreData },
            height: 'calc(100% - 5vh)'
        };
    }

    public onContextMenuSelect(event: RowDeleteData): void {
        if (event && event[`menu`] && event[`data`]) {
            switch (event[`menu`][`key`]) {
                case 'STORE_ROW_DELETE':
                    this.deleteselectedRow(event['data']);
                    break;
            }
        }
    }

    public bindselectedStoreDataGrid(data: SelectedStoreData[]): void {
        const minDate = new Date();
        minDate.setDate(new Date().getDate() + 1);
        if (this.selectedstoregrid) {
            this.selectedstoregrid?.gridApi?.setRowData(data);
            this.selectedstoregrid.selectMultipleRows('IDStore', this.copyOfSelectedStore.map(x => x.IDStore));
        } else {
            let gridColumnCustomConfig: GridColumnCustomConfig = {
                dateSettings: { minDate: minDate }
            }
            this.selectedstoregridConfig = {
                setRowsForSelection: { field: 'Name', items: this.selectedIDSTORE },
                id: `shelf_clone_pog_store_grid_details`,
                columnDefs: this.agGridHelperService.getAgGridColumns(`shelf_clone_pog_store_grid_details`, gridColumnCustomConfig),
                data: data,
                firstCheckBoxColumn: { show: true, template: `dataItem.IsMarkedAsDelete || dataItem.IsReadOnly || dataItem.isLoaded` },
                height: 'calc(100% - 7vh)',
                menuItems: data.length ? this.getContextMenu() : null
            };
        }
    }
}
