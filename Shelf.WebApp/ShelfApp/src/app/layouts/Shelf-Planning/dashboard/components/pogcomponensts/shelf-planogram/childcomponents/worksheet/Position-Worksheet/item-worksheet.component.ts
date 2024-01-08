import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import { isEmpty, cloneDeep } from 'lodash-es';
import { Subscription } from 'rxjs';
import { AppConstantSpace, PosIntersectionArray, Utils, FixtureIntersectionArray, PogIntersectionArray } from 'src/app/shared/constants';
import { GridData, LogDataType, PogSettings, WorksheetEventData } from 'src/app/shared/models';
import {
    ConfigService,
    HistoryService,
    PlanogramService,
    SharedService,
    DictConfigService,
    WorksheetGridService,
    AgGridHelperService,
    PlanogramHelperService,
    ParentApplicationService,
    DataValidationService,
    CrunchModeService,
    NotifyService,
    PropertyGridService,
    PlanogramStoreService,
    LocalSearchService,
    PlanogramSaveService,
    PropertyGridPegValidationService,
    PegLibraryService,
    AllocateNpiService,
    InformationConsoleLogService,
} from 'src/app/shared/services';
import { Position } from 'src/app/shared/classes/position';
import { KendoGridComponent } from 'src/app/shared/components/kendo-grid/kendo-grid.component';
import { GridConfig, GridColumnCustomConfig } from 'src/app/shared/components/ag-grid/models';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { PlanogramObject, Section } from 'src/app/shared/classes';
import { ColDef, ExcelExportParams, ExcelStyle, SelectionChangedEvent } from 'ag-grid-community';
import { Render2dService } from 'src/app/shared/services/render-2d/render-2d.service';
import { PositionParentList } from 'src/app/shared/services/common/shared/shared.service';
import { Context } from 'src/app/shared/classes/context';
import { has } from 'lodash';
import { AgGridColumnService } from 'src/app/shared/components/ag-grid/services/ag-grid-column.service';

