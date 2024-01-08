import {
    Component,
    ViewChild,
    OnDestroy,
    Input,
    OnChanges,
    NgZone,
    SimpleChanges,
    Output,
    EventEmitter,
    ChangeDetectorRef,
} from '@angular/core';
import {
    PlanogramLibraryService,
    AgGridHelperService,
    SharedService,
    ClonePlanogramService,
    NotifyService,
    ParentApplicationService,
} from 'src/app/shared/services';
import * as _ from 'lodash';
import { KendoGridComponent } from 'src/app/shared/components/kendo-grid/kendo-grid.component';
import { KednoGridConfig } from 'src/app/shared/models/kendoGrid';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { PlanogramStoreService } from '../../../../../../../../../shared/services';
import { ClonePlanogramComponent } from '../clone-planogram.component';
import { SelectedStoreData, EditDateEvent } from 'src/app/shared/models';
import { GridConfig, GridColumnCustomConfig } from 'src/app/shared/components/ag-grid/models';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { ExcelExportParams } from 'ag-grid-community';

@Component({
    selector: 'shelf-selected-stores',
    templateUrl: './selected-stores.component.html',
    styleUrls: ['./selected-stores.component.scss'],
})
export class SelectedStoresComponent implements OnChanges, OnDestroy {
    @Input() pogData;
    @Input() panalID: string;
    @Input() displayView: string;
    @Output() closeStoreView = new EventEmitter();
    @ViewChild(`selectedstoregrid`) selectedstoregrid: AgGridComponent;
    private subscriptions: Subscription = new Subscription();
    public storeView: boolean = false;
    public selectedstoregridConfig: GridConfig;
    private selectedstoreData: SelectedStoreData[] = [];
    private copyOfSelectedStore: SelectedStoreData[] = [];
    private todayDate: Date = new Date();
    public changeDate: Date = new Date();
    public alertMsg: boolean = true;
    private selectedRows;  // TODO Type
    public saveActive = false;
    
