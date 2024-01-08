import { AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ExcelExportParams, SelectionChangedEvent } from 'ag-grid-community';
import { isEmpty } from 'lodash';
import { Subscription } from 'rxjs';
import { Position, Section } from 'src/app/shared/classes';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { GridConfig } from 'src/app/shared/components/ag-grid/models';
import { KendoGridComponent } from 'src/app/shared/components/kendo-grid/kendo-grid.component';
import { AppConstantSpace } from 'src/app/shared/constants/appConstantSpace';
import { Utils } from 'src/app/shared/constants/utils';
import { DownloadedPog, Planograms, StoreAppSettings, WorksheetEventData } from 'src/app/shared/models';
import {
    HistoryService,
    PlanogramService,
    SharedService,
    DictConfigService,
    AgGridHelperService,
    PlanogramStoreService,
    DataValidationService,
    WorksheetGridService,
    Render2dService,
    PlanogramSaveService,
} from 'src/app/shared/services';

@Component({
    selector: 'sp-inventory-worksheet',
    templateUrl: './inventory-worksheet.component.html',
    styleUrls: ['./inventory-worksheet.component.scss'],
})
export class InventoryWorksheetComponent implements OnInit, AfterViewInit, OnChanges {
    @Input() panalID: string;
    @Input() sectionObject: Section;
    @Input() selectedPogObject: Planograms;
    @Input() displayView: string;
    @ViewChild('agGrid') gridComp: AgGridComponent;
    public aggridConfig: GridConfig;
    public isfilldowninprocess: boolean = false;
    @ViewChild('inventoryWSgrid') inventoryWSgrid: KendoGridComponent;
    public datasource: Section;
    public get AppSettingsSvc(): StoreAppSettings {
        return this.planogramStore.appSettings;
    }
    public sectionID: string;
    public localSearchStatus: boolean = false;
    public selectedPogInventory = null;
    public pogInventory: Position[] = [];
    public rowSelectionInvoked: boolean = false;
    public fName: string;
    public pogObject: Section;
    public oldValue: string | number | boolean;
    public exportFileName: string;
    private subscriptions: Subscription = new Subscription();
    private inventoryList: Position[] = [];

    constructor(
        private readonly translate: TranslateService,
        private readonly sharedService: SharedService,
        private readonly planogramservice: PlanogramService,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly dictConfigService: DictConfigService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly historyService: HistoryService,
        private readonly worksheetGridService: WorksheetGridService,
        private readonly dataValidation: DataValidationService,
        private readonly render2d: Render2dService,
        private readonly planogramSaveService: PlanogramSaveService,
    ) { }

    ngAfterViewInit(): void {
        if (this.planogramservice.rootFlags[this.sharedService.getActiveSectionId()].isEnabled || this.sharedService.enableHighlightInWorksheet) {
            this.applyPositionColor();
        }

        this.subscriptions.add(this.sharedService.itemSelection.subscribe((res) => {
            if (res && res.pogObject && res.pogObject.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
                let selectedPosObject = res['pogObject'];
                if (selectedPosObject[`IDPOGObject`]) {
                    this.gridComp.skipTo('IDPOGObject', selectedPosObject[`IDPOGObject`], 'number', res.view);
                } else {
                    this.gridComp.skipTo('TempId', selectedPosObject[`TempId`], 'number');
                }
                if (this.rowSelectionInvoked) {
                    this.rowSelectionInvoked = false;
                    return;
                }
            } else if (res && res.pogObjectArray) {
                if (res.view === 'ctrl' || res.view === 'shift') {
                    let selectedObjsList: any = res.pogObjectArray;
                    this.gridComp.selectMultipleRows('IDPOGObject', selectedObjsList.map(x => x.IDPOGObject || x.TempId), 'number', res.view);
                }
            }
            else if (res?.view === AppConstantSpace.SELECTALL) {
                this.gridComp.params.api.selectAll();
            } else {
                this.gridComp.gridApi.deselectAll();
            }
            if (this.sharedService?.enableHighlightInWorksheet) {
                //after selection we need to change selection css in case of highlight
                this.gridComp.gridApi.refreshCells({
                    force: true // skips change detection -> always refreshes the row
                });
            }
        }),
        );
        this.subscriptions.add(this.sharedService.workSheetEvent.subscribe((response: WorksheetEventData) => {
            if (response) {
                this.gridComp.gridApi.redrawRows();
            }
        }),
        );
        this.subscriptions.add(this.sharedService.deleteSubscription.subscribe((res) => {
            if (res) {
                this.gridComp.removeRows(res);
            }
        }));
    }

    public clearAllSorting = this.translate.instant('Clear_All_Sorting');
    public clearAllFilters = this.translate.instant('Clear_All_Filters');

    ngOnChanges(changes: SimpleChanges): void {
        if (!isEmpty(this.sectionObject)) {
            this.initWorkSheet();
        }
    }

