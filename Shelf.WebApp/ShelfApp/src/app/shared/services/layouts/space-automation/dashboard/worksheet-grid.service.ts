import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { cloneDeep } from 'lodash-es';
import {
    AppConstantSpace,
    Utils,
    PosIntersectionArray,
    FixtureIntersectionArray,
    PogIntersectionArray,
} from 'src/app/shared/constants';
import { BlockFixture, Fixture, Position, Section } from 'src/app/shared/classes';
import { GridData, KEYBOARD_EVENTS, PanelView, PositionFilldownObject, PositionOldVal, UndoRedoData, WorksheetEventData } from 'src/app/shared/models';
import {
    SaDashboardService,
    SharedService,
    PlanogramStoreService,
    PlanogramService,
    ParentApplicationService,
    HistoryService,
    NotifyService,
    DataValidationService,
    Render2dService,
    Planogram_2DService,
    PropertyGridService,
    DictConfigService,
} from 'src/app/shared/services';
import { FixtureList, PositionParentList } from '../../../common/shared/shared.service';
import { Context } from 'src/app/shared/classes/context';
import { EditableCallback } from 'ag-grid-community';
export type WorksheetObject = Position | FixtureList;

declare const window: any;

@Injectable({
    providedIn: 'root',
})
export class WorksheetGridService {
    public oldValuesList: PositionOldVal[] = [];
    public selectedObjects: Position[] = [];
    public redrawGrid: Subject<boolean> = new Subject<boolean>();
    private applicability = [];
    constructor(
        private readonly translate: TranslateService,
        private readonly sharedService: SharedService,
        private readonly parentApp: ParentApplicationService,
        private readonly notifyService: NotifyService,
        private readonly saDashboardService: SaDashboardService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly planogramService: PlanogramService,
        private readonly historyService: HistoryService,
        private readonly dataValidation: DataValidationService,
        private readonly render2d: Render2dService,
        private readonly planogram2DService: Planogram_2DService,
        private readonly propertyGridService: PropertyGridService,
        private readonly dictService: DictConfigService 
    ) { }

    public isPOGLive(sectionId: string, required: boolean): boolean {
        let sectionObj = this.sharedService.getObject(sectionId, sectionId) as Section;

        if (this.checkIfSystemCheckout(sectionObj.IDPOG)) {
            if (required) {
                this.notifyService.warn('Updates disabled for planograms checkedout by System', 'undo');
            }
            return true;
        } else if (this.checkIfReadonly(sectionObj.IDPOG)) {
            if (required) {
                this.notifyService.warn('UPDATES_NOT_ALLOWED_FOR_THIS_PLANOGRAM', 'undo');
            }
            return true;
        }
        return false;
    }

    public checkIfSystemCheckout(idpog: number): boolean {
        const obj = this.sharedService.getObjectFromIDPOG(idpog);
        return Utils.isNullOrEmpty(obj.CheckoutOwner)
            ? false
            : obj.CheckoutOwner.toLowerCase() === AppConstantSpace.SYSTEM;
    }

    public isEditable(sectionID) {
        const AppSettingsSvc = this.planogramStore.appSettings;
        if (this.parentApp.isNiciMode || this.isPOGLive(sectionID, false)) {
            return false;
        }
        if (this.sharedService.checkIfAssortMode('item-worksheet-edit')) {
            return true;
        }
        return !AppSettingsSvc.isReadOnly;
    }

    //TODO  @Amit : Need to confirm type of data
    public checkIffieldEditable(field: string, data: any): boolean {
        let IsEditable: boolean;
        let sectionID = this.sharedService.activeSectionID;
        let id = data._CalcField.Position ? data._CalcField.Position.id : data._CalcField.id;
        let entity = this.sharedService.getObject(id, sectionID) as Position;
        let objParent = this.sharedService.getParentObject(entity, entity.$sectionID);
        let pogObject = this.sharedService.getObject(sectionID, sectionID) as Section;
        let columnsData: any = this.saDashboardService.GetGridColumns(`SHELF_POSITION_WORKSHEET`);
        if (this.sharedService.isNiciFeatureNotAllowed('ITEM_WORKSHEET_EDIT', [entity])) {
            return true;
        } else if (this.parentApp.isNiciMode) {
            let colmnDictionary;
            for (let i = 0; i < columnsData.length; i++) {
                if (columnsData[i].field == field) {
                    colmnDictionary = columnsData[i].IDDictionary;
                    break;
                }
            }
            return colmnDictionary
                ? AppConstantSpace.PROPERTYGRID_ALLOWED_DICTIONARIES.POSITION_PROPERTIES.indexOf(colmnDictionary) != -1
                    ? false
                    : true
                : false;
        } else {
            let currentField = columnsData.find((x) => x.field == field);
            if (pogObject.IDPerfPeriod == -1 && field == 'Position.attributeObject.CurrMovt') {
                IsEditable = true;
            } else if (currentField.editable && objParent.Fixture.AutoComputeDepth && (field === 'Position.FacingsZ' || field === 'Position.LayoversZ')) {
                IsEditable = false;
            } else if (currentField.editable && objParent.Fixture.AutoComputeFronts && (field == 'Position.FacingsY' || field == 'Position.LayoversY')) {
                IsEditable = false;
            } else if (currentField.editable) {
                IsEditable = true;
            }

            return IsEditable;
        }
    }

