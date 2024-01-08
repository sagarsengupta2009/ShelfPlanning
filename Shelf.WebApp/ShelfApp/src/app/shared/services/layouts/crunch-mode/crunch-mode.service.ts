import { Injectable } from '@angular/core';
import { Basket, Coffincase, Divider, Position, Section, StandardShelf } from 'src/app/shared/classes';
import { Context } from 'src/app/shared/classes/context';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import { DividerResponse, InterSectionMessage, LookUpChildOptions, LookUpOptions } from 'src/app/shared/models';
import { DividersCurdService, SharedService } from '../..';
import { HistoryService, PlanogramService, PlanogramStoreService } from '../../common';
import { CrunchModeFixtures, MerchandisableList } from '../../common/shared/shared.service';
import { filter } from 'lodash';


/** Applicable only to standardshelf, coffincase and basket (basked extends coffincase)
 * when an item is placed it aligns them according to crunch mode
*/
@Injectable({
    providedIn: 'root'
})
export class CrunchModeService {


    public current: CrunchMode;

    // panel-context-menu.comp & context-model.comp
    public crunchModeOptions: LookUpChildOptions<CrunchMode>[] = [];

    constructor(
        private readonly sharedService: SharedService,
        private readonly planogramService: PlanogramService,
        private readonly historyService: HistoryService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly dividersCurdService: DividersCurdService
    ) { }

    // panel-context-menu
    //added function to get crunch mode options/menus based on Object derived type
    public getCrunchModeMenu(objectDerivedType: string, flag: boolean = false): void {
        switch (objectDerivedType) {
            case AppConstantSpace.SECTIONOBJ:
                this.crunchModeOptions = this.getFilteredCrunchOptions(this.planogramStore.lookUpHolder.CrunchMode.options, objectDerivedType, flag);
                break;
            case AppConstantSpace.STANDARDSHELFOBJ:
                this.crunchModeOptions = this.planogramStore.lookUpHolder.CrunchMode.options;
                break;
            case AppConstantSpace.BASKETOBJ:
            case AppConstantSpace.COFFINCASEOBJ:
                this.crunchModeOptions = this.getFilteredCrunchOptions(this.planogramStore.lookUpHolder.CrunchMode.options, objectDerivedType);
                break;
        }
    }

    // previously on planogram-helper.service
    public changeCrunchMode(datasource: Section, crunchMode: CrunchMode): void {
        //2019.3 Performance
        const section = this.sharedService.getObject(datasource.$sectionID, datasource.$sectionID) as Section;
        section.setSkipComputePositions();
        section.setSkipShelfCalculateDistribution();

        const selectedObjsList = this.planogramService.getSelectedObject(datasource.$sectionID) as CrunchModeFixtures[];
        //Note:
        //this change breaking other most of undo redo???
        //this should start at parent level not here, i.e. at 2dPOG
        const unqHistoryID = this.historyService.startRecording();
        let oldCrunch: number;
        const ctx = new Context(section);

        if (selectedObjsList.length && selectedObjsList[0].ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ
            || selectedObjsList[0].ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
            selectedObjsList[0].ObjectDerivedType == AppConstantSpace.BASKETOBJ) {
            for (const object of selectedObjsList) {
                if (object.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ) {
                    this.updateStandardshelfCrunch(ctx, object, crunchMode);
                } else if (object.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ || object.ObjectDerivedType == AppConstantSpace.BASKETOBJ) {
                    this.updateCoffinCaseCrunch(ctx, object, crunchMode);
                }
            }
        } else {
            oldCrunch = datasource.LKCrunchMode;
            datasource.LKCrunchMode = crunchMode;

            if (datasource.LKCrunchMode == CrunchMode.SpreadSpan) {
                if (datasource._IsSpanAcrossShelf.FlagData) {
                    datasource.getAllStandardShelfs()
                        .forEach((item) => {
                            this.rePositionStandardShelfOnCrunch(ctx, item, CrunchMode.SpreadSpan); // Spread
                            item.computePositionsAfterChange(ctx);
                        });
                }
            } else {
                this.updateALLCrunchMode(ctx, datasource.Children, crunchMode);
            }
        }

        //2019.3 Performance
        section.computePositionsAfterChange(ctx);
        section.clearSkipShelfCalculateDistribution();

        this.historyService.captureActionExec({
            funoriginal: () => datasource.LKCrunchMode = crunchMode,
            funRevert: () => datasource.LKCrunchMode = oldCrunch,
            funName: 'changeCrunchMode',
        });
        //intersectionUtils.insertPogIDs(null, true);
        this.planogramService.insertPogIDs(null, true);

        this.historyService.stopRecording(undefined, undefined, unqHistoryID);
        this.sharedService.updateAnnotationPosition.next(true);
    }