    private initWorkSheet(): void {
        const pog: DownloadedPog = this.planogramStore.getPogById(this.sectionObject.IDPOG);
        if (pog) {
            this.sectionID = pog.sectionID;
            this.datasource = this.pogObject = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        } else {
            this.sectionID = this.sharedService.activeSectionID;
            this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
            this.pogObject = this.datasource;
        }
        const cols = this.agGridHelperService.getAgGridColumns(`SHELF_INVENTORY_WORKSHEET`);
        this.inventoryList = this._prepareDataModel(this.datasource);
        this.initInventoryWS();
        this.aggridConfig = {
            ...this.aggridConfig,
            id: 'SHELF_INVENTORY_WORKSHEET',
            data: this.inventoryList,
            columnDefs: cols,
            isFillDown: true,
            panelId: this.panalID
        };
    }

    ngOnInit(): void {

    
        //High light value update
        this.subscriptions.add(this.sharedService.itemWSApplyPositionColor.subscribe((res: any) => {
            if (res != null) {
                this.inventoryList = this._prepareDataModel(this.datasource);
                this.applyPositionColor();
            }
        }),
        );

        this.subscriptions.add(this.sharedService.addProductAfterDrag.subscribe((res: any) => {
            if (res) {
                this.inventoryList = this._prepareDataModel(this.datasource);
                this.gridComp?.gridApi?.setRowData(this.inventoryList);
            }
        }),
        );

        // Download Excel
        this.subscriptions.add(this.sharedService.downloadExportExcel.subscribe((res: any) => {
            if (res != null && res.view == 'inventoryWS') {
                let params: ExcelExportParams = {};
                params.fileName = `${this.sectionObject.Name}_${this.sectionObject.IDPOG}_${this.displayView}`;
                this.gridComp.exportToExcel(params);
            }
        }),
        );

        // Remove Selection
        this.subscriptions.add(this.sharedService.RemoveSelectedItemsInWS.subscribe((res: { view: string }) => {
            if (res != null && (res.view == 'inventoryWS' || res.view == 'removeSelectionInWS')) {
                this.gridComp?.gridApi?.deselectAll();
                if (this.sharedService?.enableHighlightInWorksheet) {
                    //after removing selection we need to change selection css in case of highlight
                    this.gridComp.gridApi.refreshCells({
                        force: true // skips change detection -> always refreshes the row
                    });
                }
            }
        }),
        );
        
        //Redraw Grid data
        this.worksheetGridService.redrawGrid.subscribe((res) => {
            if (res) {
                this.gridComp.gridApi.redrawRows();
            }
        })
    }

    private initInventoryWS(): void {
        const cols = this.agGridHelperService.getAgGridColumns(`SHELF_ITEM_WORKSHEET`);
        let IDDicts = [];
        for (const columnData of cols) {
            if (columnData['IDDictionary'] !== 0) {
                IDDicts.push({ IDDictionary: columnData.cellRendererParams.IDDictionary });
            }
        }
        if (IDDicts.length > 0) {
            const dictData = this.dictConfigService.dictionaryConfigCollection(IDDicts);
            for (const [i, r] of dictData.entries()) {
                cols[i]['IDDictionary'] = r;
            }
        }

        this.sectionID = this.datasource.$sectionID;
    }

    private _prepareDataModel(rawData): Array<Position> {
        return this.getAllItems(rawData);
    }

    private getAllItems(rawData): Array<Position> {
        let itemsArray = [];
        let uniqueProductIDPackageID = [];
        let tempID;
        let eachRecursive = (obj) => {
            if (obj.hasOwnProperty('Children')) {
                obj.Children.forEach((child) => {
                    if (child.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                        tempID =
                            child.Position.Product.IDProduct.toString() +
                            '@' +
                            child.Position.ProductPackage.IDPackage.toString();
                        if (uniqueProductIDPackageID.indexOf(tempID) == -1) {
                            uniqueProductIDPackageID.push(tempID);
                            if (this.localSearchStatus && child.localSearchFlag) {
                                if (this.sharedService.enableHighlightInWorksheet) {
                                    child.Position.inventoryObject.HighlightLabel = child.highlightLabel(
                                        this.planogramservice.templateRangeModel,
                                        child,
                                    );
                                }
                                itemsArray.push(child);
                            } else if (!this.localSearchStatus) {
                                if (this.sharedService.enableHighlightInWorksheet) {
                                    child.Position.inventoryObject.HighlightLabel = child.highlightLabel(
                                        this.planogramservice.templateRangeModel,
                                        child,
                                    );
                                }
                                itemsArray.push(child);
                            }
                        }
                    }
                    eachRecursive(child);
                }, obj);
            }
        };

        eachRecursive(rawData);
        return itemsArray;
    }

