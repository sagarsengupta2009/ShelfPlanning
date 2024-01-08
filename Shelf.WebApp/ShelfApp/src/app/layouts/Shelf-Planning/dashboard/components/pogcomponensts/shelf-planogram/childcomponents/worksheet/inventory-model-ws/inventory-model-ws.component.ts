import { AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { isEmpty, filter } from 'lodash-es';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import {
    GridData,
    ItemWSSaveHandler,
    SelectedItemRow,
    KednoGridConfig,
    WorksheetEventData,
} from 'src/app/shared/models';
import { Position, Section } from 'src/app/shared/classes';
import { GridConfig } from 'src/app/shared/components/ag-grid/models';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { KendoGridComponent } from 'src/app/shared/components/kendo-grid/kendo-grid.component';
import {
    HistoryService,
    PlanogramService,
    ParentApplicationService,
    WorksheetGridService,
    AgGridHelperService,
    SharedService,
    PlanogramHelperService,
    PlanogramStoreService,
    DataValidationService,
    Render2dService,
    LocalSearchService,
    PlanogramSaveService,
} from 'src/app/shared/services';
import { ExcelExportParams, SelectionChangedEvent } from 'ag-grid-community';

@Component({
    selector: 'sp-inventory-model-ws',
    templateUrl: './inventory-model-ws.component.html',
    styleUrls: ['./inventory-model-ws.component.scss'],
})
export class InventoryModelWsComponent implements OnInit, AfterViewInit, OnChanges {
    @Input() sectionObject: Section;
    @ViewChild('itemWSgrid') itemWSgrid: KendoGridComponent;
    @Input() displayView: string;
    @Input() panalID: string;
    @ViewChild('agGrid') gridComp: AgGridComponent;
    public aggridConfig: GridConfig;
    public gridConfig: KednoGridConfig;
    private componentNumber: number = 5;
    private isfilldowninprocess: boolean = false;
    private sectionID: string;
    private fName: string;
    private oldValue: GridData;
    private rowSelectionInvoked: boolean = false;
    private pogObject: Section;
    private subscriptions: Subscription = new Subscription();
    private items: Position[] = [];
    private selectedRow: number = 0;
    constructor(
        private readonly sharedservice: SharedService,
        private readonly parentApp: ParentApplicationService,
        private readonly planogramservice: PlanogramService,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly planogramHelperService: PlanogramHelperService,
        private readonly historyService: HistoryService,
        private readonly worksheetGridService: WorksheetGridService,
        private readonly dataValidation: DataValidationService,
        private readonly render2d: Render2dService,
        private readonly localSearchService: LocalSearchService,
        private readonly planogramSaveService: PlanogramSaveService,
    ) { }

    ngOnInit(): void {

        if (
            this.planogramservice.rootFlags[this.sharedservice.getActiveSectionId()].isEnabled ||
            this.sharedservice.enableHighlightInWorksheet
        ) {
            this.applyPositionColor();
        }

        this.subscriptions.add(this.sharedservice.workSheetEvent.subscribe((response: WorksheetEventData) => {
            if (response) {
                this.gridComp.gridApi.redrawRows();
            }
        }),
        );

        this.subscriptions.add(this.sharedservice.deleteSubscription.subscribe((res) => {
            if (res) {
                this.gridComp?.removeRows(res);
            }
        })
        );

        this.subscriptions.add(
            this.sharedservice.showShelfItem.subscribe((res: boolean) => {
                if (res) {
                    if (this.gridComp && this.gridComp?.gridApi) {
                        let shelfandCartItem = this.items.concat(this.sharedservice.ShppingcartItems);
                        this.gridComp?.gridApi?.setRowData(shelfandCartItem);
                    } else {
                        const shelfItems = this.items.concat(this.sharedservice.ShppingcartItems); //not needed concated data in global positions object so created shelfItems
                        this.initWorkSheet(shelfItems);
                    }
                }
            }),
        );

        this.subscriptions.add(
            this.planogramservice.highlightPositionEmit.subscribe((res) => {
                if (res) {
                    if (this.localSearchService.search) {
                        const highlightedItemsIds = this.sharedservice.selectedID[this.sectionID];
                        const highlightedItems = this.items.filter(ele => highlightedItemsIds.some(pos => pos === ele.$id));
                        if (this.gridComp && this.gridComp.gridApi) {
                            this.gridComp?.gridApi?.setRowData(highlightedItems);
                        } else {
                            this.initWorkSheet(highlightedItems);
                        }
                    }
                }
            }),
        );

        //ReloadGrid
        this.subscriptions.add(
            this.sharedservice.gridReloadSubscription.subscribe((res: boolean) => {
                if (res) {
                    const tempData = this._prepareDataModel();
                    this.gridComp?.gridApi?.setRowData(tempData);
                    this.gridComp.gridApi.refreshCells();
                }
            }),
        );
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!isEmpty(this.sectionObject)) {
            this.initWorkSheet();
        }
    }

    private selectDefaultItemRow() {
        const selectedObj = this.planogramservice.getSelectedObject(this.sharedservice.getActiveSectionId());
        if(selectedObj.length > 0 && selectedObj[0].ObjectType == AppConstantSpace.POSITIONOBJECT){
            this.selectedRow = selectedObj[0].IDPOGObject;
        }
    }

    public initWorkSheet(shelfItems?: Position[]): void {
        const list = this.planogramStore.downloadedPogs;
        const index = list.findIndex((x) => x['IDPOG'] === this.sectionObject.IDPOG);
        if (index !== -1) {
            this.sectionID = list[index]['sectionID'];
        }
        else{
            this.sectionID = this.sharedservice.activeSectionID;
        }
        this.pogObject = this.sharedservice.getObject(this.sectionID, this.sectionID) as Section;
        const cols = this.agGridHelperService.getAgGridColumns(`SHELF_ITEM_WORKSHEET`);
        if (!this._isEditable()) {
            cols.map((ele) => {
                ele.editable = false;
            });
        }
        if (!shelfItems?.length) {
            shelfItems = this.items = this._prepareDataModel();
        }
        this.selectDefaultItemRow();
        this.aggridConfig = {
            ...this.aggridConfig,
            id: 'SHELF_ITEM_WORKSHEET',
            data: shelfItems,
            columnDefs: cols,
            isFillDown: true,
            skipToParam: { colName: 'IDPOGObject', value: this.selectedRow },
            panelId: this.panalID
        };
    }

    //ToDo  @Amit - After Fix of Find Duplicate option of Advance search will complete.
    public removeDuplicates(originalArray, prop1, prop2, prop3) {
        let newArray = [];
        const lookupObject = {};

        for (const i in originalArray) {
            lookupObject[originalArray[i][prop1][prop2][prop3]] = originalArray[i];
        }

        for (const i in lookupObject) {
            newArray.push(lookupObject[i]);
        }
        return newArray;
    }

    ngAfterViewInit(): void {
        this.subscriptions.add(this.sharedservice.itemSelection.subscribe((res) => {
            if (res?.pogObject?.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
                let selectedPosObject = res['pogObject'];
                if (selectedPosObject[`$id`]) {
                    this.gridComp.skipTo('$id', selectedPosObject[`$id`], 'string', res.view);
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
                    this.gridComp.selectMultipleRows('$id', selectedObjsList.map(x => x.$id), 'string', res.view);
                }
            } else if (res?.view === AppConstantSpace.SELECTALL) {
                if(this.sharedservice.ShppingcartItems.length){
                    let selectedObjsList: Position[] = this.items;
                    this.gridComp.selectMultipleRows('$id',selectedObjsList.map(x => x.$id), 'string', res.view);
                }else{
                    this.gridComp.params.api.selectAll();
                } 
            } else {
                this.gridComp.gridApi.deselectAll();
            }
            if (this.sharedservice?.enableHighlightInWorksheet) {
                //after selection we need to change selection css in case of highlight
                this.gridComp.gridApi.refreshCells({
                    force: true // skips change detection -> always refreshes the row
                });
            }
        }),
        );
        this.subscriptions.add(this.sharedservice.addProductAfterDrag.subscribe((res: boolean) => {
            if (res) {
                this.items = this._prepareDataModel();
                this.gridComp?.gridApi?.setRowData(this.items);
            }
        }),
        );



        //High light value update
        this.subscriptions.add(this.sharedservice.itemWSApplyPositionColor.subscribe((res: { gridType: string }) => {
            if (res != null && res.gridType == 'Position') {
                this.items = this._prepareDataModel();
                this.applyPositionColor();
            }
        }),
        );



        // Download Excel
        this.subscriptions.add(this.sharedservice.downloadExportExcel.subscribe((res: { view: string }) => {
            if (res != null && res.view == 'itemWS') {
                let params: ExcelExportParams = {};
                params.fileName = `${this.sectionObject.Name}_${this.sectionObject.IDPOG}_${this.displayView}`;
                this.gridComp.exportToExcel(params);
            }
        }),
        );


        this.subscriptions.add(this.sharedservice.showShoppingCartItem.subscribe((res: boolean) => {
            if (res) {
                if (this.sharedservice.ShppingcartItems.length > 0) {
                    let shelfandCartItem = this.items.concat(this.sharedservice.ShppingcartItems);
                    this.gridComp?.gridApi?.setRowData(shelfandCartItem);
                }
            } else {
                this.gridComp?.gridApi?.setRowData(this.items);
            }
        }),
        );

        //show duplicate pog in WS
        this.subscriptions.add(this.sharedservice.selectedDuplicateProducts.subscribe((res: Position[]) => {
            if (res?.length > 0) {
                let duplicateUpcList = this.sharedservice.duplicateProducts;
                let uniqueUPC = this.removeDuplicates(duplicateUpcList, 'Position', 'Product', 'UPC');
                this.gridComp?.gridApi?.setRowData(uniqueUPC);
            } else {
                this.gridComp?.gridApi?.setRowData(this.items);
            }
        }),
        );
        // Remove Selection
        this.subscriptions.add(this.sharedservice.RemoveSelectedItemsInWS.subscribe((res: { view: string }) => {
            if (res != null && (res.view == 'itemWS' || res.view == 'removeSelectionInWS')) {
                this.gridComp?.gridApi?.deselectAll();
                if (this.sharedservice?.enableHighlightInWorksheet) {
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

    private getAllItems(): Position[] {
        let itemsArray: Position[] = [];
        let uniqueProductIDPackageID = {};
        let tempID: string;
        this.pogObject = this.sharedservice.getObject(this.sectionID, this.sectionID) as Section;
        let eachRecursive = (obj) => {
            let isShoppingcartItm = false;
            if (obj.hasOwnProperty('Children')) {
                obj.Children.forEach((child, key) => {
                    if (child.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                        tempID = child.Position.Product.IDProduct.toString();
                        const parentFix = this.sharedservice.getObject(child.$idParent, child.$sectionID);
                        if (
                            uniqueProductIDPackageID[tempID] == undefined ||
                            (uniqueProductIDPackageID[tempID] != undefined &&
                                uniqueProductIDPackageID[tempID]['isShoppingCartItem'] &&
                                !Utils.checkIfShoppingCart(parentFix) &&
                                (isShoppingcartItm = true))
                        ) {
                            uniqueProductIDPackageID[tempID] = {
                                isShoppingCartItem: Utils.checkIfShoppingCart(parentFix),
                            };

                            if (this.planogramservice.localSearchStatus && child.localSearchFlag) {
                                itemsArray.push(child);
                            } else if (!this.planogramservice.localSearchStatus) {
                                if(isShoppingcartItm){
                                    let item=itemsArray.filter(function (itm) {
                                        return itm.Position.IDProduct.toString() == tempID;
                                    })[0];
                                    item && itemsArray.splice(itemsArray.indexOf(item, 1,));
                                isShoppingcartItm = false;
                                }  
                                if (!uniqueProductIDPackageID[tempID]['isShoppingCartItem']) {
                                    itemsArray.push(child);
                                }
                            }
                        }
                        if (this.sharedservice.enableHighlightInWorksheet) {
                            child.Position.inventoryObject.HighlightLabel = child.highlightLabel(
                                this.planogramservice.templateRangeModel,
                                child,
                            );
                        }
                    }
                    eachRecursive(child);
                });
            }
        };

        eachRecursive(this.pogObject);
        return itemsArray;
    }

    public _prepareDataModel(): Position[] {
        return this.getAllItems();
    }

    public invokeSelectedItemRow(cellEvent: SelectionChangedEvent): void {
        const selectedRows = this.gridComp.gridApi.getSelectedRows();
        const ids = selectedRows.map((it) => it.$id);
        const items = this.sharedservice.ShppingcartItems.length
        ? this.items.concat(this.sharedservice.ShppingcartItems)
        : this.items;
        const selectedRow = items.filter(it => ids.includes(it.$id));
        this.sharedservice.selectedObject(selectedRow[0]);
        if(selectedRow[0]?.ObjectDerivedType !== AppConstantSpace.POSITIONOBJECT){
            return ;
        }
        this.planogramservice.removeAllSelection(this.sharedservice.activeSectionID);
        selectedRow.forEach((pos) => {
            this.planogramservice.addToSelectionByObject(pos, this.sharedservice.activeSectionID);
            pos.selected = true;
        });
        if (selectedRow.length > 1) {
            this.planogramservice.selectionEmit.next(true);
        }
    }

    public itemclicked(item: Position, $event: SelectedItemRow): void {
        this.sectionID = this.sharedservice.getActiveSectionId();
        switch (true) {
            case $event.ctrlKey:
                //add to selctionobject
                this.worksheetGridService.selectObjectByEvent(item, this.sectionID);
                break;
            case $event.shiftKey:
                //add to selctionobject
                this.worksheetGridService.selectObjectByEvent(item, this.sectionID);
                break;
        }
    }

    public editedValue(params): void {
        let eachRecursive = (obj, data) => {
            if (obj.hasOwnProperty('Children')) {
                obj.Children.forEach((child, key) => {
                    if (Utils.checkIfPosition(child)) {
                        if (child.IDPOGObject == data.IDPOGObject) {
                            this.fName = params.event.colDef.field;
                            let unqHistoryID = this.historyService.startRecording();
                            let res = this._isEditable();
                            if (res) {
                                if (this.fName == 'Position.attributeObject.Color_color') {
                                    this.setColorCode(params.event.value, this.fName, child);
                                }
                                this.setFieldValue(child, this.fName, params.event.value);
                                const posObj: ItemWSSaveHandler = {
                                    Position: child,
                                    id: child._CalcField.Position.id,
                                    newValue: params.event.newValue,
                                    unqHistoryID: unqHistoryID,
                                    oldvalue: params.event.oldValue,
                                };
                                this.saveHandler(posObj);
                            }
                            return;
                        }
                    }
                    eachRecursive(child, params.event.data);
                }, obj);
            }
        };
        eachRecursive(this.pogObject, params.event.data);
        const dObj = {
            porertyType: null,
            products: [params.event.data],
            objectDerivedType: null,
            productlist: [params.event.data],
        };
        this.render2d.setDirty(dObj);
        this.sharedservice.updatePosPropertGrid.next(true);
        this.gridComp.gridApi.redrawRows();
    }

    public setColorCode = (event, fieldObj, itemdata) => {
        if (fieldObj == 'Position.attributeObject.Color_color') {
            itemdata.Position.attributeObject.Color_color = event;
            this.setFieldValue(itemdata, 'Position.attributeObject.Color_color', event);
        } else {
            itemdata = this.sharedservice.setObjectField(undefined, fieldObj, event, undefined, itemdata);
        }
        if (itemdata != null) {
            if (typeof itemdata.Position.attributeObject.Color_color == 'undefined') {
                itemdata.Position.attributeObject.Color_color = this.getColorCode(itemdata);
            }
            let newValue = event;
            let colorCode = Object.assign(itemdata.Position.attributeObject.Color_color).replace('#', '');
            let colorCodeNum = parseInt(colorCode, 16);
            itemdata.Position.attributeObject.Color = parseInt(colorCode, 16);
            const datasource = this.sharedservice.getObject(this.sectionID, this.sectionID) as Section;
            const packageID = itemdata.Position.IDProduct + '@' + itemdata.Position.IDPackage;
            datasource.PackageAttributes[packageID].Color = parseInt(colorCode, 16).toString();
            const positions = datasource.getAllPositions();

            this.planogramservice.rootFlags[this.sectionID].isSaveDirtyFlag = true;
            this.planogramservice.updateSaveDirtyFlag(true);
        }
    };

    public getColorCode = (itemData) => {
        if (itemData != null) {
            const colorCode = itemData.getStringColor();
            itemData.Position.attributeObject.Color_color = colorCode;
            return itemData;
        } else {
            return itemData;
        }
    };

    public getOldValue(obj: Position, fieldName: string, fieldValue: GridData): GridData {
        const strArray = fieldName.split('.');
        const lkey = strArray[strArray.length - 1];
        if (strArray.length == 1 && typeof obj[lkey] == 'string') {
            this.oldValue = obj[lkey];
            return this.oldValue;
        } else {
            strArray.forEach((key) => {
                if (obj && obj.hasOwnProperty(key)) {
                    if (typeof obj[key] == 'object' && !Array.isArray(obj[key])) {
                        this.setFieldValue(obj[key], fieldName, fieldValue);
                    } else if (!Array.isArray(obj[key] && key == lkey)) {
                        this.oldValue = obj[key];
                        return this.oldValue;
                    }
                }
            });
        }
        return this.oldValue;
    }

    public setFieldValue(obj: Position, fieldName: string, fieldValue: GridData): void {
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
                        obj[key] = fieldValue
                    }
                }
            });
        }
    }

    public _isEditable(): boolean {
        const appSettingsSvc = this.planogramStore.appSettings;
        if (this.parentApp.isNiciMode || this.planogramHelperService.isPOGLive(this.sectionID, false)) {
            return false;
        }
        return !appSettingsSvc.isReadOnly;
    }

    private saveHandler(data: ItemWSSaveHandler): void {
        if (!this.isfilldowninprocess) {
            const oldVM_Entity = this.sharedservice.getObject(data.id, this.sectionID) as Position;
            let pogObject = this.sharedservice.getObject(data.Position.$sectionID, this.sectionID) as Section;
            if (this.dataValidation.validate(pogObject, oldVM_Entity, this.fName, data.newValue, this.oldValue)) {
                // Added to for Undo Redo Operation
                const obj = {
                    oldVM_Entity: oldVM_Entity,
                    fieldPathStr: this.fName,
                    newValue: data.newValue,
                    oldValue: data.oldvalue,
                    model: data.Position,
                    unqHistoryID: data.unqHistoryID,
                };
                this.worksheetGridService.worksheetUndoRedo(obj); //@todo
                this.worksheetGridService.updatePOG_VM(oldVM_Entity, this.fName, data.newValue);
                // this.pogObject.computeMerchHeight(ctx);
                this.historyService.stopRecording(undefined, undefined, data.unqHistoryID);
            } else {
                const dObj = {
                    field: this.fName,
                    newValue: data.oldvalue,
                    IDPOGObject: oldVM_Entity.IDPOGObject,
                    gridType: 'item',
                    tab: null,
                };
                this.sharedservice.workSheetEvent.next(dObj);
                this.setFieldValue(data.Position, this.fName, data.oldvalue);
            }
        }
    }

    public toggleItemsWrkSheetMode(): void {
        let filters = [];
        const isDisplayCartItems = this.planogramservice.rootFlags[this.sectionID].displayWorksheet.Cart;
        const isDisplayItems = this.planogramservice.rootFlags[this.sectionID].displayWorksheet.Planogram;

        if (isDisplayCartItems) {
            filters.push({
                field: 'Fixture.FixtureNumber',
                operator: 'eq',
                value: 0,
            });
        }

        if (isDisplayItems) {
            filters.push({
                field: 'Fixture.FixtureNumber',
                operator: 'gt',
                value: 0,
            });
        }

        if (!isDisplayCartItems && !isDisplayItems) {
            filters.push({
                field: 'Fixture.FixtureNumber',
                operator: 'eq',
                value: -2,
            });
        }
    }

    public getStyleForActive(): boolean {
        if (
            this.sharedservice.getActiveSectionId() == this.sectionID &&
            this.sharedservice.getActiveComponentNumber() == this.componentNumber
        ) {
            return true;
        }
        return false;
    }

    public fillDownUPHandler(data): void {
        this.worksheetGridService.changeFillUpDownDataEvent(data, this.pogObject);
        this.gridComp.gridApi.redrawRows();
    }

    public applyPositionColor(): void {
        this.items.forEach((dataItem, key) => {
            dataItem.backgroundColor = this.sharedservice.enableHighlightInWorksheet
                ? dataItem.highlightColor(this.planogramservice.templateRangeModel, dataItem)
                : '';
        });
        this.gridComp?.gridApi?.setRowData(this.items);
    }

    public deleteObject(): void {
        this.worksheetGridService.delete();
    }

    public worksheetKeyEvents = (event): void => {
        this.worksheetGridService.keyUpEvents(event, this.displayView);
    };

    ngOnDestroy(): void {
        this.sharedservice.selectedObject(null);
        if (this.subscriptions) {
            this.subscriptions.unsubscribe();
        }
    }
}