    // previously on section object
    public changeSectionCrunchMode(ctx: Context, datasource: Section, val: CrunchMode): void {
        let sectionID = datasource.$sectionID;
        //2019.3 Performance
        let sectionObj = this.sharedService.getObject(sectionID, sectionID) as Section;
        sectionObj.setSkipComputePositions();
        sectionObj.setSkipShelfCalculateDistribution();
        let selectedObjsList = this.planogramService.getSelectedObject(sectionID) as CrunchModeFixtures[];
        //Note:
        //this change breaking other most of undo redo???
        //this should start at parent level not here, i.e. at 2dPOG
        // this.historyService.startRecording();
        let oldCrunch: CrunchMode;
        if (
            selectedObjsList.length > 0 &&
            (selectedObjsList[0].ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ ||
                selectedObjsList[0].ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ ||
                selectedObjsList[0].ObjectDerivedType === AppConstantSpace.BASKETOBJ)
        ) {
            for (const selObj of selectedObjsList) {
                this.rePositionOnCrunch(ctx, selObj, val);
                selObj.computePositionsAfterChange(ctx);
                selObj.Fixture.LKCrunchMode = val;
            }
        } else {
            oldCrunch = datasource.LKCrunchMode;
            datasource.LKCrunchMode = val;

            if (datasource.LKCrunchMode === 6) {
                datasource.getAllStandardShelfs()
                    .forEach((item) => {
                        if (datasource._IsSpanAcrossShelf.FlagData) {
                            const mode: CrunchMode = { 1: 9, 2: 8, 4: 6, 6: 6 }[datasource.LKCrunchMode] || item.Fixture.LKCrunchMode;
                            this.rePositionStandardShelfOnCrunch(ctx, item, mode);
                            item.computePositionsAfterChange(ctx);
                        }
                    });
            } else {
                this.updateALLCrunchMode(ctx, datasource.Children, val);
            }
        }

        //2019.3 Performance
        sectionObj.computePositionsAfterChange(ctx);
        sectionObj.clearSkipShelfCalculateDistribution();

        let original = ((obj, val) => {
            return () => {
                datasource.LKCrunchMode = val;
            };
        })(datasource, val);
        let revert = ((obj, val) => {
            return () => {
                datasource.LKCrunchMode = val;
            };
        })(datasource, oldCrunch);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'changeCrunchMode',
        });
        //intersectionUtils.insertPogIDs(null, true);
        // this.historyService.stopRecording();
    }

    // context-model.comp panel-context-menu.comp property-grid.comp
    public getFilteredCrunchOptions<T extends { value: number }>(options: T[], objectDerivedType: string, spreadSpanFlag?: boolean): T[] {
        switch (objectDerivedType) {
            case AppConstantSpace.SECTIONOBJ:
            case AppConstantSpace.STANDARDSHELFOBJ:
                const values = spreadSpanFlag ? [3, 5, 6, 7, 8, 9] : [1, 2, 3, 4, 5, 7];
                return options.filter(it => values.includes(it.value));
            case AppConstantSpace.COFFINCASEOBJ:
            case AppConstantSpace.BASKETOBJ:
                return options.filter(it => [1, 2, 5].includes(it.value));
            default:
                return options;
        }
    }

    // TODO @og type T
    public updateALLCrunchMode(ctx: Context, items: (StandardShelf | Coffincase)[], type: number): void {
        const recurseObjects = (items: (StandardShelf | Coffincase | Position | Divider)[], type: number) => {
            const coffinCaseSupCrunchModes = [CrunchMode.Left, CrunchMode.Right, CrunchMode.NoCrunch];
            for (const fixtureRef of items) {
                if (fixtureRef.ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ) {
                    this.updateStandardshelfCrunch(ctx, fixtureRef, type);
                } else if (fixtureRef.Fixture.FixtureType === AppConstantSpace.MODULAR && fixtureRef.hasOwnProperty('Children')) {
                    recurseObjects(fixtureRef.Children, type);
                } else if ((fixtureRef.ObjectDerivedType === AppConstantSpace.BASKETOBJ || fixtureRef.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ) && coffinCaseSupCrunchModes.includes(type)) {
                    this.updateCoffinCaseCrunch(ctx, fixtureRef, type);
                }
            }
        }
        recurseObjects(items, type);
    }

    private updateCoffinCaseCrunch(ctx: Context, coffinCase: Coffincase, crunchMode: number) {
        const funoriginal = ((coffinCase, newV) => () => this.updateCoffinCaseCrunch(ctx, coffinCase, newV))(coffinCase, crunchMode);
        const funRevert = ((coffinCase, oldV) => () => this.updateCoffinCaseCrunch(ctx, coffinCase, oldV))(coffinCase, coffinCase.Fixture.LKCrunchMode);
        coffinCase.historyService.captureActionExec({
            funoriginal,
            funRevert,
            funName: 'updateCoffinCaseCrunch',
        });
        coffinCase.Fixture.LKCrunchMode = crunchMode;
        this.rePositionOnCrunch(ctx, coffinCase, crunchMode);
        coffinCase.computePositionsAfterChange(ctx);
    }

    private updateStandardshelfCrunch(ctx: Context, shelf: StandardShelf, crunchMode: number) {
        const funoriginal = ((shelf, newV) => () => this.updateStandardshelfCrunch(ctx, shelf, newV))(shelf, crunchMode);
        const funRevert = ((shelf, oldV) => () => this.updateStandardshelfCrunch(ctx, shelf, oldV))(shelf, shelf.Fixture.LKCrunchMode);
        shelf.historyService.captureActionExec({
            funoriginal,
            funRevert,
            funName: 'updateStandardshelfCrunch',
        });

        this.rePositionOnCrunch(ctx, shelf, crunchMode);
        shelf.computePositionsAfterChange(ctx);
        if (crunchMode == CrunchMode.SpreadFacings) {
            // This is the way to call Crunch modes. This ensures proper Rendering. Fix for Spread Facings to Left mode pos overlap issue.
            shelf.Fixture.LKCrunchMode = crunchMode;
            shelf.computePositionsAfterChange(ctx);
        }
    }

    public reArrangeCrunhMode(obj: LookUpOptions): LookUpOptions<CrunchMode> {
        obj.options = obj.options.filter(it => it && it.value > 0 && it.value < 10 && it.text !== '');
        return obj;
    }

    public rePositionOnCrunch(ctx: Context, fixture: StandardShelf | Coffincase, overrideMode?: CrunchMode): { message: string[], revertFlag: boolean; } | undefined {
        const mode = overrideMode || fixture.Fixture.LKCrunchMode;
        if (fixture.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ) {
            this.rePositionStandardShelfOnCrunch(ctx, fixture, mode); // do not return
        } else if (fixture.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ || fixture.ObjectDerivedType == AppConstantSpace.BASKETOBJ) {
            return this.rePositionCoffinCaseOnCrunch(fixture, mode);
        }
    }

    // position-context-menu

    private from(value: number | string): CrunchMode {
        value = Number(value);
        if (value < 0 || value > 9) {
            return CrunchMode.NoCrunch;
        } else {
            return value as CrunchMode;
        }
    }

    /** converts crunch mode to left right or nocrunch */
    private toRNL(mode: CrunchMode): RLNCrunchMode {
        if (mode == CrunchMode.NoCrunch || mode == CrunchMode.Section) {
            return CrunchMode.NoCrunch;
        } else if (mode == CrunchMode.Right || mode == CrunchMode.SpanRight) {
            return CrunchMode.Right;
        } else {
            return CrunchMode.Left;
        }
    }

    public enableFillOption(): { display: 'block' | 'none', cursor?: 'default', color?: string, 'background-color'?: string } | undefined {
        const positionSel = this.planogramService.getSelectedObject(this.sharedService.getActiveSectionId()) as Position[];
        let validPos: boolean = false;
        if (Utils.checkIfPosition(positionSel[0])) {
            const posSelFixture = this.sharedService.getParentObject(positionSel[0], positionSel[0].$sectionID);
            const crunchMode = this.from(posSelFixture.Fixture.LKCrunchMode);
            if (posSelFixture.ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ) {
                let mode = this.toRNL(crunchMode);
                validPos = this.getPositionBasedOnCrunch(positionSel, posSelFixture, mode);
            }
            if (positionSel.length === 1 && validPos) {
                if (posSelFixture.getColor() === "red") {
                    return {
                        display: "block",
                        cursor: "default",
                        'background-color': "#CDCDCD",
                        color: 'black'
                    }
                } else {
                    return {
                        display: "block"
                    }
                }
            }
            return {
                display: "none"
            }
        }
    }

    private getPositionBasedOnCrunch(selectedPosition: Position[], selectedFixture: StandardShelf, crunchmode: RLNCrunchMode): boolean {
        // TODO: @malu add comment on what IDMerchStyle 305
        const positions = selectedFixture.getAllSpreadSpanPositions(true);
           // .filter(item => item.Position?.IDMerchStyle?.toString() !== '305'); //commenting as items with IDMerchStyle above should also be considered
        const sortedPositions = Utils.sortByXPos(positions);
        if (crunchmode === CrunchMode.Right) {
            return sortedPositions[0] === selectedPosition[0];
        } else {
            return sortedPositions[sortedPositions.length - 1] === selectedPosition[0];
        }
    }

    public rePositionStandardShelfOnCrunch(ctx: Context, standardShelf: StandardShelf, cruncMode: CrunchMode): void {
        //undo-redo : Abhishek dt. 13th Aug, 2014
        let offSet;
        const funoriginal = ((newV) => () => this.rePositionStandardShelfOnCrunch(ctx, standardShelf, newV))(cruncMode);
        const funRevert = ((oldV) => () => this.rePositionStandardShelfOnCrunch(ctx, standardShelf, oldV))(standardShelf.Fixture.LKCrunchMode);
        standardShelf.historyService.captureActionExec({
            funoriginal,
            funRevert,
            funName: 'rePositionOnCrunch',
        }, standardShelf.$sectionID);
        /*undo-redo ends here*/
        let oldCrunhMode = cruncMode;
        if (!standardShelf.isSpreadShelf) {
            cruncMode = {
                [CrunchMode.SpreadSpan]: CrunchMode.Spread,
                [CrunchMode.SpanLeft]: CrunchMode.Left,
                [CrunchMode.SpanRight]: CrunchMode.Right
            }[standardShelf.Fixture.LKCrunchMode] || cruncMode;
        }
        let prevPos: Position;
        const positions = standardShelf.Children.filter(Utils.checkIfPosition);
        const positionsLength = positions.length;
        const isFacing = (position: Position) => ![AppConstantSpace.MERCH_ABOVE, AppConstantSpace.MERCH_BEHIND].includes(Number(position.Position.IDMerchStyle)) && !position.baseItem;
        const isNotFacing = (position: Position) => [AppConstantSpace.MERCH_ABOVE, AppConstantSpace.MERCH_BEHIND].includes(Number(position.Position.IDMerchStyle)) && position.baseItem;
        const facings = positions.filter(isFacing);
        const setAboveBehindLoc = (position: Position) => {
            if (position.hasAboveItem || position.hasBackItem) {
                positions
                    .filter(pos => pos.baseItem == position.$id)
                    .forEach((itm) => {
                        itm.setAboveBehindLoc(standardShelf.getChildDimensionDepth());
                    });
            }
        };
        switch (Number(cruncMode)) {
            case CrunchMode.Right: // Right
                standardShelf.spanShelfs = [];
                const totalPosWidth = positions
                    .reduce((totalPosWidth, item) => totalPosWidth + item.linearWidth() + item.getSKUGap(), 0);
                let totalLinearWidth = standardShelf.getChildDimensionWidth();
                if (standardShelf.Fixture.HasDividers && positions.length) {
                    const DividerInfo = standardShelf.getDividerInfo(positions[0]);
                    totalLinearWidth = totalLinearWidth - DividerInfo.SlotStart;
                }
                if (!standardShelf.Fixture.HasDividers || totalLinearWidth > totalPosWidth) {
                    for (let i = positions.length - 1; i >= 0; i--) {
                        const position = positions[i];
                        position.spreadSpanPosNo = 0;
                        if (position.isPosition) {
                            if (isNotFacing(position)) {
                                continue;
                            }
                            if (i == (positions.length - 1) || !prevPos) {
                                standardShelf.setPositionLocationX(position, position.getSKUGap() / 2 + standardShelf.getChildDimensionWidth() - position.linearWidth());
                                prevPos = position;
                            } else {
                                standardShelf.setPositionLocationX(position, prevPos.Location.X - position.linearWidth() - prevPos.getSKUGap());
                                standardShelf.setPositionLocationX(prevPos, prevPos.Location.X - (prevPos.getSKUGap() / 2));
                                prevPos = position;
                            }
                            setAboveBehindLoc(position);
                        }
                    }
                } else {
                    for (let len = 0; len < positions.length; len++) {
                        let position = positions[len];
                        if (isNotFacing(position)) {
                            continue;
                        }
                        const xGap = position.getSKUGap();
                        position.spreadSpanPosNo = 0;
                        if (len == 0 || !prevPos) {
                            standardShelf.setPositionLocationX(position, xGap / 2 + 0);
                            prevPos = position;
                        } else if (len == positionsLength) { // TODO @og @narendra, always returns false
                            standardShelf.setPositionLocationX(position, prevPos.Location.X + prevPos.linearWidth() + xGap / 2);
                            prevPos = position;
                        } else if (prevPos.isPosition) {
                            standardShelf.setPositionLocationX(position, prevPos.Location.X + prevPos.linearWidth() + xGap);
                            standardShelf.setPositionLocationX(prevPos, prevPos.Location.X - prevPos.getSKUGap() / 2);
                            prevPos = position;
                        }
                        setAboveBehindLoc(position);
                    }
                }
                break;
            case CrunchMode.Left: // Left
                standardShelf.spanShelfs = [];
                //standardShelf.spanShelfPositions = [];
                let LocX = 0;
                for (let len = 0; len < positions.length; len++) {
                    let position = positions[len];
                    let xGap = position.getSKUGap();
                    position.spreadSpanPosNo = 0;
                    if (len == 0 || LocX == 0) {
                        if (isNotFacing(position)) {
                            standardShelf.setPositionLocationX(position, standardShelf.sharedService.getObject(position.baseItem, standardShelf.$sectionID).Location.X + xGap / 2);
                        } else {
                            standardShelf.setPositionLocationX(position, xGap / 2 + 0);
                            LocX += position.Location.X + position.linearWidth();
                        }
                        prevPos = position;
                    } else if (len == positionsLength) { // TODO @og @narendra always returns false
                        prevPos = positions[len - 1];
                        if (isNotFacing(position)) {
                            standardShelf.setPositionLocationX(position, standardShelf.sharedService.getObject(position.baseItem, standardShelf.$sectionID).Location.X + xGap / 2,
                            );
                        } else {
                            standardShelf.setPositionLocationX(position, LocX + xGap / 2);
                            LocX += position.linearWidth();
                        }
                    } else if (positions[len - 1].isPosition) {
                        if (isNotFacing(position)) {
                            standardShelf.setPositionLocationX(position, standardShelf.sharedService.getObject(position.baseItem, standardShelf.$sectionID).Location.X + xGap / 2);
                        } else {
                            standardShelf.setPositionLocationX(position, LocX + xGap);
                            LocX += position.linearWidth() + xGap;
                            standardShelf.setPositionLocationX(prevPos, prevPos.Location.X - prevPos.getSKUGap() / 2);
                            prevPos = position;
                        }
                    }
                };
                break;
            case CrunchMode.Center: //Center
                standardShelf.spanShelfs = [];
                for (let i = positionsLength - 1; i >= 0; i--) {
                    let position = positions[i];
                    if (isNotFacing(position)) {
                        continue;
                    }
                    let DividerInfo = standardShelf.getDividerInfo(position);
                    position.spreadSpanPosNo = 0;
                    if (i == positionsLength - 1 || !prevPos) {
                        standardShelf.setPositionLocationX(position, standardShelf.getChildDimensionWidth() - standardShelf.unUsedLinear / 2 - position.linearWidth());
                        prevPos = position;
                    } else if (position.isPosition) {
                        const xGap = prevPos.getSKUGap() / 2;
                        standardShelf.setPositionLocationX(position, prevPos.Location.X - positions[i].linearWidth() - prevPos.getSKUGap() - DividerInfo.SlotSpacing,);
                        standardShelf.setPositionLocationX(prevPos, prevPos.Location.X - xGap - DividerInfo.SlotSpacing);
                        prevPos = position;
                    }
                    setAboveBehindLoc(position);
                }
                break;
            case CrunchMode.Spread: // Spread
                standardShelf.spanShelfs = [];
                offSet = standardShelf.unUsedLinear / (facings.length - 1);
                if (standardShelf.unUsedLinear > 0) {
                    let addIncrements = 0,
                        addOffset = 0;
                    if (standardShelf.Fixture.HasDividers) {
                        if (positions.length > 0) {
                            let DividerInfo = standardShelf.getDividerInfo(positions[0]);
                            let unusedLinear = standardShelf.unUsedLinear - DividerInfo.SlotStart;
                            if (unusedLinear > 0) {
                                offSet = unusedLinear / (facings.length - 1);
                                let noOfPads = offSet % DividerInfo.SlotSpacing;
                                offSet = offSet - noOfPads;
                                if (noOfPads > 0) {
                                    addIncrements = Math.floor((facings.length - 1) / (((facings.length - 1) * noOfPads) / DividerInfo.SlotSpacing));
                                }
                            }
                        }
                    }
                    for (let i = 0; i <= positionsLength - 1; i++) {
                        let position = positions[i];
                        if (isNotFacing(position)) {
                            continue;
                        }
                        let DividerInfo = standardShelf.getDividerInfo(position);
                        if (i == 0 || !prevPos) {
                            standardShelf.setPositionLocationX(position, 0);
                            prevPos = position;
                        } else if (i == positionsLength - 1) {
                            let X = standardShelf.getChildDimensionWidth() - position.linearWidth();
                            if (DividerInfo.SlotStart + Math.ceil((X - DividerInfo.SlotStart) / DividerInfo.SlotSpacing) * DividerInfo.SlotSpacing + position.linearWidth()
                                > standardShelf.getChildDimensionWidth()) {
                                standardShelf.setPositionLocationX(position, X - DividerInfo.SlotSpacing);
                            } else {
                                standardShelf.setPositionLocationX(position, X);
                            }
                            prevPos = position;
                        } else if (position.isPosition) {
                            const xGap = prevPos.getSKUGap() / 2;
                            if (i % addIncrements == 0 && DividerInfo.Type != 0) {
                                addOffset = offSet + DividerInfo.SlotSpacing;
                            } else {
                                addOffset = offSet;
                            }
                            standardShelf.setPositionLocationX(
                                position,
                                prevPos.Location.X +
                                prevPos.linearWidth() +
                                position.getSKUGap() / 2 +
                                xGap +
                                addOffset,
                            );
                            prevPos = position;
                        }
                        setAboveBehindLoc(position);
                    }
                } else if (standardShelf.unUsedLinear <= 0) {
                    if (standardShelf.number != -1 && standardShelf.number != 0) {
                        // IGnore SHlef 0 and 1
                        for (let len = 0; len < positions.length; len++) {
                            let position = positions[len];
                            if (isNotFacing(position)) {
                                continue;
                            }
                            if (len == 0 || !prevPos) {
                                standardShelf.setPositionLocationX(position, 0);
                                prevPos = position;
                            } else {
                                const xGap = prevPos.getSKUGap() / 2;
                                if (positions[len - 1].isPosition) {
                                    standardShelf.setPositionLocationX(
                                        position,
                                        prevPos.Location.X +
                                        prevPos.linearWidth() +
                                        position.getSKUGap() / 2 +
                                        xGap,
                                    );
                                    prevPos = position;
                                }
                            }
                            setAboveBehindLoc(position);
                        }
                    }
                }
                break;
            case CrunchMode.NoCrunch: // NoCrunch
                standardShelf.spanShelfs = [];
                break;
            case CrunchMode.SpreadFacings: // Facings Spread
                standardShelf.spanShelfs = [];
                const facingsCount = facings.reduce((p, n) => n.Position.FacingsX + p, 0);
                let unusedLinear;
                standardShelf.Fixture.UsedLinear = 0;
                standardShelf.Fixture.UsedSquare = 0;
                standardShelf.Fixture.UsedCubic = 0;
                let prevPosGapx = 0;
                positions.forEach(function (item, i) {
                    if (isFacing(item)) {
                        standardShelf.Fixture.UsedLinear +=
                            item.computeWidth() * item.Position.FacingsX +
                            item.getSKUGap() / 2 +
                            prevPosGapx +
                            item.Position.GapX * (item.Position.FacingsX - 1);
                        standardShelf.Fixture.UsedSquare += item.computeWidth() * item.Position.FacingsX * item.linearHeight();
                        standardShelf.Fixture.UsedCubic +=
                            item.computeWidth() * item.Position.FacingsX * item.linearHeight() * item.linearDepth();
                        prevPosGapx = item.getSKUGap() / 2;
                    }
                });
                standardShelf.unUsedLinear = standardShelf.ChildDimension.Width - standardShelf.Fixture.UsedLinear;
                standardShelf.unUsedSquare = standardShelf.ChildDimension.Width * standardShelf.ChildDimension.Height - standardShelf.Fixture.UsedSquare;
                standardShelf.unUsedCubic = standardShelf.ChildDimension.Width * standardShelf.ChildDimension.Height * standardShelf.ChildDimension.Depth - standardShelf.Fixture.UsedCubic;

                offSet = facingsCount - 1 == 0 ? 0 : standardShelf.unUsedLinear / (facingsCount - 1);
                if (standardShelf.unUsedLinear > 0) {
                    let addIncrements = 0,
                        addOffset = 0;
                    if (standardShelf.Fixture.HasDividers) {
                        if (positions.length) {
                            let DividerInfo = standardShelf.getDividerInfo(positions[0]);
                            unusedLinear = standardShelf.unUsedLinear - DividerInfo.SlotStart;
                            if (unusedLinear > 0) {
                                offSet = facingsCount - 1 == 0 ? 0 : unusedLinear / (facingsCount - 1);
                                let noOfPads = offSet % DividerInfo.SlotSpacing;
                                offSet = offSet - noOfPads;
                            }
                            let totalLinear = 0;
                            for (let i = 0; i < positions.length; i++) {
                                let position = positions[i];
                                position.Position.SpreadFacingsFactor = offSet;
                                totalLinear += position.linearWidth();
                            }

                            unusedLinear = standardShelf.ChildDimension.Width - totalLinear - DividerInfo.SlotStart;
                            if (unusedLinear > 0) {
                                offSet = positions.length == 1 ? 0 : unusedLinear / (positions.length - 1);
                                let noOfPads = offSet % DividerInfo.SlotSpacing;
                                offSet = offSet - noOfPads;
                                if (noOfPads > 0) {
                                    addIncrements = Math.ceil((facingsCount - 1) / (((facingsCount - 1) * noOfPads) / DividerInfo.SlotSpacing));
                                }
                            } else {
                                offSet = 0;
                                for (let i = 0; i < positions.length; i++) {
                                    let position = positions[i];
                                    if (Utils.isNullOrEmpty(position)) {
                                        continue;
                                    }
                                    position.Position.SpreadFacingsFactor = offSet;
                                }
                            }
                        }
                    } else {
                        for (const position of positions) {
                            position.Position.SpreadFacingsFactor = offSet + position.Position.GapX;
                        }
                    }
                    for (let i = 0; i < positions.length; i++) {
                        const position = positions[i];
                        if (isNotFacing(position)) {
                            continue;
                        }
                        const DividerInfo = standardShelf.getDividerInfo(position);
                        if (i == 0) {
                            //position.Position.SpreadFacingsFactor = offSet;
                            standardShelf.setPositionLocationX(position, 0);
                            prevPos = position;
                        } else if (position.isPosition) {
                            const xGap = prevPos.getSKUGap() / 2;
                            if (i % addIncrements == 0 && DividerInfo.Type != 0) {
                                addOffset = offSet + DividerInfo.SlotSpacing;
                            } else {
                                addOffset = offSet;
                            }
                            //position.Position.SpreadFacingsFactor = offSet;
                            standardShelf.setPositionLocationX(
                                position,
                                prevPos.Location.X +
                                prevPos.linearWidth() +
                                position.getSKUGap() / 2 +
                                xGap +
                                addOffset,
                            );
                            prevPos = position;
                            //currentFixture.setPositionLocationX(prevPos, prevPos.Location.X - xGap );
                        }
                        setAboveBehindLoc(position);
                    }
                } else if (standardShelf.unUsedLinear <= 0) {
                    if (standardShelf.Fixture.FixtureNumber != -1 && standardShelf.Fixture.FixtureNumber != 0) {
                        // IGnore SHlef 0 and 1
                        let prevPos = 0;
                        for (let len = 0; len < positions.length; len++) {
                            let position = positions[len];
                            if (isNotFacing(position)) {
                                continue;
                            }
                            if (len == 0) {
                                standardShelf.setPositionLocationX(position, 0);
                                prevPos = position.Location.X + position.linearWidth() + position.getSKUGap() / 2;
                            } else {
                                if (position.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                                    position.Position.SpreadFacingsFactor = position.Position.GapX;
                                    standardShelf.calculatePositionDistribution(ctx, position);
                                    standardShelf.setPositionLocationX(position, prevPos + position.getSKUGap() / 2);
                                    prevPos = position.Location.X + position.linearWidth() + position.getSKUGap() / 2;
                                }
                            }
                            setAboveBehindLoc(position);
                        }
                    }

                }
                standardShelf.Fixture.UsedLinear = 0;
                const minData = [];
                const maxData = [];
                const minPosDepth = [];
                for (let i = 0; i < positions.length; i++) {
                    let item = positions[i];
                    if (isNotFacing(item)) {
                        continue;
                    }
                    let skuXGap = item.getSKUGap();
                    if (i == 0 || i == positions.length - 1) {
                        skuXGap = skuXGap / 2;
                    }
                    let usedWidth = item.linearWidth() + skuXGap;
                    let usedHeight = item.linearHeight();
                    let usedDepth = item.linearDepth();
                    if (item.hasAboveItem || item.hasBackItem) {
                        const aboveBehindMerchStylePos = positions.filter(pos => pos.baseItem == item.$id).concat([item]);
                        let minLocX = Math.min(...aboveBehindMerchStylePos.map(it => it.Location.X)),
                            maxLocX = Math.max(0, ...aboveBehindMerchStylePos.map(it => it.Location.X + usedWidth)),
                            minLocY = Math.min(...aboveBehindMerchStylePos.map(it => it.Location.Y)),
                            maxLocY = Math.max(0, ...aboveBehindMerchStylePos.map(it => it.Location.Y + usedHeight)),
                            minLocZ = Math.min(...aboveBehindMerchStylePos.map(it => it.Location.Z)),
                            maxLocZ = Math.max(0, ...aboveBehindMerchStylePos.map(it => it.Location.Z + usedDepth));
                        usedWidth = maxLocX - minLocX + skuXGap;
                        usedHeight = maxLocY - minLocY;
                        usedDepth = maxLocZ - minLocZ;
                    }
                    standardShelf.Fixture.UsedLinear += usedWidth;
                    standardShelf.Fixture.UsedSquare += usedWidth * usedHeight;
                    standardShelf.Fixture.UsedCubic += usedWidth * usedHeight * usedDepth;
                    minData.push(item.computeHeight());
                    maxData.push(item.linearHeight());
                    minPosDepth.push(item.computeDepth());

                }
                standardShelf.minMerchDepth = Math.max.apply(Math, minPosDepth);
                standardShelf.unUsedLinear = standardShelf.getChildDimensionWidth() - standardShelf.Fixture.UsedLinear;
                standardShelf.unUsedSquare =
                    standardShelf.getChildDimensionWidth() * Math.max(0, standardShelf.Dimension.Height - standardShelf.Fixture.Thickness) -
                    standardShelf.Fixture.UsedSquare;
                standardShelf.unUsedCubic =
                    standardShelf.getChildDimensionWidth() *
                    standardShelf.getChildDimensionDepth() *
                    Math.max(0, standardShelf.Dimension.Height - standardShelf.Fixture.Thickness) -
                    standardShelf.Fixture.UsedCubic;

                standardShelf.Fixture.AvailableLinear = Utils.preciseRound(standardShelf.unUsedLinear, 2);

                standardShelf.Fixture.UsedLinear = Utils.preciseRound(standardShelf.Fixture.UsedLinear, 2);
                standardShelf.Fixture.AvailableSquare = Utils.preciseRound(standardShelf.unUsedSquare, 2);
                standardShelf.Fixture.UsedSquare = Utils.preciseRound(standardShelf.Fixture.UsedSquare, 2);
                standardShelf.Fixture.AvailableCubic = Utils.preciseRound(standardShelf.unUsedCubic, 2);
                standardShelf.Fixture.UsedCubic = Utils.preciseRound(standardShelf.Fixture.UsedCubic, 2);
                break;
        }

        standardShelf.Fixture.LKCrunchMode = Number(cruncMode);

        if (!standardShelf.isSpreadShelf) {
            standardShelf.Fixture.LKCrunchMode = oldCrunhMode;
        }
        standardShelf.Fixture.LKCrunchModetext = standardShelf.planogramStore.lookUpHolder.CrunchMode.options
            .find(it => it.value == Number(standardShelf.Fixture.LKCrunchMode))?.text;
    }

    fixStartPointLeftCrunch(coffincase: Coffincase, rect: CrunchRect, x: number, y: number): number {
        let moveByWidth = 0;
        if (x != null) {
            moveByWidth = x == 0 ? rect.setLx(rect, x, 2) : rect.setLx(rect, x);
        }
        if (y != null) {
            rect.setBy(rect, y);
        }
        return moveByWidth;
    }

    private fixStartPointRightCrunch(coffincase: Coffincase, rect: PositionRect, x: number, y: number): number {
        let moveByWidth = 0;
        if (x != null) {
            let x2 = x - (coffincase.doNotCalWH ? rect.ref.Dimension.Width : rect.ref.linearWidth());
            if (x == coffincase.ChildDimension.Width) {
                let x3 = x2 - rect.ref.getSKUGap() / 2;
                moveByWidth = rect.setLx(rect, x3, 2);
            } else {
                let x4 = x2 - rect.ref.getSKUGap();
                moveByWidth = rect.setLx(rect, x4);
            }
        }

        if (y != null) {
            rect.setBy(rect, y);
        }
        return -moveByWidth; // Returning negative moveByWidth as the items have to be shifted left.
    }

    private calcXLeftCrunch(coffinCase: Coffincase, placedArray: CrunchRect[], selPos: CrunchRect): number {
        let newX = 0;
        const selPosLxToConsider = selPos.ref.justmod ? selPos.lx : coffinCase.ChildDimension.Width; // Additional logic to handle case where items facing is increased. Facing increase should not be considered overlap.
        for (const pl of placedArray) {
            // Find max(x) such that the top-y of items placed before is greater than current-y
            // and right-x of items already placed is less than currentX.
            if (pl.ty > selPos.by && pl.by < selPos.ty) {
                if (pl.rx <= selPosLxToConsider || (!coffinCase.section.fitCheck && !selPos.ref.justmod)) {
                    // Note : Not able to find exact issue to add this code block so for now keeping it as commented code.
                    // //Fix for when increasing fronts high of items location X was changing
                    // if (typeof selPos.ref.justmod == 'undefined' && selPosLxToConsider == coffinCase.ChildDimension.Width) {
                    //     newX = pl.rx;
                    // } else {
                    //     newX = pl.rx > newX ? pl.rx : newX;
                    // }
                    newX = pl.rx > newX ? pl.rx : newX;
                }
            }
        }
        return newX;
    }

    private calcXRightCrunch(coffinCase: Coffincase, placedArray: CrunchRect[], selPos: CrunchRect): number {
        let newX = coffinCase.ChildDimension.Width;
        if (coffinCase.Fixture.HasDividers && selPos.ref.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
            newX = coffinCase.getNearestDividerRight(selPos.ref)?.Location.X ?? newX;
        }
        const selPosRxToConsider = selPos.ref.justmod ? selPos.rx : 0; // Additional logic to handle case where items facing is increased. Facing increase should not be considered overlap.
        for (const pl of placedArray) {
            // Find min(x) such that the top-y of items placed before is greater than current-y
            // and right-x of items already placed is less than currentX.
            if (pl.ty > selPos.by && pl.by < selPos.ty) {
                if (pl.lx >= selPosRxToConsider || (!coffinCase.section.fitCheck && !selPos.ref.justmod)) {
                    newX = pl.lx < newX ? pl.lx : newX;
                }
            }
        }
        //Fix for when increasing fronts high of items location X was changing
        if (newX == 0 && selPos.name != 'Divider') {
            newX = selPos.rx;
        }
        return newX;
    }

    private calcXNoCrunch(coffinCase: Coffincase, placedArray: CrunchRect[], selPos: CrunchRect): number {
        for (const pl of placedArray) {
            const maxX = Math.max(selPos.rx, pl.rx);
            const minX = Math.min(selPos.lx, pl.lx);
            const maxY = Math.max(selPos.ty, pl.ty);
            const minY = Math.min(selPos.by, pl.by);
            let selPosWidth: number, selPosHeight: number, placedPosWidth: number, placedPosHeight: number;

            if (selPos.ref.ObjectDerivedType == 'Divider') {
                selPosWidth = selPos.ref.Fixture.Width;
                selPosHeight = selPos.ref.Fixture.Height;
            } else {
                selPosWidth = selPos.ref.linearWidth();
                selPosHeight = selPos.ref.linearHeight();
            }

            if (pl.ref.ObjectDerivedType == 'Divider') {
                placedPosWidth = pl.ref.Fixture.Width;
                placedPosHeight = pl.ref.Fixture.Height;
            } else {
                placedPosWidth = pl.ref.linearWidth();
                placedPosHeight = pl.ref.linearHeight();
            }

            if (
                maxX - minX + 0.001 < selPosWidth + placedPosWidth &&
                maxY - minY + 0.001 < selPosHeight + placedPosHeight
            ) {
                throw {
                    message: [
                        `Overlap detected: ${selPos.ref.Position.Product.Name} overlaps with ${pl.ref.Position.Product.Name}`,
                    ],
                    revertFlag: true,
                };
            }
        }
        //check if selPos intersects divider boundary
        const flag = this.isCurrentPosOverlapsDivider(coffinCase, selPos);
        if (flag) {
            throw { message: [coffinCase.translate.instant('DIVIDER_OVERLAP_DETECTED')], revertFlag: true };
        }

        return selPos.lx;
    }

    public rePositionCoffinCaseOnCrunch(coffinCase: Coffincase, crunchMode: CrunchMode, passCode?: string, rects?: CrunchRect[]): { err?: string; message: string[]; revertFlag: boolean } | undefined {
        if (coffinCase.dragFlag || coffinCase.section.skipRePositionCoffinCaseOnCrunch) {
            return;
        }
        //*** Crunch mode calc driver starts here.
        const result = (() => {
            switch (crunchMode) {
                case CrunchMode.Left:
                    return {
                        fixStartPoint: this.fixStartPointLeftCrunch.bind(this),
                        calcX: this.calcXLeftCrunch.bind(this),
                        sorter: this.sortByXYPosNewEnd, // Need all items in the same vertical axis together.
                        moveOverlapBeyondSelected: true,
                    };
                case CrunchMode.Right:
                    return {
                        fixStartPoint: this.fixStartPointRightCrunch.bind(this),
                        calcX: this.calcXRightCrunch.bind(this),
                        sorter: this.sortByXDescYPosNewEnd, // Need all items in the same vertical axis together starting from right end. .
                        moveOverlapBeyondSelected: true,
                    };
                case CrunchMode.NoCrunch:
                    return {
                        fixStartPoint: this.fixStartPointLeftCrunch, // Even in case of No crunch lx is referenced. Hence reuse left cruch related method.
                        calcX: this.calcXNoCrunch.bind(this),
                        sorter: this.sortByYXPosNewEnd,
                        moveOverlapBeyondSelected: false,
                    } // Go in increasing order of Y.
                // let moveOverlapBeyondSelected = () => { }; // No need to move beyond in case of No Crunch.
                default:
                    return null;
            }
        })();

        if (!result) {
            return;
        }

        const { fixStartPoint, calcX, sorter, moveOverlapBeyondSelected } = result;

        let responseObj = { message: ['Complete'], revertFlag: false }; // The object to return in case of success.
        const minmax = { lx: 0, rx: 0, ty: 0 };

        if (!rects) {
            rects = this.getRects(coffinCase, crunchMode, minmax);
        }
        rects = sorter(rects);
        coffinCase.placed = [];
        let calcYPending = [];
        let selPos: CrunchRect;
        let newX: number;
        let newY: number;
        try {
            //Don't overwrite the Y pos if crunch is noCrunch and fitCheckis off
            const skipSetY =
                crunchMode == CrunchMode.NoCrunch &&
                !(coffinCase.sharedService.getObject(coffinCase.$sectionID, coffinCase.$sectionID) as Section).fitCheck;

            // need to move all dividers to placed ahead on time so positions can be tested against all dividers
            //placed = rects.filter(function (e) { return (e.name == 'Divider') });
            //rects = rects.filter(function (e) { return (e.name != 'Divider') });
            while (rects.length > 0) {
                selPos = rects.shift(); // Obtain the first element of the array.
                newX = calcX(coffinCase, coffinCase.placed, selPos);
                /**
         if divider present
         check selPos location X falls in between which divider intervals
         set x , divider location x + divider thickness
         postion location x + width, should not cross divider or the boundary of coffincase

         */     //Need to check if this check is with Object derived type
                if (selPos.name != 'Divider') {
                    const moveWidth = fixStartPoint(coffinCase, selPos, newX, null);
                    // Check overlap and move.
                    if (moveOverlapBeyondSelected) {
                        this.moveOverlapBeyondSelectedCrunchMode(coffinCase.placed, selPos, newX, moveWidth, crunchMode);
                    }
                }

                if (selPos.ref.justmod) {
                    calcYPending.push(selPos);
                } else {
                    if (!skipSetY) {
                        newY = this.calcY(coffinCase.placed, selPos, rects);
                        fixStartPoint(coffinCase, selPos, null, newY);
                    }
                    if (passCode) {
                        // There can be cases where the items y reduces in the 2nd pass and then we are left with blank space to the adjacent item.
                        let xagain = calcX(coffinCase, coffinCase.placed, selPos);
                        if (xagain != newX) {
                            fixStartPoint(coffinCase, selPos, xagain, null);
                        }
                    }
                }
                coffinCase.placed.push(selPos);
            }

            // For the items added as part of multidrag Y postion has not been calculated yet. Do it now.
            for (const calcY of calcYPending) {
                selPos = calcY;
                if (!skipSetY) {
                    newY = this.calcY(coffinCase.placed, selPos);
                    fixStartPoint(coffinCase, selPos, null, newY);
                }
                delete selPos.ref.justmod; // Remove the just added flag..
            }
        } catch (e) {
            // In case of No crunch if an overlap is detected we need to revert.

            if (coffinCase.section.fitCheck) {
                responseObj = e;
            }
            coffinCase.placed.push(selPos);
            coffinCase.placed = coffinCase.placed.concat(rects);
        }

        if (passCode) {
            return;
        }

        // Handle item shrink
        // if (minmax.lx < 0 || minmax.rx > coffinCase.ChildDimension.Width /*|| minmax.ty > me.ChildDimension.Height*/) {
        //     coffinCase.shrinkMode = true;
        //     this.rePositionCoffinCaseOnCrunch(coffinCase, crunchMode, 'shrinkitem', coffinCase.placed);
        // }

        if (calcYPending.length > 0 && crunchMode != CrunchMode.NoCrunch) {
            // No crunch mode won't result in movements that need a second pass. Hence leave them as is.
            this.rePositionCoffinCaseOnCrunch(coffinCase, crunchMode, '2ndPass', coffinCase.placed);
        }

        //coffinCase.shrinkMode = false;

        //check fitcheck for item cross dividers boundary in x axis
        for (const atPosition of coffinCase.placed) {

            if (atPosition?.ref.ObjectType != 'Position') {
                continue;
            }

            const flag = this.isCurrentPosOverlapsDivider(coffinCase, atPosition);
            if (flag) {
                return {
                    message: [
                        `${coffinCase.translate.instant('FIT_CHECK_ERROR')} : ${coffinCase.translate.instant(
                            'DIVIDER_OVERLAP_DETECTED',
                        )}`,
                    ],
                    err: 'FC',
                    revertFlag: true,
                };
            }
        }

        if (coffinCase.section.fitCheck &&
            (minmax.lx < 0 || minmax.rx > coffinCase.ChildDimension.Width || minmax.ty > coffinCase.ChildDimension.Depth)) {
            return {
                message: [
                    `${coffinCase.translate.instant('FIT_CHECK_ERROR')} : ${coffinCase.translate.instant(
                        'ITEMS_CROSS_COFFINCASE_BOUNDARY',
                    )}`,
                ],
                err: 'FC',
                revertFlag: true,
            };
        }

        for (const atPosition of coffinCase.placed as PositionRect[]) {
            // Account for sku width.
            if (atPosition) {
                const oldLocationX = atPosition.ref.Location.X;
                const oldLocationY = atPosition.ref.Location.Y;
                if (atPosition.ref.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
                    newX = atPosition.lx == 0 || crunchMode == CrunchMode.NoCrunch ? atPosition.lx : atPosition.lx + atPosition.ref.getSKUGap() / 2;
                } else {
                    newX = atPosition.lx;
                }
                newY = atPosition.by;

                coffinCase.setPositionLocationX(atPosition.ref as Position, newX);
                coffinCase.setPositionLocationY(atPosition.ref as Position, newY);

                const original = ((position, newLocationX, newLocationY) => {
                    return () => {
                        coffinCase.setPositionLocationX(position, newLocationX);
                        coffinCase.setPositionLocationY(position, newLocationY);
                    };
                })(atPosition.ref, atPosition.ref.Location.X, atPosition.ref.Location.Y);
                const revert = ((position, oldLocationX, oldLocationY) => {
                    return () => {
                        coffinCase.setPositionLocationX(position, oldLocationX);
                        coffinCase.setPositionLocationY(position, oldLocationY);
                    };
                })(atPosition.ref, oldLocationX, oldLocationY);
                coffinCase.historyService.captureActionExec({
                    funoriginal: original,
                    funRevert: revert,
                    funName: 'LocationChanges',
                }, coffinCase.$sectionID);
            }
        }
        return responseObj;
    }

    public isCurrentPosOverlapsDivider(coffinCase: Coffincase, selPos: CrunchRect): boolean {
        if (selPos?.name != 'Divider') {
            const dividerInfo = JSON.parse(coffinCase.Fixture.SeparatorsData);
            if (dividerInfo) {
                const dividerItemData = coffinCase.Children.find(it => it.ObjectDerivedType === AppConstantSpace.DIVIDERS) as Divider | undefined;
                for (const divInfo of dividerInfo.vertical) {
                    //positions location left x should not be less than divider location x and right x greater than divider location x, revert the placement
                    //positions location x should not overlap divider, revert the placement
                    if ((selPos.lx < divInfo.x && selPos.rx > divInfo.x) ||
                        (selPos.lx > divInfo.x && selPos.lx < divInfo.x + dividerItemData.Fixture.Thickness)) {
                        return true;
                    }
                }
                for (const divInfo of dividerInfo.horizontal) {
                    if (selPos.by < divInfo.y && selPos.ty > divInfo.y) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private sortByXYPosNewEnd(objarray: CrunchRect[]): CrunchRect[] {
        return objarray.sort(function (a, b) {
            if (a.ref.justmod == b.ref.justmod) {
                if (a.lx === b.lx) {
                    if (a.by === b.by) {
                        //new placed items come before exising (2nd round)
                        return a.inserted - b.inserted;
                    } else {
                        return a.by - b.by;
                    }
                } else {
                    return a.lx - b.lx; // Ascending order of x - left end.
                }
            } else {
                return a.ref.justmod ? 1 : -1;
            }
        });
    };

    private sortByXDescYPosNewEnd(objarray: CrunchRect[]): CrunchRect[] {
        return objarray.sort(function (a, b) {
            if (a.ref.justmod == b.ref.justmod) {
                if (a.rx === b.rx) {
                    return a.by - b.by; // Ascending order of Y.
                } else {
                    return b.rx - a.rx; // Descending order of X - however right end;
                }
            } else {
                return a.ref.justmod ? 1 : -1;
            }
        });
    };

    private sortByYXPosNewEnd(objarray: CrunchRect[]): CrunchRect[] {
        return objarray.sort(function (a, b) {
            if (a.ref.justmod == b.ref.justmod) {
                if (a.by === b.by) {
                    return a.lx - b.lx; // Ascending order of Y.
                } else {
                    return a.by - b.by; // Descending order of X - however right end;
                }
            } else {
                return a.ref.justmod ? 1 : -1;
            }
        });
    }


    private moveOverlapBeyondSelectedCrunchMode(placedArray: CrunchRect[], selPos: CrunchRect, newX: number, moveByWidth: number, crunchMode: number): void {
        let byToShift = selPos.by;
        let tyToShift = selPos.ty;
        let incrementalWidth = 0; // Used to hold the incremental movement that needs to happen in case of full overlap. That is selected item starts after any given item but ends before the given item.
        for (const alreadyPlaced of placedArray) {

            if (alreadyPlaced && ((crunchMode == CrunchMode.Left && newX > alreadyPlaced.lx && newX < alreadyPlaced.rx) ||
                (crunchMode == CrunchMode.Right && (alreadyPlaced.rx <= newX || alreadyPlaced.lx < newX))) &&
                alreadyPlaced.ty > byToShift && alreadyPlaced.by < tyToShift
            ) {
                // Indicates overlap.
                if (crunchMode == CrunchMode.Left && alreadyPlaced.lx < newX) {
                    const newIncrementalWidth = newX - alreadyPlaced.lx;
                    incrementalWidth = Math.max(newIncrementalWidth, incrementalWidth);
                }

                if (crunchMode == CrunchMode.Right && alreadyPlaced.rx > newX) {
                    var newIncrementalWidth = newX - alreadyPlaced.rx; // Negative number.
                    incrementalWidth = Math.min(newIncrementalWidth, incrementalWidth);
                }

                alreadyPlaced.setLx(alreadyPlaced, alreadyPlaced.lx + moveByWidth + incrementalWidth); // No gap divisor passed as items being shifted won't have calculated-lx as 0.
                byToShift = alreadyPlaced.by < byToShift ? alreadyPlaced.by : byToShift; //All items between min and max rectangle need to move as a result of shift.
                tyToShift = alreadyPlaced.ty > tyToShift ? alreadyPlaced.ty : tyToShift;
            }
        }
    }

    private calcY(placedArray: CrunchRect[], selPos: CrunchRect, yetToPlace?: CrunchRect[]): number | undefined {
        let newY = 0;
        for (const pl of placedArray) {
            // Only consider items that are below this item. Hence check if the left-x is between the left and right x of the selected item.
            if (!pl.ref.justmod && selPos.lx < pl.rx && selPos.rx > pl.lx) {
                if (pl.ty <= selPos.by) {
                    newY = pl.ty > newY ? pl.ty : newY;
                }
            }
        }
        if (yetToPlace) {
            // Since we sort in X,Y order, any item that was in a fixed position that does not need to shift should participate in Y calculation.
            for (const ytPl of yetToPlace) {
                // Only consider items that are below this item. Hence check if the left-x is between the left and right x of the selected item.
                if (!ytPl.ref.justmod && selPos.lx < ytPl.rx && selPos.rx > ytPl.lx) {
                    if (ytPl.ty <= selPos.by) {
                        newY = ytPl.ty > newY ? ytPl.ty : newY;
                    }
                }
            }
        }
        return newY;
    }

    public checkPositionsOverlapsDivider(coffinCase: Coffincase): InterSectionMessage {
        const rects = this.getRects(coffinCase, coffinCase.Fixture.LKCrunchMode, { lx: 0, rx: 0, ty: 0 });
        const interSectionMessage: InterSectionMessage = { message: [], revertFlag: false };
        for (const rect of rects) {
            const flag = this.isCurrentPosOverlapsDivider(coffinCase, rect);
            if (flag) {
                interSectionMessage.message = [`${coffinCase.translate.instant('DIVIDER_OVERLAP_DETECTED')}`];
                interSectionMessage.revertFlag = true;
                break;
            }
        }
        return interSectionMessage;
    }

    public getRects(coffinCase: Coffincase, crunchMode: CrunchMode, minmax: { lx: number, rx: number, ty: number }): CrunchRect[] {
        const decimal2 = (value: number) => Math.round(value * 100) / 100;
        const children = coffinCase.ObjectDerivedType === AppConstantSpace.BASKETOBJ ? coffinCase.Children.filter(x => x.ObjectDerivedType !== AppConstantSpace.DIVIDERS) : coffinCase.Children;
        return children.map(child => {
            const base = {
                ref: child,
                name: child.Position ? child.Position.Product.Name : child.ObjectDerivedType,
                lx: decimal2(child.Location.X),
                by: decimal2(child.Location.Y),
            }
            if (child.ObjectDerivedType == 'Position') {
                return {
                    ...base,
                    rx: decimal2(base.lx + coffinCase.getPosWidthForRect(child, coffinCase.doNotCalWH)),
                    ty: decimal2(base.by + (coffinCase.doNotCalWH ? child.Dimension.Height : child.linearHeight())),
                    inserted: crunchMode == CrunchMode.Left && child.justmod ? -1 : 0,
                    setLx: (rect, newX, gapDivisor) => {
                        if (newX >= 0 || crunchMode == CrunchMode.Right) {
                            rect.lx = decimal2(newX);
                        }
                        // Gap divisor is passed if x =0 in left crunch or item is at the right end in right crunch.
                        let gap = gapDivisor ? rect.ref.getSKUGap() / gapDivisor : rect.ref.getSKUGap();
                        let virtualWidth = (coffinCase.doNotCalWH ? rect.ref.Dimension.Width : rect.ref.linearWidth()) + gap;
                        rect.rx = decimal2(rect.lx + virtualWidth);

                        // Calculate Minimum Lx and Maximum of Rx to aid fit check
                        minmax.lx = Math.min(rect.lx, minmax.lx);
                        minmax.rx = Math.max(rect.rx, minmax.rx);

                        //set maximum of rx in divider interval

                        return virtualWidth;
                    },
                    setBy: (rect, newY) => {
                        rect.by = newY;
                        const virtualHeight = (coffinCase.doNotCalWH ? rect.ref.Dimension.Height : rect.ref.linearHeight());
                        rect.ty = decimal2(rect.by + virtualHeight);

                        // Calculate maximum ty to aid fit check
                        minmax.ty = Math.max(rect.ty, minmax.ty);
                    },
                };
            } else {
                return {
                    ...base,
                    rx: decimal2(base.lx + (base.by ? coffinCase.ChildDimension.Width : child.Fixture.Thickness)),
                    ty: decimal2(base.by + (base.lx ? coffinCase.ChildDimension.Depth : child.Fixture.Thickness)),
                    inserted: 0,
                    setLx: (newX, gapDivisor) => { },
                    setBy: (newY) => { },
                };
            }
        })
            .filter(it => it);
    }

    public regenerateDividers(coffinCase: Coffincase): void {
        const separatorsData = JSON.parse(coffinCase.Fixture.SeparatorsData);
        const dividerItemData = filter(coffinCase.Children, { ObjectDerivedType: AppConstantSpace.DIVIDERS })[0];

        let separatorThickness: number = undefined;
        let type: string = undefined;
        let fixedUprightX: number = undefined;
        let fixedUprightY: number = undefined;
        let separatorDir: number = 0;
        const uprightsPositionsArrX: number[] = [];
        const uprightsPositionsArrY: number[] = [];

        if (separatorsData && dividerItemData) {
            separatorThickness = dividerItemData.Fixture.Thickness;
            separatorDir = coffinCase.Fixture.LKDividerType;
            type = separatorsData.type;
            if (type == 'fixed') {
                if (separatorsData.vertical.length > 0) {
                    fixedUprightX = separatorsData.vertical[0].x;
                }
                if (separatorsData.horizontal.length > 0) {
                    fixedUprightY = separatorsData.horizontal[0].y;
                }
            }
            if (type == 'variable') {
                separatorsData.vertical.forEach((element, index) => {
                    const xcord = index > 0 ? element.x - separatorThickness : element.x;
                    uprightsPositionsArrX.push(xcord);
                });

                separatorsData.horizontal.forEach((element, index) => {
                    const ycord = index > 0 ? element.y - separatorThickness : element.y;
                    uprightsPositionsArrY.push(ycord);
                });
            }

            const newSeparatorsData = this.dividersCurdService.createCoffincaseDivider({
                coffincaseObj: coffinCase,
                separatorThickness,
                type,
                fixedUprightX,
                fixedUprightY,
                separatorDir,
                uprightsPositionsArrX,
                uprightsPositionsArrY
            });
            if (!newSeparatorsData) return;
            const dividerData: DividerResponse = <DividerResponse>{
                HasDividers: coffinCase.Fixture.HasDividers,
                selectedDividerPlacement: separatorDir,
                Fixture: {
                    Thickness: separatorThickness,
                    PartNumber: dividerItemData.Fixture.PartNumber,
                    _DividerSlotStart: {
                        ValData: null
                    },
                    _DividerSlotSpacing: {
                        ValData: null
                    }
                }
            }
            this.dividersCurdService.applySeparators(coffinCase, dividerData, newSeparatorsData);
        }
    }
}

export enum CrunchMode {
    Section = 0,
    Right = 1,
    Left = 2,
    Center = 3,
    Spread = 4,
    NoCrunch = 5,
    SpreadSpan = 6,
    SpreadFacings = 7,
    SpanLeft = 8,
    SpanRight = 9,
}

type RLNCrunchMode = CrunchMode.Right | CrunchMode.Left | CrunchMode.NoCrunch;

export interface Rect {
    lx: number;
    by: number;
    rx?: number;
    ty?: number;
}

export interface CrunchRect extends Rect {
    ref: Position | Divider;
    name: string;
    inserted: number;
    setLx: (rect, newX, gapDivider?) => number;
    setBy: (rect, newY) => void;
}

export interface PositionRect extends CrunchRect {
    ref: Position;
}
