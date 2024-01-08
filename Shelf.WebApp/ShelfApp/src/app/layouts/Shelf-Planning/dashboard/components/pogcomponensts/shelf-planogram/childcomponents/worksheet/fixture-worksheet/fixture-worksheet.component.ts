import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { cloneDeep, isEmpty } from 'lodash-es';
import { Subscription } from 'rxjs';
import { Fixture, PlanogramObject, Section } from 'src/app/shared/classes';
import { WorksheetEventData, LookUpChildOptions, GridData, DividerResponse, Grill } from 'src/app/shared/models';
import {
    AppConstantSpace,
    Utils,
    PosIntersectionArray,
    FixtureIntersectionArray,
    PogIntersectionArray,
} from 'src/app/shared/constants';
import {
    HistoryService,
    AgGridHelperService,
    NotifyService,
    Planogram_2DService,
    PlanogramCommonService,
    PlanogramStoreService,
    PlanogramService,
    SharedService,
    WorksheetGridService,
    DataValidationService,
    Render2dService,
    ParentApplicationService,
    CrunchModeService,
    CrunchMode,
    PanelService,
    PlanogramSaveService,
    DividersCurdService,
    GrillsCurdService,
    QuadtreeUtilsService,
    PlanogramHelperService,
} from 'src/app/shared/services';
import { FixtureList, MerchandisableList, ObjectListItem, PositionParentList } from 'src/app/shared/services/common/shared/shared.service';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { GridConfig, GridColumnCustomConfig } from 'src/app/shared/components/ag-grid/models';
import { ExcelExportParams, SelectionChangedEvent } from 'ag-grid-community';
import { Context } from 'src/app/shared/classes/context';

@Component({
    selector: 'sp-fixture-worksheet',
    templateUrl: './fixture-worksheet.component.html',
    styleUrls: ['./fixture-worksheet.component.scss'],
})
export class FixtureWorksheetComponent implements OnInit, OnChanges {
    @Input() sectionObject: Section;
    @Input() panalID: string;
    @Input() displayView: string;

    @ViewChild('agGrid') gridComp: AgGridComponent;
    aggridConfig: GridConfig;

    private sectionID: string;
    private datasource: Section;
    public selectedfixture: Fixture;
    private pogObject: Section;
    private fName: string = '';
    private rowSelectionInvoked: boolean = false;
    private subscriptions: Subscription = new Subscription();
    private fixtureList: FixtureList[] = [];
    private isfilldowninprocess: boolean = false;
    private selectedRow: string;
    constructor(
        private readonly translate: TranslateService,
        private readonly sharedService: SharedService,
        private readonly notifyService: NotifyService,
        private readonly planogramservice: PlanogramService,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly worksheetGridService: WorksheetGridService,
        private readonly planogramStore: PlanogramStoreService,
        public readonly planogramCommonService: PlanogramCommonService,
        private readonly historyService: HistoryService,
        private readonly planogram_2DService: Planogram_2DService,
        private readonly planogramService: PlanogramService,
        private dataValidation: DataValidationService,
        private readonly render2d: Render2dService,
        private readonly parentApp: ParentApplicationService,
        private readonly crunchMode: CrunchModeService,
        private readonly panelService: PanelService,
        private readonly planogramSaveService: PlanogramSaveService,
        private readonly dividersCurdService: DividersCurdService,
        private readonly grillsCurdService: GrillsCurdService,
        private readonly planogramHelperService: PlanogramHelperService
    ) { }