@Component({
    selector: 'sp-item-worksheet',
    templateUrl: './item-worksheet.component.html',
    styleUrls: ['./item-worksheet.component.scss'],
})
export class ItemWorksheetComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
    @Input() sectionObject: any;
    @Output() updatedSectionObject: EventEmitter<any> = new EventEmitter<any>();
    @Input() panalID: string;
    @Input() selectedPogObject: any;
    @Input() displayView: any;

    //-------------
    aggridConfig: GridConfig;
    //-------------

    @ViewChild('positionWSgrid') positionWSgrid: KendoGridComponent;

    @ViewChild('agGrid') gridComp: AgGridComponent;


    public columnsData: any[] = [];
    public isfilldowninprocess = false;
    public positionSheetConfig = {
        id: 'positionSheet',
        gridName: 'SHELF_POSITION_WORKSHEET',
        applicationID: 1,
        applicationName: 'Shelf',
        kendoGridID: 'positionWorksheet',
    };
    public cbClicked = false;
    public sectionID;
    public gridName = 'SHELF_POSITION_WORKSHEET';
    public LkOptions = {};
    public colorDD;
    public position: Position;
    public datasource;
    public localSearchStatus = false;
    public selectedRows;
    public preparedModel;
    public data: any = [];
    public dictConfig: any;
    public selectedPosition: any[] = [];
    public secStoreObj;
    public IsEditable;
    public rootObj;
    public objParent;
    public entity;
    private selectedRow: number = 0;
    public skipToRow = {};
    public oldCellValue: any;
    public fieldPathStr: string;
    public fielsEditable = false;
    public propertySubscription;
    public copySubscription;
    public fName;
    public oldValue;
    rowSelectionInvoked: boolean = false;
    public pogObject;
    public showcartitemsub: Subscription;
    public exportFileName;
    private positions: Position[] = [];
    private subscriptions: Subscription = new Subscription();
    private pogSettings: PogSettings;
    public excelstyles: ExcelStyle[];
    public get deploymentPath(): string {
        return this.config.deploymentPath;
    }
    private pegFields = ['Position.PegType', 'Position.BackHooks', 'Position.BackSpacing', 'Position.FrontBars', 'Position.FrontSpacing'];
    constructor(
        private readonly sharedService: SharedService,
        private readonly parentApp: ParentApplicationService,
        private readonly cd: ChangeDetectorRef,
        private readonly config: ConfigService,
        private readonly planogramservice: PlanogramService,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly dictcongig: DictConfigService,
        private readonly worksheetGridService: WorksheetGridService,
        private readonly historyService: HistoryService,
        private readonly planogramService: PlanogramService,
        private readonly planogramHelper: PlanogramHelperService,
        private readonly dataValidation: DataValidationService,
        private readonly crunchMode: CrunchModeService,
        private readonly translate: TranslateService,
        private readonly notifyService: NotifyService,
        private readonly propertyGridService: PropertyGridService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly render2d: Render2dService,
        private readonly localSearchService: LocalSearchService,
        private readonly planogramSaveService: PlanogramSaveService,
        private readonly propertyGridPegValidationService: PropertyGridPegValidationService,
        private readonly pegLibraryService: PegLibraryService,
        private readonly agGridColService: AgGridColumnService,
        private readonly allocateNpi: AllocateNpiService,
        private readonly informationConsoleLogService: InformationConsoleLogService
    ) { }

    public SelectedposObject = null;
    private gridColumnCustomConfig: GridColumnCustomConfig = {
        isLookUpDataNeeded: true,
        dynamicDropdown: { field: ['Position.IDPackage','Position.IDOrientation'], value: [true,true], fillUpDownIsDynamic: [false, true] },
        editableCallbacks: [
            {
                isEditableCallbackRequired: true,
                fieldsToValidateForCallback: ['Position.TagHeight', 'Position.TagWidth', 'Position.TagYOffset', 'Position.TagXOffset'],
                editableCallbackTemplate: 'params.data.Position.IsPegTag ? true : false'
            },
            {
                isEditableCallbackRequired: true,
                fieldsToValidateForCallback: ['Position.BackSpacing'],
                editableCallbackTemplate: 'params.data.Position.BackHooks > 1 ? true : false'
            },
            {
                isEditableCallbackRequired: true,
                fieldsToValidateForCallback: ['Position.FrontSpacing'],
                editableCallbackTemplate: 'params.data.Position.FrontBars > 1 ? true : false',
            },
        ]
    }
    ngAfterViewInit(): void {
        this.subscriptions.add(
            this.sharedService.itemSelection.subscribe((res) => {
                if (res && res.pogObject && res.pogObject.ObjectDerivedType === 'Position') {
                    this.SelectedposObject = res['pogObject'];
                    if (this.SelectedposObject[`$id`]) {
                        this.gridComp.skipTo('$id', this.SelectedposObject[`$id`], 'string', res.view);
                    } else {
                        this.gridComp.skipTo('TempId', this.SelectedposObject[`TempId`], 'number',);
                    }
                    if (this.rowSelectionInvoked) {
                        this.rowSelectionInvoked = false;
                        return;
                    }
                } else if (res && res.pogObjectArray) {
                    if (res.view === 'ctrl' || res.view === 'shift') {
                        let selectedObjsList: PlanogramObject[] = res.pogObjectArray;
                        this.gridComp.selectMultipleRows('$id', selectedObjsList.map(x => x.$id), 'string', res.view);
                    }
                } else if (res?.view === AppConstantSpace.SELECTALL) {
                    if (this.sharedService.ShppingcartItems.length > 0) {
                        let selectedObjsList: Position[] = this.positions;
                        this.gridComp.selectMultipleRows('$id', selectedObjsList.map(x => x.$id), 'string', res.view);
                    } else {
                        this.gridComp.params.api.selectAll();
                    }
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

        //show duplicate pog in WS
        this.subscriptions.add(
            this.sharedService.selectedDuplicateProducts.subscribe((res: Position[]) => {
                if (res) {
                    if (res.length > 0) {
                        this.gridComp?.gridApi?.setRowData(this.sharedService.duplicateProducts);
                    } else if (res.length == 0) {
                        this.gridComp.gridApi.setRowData([]);
                    }
                }
            }),
        );
    }
    ngOnChanges(changes: SimpleChanges): void {
        if (!isEmpty(this.sectionObject)) {
            this.initWorkSheet();
        }
    }

    ngOnInit(): void {
        this.sectionID = this.sharedService.activeSectionID;
        this.pogSettings = this.planogramService.rootFlags[this.sectionID];
        //Property grid value update
        this.subscriptions.add(
            this.sharedService.workSheetEvent.subscribe((response: WorksheetEventData) => {
                if (response && response.gridType == 'Position') {
                    this.gridComp.updateValue(response, 'IDPOGObject', response.field);
                }
            }),
        );

        //proudct add when copy paste happen
        this.subscriptions.add(
            this.sharedService.copyPasteSubscription.subscribe((res: Position[]) => {
                if (res) {
                    const tempData = this.pogObject.getAllPositions();
                    this.gridComp?.gridApi?.setRowData(tempData);
                }
            }),
        );

        //add position in worksheet after dragdrop
        this.subscriptions.add(
            this.sharedService.addProductAfterDrag.subscribe((res: boolean) => {
                if (res) {
                    const tempData = this.pogObject.getAllPositions();
                    this.gridComp?.gridApi?.setRowData(tempData);
                }
            }),
        );

        //delete item
        this.subscriptions.add(
            this.sharedService.deleteSubscription.subscribe((res: Position[]) => {
                if (res) {
                    this.gridComp?.removeRows(res);
                }
            }),
        );
        //ReloadGrid
        this.subscriptions.add(
            this.sharedService.gridReloadSubscription.subscribe((res: boolean) => {
                if (res) {
                    const tempData = this.pogObject.getAllPositions();
                    this.gridComp?.gridApi?.setRowData(tempData);
                    this.gridComp?.gridApi?.refreshCells();
                    this.retainSearch();
                }
            }),
        );
        //High light value update
        this.subscriptions.add(
            this.sharedService.itemWSApplyPositionColor.subscribe((res: { gridType: string }) => {
                if (res && res.gridType == 'Position') {
                    this.applyPositionColor();
                }
            }),
        );


        // Download Excel
        this.subscriptions.add(this.sharedService.downloadExportExcel.subscribe((res: { view: string }) => {
            if (res && res.view == 'positionWS') {
                let params: ExcelExportParams = {};
                params.fileName = `${this.selectedPogObject.Name}_${this.selectedPogObject.IDPOG}_${this.displayView}`;
                if (this.sharedService.enableHighlightInWorksheet) {
                    this.applyPositionColor();
                }
                this.gridComp.exportToExcel(params);
            }
        }));

        this.showcartitemsub = this.sharedService.showShoppingCartItem.subscribe((res: boolean) => {
            if (res) {
                this.gridComp?.gridApi?.setRowData(this.sharedService.ShppingcartItems);
            }
        });

        this.subscriptions.add(
            this.sharedService.showShelfItem.subscribe((res: boolean) => {
                if (res) {
                    if (this.gridComp && this.gridComp?.gridApi) {
                        let ShelfandCartItem: Position[];
                        ShelfandCartItem = this.positions = this.pogObject.getAllPositions(this.sectionID);
                        if (!this.pogSettings.displayWorksheet.Planogram && this.pogSettings.displayWorksheet.Cart) {
                            ShelfandCartItem = this.sharedService.ShppingcartItems;
                        }
                        else if (this.pogSettings.displayWorksheet.Planogram && this.pogSettings.displayWorksheet.Cart) {
                            ShelfandCartItem = this.positions.concat(this.sharedService.ShppingcartItems);
                        }
                        this.gridComp?.gridApi?.setRowData(ShelfandCartItem);
                    }
                }
            }),
        );

        // Remove Selection
        this.subscriptions.add(
            this.sharedService.RemoveSelectedItemsInWS.subscribe((res: { view: string }) => {
                if (res && (res.view == 'positionWS' || res.view == 'removeSelectionInWS')) {
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

        this.subscriptions.add(
            this.planogramService.highlightPositionEmit.subscribe((res) => {
                if (res) {
                    this.retainSearch();
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
    public initWorkSheet = (shelfItems?: Position[]) => {
        const list = this.planogramStore.downloadedPogs;
        const index = list.findIndex((x) => x['IDPOG'] === this.sectionObject.IDPOG);
        if (index !== -1) {
            this.sectionID = list[index]['sectionID'];
        }
        else {
            this.sectionID = this.sharedService.activeSectionID;
        }
        this.pogSettings = this.planogramService.rootFlags[this.sectionID];
        this.pogObject = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        this.columnsData = this.agGridHelperService.getAgGridColumns('SHELF_POSITION_WORKSHEET', this.gridColumnCustomConfig);
        let availablePegTypesList = this.pegLibraryService?.PegLibrary.filter(x => x.IsActive);
        let availablePegDatasource = [];
        availablePegTypesList?.forEach((item, key) => {
            let fieldOptionObj: any = {};
            fieldOptionObj.key = item.IDPegLibrary;
            fieldOptionObj.value = item.PegName;
            availablePegDatasource.push(fieldOptionObj);
        });
        this.columnsData.forEach((col) => {
            if (col.field === "Position.PegType") {
                col.cellRendererParams.template = JSON.stringify(availablePegDatasource);
                col.cellEditorParams.values = this.agGridColService.getCellEditorValues(col.cellRendererParams.columntype, col.cellRendererParams.template, false);
            }
        })
        if (!shelfItems?.length) {
            shelfItems = this.positions = this.pogObject.getAllPositions(this.sectionID);
            if (!this.pogSettings.displayWorksheet.Planogram && this.pogSettings.displayWorksheet.Cart) {
                shelfItems = this.sharedService.ShppingcartItems;
            }
            else if (this.pogSettings.displayWorksheet.Planogram && this.pogSettings.displayWorksheet.Cart) {
                shelfItems = this.positions.concat(this.sharedService.ShppingcartItems);
            } else if (!this.pogSettings.displayWorksheet.Planogram && !this.pogSettings.displayWorksheet.Cart) {
                shelfItems = [];
            }
        }
        this.selectDefaultPositionRow();
        this.columnsData.forEach((col) => {
            col.cellClass = params => {
                return typeof params.value + 'Type';
            }
        })
        this.aggridConfig = {
            ...this.aggridConfig,
            id: 'SHELF_POSITION_WORKSHEET',
            data: shelfItems,
            columnDefs: this.columnsData,
            isFillDown: true,
            skipToParam: { colName: 'IDPOGObject', value: this.selectedRow },
            panelId: this.panalID,
            gridColumnCustomConfig: this.gridColumnCustomConfig,
            excelStyles: this.excelStyles,
        };
    };

    private selectDefaultPositionRow() {
        const selectedObj = this.planogramService.getSelectedObject(this.sharedService.getActiveSectionId());
        if (selectedObj.length > 0 && selectedObj[0].ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
            this.selectedRow = selectedObj[0].IDPOGObject;
        }
    }

    public exportToExcel = () => {
        this.positionWSgrid.customSaveAsExcel();
    };

    public initPositionWS = () => {
        let IDDicts = [];
        for (const columnData of this.columnsData) {
            if (columnData['IDDictionary'] !== 0) {
                IDDicts.push({ IDDictionary: columnData.IDDictionary });
            }
        }
        if (IDDicts.length > 0) {
            const dictPromise = this.dictcongig.dictionaryConfigCollection(IDDicts);
            for (const [i, dictP] of dictPromise['__zone_symbol__value'].entries()) {
                this.columnsData[i]['IDDictionary'] = dictP;
            }
        }
    };

    public _prepareDataModel = () => {
        return this.pogObject.getAllPositions();
    };


    //TODO @Amit/@Pranay  selection from worksheet to planogram
    public invokeSelectedPositionRow(cellEvent: SelectionChangedEvent): void {
        const selectedRows = this.gridComp.gridApi.getSelectedRows();
        const ids = selectedRows.map((it) => it.$id);
        const positions = this.sharedService.ShppingcartItems.length
            ? this.positions.concat(this.sharedService.ShppingcartItems)
            : this.positions;
        const selectedRow = positions.filter(it => ids.includes(it.$id));
        this.sharedService.selectedObject(selectedRow[0]);
        if (selectedRow[0]?.ObjectDerivedType !== AppConstantSpace.POSITIONOBJECT) {
            return;
        }
        this.planogramservice.removeAllSelection(this.sharedService.activeSectionID);
        selectedRow.forEach((pos, index) => {
            const isOpenPropertyGrid = (selectedRow.length - 1) === index;
            this.planogramservice.addToSelectionByObject(pos, this.sharedService.activeSectionID, isOpenPropertyGrid);
            pos.selected = true;
        });
        if (selectedRow.length > 1) {
            this.planogramService.selectionEmit.next(true);
        }
    }

    private isEditable(): boolean {
        if (this.worksheetGridService.isPOGLive(this.sectionID, false)) {
            return false;
        }
        if (this.sharedService.checkIfAssortMode('item-worksheet-edit')) {
            return true; // return false; // for testing i made it as true
        }
        return true;
    }
    public itemclicked(item, $event): void {
        this.sectionID = this.sharedService.getActiveSectionId();
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
        const id = params.event.data._CalcField.Position.id;
        this.entity = this.sharedService.getObject(id, this.sectionID);
        let eachRecursive = (obj, data) => {
            if (obj.hasOwnProperty('Children')) {
                obj.Children.forEach((child, key) => {
                    if (Utils.checkIfPosition(child)) {
                        if (child.$id === data.$id) {
                            let value = params.event.value;
                            this.fName = params.event.colDef.field;
                            let uniqueHistoryID;
                            if (!this.pegFields.includes(this.fName)) {
                                uniqueHistoryID = this.historyService.startRecording();
                            }
                            let res = this.isEditable();
                            if (res) {
                                let oldvalue = params.event.oldValue;
                                let $id = child._CalcField.Position.id;
                                if (this.fName == 'Position.attributeObject.Color_color') {
                                    this.setColorCode(params.event.value, this.fName, child);
                                }
                                if (this.fName == 'Position.IDOrientation') {
                                    value = this.changeOrientationCxt(value, child, params.event.oldValue);
                                }
                                if (this.fName === 'Position.IDPackage') {
                                    value = this.changePackageStyle(this.fName, child, value, params.event.oldValue);
                                }
                                if (this.fName == 'Position.FacingsX' || this.fName == 'Position.FacingsY' ||
                                    this.fName === 'Position.GapX' || this.fName === 'Position.GapY' ||
                                    this.fName === 'Position.SKUGapX' || this.fName === 'Position.SKUGapY') {
                                    if (!this.changePositionShrink(child, oldvalue)) {
                                        return;
                                    }
                                }
                                if (this.fName == 'Position.MaxFacingsY' || this.fName == 'Position.MinFacingsY' ||
                                    this.fName == 'Position.MaxFacingsX' || this.fName == 'Position.MinFacingsX') {
                                    if (!this.changePositionShrink(child, oldvalue)) {
                                        return;
                                    }
                                    const newValue = this.sharedService.getObjectField(undefined, this.fName, undefined, child) as number;
                                    child.checkAndCalcIfContrainUpdated(this.fName, newValue, oldvalue);
                                    const parentItemData = this.sharedService.getParentObject(child, child.$sectionID);
                                    const ctx = new Context(this.pogObject);
                                    parentItemData.computePositionsAfterChange(ctx);
                                }
                                if (!this.pegFields.includes(this.fName)) {
                                    this.setFieldValue(child, this.fName, value);
                                }
                                this.saveEdit(child, $id, value, uniqueHistoryID, oldvalue);
                                return;
                            }
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
        this.sharedService.updatePosPropertGrid.next(true);
        this.sharedService.renderSeparatorAgainEvent.next(true);
        this.sharedService.renderDividersAgainEvent.next(true);
        this.sharedService.updateGrillOnFieldChange.next(true);
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
                        obj[key] = typeof obj[key] == 'number' ? JSON.parse(fieldValue) : obj[key];
                    }
                }
            });
        }
    };

    //TODO @Amit type of event
    public cellClickHandler(event): boolean {
        if (this.sharedService?.enableHighlightInWorksheet) {
            //after cell click selection we need to change selection css in case of highlight
            this.gridComp.gridApi.refreshCells({
                force: true // skips change detection -> always refreshes the row
            });
        }
        return this.worksheetGridService.cellValidation(event.event.data, event.event.column.colId, event.event.colDef.editable, event.event.colDef.cellRendererParams.IDDictionary, this.displayView);
    }

    public getOldValue = (obj, fieldName, fieldValue) => {
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
    };

    private changeOrientationCxt(value, child, oldVal): GridData {
        const parentItemData = this.sharedService.getParentObject(child, child.$sectionID);
        let pogObj = this.sharedService.getObject(child.$sectionID, child.$sectionID) as Section;
        if (Utils.checkIfstandardShelf(parentItemData)) {
            const ctx = new Context(pogObj);
            parentItemData.computePositionsAfterChange(ctx);
            const response = this.crunchMode.rePositionOnCrunch(ctx, parentItemData);
            if (response && response.revertFlag) {
                //
                child.Position.IDOrientation = oldVal;
                const rollBefore = child.getOrientation();
                child.setOrientation(rollBefore);
                this.notifyService.warn(response.message.toString());
                return child.Position.IDOrientation;
            }
        } else if (Utils.checkIfBasket(parentItemData) || Utils.checkIfCoffincase(parentItemData)) {
            child.Position.IDOrientation = oldVal;
            const response = parentItemData.checkShrinkForOrientation(value, child);
            if (response && response.revertFlag) {
                child.Position.IDOrientation = oldVal;
                this.notifyService.warn(response.message.toString());
                if (this.historyService.unqHistoryID[child.$sectionID]) {
                    this.historyService.stopRecording(undefined, undefined, this.historyService.unqHistoryID[child.$sectionID]);
                    this.historyService.abandonLastCapturedActionInHistory(this.historyService.unqHistoryID[child.$sectionID]);
                }
                return child.Position.IDOrientation;
            }
        }

        if (!pogObj.fitCheck || child.isValidFitChange(value, this.fName)) {
            child.setOrientation(value, { oldVal: oldVal });
            return value;
        } else {
            child.setOrientation(oldVal);
            value = oldVal;
            this.notifyService.warn('FIT_CHECK_ERROR');
            this.updatePOG_VM(child, this.fName, oldVal);
            return value;
        }
    }

    private changePositionShrink(child: Position, oldvalue: number): boolean {
        const parentItemData = this.sharedService.getParentObject(child, child.$sectionID);
        if (Utils.checkIfCoffincase(parentItemData) || Utils.checkIfBasket(parentItemData)) {
            let onlyShrink = undefined;
            if (this.fName === 'Position.FacingsY' || this.fName === 'Position.GapY' || this.fName === 'Position.SKUGapY' || this.fName == 'Position.MinFacingsY') {
                onlyShrink = { X: false, Y: true };
            }

            const newValue = this.sharedService.getObjectField(undefined, this.fName, undefined, child) as number;
            this.setFieldValue(child, this.fName, oldvalue);
            const oldChildren = cloneDeep(parentItemData.Children);
            this.setFieldValue(child, this.fName, newValue);
            const oldFacingX = child.Position.FacingsX;
            const oldFacingY = child.Position.FacingsY;
            if ((this.fName == 'Position.MaxFacingsX' && child.Position.FacingsX > newValue) || (this.fName == 'Position.MinFacingsX' && child.Position.FacingsX < newValue)) {
                child.Position.FacingsX = newValue;
            }
            if ((this.fName == 'Position.MaxFacingsY' && child.Position.FacingsY > newValue) || (this.fName == 'Position.MinFacingsY' && child.Position.FacingsY < newValue)) {
                child.Position.FacingsY = newValue;
            }

            const response = parentItemData.calculatePositionShrink(child, oldChildren, onlyShrink);
            child.Position.FacingsX = oldFacingX;
            child.Position.FacingsY = oldFacingY;
            if (response && response.revertFlag) {
                this.setFieldValue(child, this.fName, oldvalue);
                this.notifyService.warn(response.message.toString());
                return false;
            }
        }
        return true;
    }

    setToDefaultOrientation = (child) => {
        let sectionObj = this.sharedService.getObject(child.$sectionID, child.$sectionID) as Section;
        this.planogramHelper.setToDefaultOrientation(sectionObj);
        this.sharedService.updatePosition.next(child.$id);
    };

    changeOrientation = (val, child) => {
        let sectionObj = this.sharedService.getObject(child.$sectionID, child.$sectionID) as Section;
        if (this.planogramHelper.isPOGLive(child.$sectionID, true)) {
            return;
        }
        this.planogramHelper.changeOrientation(sectionObj, val,'setSelected');
        this.sharedService.updatePosition.next(child.$id);
        this.planogramService.updateNestedStyleDirty = true;
    };

    private changePackageStyle(field: string, itemData: Position, newValue: number, oldVal): number {
        if (field == 'Position.IDPackage') {
            if (itemData.hasBackItem || itemData.hasAboveItem) {
                this.notifyService.warn("CANT_CHANGE_PACKAGE_ABOVE_BEHIND_ITEMS");
                newValue = oldVal;
                this.updatePOG_VM(itemData, this.fName, oldVal);
                return newValue;
            } else if (itemData.Position.AvailablePackageType.filter((AvailablePkgs) => { return AvailablePkgs.IDPackage == newValue; })[0].IdPackageStyle != 1 &&
                itemData.Position.IDMerchStyle == AppConstantSpace.MERCH_ADVANCED_TRAY) {
                this.notifyService.warn('PKG_STYLE_CAN_NOT_BE_CHANGED_WHEN_ADVANCED_TRAY');
                newValue = oldVal;
                this.updatePOG_VM(itemData, this.fName, oldVal);
                return newValue;
            } else {
                this.subscriptions.add(
                    this.planogramService.getPackageTypeInfo(newValue).subscribe((d) => {
                        let currentPackage = d.Data;
                        this.applyChanges(itemData, currentPackage);
                        this.propertyGridService.updatePropertyGridMetaData.next(416);
                        this.sharedService.updatePosition.next(itemData.$id);
                        this.sharedService.updatePosPropertGrid.next(true);
                    }),
                );
                return newValue;
            }
        }
    }

    //ToDO @Amit type of currentPackage - Getting error while assigninig Inventory Model -- Need to discuss with Narendra
    private applyChanges(data, currentPackage): void {

        let newIDPackageAttribute = '' + data.Position.IDProduct + '@' + currentPackage.IDPackage;
        const section_$id = data.$sectionID;
        const itemData = this.sharedService.getObject(data.$id, section_$id);
        // TODO: @malu rootObj is Section (the mixin class) but there is no prop called InventoryModel!
        let rootObj = this.sharedService.getObject(itemData.$sectionID, itemData.$sectionID) as Section;
        const hasPackageAttribute = has(rootObj.PackageAttributes, newIDPackageAttribute);
        const hasInventoryrootObject = has(rootObj.PackageInventoryModel, newIDPackageAttribute);
        const containsInventoryObject = has(data.Position, 'InventoryModel');

        if (!hasPackageAttribute) {
            let packageAttrDefaultTemp = cloneDeep(this.planogramStore.packageAttrDefaultTemplate);
            packageAttrDefaultTemp.IdPackage = currentPackage.IDPackage;
            packageAttrDefaultTemp.IdProduct = data.Position.IDProduct;
            rootObj.PackageAttributes[newIDPackageAttribute] = packageAttrDefaultTemp;
            rootObj.PackageAttributes[newIDPackageAttribute].RecADRI = data.Position.attributeObject.RecADRI;
        }
        if (!hasInventoryrootObject) {
            rootObj.InventoryModel.IDPackage = currentPackage.IDPackage;
            rootObj.InventoryModel.IDProduct = data.Position.IDProduct;
            rootObj.PackageInventoryModel[newIDPackageAttribute] = rootObj.InventoryModel;
        }
        if (!containsInventoryObject) {
            data.Position.InventoryModel = rootObj.InventoryModel;
        }

        // this.wireUpUndoRedo(this.originalData.Position.ProductPackage, this.currentPackage);
        data.Position.IDPackage = currentPackage.IDPackage;
        data.Position.ProductPackage = currentPackage;
        rootObj.PackageAttributes[newIDPackageAttribute].IdPackageAttribute = 0;
        //resetting when package change
        //@todo revalidate later
        data.Position.FacingsX = currentPackage.MinFacingsX;
        data.Position.FacingsY = 1;
        data.Position.LayoversY = 0;
        data.Position.LayoversZ = 0;
        data.Position.LayundersY = 0;
        data.Position.LayundersZ = 0;
        data.Position.ProductPackage.IdPackageStyle =
            data.Position.ProductPackage.IdPackageStyle;
        if (data.hasRestrictedOrientation()) {
          data.Position.IDOrientation = data.Position.ProductPackage.DefaultOrientation || 0;
          this.setFieldValue(data, 'Position.IDOrientation', data.Position.IDOrientation);
          const dObj = {
            field: 'Position.IDOrientation',
            newValue: data.Position.IDOrientation,
            IDPOGObject: data.IDPOGObject,
            gridType: 'Position',
            tab: null,
          };
          this.sharedService.workSheetEvent.next(dObj);
        }
        this.planogramService.lookupText(data.Position.ProductPackage);
        let parentFixture = this.sharedService.getParentObject(data, data.$sectionID);
        const ctx = new Context(itemData.section);
        parentFixture.computePositionsAfterChange(ctx);
        if (this.parentApp.isAllocateApp) {
          this.allocateNpi.updateProductKeys([data], rootObj);
        }
    }
    public saveEdit = (e, id, value, unqHistoryID, oldvalue) => {
        if (!this.isfilldowninprocess) {
            let oldVM_Entity = this.sharedService.getObject(id, this.sectionID);
            let pogObject = this.sharedService.getObject(e.$sectionID, this.sectionID) as Section;
            if (this.dataValidation.validate(pogObject, oldVM_Entity, this.fName, value, this.oldValue)) {
                if (this.pegFields.includes(this.fName)) {
                    if (this.fName === 'Position.PegType') {
                        let canPegChange = this.propertyGridPegValidationService.validatePegTypeChange(e, value, undefined);
                        if (!canPegChange.flag) {
                            this.notifyService.warn('PEG_TYPE_CANT_CHANGED_PLEASE_CHECK_NUMBER_OF_FRONT_BARS_AND_PEGHOLES_OF_PRODUCT');
                        }
                        this.propertyGridPegValidationService.changePegType(e, value, canPegChange);
                    }
                    this.propertyGridPegValidationService.changePegFields(e, this.fName, value);

                } else {
                    this.wireUpUndoRedo(oldVM_Entity, this.fName, value, oldvalue, unqHistoryID);
                    this.updatePOG_VM(oldVM_Entity, this.fName, value);
                    //computeMerchHeight is triggered by history service. This will not be necessary.
                    //this.pogObject.computeMerchHeight(ctx);
                    this.historyService.stopRecording(undefined, undefined, unqHistoryID);
                }
                return true;
            } else {
                const dObj = {
                    field: this.fName,
                    newValue: oldvalue,
                    IDPOGObject: oldVM_Entity.IDPOGObject,
                    gridType: 'Position',
                    tab: null,
                };
                this.sharedService.workSheetEvent.next(dObj);
                this.setFieldValue(e, this.fName, oldvalue);
                //   this.snackBar.open(( this.fName) + ' is not editable for the selected position.', '', { duration: 4000 });
                return false;
            }
        }
    };
    public updatePOG_VM = (oldVM_Entity, fieldPathStr, newValue) => {
        //lets update POG as well as kendo grid datasource
        this.sharedService.setObjectField(oldVM_Entity.$id, fieldPathStr, newValue, this.sectionID);
        fieldPathStr == '';
        var rootObj = this.sharedService.getObject(this.sectionID, this.sectionID);
        var obj = this.sharedService.getObject(oldVM_Entity.$id, this.sectionID);
        //rootObj.calcInventoryModelFields(obj);
    };

    //----- AG-Grid FillUpDown--------
    public changeFillUpDownDataEvent(data) {
      let positions = this.sharedService.getAllPositionFromObjectList(this.pogObject.$id);
        if (data?.params?.type == 'gridReady' && data.field == 'Position.IDPackage') {
          data.updatedRows.forEach((element) => {
            let child = positions.filter((e) => e.$id == element.$id)[0];
            let oldValue = data.oldValues.filter((e) => e.$id == element.$id)[0];
            if (child) {

              const dObj = {
                field: data.field,
                newValue: oldValue.oldValue,
                IDPOGObject: child.IDPOGObject,
                gridType: 'Position',
                tab: null,
              };
              this.sharedService.workSheetEvent.next(dObj);

            }
          });
          return;
        }
        let updatedPositions = [];
        let unqHistoryID = this.historyService.startRecording();
        this.fName = data.field;

        let parentFixtures: { [key: string]: PositionParentList } = {};

        const ctx = new Context(this.pogObject);
        let restrictedOrientations = [];
        data.updatedRows.forEach((element) => {
            let child = positions.filter((e) => e.$id == element.$id)[0];
            let oldValue = data.oldValues.filter((e) => e.$id == element.$id)[0];
            if (child) {
                if (child && this.dataValidation.validate(
                    this.pogObject,
                    child,
                    this.fName,
                    data.updatedValue,
                    oldValue.oldValue,
                ) && this.worksheetGridService.cellValidation(child, this.fName, true, data.params?.colDef?.cellRendererParams.IDDictionary, this.displayView)
                ) {
                    if (data.field == 'Position.attributeObject.Color_color') {
                        this.setColorCode(data.updatedValue, data.field, child);
                        updatedPositions.push(child);
                        return;
                    }
                    else if (data.field == 'Position.IDOrientation') {
                      const availableOrientations = child.getAvailableOrientationsWorksheet()?.map(ori=>ori.key);
                      if(!availableOrientations.includes(data.updatedValue)){
                        !restrictedOrientations.includes(child.Position.Product.UPC) && restrictedOrientations.push(child.Position.Product.UPC);
                        child.setOrientation(oldValue.oldValue);
                        this.updatePOG_VM(child, this.fName, oldValue.oldValue);
                        const dObj = {
                          field: this.fName,
                          newValue: oldValue.oldValue,
                          IDPOGObject: child.IDPOGObject,
                          gridType: 'Position',
                          tab: null,
                        };
                        this.sharedService.workSheetEvent.next(dObj);
                      }
                      if (this.pogObject.fitCheck && !child.isValidFitChange(data.updatedValue, data.field)) {
                        child.setOrientation(oldValue.oldValue);
                        this.notifyService.warn('FIT_CHECK_ERROR');
                        this.updatePOG_VM(child, this.fName, oldValue.oldValue);
                        const dObj = {
                          field: this.fName,
                          newValue: oldValue.oldValue,
                          IDPOGObject: child.IDPOGObject,
                          gridType: 'Position',
                          tab: null,
                        };
                        this.sharedService.workSheetEvent.next(dObj);
                      }
                    }
                    if (this.fName === 'Position.IDPackage') {
                        let index = child.Position.AvailablePackageType.findIndex(pos => pos.IDPackage == data.updatedValue);
                        if (index !== -1) {
                            this.changePackageStyle(this.fName, child, data.updatedValue, oldValue.oldValue);
                        } else {
                            this.sharedService.setObjectField(
                                child._CalcField.Position.id,
                                this.fName,
                                oldValue.oldValue,
                                this.sectionID,
                            );
                            this.updatePOG_VM(child, this.fName, oldValue.oldValue);
                            const dObj = {
                                field: this.fName,
                                newValue: oldValue.oldValue,
                                IDPOGObject: child.IDPOGObject,
                                gridType: 'Position',
                                tab: null,
                            };
                            this.sharedService.workSheetEvent.next(dObj);
                        }
                    }
                    let currentFixtureObj = this.sharedService.getParentObject(child, child.$sectionID);
                    parentFixtures[currentFixtureObj.$id] = currentFixtureObj;
                    // @karthik This update is unnecessary,as data updates are handled by the grid. delete if not uncommented by 13-09-22
                    //this.setFieldValue(child, data.field, data.updatedValue);
                    child.calculateDistribution(ctx, currentFixtureObj);
                    child.checkAndCalcIfContrainUpdated(data.field, data.updatedValue, oldValue);
                    updatedPositions.push(child);
                    return;
                } else {
                    const dObj = {
                        field: this.fName,
                        newValue: oldValue.oldValue,
                        IDPOGObject: child.IDPOGObject,
                        gridType: 'Position',
                        tab: null,
                    };
                    this.sharedService.workSheetEvent.next(dObj);
                }
            }
        });
        if (restrictedOrientations?.length) {
          const orient = Utils.findObjectKey(
            this.planogramStore.lookUpHolder.Orientation.options,
            data.updatedValue,
          );
          const message = this.translate.instant(orient) + ' ' + this.translate.instant('ORIENTATION_IS_RESTRICTED_FOR_FEW_POSITIONS_CHECK_CONSOLE_FOR_MORE_DETAILS');
          this.notifyService.warn(message);
          const errorObj = {
            Message: this.translate.instant('NOT_ABLE_TO_APPLY_FILL_UP_DOWN_AS') + ' ' + orient + ' ' + this.translate.instant('ORIENTATION_IS_RESTRICTED_FOR_POSITION')+'s - UPC: '+restrictedOrientations.join(','),
            Type: LogDataType.WARNING,
            Code: this.translate.instant('TOOLTIP_ORIENTATION'),
            SubType: 'OrientationWorkSheet',
            IsClientSide: true,
            PlanogramID: this.sectionObject.IDPOG,
            Option: {
              $id: this.sectionObject.$id,
              $sectionID: this.sectionObject.$sectionID,
              Group: 'OrientationWorkSheet',
            }
          }
          this.informationConsoleLogService.setClientLog([errorObj], this.sectionObject.IDPOG);
        }
        Object.values(parentFixtures).forEach(it => it.computePositionsAfterChange(ctx));

        if (updatedPositions.length) {
            const positionObjdata = {
                item: updatedPositions[0],
                id: updatedPositions[0].$id,
                value: data.updatedValue,
                unqHistoryID: unqHistoryID,
                oldvalues: data.oldValues,
                positions: updatedPositions,
            };
            const uObj = {
                fieldPathStr: this.fName,
                newValue: positionObjdata.value,
                oldValues: positionObjdata.oldvalues,
                model: positionObjdata.item,
                unqHistoryID: positionObjdata.unqHistoryID,
                positions: positionObjdata.positions,
            };
            this.undoRedoFilldown(uObj);
            this.historyService.stopRecording(undefined, undefined, positionObjdata.unqHistoryID);
            // @karthik computeMerchHeight is triggered by history service. This will not be necessary.
            //this.pogObject.computeMerchHeight(ctx);
            this.planogramservice.UpdatedSectionObject.next(this.pogObject);
            this.sharedService.updatePosPropertGrid.next(true);
            const dObj = {
                porertyType: null,
                products: updatedPositions,
                objectDerivedType: null,
                productlist: [],
            };
            this.sharedService.updateValueInPlanogram.next(dObj);
            this.sharedService.fixtureEdit.next(true);
        }
        this.gridComp.gridApi.redrawRows();
    }

    public checkIffieldEditable = (field) => {
        if (this.sharedService.isNiciFeatureNotAllowed('ITEM_WORKSHEET_EDIT', [this.entity])) {
            return true;
        } else if (this.parentApp.isNiciMode) {
            let colmnDictionary;
            for (const columnData of this.columnsData) {
                if (columnData.field === field) {
                    colmnDictionary = columnData.IDDictionary ? columnData.IDDictionary : '';
                    break;
                }
            }
            return colmnDictionary
                ? AppConstantSpace.PROPERTYGRID_ALLOWED_DICTIONARIES.POSITION_PROPERTIES.indexOf(colmnDictionary) != -1
                    ? false
                    : true
                : false;
        } else {
            let currentField = this.columnsData.find((x) => x.field == field);
            if (currentField.editable) {
                if (this.pogObject.IDPerfPeriod == -1 && field == 'Position.attributeObject.CurrMovt') {
                    this.IsEditable = true;
                } else if ((this.objParent.Fixture.AutoComputeDepth || this.objParent.Fixture.AutoComputeFronts) && (field.match('Position.Facings[Y,Z]') || field.match('Position.Layovers[Y,Z]'))) {
                    this.IsEditable = false;
                } else {
                    this.IsEditable = true;
                }
            }

            return this.IsEditable;
        }
    };

    public wireUpUndoRedo(
        oldVM_Entity,
        fieldPathStr,
        newValue,
        oldValue,
        unqHistoryID
    ) {
        //
        const positionObjdata = {
            item: oldVM_Entity,
            id: oldVM_Entity.$id,
            value: newValue,
            unqHistoryID: unqHistoryID,
            oldvalues: [{ id: oldVM_Entity.IDPOGObject, oldValue: oldValue, field: fieldPathStr, }],
            positions: [oldVM_Entity],
        };
        const uObj = {
            fieldPathStr: this.fName,
            newValue: positionObjdata.value,
            oldValues: positionObjdata.oldvalues,
            model: positionObjdata.item,
            unqHistoryID: positionObjdata.unqHistoryID,
            positions: positionObjdata.positions,
        };
        this.undoRedoFilldown(uObj);
    }

    public applyPositionColor() {
        let positions: Position[] = []
        positions = this.positions = this.pogObject.getAllPositions();
        if (!this.pogSettings.displayWorksheet.Planogram && this.pogSettings.displayWorksheet.Cart) {
            positions = this.sharedService.ShppingcartItems;
        }
        else if (this.pogSettings.displayWorksheet.Planogram && this.pogSettings.displayWorksheet.Cart) {
            positions = this.positions.concat(this.sharedService.ShppingcartItems);
        }
        let columns: ColDef[] = this.gridComp?.gridApi?.getColumnDefs();
        columns = columns && columns.length > 0 ? columns : this.agGridHelperService.getAgGridColumns('SHELF_POSITION_WORKSHEET', this.gridColumnCustomConfig);
        if (this.gridComp) {
            this.gridComp.gridConfig.excelStyles.length = 0;
            this.gridComp.gridConfig.excelStyles.push(
                {
                    id: 'excelColor',
                    alignment: {
                        horizontal: 'center',
                        vertical: 'Bottom',
                    },
                    borders: {
                        borderBottom: {
                            color: '#000000',
                            lineStyle: 'Continuous',
                            weight: 1,
                        },
                        borderLeft: {
                            color: '#000000',
                            lineStyle: 'Continuous',
                            weight: 1,
                        },
                        borderRight: {
                            color: '#000000',
                            lineStyle: 'Continuous',
                            weight: 1,
                        },
                        borderTop: {
                            color: '#000000',
                            lineStyle: 'Continuous',
                            weight: 1,
                        },
                    },
                    font: { color: '#6F6F6F' },
                    interior: {
                        color: '#eeeeee',
                        pattern: 'Solid',
                    },
                },
                {
                    id: 'cell',
                    alignment: {
                        horizontal: 'center',
                        vertical: 'Center',
                    },
                },
                {
                    id: 'header',
                    alignment: {
                        horizontal: 'center',
                        vertical: 'Center',
                    },
                    font: { color: '#eeeeee' },
                    interior: {
                        color: '#4E9698',
                        pattern: 'Solid',
                    },
                },
                {
                    id: 'stringType',
                    dataType: 'String',
                },
                {
                    id: 'numberType'
                },
                {
                    id: 'groupheader',
                    alignment: {
                        horizontal: 'center',
                        vertical: 'Center',
                    },
                    font: { color: '#eeeeee' },
                    interior: {
                        color: '#4E9698',
                        pattern: 'Solid',
                    },
                });
        }
        if (this.sharedService.enableHighlightInWorksheet) {
            columns.forEach((col) => {
                col.cellClass = params => {
                    if(!params.data){
                        return 'groupheader';
                    }
                    else if(params.data.IDPOGObject){
                        return params.data.IDPOGObject.toString();
                    }
                }
            })
            this.gridComp?.gridApi?.setColumnDefs(columns);
            this.gridComp?.gridConfig?.excelStyles.push({
                    id: 'groupheader',
                    alignment: {
                        horizontal: 'center',
                        vertical: 'Center',
                    },
                    font: { color: '#eeeeee' },
                    interior: {
                        color: '#4E9698',
                        pattern: 'Solid',
                    },
            });
            positions.forEach((dataItem) => {
                dataItem.backgroundColor = dataItem.highlightColor(this.planogramservice.templateRangeModel, dataItem);
                this.gridComp?.gridConfig?.excelStyles.push(
                    {
                        id: dataItem.Position.IDPOGObject.toString(),
                        dataType: 'String',
                        font: { color: '#eeeeee' },
                        interior: {
                            color: dataItem.highlightColor(this.planogramservice.templateRangeModel, dataItem),
                            pattern: 'Solid'
                        },
                        alignment: {
                            horizontal: 'center',
                            vertical: 'Bottom',
                        },
                        borders: {
                            borderBottom: {
                                color: '#000000',
                                lineStyle: 'Continuous',
                                weight: 1,
                            },
                            borderLeft: {
                                color: '#000000',
                                lineStyle: 'Continuous',
                                weight: 1,
                            },
                            borderRight: {
                                color: '#000000',
                                lineStyle: 'Continuous',
                                weight: 1,
                            },
                            borderTop: {
                                color: '#000000',
                                lineStyle: 'Continuous',
                                weight: 1,
                            },
                        }
                    },)
            });
        }
        else {
            columns.forEach((col) => {
                col.cellClass = params => {
                    return typeof params.value + 'Type';
                }
            })
            this.gridComp?.gridApi?.setColumnDefs(columns);
            positions.forEach((dataItem) => {
                dataItem.backgroundColor = '';
            });
        }
        this.gridComp?.gridApi?.setRowData(positions);
    };

    public setColorCode = (event, fieldObj, itemdata) => {
        if (fieldObj == 'Position.attributeObject.Color_color') {
            itemdata.Position.attributeObject.Color_color = event;
            this.setFieldValue(itemdata, 'Position.attributeObject.Color_color', event);
        } else {
            itemdata = this.sharedService.setObjectField(undefined, fieldObj, event, undefined, itemdata);
        }
        if (itemdata != null) {
            if (typeof itemdata.Position.attributeObject.Color_color == 'undefined') {
                itemdata.Position.attributeObject.Color_color = this.getColorCode(itemdata);
            }
            let newValue = event;
            let colorCode = Object.assign(itemdata.Position.attributeObject.Color_color).replace('#', '');
            let colorCodeNum = parseInt(colorCode, 16);
            itemdata.Position.attributeObject.Color = parseInt(colorCode, 16);
            const datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
            const packageID = itemdata.Position.IDProduct + '@' + itemdata.Position.IDPackage;
            datasource.PackageAttributes[packageID].Color = parseInt(colorCode, 16).toString();
            const positions = datasource.getAllPositions();
            //positions with same product id
            let filteredPositions = _.filter(positions, (val) => {
                return val.Position.IDProduct == itemdata.Position.IDProduct;
            });

            filteredPositions.forEach((item) => {
                item.Position.attributeObject.Color = colorCodeNum.toString();
                this.setFieldValue(item, 'Position.attributeObject.Color', colorCodeNum);
                item.Position.attributeObject.Color_color = itemdata.Position.attributeObject.Color_color;
                this.setFieldValue(
                    item,
                    'Position.attributeObject.Color_color',
                    itemdata.Position.attributeObject.Color_color,
                );
            });
            this.planogramService.rootFlags[this.sectionID].isSaveDirtyFlag = true;
            this.planogramService.updateSaveDirtyFlag(true);
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

    private undoRedoFilldown = (uObj) => {
        let original = ((sharedService, uObj, fieldPathStr, value, sectionId) => {
            return () => {
                if (fieldPathStr == 'Position.attributeObject.Color_color') {
                    let colorCode = cloneDeep(value);

                    //TODO @Amit update colorcode
                    //colorCode = parseInt(colorCode.replace('#', ''), 16);
                    // colorCode.forEach((color) => {
                    //     parseInt(color.replace('#', ''), 16);
                    // })
                    if (uObj.positions != undefined) {
                        uObj.positions.forEach((position, key) => {
                            uObj.oldValues.forEach((item) => {
                                if (position.IDPOGObject == item.id) {
                                    sharedService.setObjectField(
                                        position._CalcField.Position.id,
                                        fieldPathStr,
                                        value,
                                        sectionId,
                                    );
                                    const dObj = {
                                        field: fieldPathStr,
                                        newValue: value,
                                        IDPOGObject: position.IDPOGObject,
                                        gridType: 'Position',
                                        tab: null,
                                    };
                                    this.sharedService.workSheetEvent.next(dObj);
                                }
                            });
                        });
                    }
                } else {
                    if (uObj.positions != undefined) {
                        uObj.positions.forEach((position, key) => {
                            uObj.oldValues.forEach((item) => {
                                if (position.IDPOGObject == item.id) {
                                    sharedService.setObjectField(
                                        position._CalcField.Position.id,
                                        fieldPathStr,
                                        value,
                                        sectionId,
                                    );
                                    const dObj = {
                                        field: fieldPathStr,
                                        newValue: value,
                                        IDPOGObject: position.IDPOGObject,
                                        gridType: 'Position',
                                        tab: null,
                                    };
                                    this.sharedService.workSheetEvent.next(dObj);
                                }
                            });
                        });
                    }
                }
            };
        })(this.sharedService, uObj, uObj.fieldPathStr, uObj.newValue, this.sectionID);
        let revert = ((sharedService, uObj, fieldPathStr, value, sectionId) => {
            return () => {
                if (fieldPathStr == 'Position.attributeObject.Color_color') {
                    let colorCode = cloneDeep(value);
                    colorCode.forEach((color) => {
                        parseInt(color.oldValue.replace('#', ''), 16);
                    })
                    if (uObj.positions != undefined) {
                        uObj.positions.forEach((position, key) => {
                            uObj.oldValues.forEach((item) => {
                                if (position.IDPOGObject == item.id) {
                                    sharedService.setObjectField(item.id, fieldPathStr, item.oldValue, sectionId, position);
                                    const dObj = {
                                        field: fieldPathStr,
                                        newValue: item.oldValue,
                                        IDPOGObject: position.IDPOGObject,
                                        gridType: 'Position',
                                        tab: null,
                                    };
                                    this.sharedService.workSheetEvent.next(dObj);
                                }
                            });
                        });
                        uObj.positions.forEach((position, key) => {
                            colorCode.forEach(color => {
                                sharedService.setObjectField(position.$id, 'Position.attributeObject.Color', color.oldValue, sectionId);
                            });
                        })
                    }
                } else {
                    if (uObj.positions != undefined) {
                        uObj.positions.forEach((position, key) => {
                            uObj.oldValues.forEach((item) => {
                                if (position.IDPOGObject == item.id) {
                                    sharedService.setObjectField(
                                        position._CalcField.Position.id,
                                        fieldPathStr,
                                        item.oldValue,
                                        sectionId,
                                    );
                                    const dObj = {
                                        field: fieldPathStr,
                                        newValue: item.oldValue,
                                        IDPOGObject: position.IDPOGObject,
                                        gridType: 'Position',
                                        tab: null,
                                    };
                                    this.sharedService.workSheetEvent.next(dObj);
                                }
                            });
                        });
                    }
                }
            };
        })(this.sharedService, uObj, uObj.fieldPathStr, uObj.oldValues, this.sectionID);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'WorkSheetGrid',
        });
        if (uObj.model.ObjectType != AppConstantSpace.FIXTUREOBJ) {
            if (
                (PosIntersectionArray.indexOf(uObj.fieldPathStr) != -1) ||
                (FixtureIntersectionArray.indexOf(uObj.fieldPathStr) != -1) ||
                (PogIntersectionArray.indexOf(uObj.fieldPathStr) != -1)
            ) {
                this.planogramService.insertPogIDs([uObj.model], true);
            }
            this.historyService.stopRecording([1, 2, 3], undefined, uObj.unqHistoryID);
        }
        //undo-redo ends here
    };

    ngOnDestroy(): void {
        this.sharedService.selectedObject(null);
        this.sharedService.workSheetEvent.next(null);
        this.propertySubscription ? this.propertySubscription.unsubscribe() : null;
        if (this.subscriptions) {
            this.subscriptions.unsubscribe();
        }
    }

    public deleteObject(): void {
        this.worksheetGridService.delete();
    };

    public worksheetKeyEvents = (event): void => {
        this.worksheetGridService.keyUpEvents(event, this.displayView);
    };

    public excelStyles = [];

    private retainSearch(): void {
        if (this.localSearchService.search) {
            const highlightedPositionsIds = this.sharedService.selectedID[this.sectionID];
            const highlightedPositions = this.positions.filter(ele => highlightedPositionsIds.some(pos => pos === ele.$id));
            if (this.gridComp && this.gridComp.gridApi) {
                this.gridComp?.gridApi?.setRowData(highlightedPositions);
            } else {
                this.initWorkSheet(highlightedPositions);
            }
        }
    }
}