    public checkIfReadonly(IDPOG: number): boolean {
        const obj = this.sharedService.getObjectFromIDPOG(IDPOG);
        return obj.IsReadOnly;
    }

    public selectObjectByEvent(item: WorksheetObject, sectionID: string): void {
        item.selected = true;
        if (this.planogramService.getLastSelectedObjectDerivedType(sectionID) == 'Section') {
            this.planogramService.removeAllSelection(sectionID);
        }
        this.planogramService.addToSelectionByObject(item, item.$sectionID);
        this.planogramService.selectionEmit.next(true);
    }

    public saveFilldown(ctx: Context, data: PositionFilldownObject): boolean {
        if (!data.isfilldowninprocess) {
            const oldVM_Entity = this.sharedService.getObject(data.id, data.sectionID) as Position;
            let pogObject = this.sharedService.getObject(data.position.$sectionID, data.sectionID) as Section;
            if (this.dataValidation.validate(pogObject, oldVM_Entity, data.fieldName, data.value, data.preValue)) {
                this.undoRedoFilldown(oldVM_Entity, data);
                this.updatePOG_VM(oldVM_Entity, data.fieldName, data.value);
                pogObject.computeMerchHeight(ctx);
                this.historyService.stopRecording(undefined, undefined, data.unqHistoryID);
                return true;
            } else {
                const dObj: WorksheetEventData = {
                    field: data.fieldName,
                    newValue: data.preValue,
                    IDPOGObject: oldVM_Entity.IDPOGObject,
                    gridType: 'item',
                    tab: null,
                };
                this.sharedService.workSheetEvent.next(dObj);
                // this.notifyService.warn(( data.fieldName) + ' is not editable for the selected position.', '', { duration: 4000 });
                return false;
            }
        }
    }

    public updatePOG_VM(oldVM_Entity: Position, fieldPathStr: string, newValue: GridData): void {
        //lets update POG as well as kendo grid datasource
        let sectionID = this.sharedService.getActiveSectionId();
        this.sharedService.setObjectField(oldVM_Entity.$id, fieldPathStr, newValue, sectionID);
    }