    ngOnInit(): void {
        //For item selection
        this.subscriptions.add(
            this.sharedService.itemSelection.subscribe((res) => {
                if (res && res.pogObject && res.pogObject.ObjectType === 'Fixture' && res['view'] !== 'removeSelection') {
                    let SelectedFixObject = res['pogObject'];
                    if (SelectedFixObject[`$id`]) {
                        this.gridComp.skipTo('$id', SelectedFixObject[`$id`], 'string', res.view);
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
                } else {
                    this.gridComp.gridApi.deselectAll();
                }
            }),
        );

        //delete item
        this.subscriptions.add(this.sharedService.deleteSubscription.subscribe((res) => {
            if (res) {
                if (this.gridComp) {
                    this.gridComp?.removeRows(res);
                    // this.gridComp.gridApi.refreshCells();
                } else {
                    const fixtures = this.fixtureList.filter(ele => !res.some(fix => fix.$id === ele.$id));
                    this.bindFixturenWSGrid(fixtures);
                }
            }
        }));

        //Property grid value update
        this.subscriptions.add(this.sharedService.workSheetEvent.subscribe((res: WorksheetEventData) => {
            if (res) {
                if (res && res.gridType === 'Fixture') {
                    this.gridComp?.updateValue(res, 'IDPOGObject', res.field);
                }
            }
        }));

        // Download Excel
        this.subscriptions.add(this.sharedService.downloadExportExcel.subscribe((res: { view: string }) => {
            if (res) {
                if (res.view === 'fixtureWS') {
                    let params: ExcelExportParams = {};
                    params.fileName = `${this.pogObject.Name}_${this.pogObject.IDPOG}_${this.displayView}`;
                    this.gridComp?.exportToExcel(params);
                }
            }
        }));

        //add fixtures in worksheet after dragdrop
        //TODO: Pass added fixture in addProductAfterDrag subscription
        this.subscriptions.add(this.sharedService.addProductAfterDrag.subscribe((res: boolean) => {
            if (res) {
                this.fixtureList = this._prepareDataModel(this.datasource);
                this.gridComp?.gridApi?.setRowData(this.fixtureList);
            }
        }));

        // Remove Selection
        this.subscriptions.add(
            this.sharedService.RemoveSelectedItemsInWS.subscribe((res: { view: string }) => {
                if (res) {
                    if (res.view === 'fixtureWS' || res.view === 'removeSelectionInWS') {
                        this.gridComp?.gridApi?.deselectAll();
                    }
                }
            }),
        );
        //ReloadGrid
        this.subscriptions.add(
            this.sharedService.gridReloadSubscription.subscribe((res: boolean) => {
                if (res) {
                    this.fixtureList = this._prepareDataModel(this.datasource);
                    if (this.gridComp?.gridApi) {
                        this.gridComp?.gridApi?.setRowData(this.fixtureList);
                    } else {
                        this.bindFixturenWSGrid(this.fixtureList);
                    }
                }
            }),
        );
        //Bind Grid
        this.subscriptions.add(
            this.sharedService.bindGridSubscription.subscribe((res: string) => {
                if (res=='SHELF_FIXTURE_WORKSHEET') {
                    this.fixtureList = this._prepareDataModel(this.datasource);
                    this.bindFixturenWSGrid(this.fixtureList);
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


    ngOnChanges(changes: SimpleChanges): void {
        if (!isEmpty(this.sectionObject)) {
            this.initWorkSheet();
        }
    }

    public initWorkSheet(): void {
        const list = this.planogramStore.downloadedPogs;
        const index = list.findIndex((x) => x['IDPOG'] === this.sectionObject.IDPOG);
        if (index !== -1) {
            this.sectionID = list[index]['sectionID'];
            this.datasource = this.pogObject = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
            if (list[index]['fixtureWS']) {
                this.fixtureList = list[index]['fixtureWS'];
            } else {
                this.fixtureList = this._prepareDataModel(this.datasource);
                list[index]['fixtureWS'] = this.fixtureList;
                this.planogramStore.downloadedPogs = [...list];
            }
        } else {
            this.sectionID = this.sharedService.activeSectionID;
            this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
            this.pogObject = this.datasource;
        }

        if (this.fixtureList === null) {
            this.fixtureList = this._prepareDataModel(this.datasource);
        }
        this.selectDefaultFixtureRow();
        this.bindFixturenWSGrid(this.fixtureList);
    };

    private selectDefaultFixtureRow() {
        const selectedObj = this.planogramService.getSelectedObject(this.sharedService.getActiveSectionId());
        if (selectedObj.length > 0 && selectedObj[0].ObjectType == AppConstantSpace.FIXTUREOBJ) {
            this.selectedRow = selectedObj[0].$id;
        }
    }

    public isEditable(): boolean {
        if (this.worksheetGridService.isPOGLive(this.sectionID, false)) {
            return false;
        }
        if (this.parentApp.isAssortApp && this.sharedService.checkIfAssortMode('fixture-worksheet-edit')) {
            return true; // return false; // for testing i made it as true
        }
        return true;
    };

    public _prepareDataModel(object: Section): FixtureList[] {
        return this.getAllFixtures(object) as FixtureList[];
    };

    public bindFixturenWSGrid(data: Fixture[]): void {
        let gridColumnCustomConfig: GridColumnCustomConfig = {
            isLookUpDataNeeded: true,
            editableCallbacks: [
              {
                isEditableCallbackRequired: true,
                fieldsToValidateForCallback: ['ALL'],
                editableCallbackTemplate: `(function(){var parent = params.data.parent; if(params.data.ObjectDerivedType=='StandardShelf'){return [589].indexOf(item[18])!=-1?false:true;} else if(params.data.ObjectDerivedType=='Grill'||params.data.ObjectDerivedType=='Divider'){if(params.data.ObjectDerivedType=='Divider'){return parent && parent.Fixture.HasDividers && [589,344,349,350,351,3665,3666].indexOf(item[18])!=-1?true:false;}if(params.data.ObjectDerivedType=='Grill'){return parent && parent.Fixture.HasGrills && [349,344,352,639,641].indexOf(item[18])!=-1?true:false;}} return true;})()`},
              ]
        };
        let columnsData = this.agGridHelperService.getAgGridColumns(`SHELF_FIXTURE_WORKSHEET`, gridColumnCustomConfig);
        if (!this.isEditable()) {
            columnsData.map((ele) => {
                ele.editable = false;
            });
        }
        this.aggridConfig = {
            ...this.aggridConfig,
            id: 'SHELF_FIXTURE_WORKSHEET',
            data,
            columnDefs: columnsData,
            isFillDown: true,
            skipToParam: { colName: 'IDPOGObject', value: this.selectedRow },
            panelId: this.panalID
        };
    }

    public getAllFixtures(object: Section): FixtureList[] {
        const lookUpData = this.planogramStore.lookUpHolder;
        let lkValues: LookUpChildOptions[];
        let fixtures: FixtureList[] = object.getAllFixChildren() as FixtureList[];
        let fixturesList: FixtureList[] = [];
        for (const fixture of fixtures) {
            const child = fixture;
            if (child.Fixture.FixtureType === AppConstantSpace.DIVIDERS ||
              child.Fixture.FixtureType === AppConstantSpace.GRILLOBJ) {
                //get parent of the divider and grill
                const parent = this.sharedService.getObject(child.$idParent, child.$sectionID) as Fixture;
                if ((!parent.Fixture.HasDividers && child.Fixture.FixtureType === AppConstantSpace.DIVIDERS) || (!parent.Fixture.HasGrills && child.Fixture.FixtureType === AppConstantSpace.GRILLOBJ)) {
                  continue;
                }
            }
            fixturesList.push(child);
            this.planogramService.lookupText(child.Fixture);

            for (let [key, val] of Object.entries(child.Fixture)) {
                if (key.indexOf('LK') == 0) {
                    let DictObj = this.planogramService.getFromDict(key);
                    if (DictObj) {
                        if (!DictObj.LkUpGroupName) {
                            if (child.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ && key === 'LKDividerType') {
                                lkValues = lookUpData['FIXTURE_UPRIGHTS_DIRECTION'].options;
                            } else {
                                lkValues = lookUpData[DictObj.LkUpGroupName].options;
                            }
                            const LkSelected: LookUpChildOptions = lkValues.find((x) => x.value == val);
                            child.Fixture[key + 'text'] = LkSelected ? LkSelected.text : '';
                        }
                    }
                }
            }
        }
        return fixturesList;
    };

    public invokeSelectedFixtureRow(event: SelectionChangedEvent): void {
        let selectedRow: FixtureList[] = [];
        const selectedRows = this.gridComp.gridApi.getSelectedRows();
        const ids = selectedRows.map((x) => { return x.$id });
        this.fixtureList.forEach((item) => {
            const res = ids.includes(item.$id);
            if (res) {
                selectedRow.push(item);
            }
        });
        this.sharedService.selectedObject(selectedRow[0]);
        if (selectedRow[0]?.ObjectType !== AppConstantSpace.FIXTUREOBJ) {
            return;
        }
        this.planogramservice.removeAllSelection(this.sharedService.activeSectionID);
        selectedRow.forEach((fixture) => {
            this.planogramservice.addToSelectionByObject(fixture, this.sharedService.activeSectionID);
            fixture.selected = true;
        });
        if (selectedRow.length > 1) {
            this.planogramservice.selectionEmit.next(true);
        }
    }

    public editedValue(params): void {
        let isValidMove: boolean, isFixtureMoved: boolean = false;
        const id = params.event.data._CalcField.Fixture.id;
        const ctx = new Context(this.sharedService.getObjectAs(this.sectionID, this.sectionID));
        let eachRecursive = (obj, data) => {
            if (obj.hasOwnProperty('Children')) {
                obj.Children.forEach((child, key) => {
                    if (child.ObjectType == AppConstantSpace.FIXTUREOBJ) {
                        if (child.$id === data.$id) {
                            this.fName = params.event.colDef.field;
                            let uniqueHistoryID = this.historyService.startRecording();
                            let $id = child._CalcField.Fixture.id;
                            // this.setFieldValue(child, this.fName, value);
                            if (this.fName === 'Fixture.SnapToLeft' && params.event.value === true) {
                                this.snapToLeftShelf(child, this.pogObject);
                                if (child.Fixture.SnapToRight) {
                                    this.snapToRightShelf(child, this.pogObject, undefined, child.Fixture.Width);
                                }
                            }

                            if (this.fName === 'Fixture.SnapToRight' && params.event.value === true) {
                                if (child.Fixture.SnapToLeft) {
                                    this.snapToLeftShelf(child, this.pogObject);
                                }
                                this.snapToRightShelf(child, this.pogObject, undefined, child.Fixture.Width);
                            }

                            if (child.Fixture.SnapToRight && child.Fixture.SnapToLeft && (this.fName === 'Fixture.Width' || this.fName === 'Dimension.Width')) {
                                this.snapToRightShelf(child, this.pogObject, data.Dimension.Width, params.event.value);
                                this.notifyService.warn(child.ObjectDerivedType + ' ' + this.translate.instant('WIDTH_CANT_BE_CHANGED_WHEN_SNAP_RIGHT_AND_LEFT'), '',);
                            }

                            if (this.fName === 'Fixture.AutoComputeFronts' || this.fName === 'Fixture.AutoComputeDepth') {
                                data.computePositionsAfterChange(ctx);
                            }

                            if (this.fName === 'Fixture.LKCrunchMode') {
                                const IsCrunchModeChange = this.changeFixCrunchModeCxt(child, params.event.value, params.event.oldValue, true);
                                if (!IsCrunchModeChange) return;
                            }

                            if (this.fName === AppConstantSpace.FIXTURE_NOTCH_NUMBER) {
                                isValidMove = params.event.value === 0 || this.planogramHelperService.validateFixtureMovement(this.pogObject, data, params.event.oldValue, params.event.value, AppConstantSpace.FIXTURE_NOTCH_NUMBER);
                                if (isValidMove) {
                                    isFixtureMoved = this.planogramHelperService.moveFixtureByNotchNumber(data, this.pogObject, params.event.oldValue, params.event.value);
                                    if (!isFixtureMoved) {
                                        return;
                                    } 
                                }
                                else {
                                    return;
                                }
                            }

                            if (this.fName === AppConstantSpace.LOCATION_X || this.fName === AppConstantSpace.LOCATION_Y) {
                                if (this.fName === AppConstantSpace.LOCATION_Y && params.event.value > (this.pogObject.Dimension.Height - data.minMerchHeight)) {
                                    params.event.value = params.event.oldValue;
                                    this.notifyService.warn("SHELF_CROSSING_SECTION_HEIGHT_WITH_CHANGED_LOCATION_Y");
                                    this.sharedService.setObjectField(undefined, this.fName, params.event.oldValue, undefined, data);
                                    this.updatePOG_VM(child, this.fName, params.event.oldValue);
                                    return;
                                }
                                if (!this.planogramHelperService.checkValidShelfXYChanges(data, this.fName, params.event.value, params.event.oldValue, this.pogObject.isBayPresents)) {
                                    params.event.value = params.event.oldValue;
                                }
                            }

                            //added hear for undo-redo operation. it contains method wireupUndoRedo , which ecord the editing provess
                            const isValidationSucceed = this.saveEdit(child, $id, params.event.value, params.event.oldValue);

                            //Revert change in section object if validation failed
                            if (!isValidationSucceed) {
                                this.setFieldValue(child, this.fName, params.event.oldValue);
                            } else {
                                this.setFieldValue(child, this.fName, params.event.value);
                                this.updateDependentFixtureData(child, data, ctx);
                            }
                            this.historyService.stopRecording([1, 2, 3], undefined, uniqueHistoryID);
                        }
                    }
                    eachRecursive(child, params.event.data);
                }, obj);
            }
        };
        eachRecursive(this.pogObject, params.event.data);
        let index = this.fixtureList.findIndex((item) => item.$id === params.event.data.$id);
        let childrenList = [];
        this.fixtureList[index].Children.forEach((element) => {
            if (element.ObjectDerivedType === 'Position') {
                childrenList.push(element);
            }
        });
        this.planogram_2DService.reArrangeRubberBandingAnchors();
        this.planogramservice.UpdatedSectionObject.next(this.pogObject);
        this.render2d.isDirty = true;
        this.sharedService.updatePosPropertGrid.next(true);
        this.planogramservice.updateNestedStyleDirty = true;;
        this.gridComp.gridApi.redrawRows();
    };

    private updateDependentFixtureData(child, data, ctx): void {
        if ((this.fName === 'Fixture.HasDividers' ||
            this.fName === 'Fixture.LKDividerType') &&
            child.ObjectDerivedType != AppConstantSpace.COFFINCASEOBJ) {
            const isDivider = child.ObjectDerivedType === AppConstantSpace.DIVIDERS;
            let fixture = isDivider ? child.parent : child;
            let divider = isDivider ? child : child.Children.find(x => x.ObjectDerivedType === AppConstantSpace.DIVIDERS);
            if (!divider && fixture.Fixture.HasDividers) {
                this.dividersCurdService.addDividerToShelf(fixture, { LKDividerType: 0 }, true);
                divider = fixture.Children.find(x => x.ObjectDerivedType === AppConstantSpace.DIVIDERS);
            }
            const isDividerTypeChanged = this.fName === 'Fixture.LKDividerType' && isDivider && divider.Fixture.LKDividerType == 0;
            const dividerData: DividerResponse = <DividerResponse>{
                HasDividers: isDividerTypeChanged ? false : fixture.Fixture.HasDividers,
                selectedDividerPlacement: fixture.Fixture.HasDividers ? (divider && (divider.Fixture.LKDividerType || isDividerTypeChanged) ? divider.Fixture.LKDividerType : 1) : 0,
                Fixture: {
                    Height: divider ? divider.Fixture.Height : fixture.ChildDimension.Height,
                    Width: divider ? divider.Fixture.Width : 2,
                    Depth: divider ? divider.Fixture.Depth : fixture.ChildDimension.Depth,
                    PartNumber: divider ? divider.Fixture.PartNumber : null,
                    _DividerSlotStart: {
                        ValData: divider ? divider.Fixture._DividerSlotStart.ValData : 0,
                    },
                    _DividerSlotSpacing: {
                        ValData: divider ? divider.Fixture._DividerSlotSpacing.ValData : 0,
                    }
                }
            }
            this.dividersCurdService.applyDividers([fixture], dividerData);
            this.pogObject.computeMerchHeight(ctx);
            this.sharedService.renderPositionAgainEvent.next(true);
            this.sharedService.gridReloadSubscription.next(true);
        }
        if (this.fName === 'Fixture.HasGrills') {
            let grill = child.Children.find(x => x.ObjectDerivedType === AppConstantSpace.GRILLOBJ);
            if (child.Fixture.HasGrills) {
                this.grillsCurdService.addGrillsToShelf([child], true);
                grill = child.Children.find(x => x.ObjectDerivedType === AppConstantSpace.GRILLOBJ);
            }
            let grillData: Grill = {
                selectedGrillPlacement: data.Fixture.HasGrills ? 4 : 1,
                GrillThickness: grill && data.Fixture.Grills[0].Fixture.Thickness ? data.Fixture.Grills[0].Fixture.Thickness : 0.07,
                GrillHeight: grill && data.Fixture.Grills[0].Fixture.Height ? data.Fixture.Grills[0].Fixture.Height : data.Dimension.Height - data.Fixture.Thickness,
                GrillSpacing: grill && data.Fixture.Grills[0].Fixture._GrillSpacing.ValData ? (!data.Fixture.Grills[0].Fixture._GrillSpacing.ValData ? 0 : data.Fixture.Grills[0].Fixture._GrillSpacing.ValData) : 2,
                grillPartNumber: grill && data.Fixture.Grills[0].Fixture.PartNumber ? data.Fixture.Grills[0].Fixture.PartNumber : null,
                HasGrills: data.Fixture.HasGrills,
                PartNumber: grill && data.Fixture.Grills[0].Fixture.PartNumber ? data.Fixture.Grills[0].Fixture.PartNumber : null
            }
            this.grillsCurdService.applyGrills([child], grillData);
            this.pogObject.computeMerchHeight(ctx);
            this.sharedService.gridReloadSubscription.next(true);
        }

        if (this.fName === 'Fixture.Height' || this.fName === 'Fixture.Thickness' || this.fName == AppConstantSpace.LOCATION_Y) {
            this.pogObject.applyRenumberingShelfs();
        }
    }

    private getVal(currentVal: GridData): boolean {
        switch (currentVal) {
            case 1:
                return true;
            case 2:
                return false;
        }
    }

    public snapToLeftShelf(shelfItemData: FixtureList, rootObject: Section): void {
        let proposedX1PosToPog = shelfItemData.getXPosToPog();
        let proposedYPosToPog = shelfItemData.getYPosToPog(true);
        let proposedWidth = shelfItemData.Fixture.Width;
        proposedX1PosToPog = rootObject.getNearestXCoordinate(proposedX1PosToPog, 'leftmost');
        proposedWidth = shelfItemData.Fixture.Width;
        shelfItemData.moveFixture(proposedX1PosToPog, proposedYPosToPog, proposedWidth);
        //revert to Orignal value if snaptoLeft and snaptoRight is enabled
        const dObj = {
            field: 'Fixture.Width',
            newValue: proposedWidth,
            IDPOGObject: shelfItemData.IDPOGObject,
            gridType: 'Fixture',
            tab: null,
        };
        this.sharedService.workSheetEvent.next(dObj);
    }

    public snapToRightShelf(shelfItemData: FixtureList, rootObject: Section, valueOld: number, proposedWidth): void {
        let proposedX1PosToPog = shelfItemData.getXPosToPog();
        let proposedYPosToPog = shelfItemData.getYPosToPog();
        let proposedX2PosToPog = proposedX1PosToPog + proposedWidth;
        proposedX2PosToPog = Utils.isNullOrEmpty(valueOld) ? proposedX2PosToPog : proposedX1PosToPog + valueOld;
        proposedX2PosToPog = (function () {
            return rootObject.getNearestXCoordinate(proposedX2PosToPog, 'rightmost');
        })();
        if (shelfItemData.Fixture.SnapToLeft) {
            proposedWidth = proposedX2PosToPog - proposedX1PosToPog;
            proposedX1PosToPog = proposedX2PosToPog - proposedWidth;
        } else {
            proposedX1PosToPog = proposedX2PosToPog - proposedWidth;
        }
        const oldFixWidth = shelfItemData.Fixture.Width;
        shelfItemData.moveFixture(proposedX1PosToPog, proposedYPosToPog, proposedWidth, {
            oldWidth: valueOld,
            oldLocY: shelfItemData.Location.Y,
            oldLocX: shelfItemData.Location.X,
        });

        //revert to Orignal value if snaptoLeft and snaptoRight is enabled
        const dObj = {
            field: 'Fixture.Width',
            newValue: proposedWidth,
            IDPOGObject: shelfItemData.IDPOGObject,
            gridType: 'Fixture',
            tab: null,
        };
        if (proposedWidth != oldFixWidth) {
            this.generateDividers(shelfItemData, this.fName, proposedWidth, oldFixWidth);
        }
        this.sharedService.workSheetEvent.next(dObj);
    }

    public setFieldValue(obj: Fixture, fieldName: string, fieldValue: GridData): void {
        const strArray = fieldName.split('.');
        const lkey = strArray[strArray.length - 1];
        if (strArray.length === 1 && typeof obj[lkey] === 'string') {
            obj[lkey] = fieldValue;
        } else {
            strArray.forEach((key) => {
                if (obj && obj.hasOwnProperty(key)) {
                    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                        this.setFieldValue(obj[key], fieldName, fieldValue);
                    } else if (!Array.isArray(obj[key] && key === lkey)) {
                        obj[key] = fieldValue;
                    }
                }
            });
        }
    }

    public saveEdit(
        fixture: FixtureList,
        id: string,
        value: GridData,
        oldvalue: GridData
    ): boolean {
        if (!this.isfilldowninprocess) {
            let oldVM_Entity = this.sharedService.getObject(id, this.sectionID) as FixtureList;
            let pogObject = this.sharedService.getObject(fixture.$sectionID, this.sectionID) as Section;
            if (this.dataValidation.validate(pogObject, oldVM_Entity, this.fName, value, oldvalue)) {
                //just update VM
                //feature undo-redo: by Abhishek
                if (this.fName !== 'Fixture.SnapToLeft' && this.fName !== 'Fixture.SnapToRight') {
                    this.generateDividers(oldVM_Entity, this.fName, value, oldvalue);    
                }
                this.wireUpUndoRedo(oldVM_Entity, this.fName, value, oldvalue); //@todo
                this.updatePOG_VM(oldVM_Entity, this.fName, value);
                return true;
            } else {
                const dObj = {
                    field: this.fName,
                    newValue: oldvalue,
                    IDPOGObject: oldVM_Entity.IDPOGObject,
                    gridType: 'Fixture',
                    tab: null,
                };
                this.sharedService.workSheetEvent.next(dObj);
                return false;
            }
        }
    }

    public wireUpUndoRedo(
        oldVM_Entity: FixtureList,
        fieldPathStr: string,
        newValue: GridData,
        oldValue: GridData
    ): void {
        let original = ((sharedService, $id, fieldPathStr, value, sectionId) => {
            return () => {
                sharedService.setObjectField($id, fieldPathStr, value, sectionId);
                const dObj = {
                    field: fieldPathStr,
                    newValue: value,
                    IDPOGObject: oldVM_Entity.IDPOGObject,
                    gridType: 'Fixture',
                    tab: null,
                };
                this.sharedService.workSheetEvent.next(dObj);
            };
        })(this.sharedService, oldVM_Entity.$id, fieldPathStr, newValue, this.sectionID);
        let revert = ((ObjectProvider, $id, fieldPathStr, value, sectionId) => {
            return () => {
                ObjectProvider.setObjectField($id, fieldPathStr, value, sectionId);
                const dObj = {
                    field: fieldPathStr,
                    newValue: value,
                    IDPOGObject: oldVM_Entity.IDPOGObject,
                    gridType: 'Fixture',
                    tab: null,
                };
                this.sharedService.workSheetEvent.next(dObj);
            };
        })(this.sharedService, oldVM_Entity.$id, fieldPathStr, oldValue, this.sectionID);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'fixtureWorkSheetGrid',
        });
        if (oldVM_Entity.ObjectType !== AppConstantSpace.FIXTUREOBJ) {
            if (
                (PosIntersectionArray.indexOf(fieldPathStr) !== -1) ||
                (FixtureIntersectionArray.indexOf(fieldPathStr) !== -1) ||
                (PogIntersectionArray.indexOf(fieldPathStr) !== -1)
            ) {
                this.planogramService.insertPogIDs([oldVM_Entity], true);
            }
        } else {
            this.planogramService.insertPogIDs([oldVM_Entity], true);
        }
    }

    private updatePOG_VM(oldVM_Entity: FixtureList, fieldPathStr: string, newValue: GridData): void {
        this.sharedService.setObjectField(oldVM_Entity.$id, fieldPathStr, newValue, this.sectionID);
    }

    public changeFillUpDownDataEvent(data) {
        let updatedFixtures = [];
        let unqHistoryID = this.historyService.startRecording();
        let fixtures = this.getAllFixtures(this.pogObject);
        this.fName = data.field;

        let toComputeFixtures: { [key: string]: PositionParentList } = {};


        data.updatedRows.forEach((element) => {
            let child = fixtures.filter((e) => e.$id == element.$id)[0];
            let oldValue = data.oldValues.filter((e) => e.$id == element.$id)[0];
            let isValid = true;
            if (child) {
                if (child && this.dataValidation.validate(this.pogObject, child, this.fName, data.updatedValue, oldValue.oldValue)  && this.worksheetGridService.cellValidation(child, this.fName,true,data.params?.colDef?.cellRendererParams?.IDDictionary,this.panelService.ActivePanelInfo.view)) {
                    if (this.fName === 'Fixture.SnapToLeft' || this.fName === 'Fixture.SnapToRight') {
                        if (this.fName === 'Fixture.SnapToLeft' && data.updatedValue === true) {
                            this.snapToLeftShelf(child, this.pogObject);
                            if (child.Fixture.SnapToRight) {
                                this.snapToRightShelf(child, this.pogObject, undefined, child.Fixture.Width);
                            }
                        }
                        if (this.fName === 'Fixture.SnapToRight' && data.updatedValue === true) {
                            if (child.Fixture.SnapToLeft) {
                                this.snapToLeftShelf(child, this.pogObject);
                            }
                            this.snapToRightShelf(child, this.pogObject, undefined, child.Fixture.Width);
                        }
                    }

                    if (this.fName === 'Fixture.Width') {
                        if (child.Fixture.SnapToRight && child.Fixture.SnapToLeft)
                            this.snapToRightShelf(child, this.pogObject, child.Dimension.Width, data.updatedValue);
                    }
                    if (this.fName === 'Fixture.AutoComputeDepth' && 'computePositionsAfterChange' in child) {
                        toComputeFixtures[child.$id] = child;
                    }
                    if (this.fName === 'Fixture.LKCrunchMode') {
                        const IsCrunchModeChange = this.changeFixCrunchModeCxt(child, data.updatedValue, oldValue.oldValue, false, true);
                        if (!IsCrunchModeChange) return;
                    }

                    if (this.fName === AppConstantSpace.FIXTURE_NOTCH_NUMBER) {
                        let isValidMove = data.updatedValue === 0 || this.planogramHelperService.validateFixtureMovement(this.pogObject, child, oldValue.oldValue, data.updatedValue, this.fName);
                        if (!isValidMove) {
                            data.updatedValue = oldValue.oldValue;
                            isValid = false;
                        } else {
                            let isFixtureMoved = this.planogramHelperService.moveFixtureByNotchNumber(child, this.pogObject, oldValue.oldValue, data.updatedValue);
                            if (!isFixtureMoved) {
                                data.updatedValue = oldValue.oldValue;
                                isValid = false;
                            }
                        }
                    }
                    if (isValid) {
                        updatedFixtures.push(child);   
                    } else {
                        const dObj = {
                            field: this.fName,
                            newValue: oldValue.oldValue,
                            IDPOGObject: child.IDPOGObject,
                            gridType: 'Fixture',
                            tab: null,
                        };
                        this.sharedService.workSheetEvent.next(dObj);
                    }
                    return;
                } else {
                    const dObj = {
                        field: this.fName,
                        newValue: oldValue.oldValue,
                        IDPOGObject: child.IDPOGObject,
                        gridType: 'Fixture',
                        tab: null,
                    };
                    // this.setFieldValue(child, this.fName, oldValue.oldValue);
                    this.sharedService.workSheetEvent.next(dObj);
                }
            }
        });

        if (this.fName === AppConstantSpace.FIXTURE_NOTCH_NUMBER) {
            this.pogObject.applyRenumberingShelfs();
            this.planogramService.insertPogIDs(updatedFixtures, true);
        }
        

        // This does not seem to affecting any functionality. The stop recording triggers compute merch height which should handle the calculations.
        // const ctx = new Context(this.pogObject);
        // Object.values(toComputeFixtures).forEach(it => it.computePositionsAfterChange(ctx));

        const fixtureObjdata = {
            item: updatedFixtures[0],
            id: updatedFixtures[0]?.$id,
            value: data.updatedValue,
            unqHistoryID: unqHistoryID,
            oldvalues: data.oldValues,
            fixtures: updatedFixtures,
        };
        const uObj = {
            fieldPathStr: this.fName,
            newValue: fixtureObjdata.value,
            oldValues: fixtureObjdata.oldvalues,
            model: fixtureObjdata.item,
            unqHistoryID: fixtureObjdata.unqHistoryID,
            fixtures: fixtureObjdata.fixtures,
        };
        if (this.fName !== 'Fixture.SnapToLeft' && this.fName !== 'Fixture.SnapToRight') {
            updatedFixtures.forEach(fix => {
                const oldValue = uObj.oldValues.find(ov => ov.$id == fix.$id)?.oldValue;
                this.generateDividers(fix, this.fName, uObj.newValue, oldValue);
            });
        }
        
        this.undoRedoFilldown(uObj);
        this.historyService.stopRecording(undefined, undefined, fixtureObjdata.unqHistoryID);
        this.planogramservice.UpdatedSectionObject.next(this.pogObject);
        this.sharedService.fixtureEdit.next(true);
        this.planogram_2DService.reArrangeRubberBandingAnchors();
        this.render2d.isDirty = true;
        this.sharedService.updatePosPropertGrid.next(true);
        this.planogramservice.updateNestedStyleDirty = true;;
    }

    private undoRedoFilldown(uObj: any): void {
        let original = ((sharedService, $id, fieldPathStr, value, sectionId) => {
            return () => {
                if (fieldPathStr === 'Position.attributeObject.Color_color') {
                    let colorCode = cloneDeep(value);
                    colorCode = parseInt(colorCode.replace('#', ''), 16);
                    if (uObj.fixtures != undefined) {
                        uObj.fixtures.forEach((item, key) => {
                            sharedService.setObjectField($id, 'Position.attributeObject.Color', colorCode, sectionId);
                        });
                    }
                } else {
                    if (uObj.fixtures != undefined) {
                        uObj.fixtures.forEach((item, key) => {
                            uObj.oldValues.forEach((fixtures) => {
                                if (fixtures.$id === item.$id) {
                                    sharedService.setObjectField(
                                        item._CalcField.Fixture.id,
                                        fieldPathStr,
                                        value,
                                        sectionId,
                                    );
                                    const dObj = {
                                        field: fieldPathStr,
                                        newValue: value,
                                        IDPOGObject: item.IDPOGObject,
                                        gridType: 'Fixture',
                                        tab: null,
                                    };
                                    this.sharedService.workSheetEvent.next(dObj);
                                }
                            });
                        });
                    }
                }
            };
        })(this.sharedService, uObj.model.$id, uObj.fieldPathStr, uObj.newValue, this.sectionID);
        let revert = (($id, fieldPathStr, value, sectionId) => {
            return () => {
                if (fieldPathStr === 'Position.attributeObject.Color_color') {
                    let colorCode = cloneDeep(value);
                    colorCode = parseInt(colorCode.replace('#', ''), 16);
                    if (uObj.fixtures != undefined) {
                        uObj.fixtures.forEach((item, key) => {
                            uObj.oldValues.forEach((fixtures) => {
                                if (fixtures.$id === item.$id) {
                                    this.sharedService.setObjectField(
                                        item._CalcField.Fixture.id,
                                        fieldPathStr,
                                        fixtures.oldValue,
                                        sectionId,
                                    );
                                    const dObj = {
                                        field: fieldPathStr,
                                        newValue: fixtures.oldValue,
                                        IDPOGObject: item.IDPOGObject,
                                        gridType: 'Fixture',
                                        tab: null,
                                    };
                                    this.sharedService.workSheetEvent.next(dObj);
                                }
                            });
                        });
                    }
                } else {
                    if (uObj.fixtures != undefined) {
                        uObj.fixtures.forEach((item, key) => {
                            uObj.oldValues.forEach((fixtures) => {
                                if (fixtures.$id === item.$id) {
                                    this.sharedService.setObjectField(
                                        item._CalcField.Fixture.id,
                                        fieldPathStr,
                                        fixtures.oldValue,
                                        sectionId,
                                    );
                                    const dObj = {
                                        field: fieldPathStr,
                                        newValue: fixtures.oldValue,
                                        IDPOGObject: item.IDPOGObject,
                                        gridType: 'Fixture',
                                        tab: null,
                                    };
                                    this.sharedService.workSheetEvent.next(dObj);
                                }
                            });
                        });
                    }
                }
            };
        })(uObj.model.$id, uObj.fieldPathStr, uObj.oldValues, this.sectionID);
        if (uObj.fieldPathStr === 'Fixture.LKCrunchMode') {
            this.undoRedoCrunchModeChange(uObj.fixtures, uObj.newValue, uObj.oldValues, true);
        } else {
            this.historyService.captureActionExec({
                funoriginal: original,
                funRevert: revert,
                funName: 'WorkSheetGrid',
            });
        }
        if (uObj.model.ObjectType != AppConstantSpace.FIXTUREOBJ) {
            if (
                (PosIntersectionArray.indexOf(uObj.fieldPathStr) !== -1) ||
                (FixtureIntersectionArray.indexOf(uObj.fieldPathStr) !== -1) ||
                (PogIntersectionArray.indexOf(uObj.fieldPathStr) !== -1)
            ) {
                this.planogramService.insertPogIDs([uObj.model], true);
            }
            this.historyService.stopRecording([1, 2, 3], undefined, uObj.unqHistoryID);
        }
        //undo-redo ends here
    };

    public deleteObject(): void {
        this.worksheetGridService.delete();
    }

    public worksheetKeyEvents = (event): void => {
        this.worksheetGridService.keyUpEvents(event, this.displayView);
    };

    // Regenerate dividers to show properly in SVG
    private generateDividers(fixture: ObjectListItem, field: string, newValue: GridData, oldValue: GridData): void {
        if ((field == 'Fixture.Width' || field == 'Fixture.Depth' || field == 'Fixture.Height' ||
            field === 'Fixture.SnapToLeft' || field === 'Fixture.SnapToRight')
            && Utils.checkIfCoffincase(fixture)) {
            
            const info = fixture.getCoffinCaseInfo();
            if (field === 'Fixture.SnapToLeft' || field === 'Fixture.SnapToRight') {
                fixture.ChildDimension.Width = (newValue as number) - info.SideThickness * 2;
            }
            if (field == 'Fixture.Width') {
                fixture.ChildDimension.Width = (newValue as number) - info.SideThickness * 2;
                fixture.Dimension.Width = (newValue as number);
            }
            if (field == 'Fixture.Depth') {
                fixture.ChildDimension.Depth = (newValue as number) - info.FrontThickness * 2;
                fixture.Dimension.Depth = (newValue as number);
            }
            if (field == 'Fixture.Height') {
                fixture.ChildDimension.Height = (newValue as number) - info.BottomThickness;
                fixture.Dimension.Height = (newValue as number);
            }
            
            const hasAnyDivider = fixture.Children.find(ch => ch.ObjectDerivedType === AppConstantSpace.DIVIDERS);
            hasAnyDivider ? this.crunchMode.regenerateDividers(fixture) : undefined;
            this.sharedService.renderSeparatorAgainEvent.next(true);
            this.sharedService.updateValueInPlanogram.next({ products: [fixture] });

            let original = ((newValue, oldValue) => {
                return () => {
                    this.generateDividers(fixture, field, newValue, oldValue);
                };
            })(newValue, oldValue);
            let revert = ((oldValue, newValue) => {
                return () => {
                    this.generateDividers(fixture, field, oldValue, newValue);
                };
            })(oldValue, newValue);
            this.historyService.captureActionExec({
                funoriginal: original,
                funRevert: revert,
                funName: 'fixtureWorkSheetGenerateDividers',
            });
        }
    }

    private changeFixCrunchModeCxt(data, newValue, oldValue, isUndoRedoRequired: boolean, isCallFromFillUpFilldown?: boolean): boolean {
        if (data.ObjectDerivedType === AppConstantSpace.PEGBOARDOBJ ||
            data.ObjectDerivedType === AppConstantSpace.SLOTWALLOBJ ||
            data.ObjectDerivedType === AppConstantSpace.CROSSBAROBJ ||
            data.ObjectDerivedType === AppConstantSpace.BLOCK_FIXTURE) {
            const dObj = {
                field: this.fName,
                newValue: oldValue,
                IDPOGObject: data.IDPOGObject,
                gridType: 'Fixture',
                tab: null,
            };
            this.sharedService.workSheetEvent.next(dObj);
            return false;
        }
        this.crunchMode.current = newValue;
        this.crunchMode.getCrunchModeMenu(data.ObjectDerivedType);
        const sectionObj = this.sharedService.getObjectAs<Section>(data.$sectionID, data.$sectionID);
        if (this.worksheetGridService.isPOGLive(data.$sectionID, true)) {
            return false;
        }
        this.crunchMode.changeCrunchMode(sectionObj, this.crunchMode.current);
        if (isUndoRedoRequired) {
            this.undoRedoCrunchModeChange([sectionObj], this.crunchMode.current, [oldValue]);
        }
        this.sharedService.renderDividersAgainEvent.next(true);
        return true;
    }

    //Due to requirement of crunch-mode service code, we need this functionality for crunch mode undo-redo
    //Old values can be type of number or any
    private undoRedoCrunchModeChange(fixtures: Section[], newValue: CrunchMode, oldValues: any[], isCallFromFillUpFilldown?: boolean): void {
        let unqHistoryID = this.historyService.startRecording();
        let original = ((fixtures, newValue) => {
            return () => {
                fixtures.forEach((element) => {
                    if (isCallFromFillUpFilldown) {
                        const sectionObj = this.sharedService.getObjectAs<Section>(element.$sectionID, element.$sectionID);
                        this.crunchMode.changeCrunchMode(sectionObj, newValue);
                    } else {
                        this.crunchMode.changeCrunchMode(element, newValue);
                    }
                });
            };
        })(fixtures, newValue);
        let revert = ((fixtures, oldValues) => {
            return () => {
                fixtures.forEach((element, index) => {
                    if (isCallFromFillUpFilldown) {
                        //In crunch-mode service, we are doing operations on selection object so did some manipulation on selectedList as per requirements
                        const previousSelectionList = this.sharedService.selectedID[element.$sectionID];
                        this.sharedService.selectedID[element.$sectionID] = [element.$id];
                        const sectionObj = this.sharedService.getObjectAs<Section>(element.$sectionID, element.$sectionID);
                        const oldValue = oldValues.filter(ele => ele.id === element.IDPOGObject)[0].oldValue;
                        this.crunchMode.changeCrunchMode(sectionObj, oldValue);
                        this.sharedService.selectedID[element.$sectionID] = previousSelectionList;
                    } else {
                        this.crunchMode.changeCrunchMode(element, oldValues[index]);
                    }
                    //Need to remove undo-redo stack as its added from crunch mode service which is not needed for worksheet
                    this.historyService.historyStack[this.sharedService.activeSectionID].pop()
                });
            };
        })(fixtures, oldValues);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'fixtureWorksheetChangeCrunchMode',
        });
        this.historyService.stopRecording(undefined, undefined, unqHistoryID);
    };

    ngOnDestroy(): void {
        this.sharedService.selectedObject(null);
        this.sharedService.workSheetEvent.next(null);
        if (this.subscriptions) {
            this.subscriptions.unsubscribe();
        }
    }
}