    constructor(
        private readonly zone: NgZone,
        private readonly parentApp: ParentApplicationService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly dialog: MatDialog,
        private readonly cdr: ChangeDetectorRef,
        private readonly notifyService: NotifyService,
        private readonly clonePlanogramService: ClonePlanogramService,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly planogramLibraryService: PlanogramLibraryService,
        private readonly sharedService: SharedService,
    ) { }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.pogData && changes.pogData.currentValue) {
            this.getPogStores();
        }
    }

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    public get checkvmode(): boolean {
        return !(this.pogData.IsReadOnly && this.parentApp.isWebViewApp);
    }

    public disabledDates(date: Date): boolean {
        return date < new Date();
    }

    public excelasexportselectdstoregrid(): void {
        let params: ExcelExportParams = {};
        params.fileName = 'Shelf-Store Grid Library';
        this.selectedstoregrid.exportToExcel(params);
    }

    public saveStores(): void {
        const postApiData = {
            IDPOG: this.pogData.IDPOG,
            StoreData: [],
        };
        for (let storerow of this.selectedstoreData) {
            let storeData = {
                EffectiveFrom: (new Date(Date.parse((new Date(storerow.EffectiveFrom).getFullYear() + '-'
                    + (("0" + (new Date(storerow.EffectiveFrom).getMonth() + 1)).slice(-2)) + '-'
                    + ("0" + new Date(storerow.EffectiveFrom).getDate()).slice(-2)))).toISOString()),
                IDStore: storerow.idStore,
            };
            postApiData.StoreData.push(storeData);
        }
        this.saveActive = false;
        this.sharedService.isStoreDirty = false;
        this.sharedService.GridValueUpdated(false); // To deactivate the reload event(the alert comes on unsaved changes) on save of the changes after assignment or any manipulation of store assignment grid.
        this.subscriptions.add(
            this.clonePlanogramService.saveStores(postApiData).subscribe((response) => {
                if (response && response.Log.Summary.Error) {
                    this.notifyService.error(response.Log.Details[0].Message);
                } else {
                    this.sharedService.isStoreDirty = false;
                    this.getPogStores(true);
                }
            },error => {
                this.notifyService.error(error);
            }),
        );
    }

    public closeStore(): void {
        if(this.sharedService.isStoreDirty){
            this.sharedService.isStoreDirty = false;
        }
        this.closeStoreView.emit({ closeStoreView: true });
    }

    public openStoreDialog(): void {
        this.zone.runOutsideAngular(() => {
            const dialogRef = this.dialog.open(ClonePlanogramComponent, {
                width: '125vw',
                height: '80vh',
                data: { pogData: this.pogData, selectedStores: this.selectedstoreData, fromPanel: true },
                panelClass: 'mat-dialog-move-cursor',
            });
            const existingStoreCount = this.selectedstoreData.length;
            const existingStoresContainer: number[] = this.selectedstoreData.map(item => item.StoreNum);
            this.subscriptions.add(
                dialogRef.componentInstance.storeChange.subscribe((res) => {
                    this.alertMsg = false;
                    this.selectedstoreData = res;
                    if(existingStoreCount !== this.selectedstoreData.length){
                        this.sharedService.isStoreDirty = true;
                    }
                    for (let d of this.selectedstoreData) {
                        d.idPogStatus = this.pogData.IDPogStatus;
                    }
                    if (this.selectedstoregrid && this.selectedstoregrid.gridApi) {
                        this.selectedstoregrid?.gridApi?.setRowData(this.selectedstoreData);
                    } else {
                        this.bindselectedStoreDataGrid(this.selectedstoreData);
                    }
                    if (this.selectedstoreData.length == 0) {
                        this.copyOfSelectedStore = [];
                        this.selectedRows = [];
                        if (this.selectedstoregrid) {
                        }
                    }
                    
                    // addded this code to disable and enable save button on the basis of store selection
                    if (existingStoreCount !== this.selectedstoreData.length) {
                        this.saveActive = true;
                    } else {
                        this.saveActive = this.selectedstoreData.some(item => !existingStoresContainer.includes(item.StoreNum));
                    }
                }),
            );
        });
    }

    public onDateChange(): void {
        for (let row of this.copyOfSelectedStore) {
            if ((row.idPogStatus == 5 || row.idPogStatus == 6) && new Date(row.EffectiveFrom) < new Date()) {
            } else {
                let index = this.selectedstoreData.findIndex((item) => item.idStore == row.idStore);
                if (index >= 0) {
                    this.selectedstoreData[index].EffectiveFrom = this.changeDate.toDateString();
                    this.saveActive = true;
                }
            }
        }
        this.selectedstoregrid.gridApi.redrawRows();
    }

    public editedValue(event): void {
        let editedDate = new Date(event.event.value);
        let index = this.selectedstoreData.findIndex((item) => item.idStore == event.event?.data.idStore);
        if (index > -1) {
            this.selectedstoreData[index].EffectiveFrom
                = this.planogramStore.DateFormat((new Date(Date.parse((editedDate.getFullYear() + '-'
                    + (("0" + (editedDate.getMonth() + 1)).slice(-2)) + '-'
                    + ("0" + editedDate.getDate()).slice(-2)))).toISOString()).split('T')[0]);
        }
        this.selectedstoregrid.gridConfig.data = this.selectedstoreData; //update grid data
        this.saveActive = true;
        this.sharedService.isStoreDirty = true;
    }

    public deleteselectedRows(): void {
        for (let row of this.copyOfSelectedStore) {
            let index = this.selectedstoreData.findIndex((item) => item.idStore == row.idStore);
            if (index >= 0) {
                this.selectedstoreData.splice(index, 1);
            }
        }
        this.selectedRows = this.selectedstoregrid.gridApi.getSelectedRows();
        this.selectedstoregrid.removeRows(this.selectedRows);
        this.copyOfSelectedStore = [];
        this.selectedRows = [];
        this.selectedstoregrid.gridApi.deselectAll()
        this.saveActive = true;
        this.sharedService.isStoreDirty = true;
    }

    public invokeSelectedstoreRow(): void {
        this.copyOfSelectedStore = [];
        this.selectedRows = this.selectedstoregrid.gridApi.getSelectedRows();
        if (this.selectedRows && this.selectedRows.length > 0) {
            this.selectedRows.forEach((element) => {
                let storeRow = this.selectedstoreData.find((item) => item.idStore == element.idStore);
                if (storeRow) this.copyOfSelectedStore.push(storeRow);
            });
        } else {
            this.copyOfSelectedStore = [];
            this.selectedRows = [];
            this.selectedstoregrid.gridApi.deselectAll()
        }
        this.changeDate = new Date();
    }

    private bindselectedStoreDataGrid(data: SelectedStoreData[]): void {
        const minDate = new Date();
        minDate.setDate(new Date().getDate() + 1);
        let gridColumnCustomConfig: GridColumnCustomConfig = {
            dateSettings: { minDate: minDate }
        }
        this.selectedstoregridConfig = {
            ...this.selectedstoregridConfig,
            id: `shelf_store_assign_grid_details`,
            columnDefs: this.agGridHelperService.getAgGridColumns(`shelf_store_assign_grid_details`, gridColumnCustomConfig),
            data: data,
            height: '100%',
            firstCheckBoxColumn: { show: true, template: `dataItem.IsMarkedAsDelete || dataItem.IsReadOnly || dataItem.isLoaded` },
        };
        this.cdr.detectChanges();
    }

    public getPogStores(save?: boolean): void {
        this.changeDate.setDate(this.todayDate.getDate() + 1);
        this.selectedstoreData = [];
        this.storeView = true;
        this.subscriptions.add(
            this.clonePlanogramService
                .getpogstores(this.pogData.IDPOG, this.planogramStore.scenarioId)
                .subscribe((response) => {
                    if (response && response.Log.Summary.Error) {
                        this.notifyService.error(response.Log.Details[0].Message);
                    } else {
                        this.selectedstoreData = response.Data;
                        for (let storeRow of this.selectedstoreData) {
                            storeRow.EffectiveFrom = this.planogramStore.DateFormat(storeRow.EffectiveFrom.toString().split('T')[0]);
                            if(storeRow.EffectiveTo){
                                storeRow.EffectiveTo = new Date( this.planogramStore.DateFormat(storeRow.EffectiveTo.toString().split('T')[0]));
                            }
                            storeRow.idPogStatus = this.pogData.IDPogStatus;
                            storeRow.IDStore = storeRow.idStore;
                        }
                        this.copyOfSelectedStore = [];
                        this.selectedRows = [];
                        this.bindselectedStoreDataGrid(this.selectedstoreData);
                        if (this.selectedstoreData.length > 0) {
                            this.alertMsg = false;
                        } else {
                            this.alertMsg = true;
                        }
                        this.cdr.detectChanges();
                        if (this.selectedstoregrid) {
                        }
                        if (save) {
                            let pogIDToUpdate = {
                                IDPOG: this.pogData.IDPOG,
                                StoreData: this.selectedstoreData,
                            };
                            this.planogramLibraryService.updateStorelength(pogIDToUpdate);
                            let guid = this.getGuidFromIdpog(this.pogData.IDPOG);
                            if (guid) {
                                let currentObj = this.planogramLibraryService.getCurrentObject(guid);
                                this.planogramLibraryService.updateMapperObject([currentObj], false, false).subscribe();
                            }
                        }
                    }
                }),
        );
    }
    private getGuidFromIdpog(IDPOG: number): string | undefined {
        return this.planogramStore.mappers.find(it => it.IDPOG == IDPOG)?.globalUniqueID;
    }
    public cellClickHandler(event): boolean {
        if (event.event.data.idPogStatus && event.event.data.EffectiveFrom && (event.event.data.idPogStatus == 5 || event.event.data.idPogStatus == 6) &&new Date(event.event.data.EffectiveFrom) < new Date()) {
            event.event.api.stopEditing(true);
        } else {
            return false;
        }
    }
}