    private undoRedoFilldown = (uObj, sectionID, isHistoryRec?) => {
        let original = ((sharedService, uObj, fieldPathStr, value, sectionId) => {
            return () => {
                if (fieldPathStr == 'Position.attributeObject.Color_color') {
                    //TODO @Amit update colorcodr
                    // let colorCode = cloneDeep(value);
                    // colorCode = parseInt(colorCode.replace('#', ''), 16);
                    if (uObj.positions) {
                        uObj.positions.forEach((position, key) => {
                            uObj.oldValues.forEach((item) => {
                                if (position.IDPOGObject == item.id) {
                                    sharedService.setObjectField(
                                        position._CalcField.Position.id,
                                        fieldPathStr,
                                        value,
                                        sectionId,
                                    );
                                    const dObj: WorksheetEventData = {
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
                    if (uObj.positions) {
                        uObj.positions.forEach((position, key) => {
                            uObj.oldValues.forEach((item) => {
                                if (position.IDPOGObject == item.id) {
                                    sharedService.setObjectField(
                                        position._CalcField.Position.id,
                                        fieldPathStr,
                                        value,
                                        sectionId,
                                    );
                                    const dObj: WorksheetEventData = {
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
        })(this.sharedService, uObj, uObj.fieldPathStr, uObj.newValue, sectionID);
        let revert = ((sharedService, uObj, fieldPathStr, value, sectionId) => {
            return () => {
                if (fieldPathStr == 'Position.attributeObject.Color_color') {
                    let colorCode = cloneDeep(value);
                    colorCode.forEach((color) => {
                        parseInt(color.oldValue.replace('#', ''), 16);
                    })
                    if (uObj.positions) {
                        uObj.positions.forEach((position, key) => {
                            uObj.oldValues.forEach((item) => {
                                if (position.IDPOGObject == item.id) {
                                    sharedService.setObjectField(
                                        position._CalcField.Position.id,
                                        fieldPathStr,
                                        item.oldValue,
                                        sectionId,
                                    );
                                    const dObj: WorksheetEventData = {
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
                    if (uObj.positions) {
                        uObj.positions.forEach((position, key) => {
                            uObj.oldValues.forEach((item) => {
                                if (position.IDPOGObject == item.id) {
                                    sharedService.setObjectField(
                                        position._CalcField.Position.id,
                                        fieldPathStr,
                                        item.oldValue,
                                        sectionId,
                                    );
                                    const dObj: WorksheetEventData = {
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
        })(this.sharedService, uObj, uObj.fieldPathStr, uObj.oldValues, sectionID);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'WorkSheetGrid',
        });
        if (uObj.model.ObjectType != AppConstantSpace.FIXTUREOBJ || isHistoryRec) {
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
    public worksheetUndoRedo(data: UndoRedoData, positions?: Position[], isHistoryRec?: boolean): void {
        let sectionID = this.sharedService.getActiveSectionId();
        let original = (($id, fieldPathStr, value, sectionId) => {
            return () => {
                if (fieldPathStr == 'Position.attributeObject.Color_color') {
                    let colorCode = cloneDeep(value);
                    colorCode = parseInt(colorCode.replace('#', ''), 16);
                    this.sharedService.setObjectField($id, 'Position.attributeObject.Color', colorCode, sectionId);
                    this.sharedService.setObjectField($id, fieldPathStr, value, sectionId);
                    const dObj: WorksheetEventData = {
                        field: fieldPathStr,
                        newValue: value,
                        IDPOGObject: data.oldVM_Entity.IDPOGObject,
                        gridType: 'item',
                        tab: null,
                    };
                    this.sharedService.workSheetEvent.next(dObj);
                } else {
                    this.sharedService.setObjectField($id, fieldPathStr, value, sectionId);
                    const dObj: WorksheetEventData = {
                        field: fieldPathStr,
                        newValue: value,
                        IDPOGObject: data.oldVM_Entity.IDPOGObject,
                        gridType: 'item',
                        tab: null,
                    };
                    this.sharedService.workSheetEvent.next(dObj);
                }
            };
        })(data.oldVM_Entity.$id, data.fieldPathStr, data.newValue, sectionID);
        let revert = (($id, fieldPathStr, value, sectionId) => {
            return () => {
                if (fieldPathStr == 'Position.attributeObject.Color_color') {
                    let colorCode = cloneDeep(value);
                    colorCode = parseInt(colorCode.replace('#', ''), 16);
                    this.sharedService.setObjectField($id, 'Position.attributeObject.Color', colorCode, sectionId);
                    this.sharedService.setObjectField($id, fieldPathStr, value, sectionId);
                    const dObj: WorksheetEventData = {
                        field: fieldPathStr,
                        newValue: data.oldValue,
                        IDPOGObject: data.oldVM_Entity.IDPOGObject,
                        gridType: 'Position',
                        tab: null,
                    };
                    this.sharedService.workSheetEvent.next(dObj);
                } else {
                    this.sharedService.setObjectField($id, fieldPathStr, value, sectionId);
                    const dObj: WorksheetEventData = {
                        field: fieldPathStr,
                        newValue: data.oldValue,
                        IDPOGObject: data.oldVM_Entity.IDPOGObject,
                        gridType: 'item',
                        tab: null,
                    };
                    this.sharedService.workSheetEvent.next(dObj);
                }
            };
        })(data.oldVM_Entity.$id, data.fieldPathStr, data.oldValue, sectionID);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'WorkSheetGrid',
        });
        if (data.model || isHistoryRec) {
            if (
                (PosIntersectionArray.indexOf(data.fieldPathStr) != -1) ||
                (FixtureIntersectionArray.indexOf(data.fieldPathStr) != -1) ||
                (PogIntersectionArray.indexOf(data.fieldPathStr) != -1)
            ) {
                this.planogramService.insertPogIDs([data.model], true);
            }
            this.historyService.stopRecording([1, 2, 3], undefined, data.unqHistoryID);
        }
        //undo-redo ends here
    }

    public delete(): void {
        this.planogram2DService.delete();
        this.render2d.isDirty = true;
    }

    public keyUpEvents(event: KeyboardEvent, displayView: string): void {
        if (event.ctrlKey) {
            switch (event.key) {
                case KEYBOARD_EVENTS.REDO: //REDO
                    this.historyService.redo();
                    event.stopPropagation();
                    break;
                case KEYBOARD_EVENTS.UNDU: //UNDO
                    this.historyService.undo();
                    event.stopPropagation();
                    break;
            }
        }
    }

    private getApplicability(data, idDictionary: number): boolean {
        let DictObj
        this.applicability = []
        DictObj = this.dictService.findById(idDictionary)
        if (DictObj?.Applicability && idDictionary == DictObj.IDDictionary) {
            this.applicability.push({ field: DictObj.DictionaryName, value: DictObj.Applicability.split(/[ ,]+/).map((ele) => Number(ele)) });
        }
        if (!DictObj?.Applicability) {
            return true;
        } else {
            return this.applicability[0]?.value.includes(data.Fixture.IDFixtureType);
        }
    }

    public fieldValidation(data, idDictionary){
        return this.getApplicability(data, idDictionary)
    }
    //----- AG-Grid FillUpDown--------
    public changeFillUpDownDataEvent(data, pogObject:Section) {
        let updatedPositions = [];
        let unqHistoryID = this.historyService.startRecording();
        let positions = this.sharedService.getAllPositionFromObjectList(pogObject.$id);
        let field = data.field;

        let parentFixtures: { [key: string]: PositionParentList } = {};

        const ctx = new Context(pogObject);
        data.updatedRows.forEach((element) => {
            let child = positions.filter((e) => e.$id == element.$id)[0];
            let oldValue = data.oldValues.filter((e) => e.$id == element.$id)[0];
            if (child) {
                if (
                    child &&
                    this.dataValidation.validate(pogObject, child, field, data.updatedValue, oldValue.oldValue)
                ) {
                    let currentFixtureObj = this.sharedService.getParentObject(child, child.$sectionID) as PositionParentList;
                    parentFixtures[currentFixtureObj.$id] = currentFixtureObj;
                    // @karthik This update is unnecessary,as data updates are handled by the grid. delete if not uncommented by 13-09-22
                    //this.setFieldValue(child, data.field, data.updatedValue);
                    child.calculateDistribution(ctx, currentFixtureObj);
                    child.checkAndCalcIfContrainUpdated(data.field, data.updatedValue, oldValue);
                    updatedPositions.push(child);
                    return;
                } else {
                    const dObj: WorksheetEventData = {
                        field: field,
                        newValue: oldValue.oldValue,
                        IDPOGObject: child.IDPOGObject,
                        gridType: 'Position',
                        tab: null,
                    };
                    this.sharedService.workSheetEvent.next(dObj);
                }
            }
        });

        Object.values(parentFixtures).forEach(it => it.computePositionsAfterChange(ctx));

        const positionObjdata = {
            item: updatedPositions[0],
            id: updatedPositions[0].$id,
            value: data.updatedValue,
            unqHistoryID: unqHistoryID,
            oldvalues: data.oldValues,
            positions: updatedPositions,
        };
        const uObj = {
            fieldPathStr: field,
            newValue: positionObjdata.value,
            oldValues: positionObjdata.oldvalues,
            model: positionObjdata.item,
            unqHistoryID: positionObjdata.unqHistoryID,
            positions: positionObjdata.positions,
        };
        this.undoRedoFilldown(uObj, pogObject.$id);
        this.historyService.stopRecording(undefined, undefined, positionObjdata.unqHistoryID);
        //Not required as it is calculating in History Service
        //pogObject.computeMerchHeight(ctx);
        this.planogramService.UpdatedSectionObject.next(pogObject);
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

    
    public cellValidation(data : Position | Fixture, field: string, isColEditable: boolean | EditableCallback, idDictionary?: number, view?: string): boolean {
        if (isColEditable) {
            if (view === PanelView.POSITION || view === PanelView.ITEM) {
                if (!this.checkIffieldEditable(field, data)) {
                    this.notifyService.warn(field + ' ' + this.translate.instant('IS_NOT_EDITABLE_FOR_THE_SELECTED_POSITION'));
                    return false;
                }
                let parentObject = this.sharedService.getParentObject(data, data.$sectionID);
                return this.getApplicability(parentObject, idDictionary) ? true : false;
            } else {
                return this.getApplicability(data, idDictionary) ? true : false;
            }
        }
    }
}