    public invokeSelectedInventoryRow(cellEvent: SelectionChangedEvent): void {
        let selectedRow: Position[] = [];
        const selectedRows = this.gridComp.gridApi.getSelectedRows();
        const ids = selectedRows.map((x) => x.IDPOGObject);
        this.inventoryList.forEach((item) => {
            const res = ids.includes(item.IDPOGObject);
            if (res) {
                selectedRow.push(item);
            }
        });
        this.sharedService.selectedObject(selectedRow[0]);
        if(selectedRow[0]?.ObjectDerivedType !== AppConstantSpace.POSITIONOBJECT){
            return ;
        }
        this.planogramservice.removeAllSelection(this.sharedService.activeSectionID);
        selectedRow.forEach((pos) => {
            this.planogramservice.addToSelectionByObject(pos, this.sharedService.activeSectionID);
            pos.selected = true;
        });
        if (selectedRow.length > 1) {
            this.planogramservice.selectionEmit.next(true);
        }
    }

    private applyPositionColor(): void {
        this.inventoryList.forEach((dataItem) => {
            dataItem.backgroundColor = this.sharedService.enableHighlightInWorksheet
                ? dataItem.highlightColor(this.planogramservice.templateRangeModel, dataItem)
                : '';
        });
        this.gridComp?.gridApi?.setRowData(this.inventoryList);
    }

    public editedValue(param): void {
        let eachRecursive = (obj, data) => {
            if (obj.hasOwnProperty('Children')) {
                obj.Children.forEach((child) => {
                    if (Utils.checkIfPosition(child)) {
                        if (child.IDPOGObject == data.IDPOGObject) {
                            this.fName = param.event.colDef.field;
                            let unqHistoryID = this.historyService.startRecording();
                            this.setFieldValue(child, this.fName, param.event.newValue);
                            let newValue = param.event.newValue;
                            let oldValue = param.event.oldValue;
                            const inventoryObjData = {
                                Position: child,
                                id: child._CalcField.Position.id,
                                newValue: newValue,
                                unqHistoryID: unqHistoryID,
                                oldValue: oldValue,
                            };
                            this.saveEdit(inventoryObjData);
                            return;
                        }
                    }
                    eachRecursive(child, param.event.data);
                }, obj);
            }
        };
        eachRecursive(this.pogObject, param.event.data);
        const dObj = {
            porertyType: null,
            products: [param.event.data],
            objectDerivedType: null,
            productlist: [param.event.data],
        };
        this.render2d.setDirty(dObj);
        this.sharedService.updatePosPropertGrid.next(true);
        this.gridComp.gridApi.redrawRows();
    }

    private setFieldValue(obj, fieldName, fieldValue) {
        const strArray = fieldName.split('.');
        const lkey = strArray[strArray.length - 1];
        if (strArray.length == 1 && typeof obj[lkey] == 'string') {
            this.oldValue = obj[lkey];
            obj[lkey] = fieldValue;
        } else {
            strArray.forEach((key) => {
                if (obj && obj.hasOwnProperty(key)) {
                    if (typeof obj[key] == 'object' && !Array.isArray(obj[key])) {
                        this.setFieldValue(obj[key], fieldName, fieldValue);
                    } else if (!Array.isArray(obj[key] && key == lkey)) {
                        this.oldValue = obj[key];
                        obj[key] = fieldValue;
                    }
                }
            });
        }
    }

    private saveEdit(inventoryObjData): void {
        if (!this.isfilldowninprocess) {
            let oldVM_Entity = this.sharedService.getObject(inventoryObjData.id, this.sectionID) as Position;
            let pogObject = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
            if (
                this.dataValidation.validate(
                    pogObject,
                    oldVM_Entity,
                    this.fName,
                    inventoryObjData.newValue,
                    inventoryObjData.oldValue,
                )
            ) {
                const undoObj = {
                    oldVM_Entity: oldVM_Entity,
                    fieldPathStr: this.fName,
                    newValue: inventoryObjData.newValue,
                    oldValue: inventoryObjData.oldValue,
                    model: inventoryObjData.Position,
                    unqHistoryID: inventoryObjData.unqHistoryID,
                };
                this.worksheetGridService.worksheetUndoRedo(undoObj); //@todo
                this.worksheetGridService.updatePOG_VM(oldVM_Entity, this.fName, inventoryObjData.newValue);
                // this.pogObject.computeMerchHeight(ctx);
                this.historyService.stopRecording(undefined, undefined, inventoryObjData.unqHistoryID);
            } else {
                const dObj = {
                    field: this.fName,
                    newValue: this.oldValue,
                    IDPOGObject: oldVM_Entity.IDPOGObject,
                    gridType: 'Fixture',
                    tab: null,
                };
                this.sharedService.workSheetEvent.next(dObj);
                this.setFieldValue(oldVM_Entity, inventoryObjData.oldValue, inventoryObjData.oldValue);
            }
        }
    }

    public fillDownandUpInventoryWS(data): void {
        this.worksheetGridService.changeFillUpDownDataEvent(data, this.pogObject);
        this.gridComp.gridApi.redrawRows();
    };

    public deleteObject(): void {
        this.worksheetGridService.delete();
    }

    public worksheetKeyEvents = (event): void => {
        this.worksheetGridService.keyUpEvents(event, this.displayView);
    };

    ngOnDestroy(): void {
        if (this.subscriptions) {
            this.subscriptions.unsubscribe();
        }
        this.sharedService.selectedObject(null);
    }
}
