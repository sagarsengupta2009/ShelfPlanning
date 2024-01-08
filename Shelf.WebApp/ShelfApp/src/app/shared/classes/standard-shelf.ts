import { TranslateService } from '@ngx-translate/core';
import { ElementRef } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConstantSpace } from '../constants/appConstantSpace';
import { FixtureList, PositionParentList } from '../services/common/shared/shared.service';
import {
    CollisionService,
    CrunchMode,
    CrunchModeService,
    DragDropUtilsService,
    MoveFixtureService,
    NotifyService,
} from 'src/app/shared/services';

import { Utils } from '../constants/utils';
import { indexOf, find, cloneDeep, isUndefined } from 'lodash-es';
import { DividerTypes, GrillPlacementTypes } from '../constants/fixtureCrunchModes';
import { Fixture, Divider, Grill, Modular, Orientation, Position, Section, ShoppingCart, PegBoard, Block } from '.';
import {
    SharedService,
    PlanogramService,
    PlanogramStoreService,
    HistoryService,
    PlanogramCommonService,
    ParentApplicationService,Render2dService
} from '../services';
import {
    DropCoord,
    FromPropertyGrid,
    IApiResponse,
    IntersectingShelfInfo,
    Location,
    RefreshParams,
    Size3,
    SpreadSpanProperties,
    StandardShelfFixtureResponse,
    StandardshelfResponse,
    ValData,
    DividerInfo,
    GrillInfo,
    GrillEdgeInfo,
    StyleStandard,
    ProductPackageResponse,
    UnitPackageItemInfos
} from 'src/app/shared/models';
import { Context } from './context';
import { AllocateUtilitiesService } from '../services/layouts/allocate/utilities/allocate-utilities.service';
import { Offset } from '../models/planogram/pog-object';
import { OrientationDimensions } from './orientation';

declare const window: any;

export class StandardShelf extends Fixture {
    ObjectDerivedType: 'StandardShelf';
    public _elementRef: ElementRef;
    public isMerchandisable: boolean = true;
    public AutoComputeFronts: boolean = true;
    public usedLinear: number = 0;
    public unUsedLinear: number = 0;
    public usedSquare: number = 0;
    public unUsedSquare: number = 0;
    public usedCubic: number = 0;
    public unUsedCubic: number = 0;
    public allowOverflow: boolean = true;
    public enableBayProperty: boolean = false;
    public minMerchHeight: number = 0;
    public maxItemHeight: number = 0;
    public isSpreadShelf: boolean = false;
    public spanShelfs: string[] = [];
    public spreadSpanProperties: SpreadSpanProperties = new SpreadSpanProperties();
    public minMerchDepth: number = 0;
    public OrientNS: Orientation = new Orientation();
    public canUseShrinkVal: boolean;
    config;
    number: number;
    public Children: Array<Position | Grill | Divider | Block> = [];
    public Fixture: StandardShelfFixtureResponse = {} as StandardShelfFixtureResponse;
    public uiProperties: string[] = ['number', 'config', 'canUseShrinkVal', 'OrientNS', 'minMerchDepth', 'spreadSpanProperties',
  'spanShelfs', 'isSpreadShelf', 'maxItemHeight', 'minMerchHeight', 'enableBayProperty', 'allowOverflow', 'unUsedCubic',
  'unUsedSquare', 'unUsedLinear', '_elementRef'];
    constructor(
        public data: StandardshelfResponse,
        public notifyService: NotifyService,
        public translate: TranslateService,
        public sharedService: SharedService,
        public planogramService: PlanogramService,
        public planogramCommonService: PlanogramCommonService,
        public historyService: HistoryService,
        public dragDropUtilsService: DragDropUtilsService,
        public planogramStore: PlanogramStoreService,
        public collision: CollisionService,
        public crunchMode: CrunchModeService,
        public parentApp: ParentApplicationService,
        public moveFixtureService: MoveFixtureService,
        private readonly render2d: Render2dService,
        public readonly allocateUtils: AllocateUtilitiesService
    ) {
        super(
            data,
            notifyService,
            translate,
            sharedService,
            planogramService,
            historyService,
            planogramStore,
            collision,
        );
        this.dragDropSettings.drop = true;
    }

    public getType() {
        return AppConstantSpace.STANDARDSHELFOBJ as string;
    }

    public fixtureCrunchSpreadFacings(ctx: Context) {
        this.Fixture.LKCrunchMode = CrunchMode.SpreadFacings;
        this.crunchMode.rePositionStandardShelfOnCrunch(ctx, this, this.Fixture.LKCrunchMode);
    }

    public fixtureFlip(ctx: Context): void {
        //feature undo-redo: by Abhishek
        const original = ((that) => {
            return () => {
                that.fixtureFlip(ctx);
            };
        })(this);
        const revert = ((that) => {
            return () => {
                that.fixtureFlip(ctx);
            };
        })(this);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'fixtureFlip',
        });
        /*undo-redo ends here*/
        if (this.hasOwnProperty('Children')) {
            if (this.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ) {
                this.Children.reverse();
                //Change the crunch mode to left to right , spread left to spread right

                this.Fixture.LKCrunchMode = {
                    [CrunchMode.Left]: CrunchMode.Right,
                    [CrunchMode.Right]: CrunchMode.Left,
                    [CrunchMode.SpanLeft]: CrunchMode.SpanRight,
                    [CrunchMode.SpanRight]: CrunchMode.SpanLeft,
                }[this.Fixture.LKCrunchMode] || this.Fixture.LKCrunchMode;
                //snap left to snap right and vice versa
                const tempSnapLeft = this.Fixture.SnapToLeft;
                this.Fixture.SnapToLeft = this.Fixture.SnapToRight;
                this.Fixture.SnapToRight = tempSnapLeft;
                if (this.Fixture.LKCrunchMode == CrunchMode.NoCrunch) {
                    this.Children.forEach((position: Position, key) => {
                        if (this.Children[key].asPosition()) {
                            this.setPositionLocationX(
                                position,
                                this.Dimension.Width - position.Location.X - position.linearWidth(),
                            );
                        }
                    });
                }
            }
            //set location X of the shelf from left

            this.crunchMode.rePositionOnCrunch(ctx, this);
        }
    }

    public addCopiedPositions(ctx, copiedItemsToInsert: Position[], index: number): void {
        Array.prototype.splice.apply(this.Children, [index, 0].concat(copiedItemsToInsert as any));
        this.computePositionsAfterChange(ctx);
        if(this.parentApp.isAllocateApp) {
          copiedItemsToInsert.forEach(pos => this.allocateUtils.updatePaPositionKey(pos));
        }
    }

    public addClonedPosition(ctx: Context, position: Position, toIndex: number): void {
        /*feature undo-redo: by abhishek
     dt. 13th, Aug, 2014*/
        const original = ((obj, position, toIndex) => {
            return () => {
                obj.addClonedPosition(ctx, position, toIndex);
            };
        })(this, position, toIndex);
        const revert = ((obj, toIndex) => {
            return () => {
                obj.removePosition(ctx, toIndex);
            };
        })(this, toIndex);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'CopiedPosition',
        }, this.$sectionID);
        /* ends here */

        this.planogramCommonService.resetPegFields(this, position);
        position.Position.IDPOGObject = null;
        position.IDPOGObject = null;
        position.IDPOGObjectParent = this.IDPOGObject;
        position.selected = false;
        const rootObj = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        position.IdPog = rootObj.IDPOG;
        position.$sectionID != this.$sectionID && this.planogramService.prepareModelPosition(position, rootObj);
        this.planogramCommonService.extend(position, true, this.$sectionID);
        this.planogramCommonService.setParent(position, this);
        this.Children.splice(toIndex, 0, position);
        this.computePositionsAfterChange(ctx);
    }

    // This method is used to paste copied positions
    public addPosition(
        ctx: Context,
        position: Position,
        index: number,
        dropCoord?: DropCoord,
        movePosition?: string,
        skipAssign?: RefreshParams | boolean,
        undocheck?: boolean, // todo  eliminate  boolean
        isReassignAction?: boolean
    ): void {
        this.planogramCommonService.resetPegFields(this, position);
        position.IDPOGObjectParent = this.IDPOGObject; // Kuldip changes for IDPOGObject
        position.setParentId(this.$id); //fixes for ObjectProvider parentID
        this.Children.splice(index, 0, position);
        if (!undocheck && !isReassignAction) {
            this.computePositionsAfterChange(ctx, skipAssign as RefreshParams);
        }
        if (this.parentApp.isAllocateApp) {
              this.allocateUtils.updatePaPositionKey(position);
        }
    }

    public removePosition(ctx: Context, index: number, undocheck?: boolean, refresh?: RefreshParams, isReassignAction?: boolean): void {
        this.Children.splice(index, 1);
        if (!undocheck && !isReassignAction) {
            this.computePositionsAfterChange(ctx, refresh);
        }
    }
    //@Narendra To skip history recording if the failed drop is reverting back the items when placed on pegboard
    public movePosition(
        ctx: Context,
        fromIndex: number,
        toFixture: PositionParentList,
        toIndex: number,
        dropCoord: DropCoord,
        isRecording?: boolean,
        allocateObj?,
        refresh?: RefreshParams,
        isReassignAction? : boolean
    ): void {
        if (this.Children.length > 0) {
            const position = this.Children[fromIndex] as Position;
            const oldDropCoord = cloneDeep({ left: position.Location.X, top: position.Location.Y });

            this.removePosition(ctx, fromIndex, false ,refresh, isReassignAction);
            //item dragged and dropped in the same shelf
            /* temp flag for stshelf undo/redo move position*/
            if (this === toFixture && !this.historyService.isUndoRedoOn()) {
                if (toIndex > fromIndex) {
                    toIndex = toIndex - 1;
                }
            }
            //exception handled : abhishek dt. 3rd April, 2014
            //make sure when droped to last position, index doesn't cross total index.
            //Note: toIndex cannot be at any cost > the total Children of the toFixture
            //if toIndex is greater then splice() by default put it in last position but it causes trouble in undo,
            //since invalid toIndex is stored in History where we dont have any items actually
            if (toIndex > toFixture.Children.length) {
                toIndex = toFixture.Children.length;
            }
            const clonedDropCord = cloneDeep(dropCoord);
            let oldIdblock, clonedIdblock;
            position.Location.X = dropCoord.left;
            position.Location.Y = dropCoord.top;
            toFixture.addPosition(ctx, position, toIndex, dropCoord, 'movePosition', refresh, undefined, isReassignAction);
            if (this.parentApp.isAssortAppInIAssortNiciMode && this.sharedService.triggeredFromAssort != true) {
                // undo on add
                if (toFixture.asShoppingCart())
                    window.parent.postMessage(
                        'invokePaceFunc:deleteProduct:["' + position.Position.IDProduct + '"]',
                        '*',
                    );
                else if (position.Position.attributeObject.RecADRI == 'A')
                    window.parent.postMessage(
                        'invokePaceFunc:itemDropped:"' +
                        JSON.stringify(Utils.formatAssortMessage(toIndex, toFixture, position.Position.IDProduct)) +
                        '"',
                        '*',
                    );
                window.footerStatusItemID = null;
            }

            //since on drop we just change the index
            //so calling this method to com
            //if (this === toFixture) {
            //toFixture.computePositionXPosByCrunchMode();
            //}
            !isReassignAction && position.calculateDistribution(ctx, toFixture);
            //item dragged and dropped in the same shelf
            if ((this === toFixture || isReassignAction) && this.isSpreadShelf) {
                const rootObj: Section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section; //sharedService.getRootObject(this, this.$sectionID);
                rootObj.setSpreadSpanStandardshelfs(ctx);
            }
            const toFixturePegboardType = toFixture.asPegType() as PegBoard;
            if (toFixturePegboardType) {
                toFixture.Children = toFixturePegboardType.pegPositionSort(toFixture);
                toIndex = toFixture.Children.indexOf(position);
            }
            //feature undo-redo: by AM
            //dt. 11th, Aug, 2014
            if (isRecording == undefined) {
                const original = ((obj, fromIndex, toFixture, toIndex, dropCoord, clonedIdblock) => {
                    return () => {
                        obj.movePosition(ctx, fromIndex, toFixture, toIndex, dropCoord);
                        if (this.parentApp.isAllocateApp && clonedIdblock != undefined) {
                            position.Position.IdBlock = clonedIdblock;
                        }
                    };
                })(this, fromIndex, toFixture, toIndex, clonedDropCord, clonedIdblock);
                const revert = ((obj, toIndex, toFixture, fromIndex, dropCoord, oldIdblock) => {
                    return () => {
                        toFixture.movePosition(ctx, fromIndex, obj, toIndex, dropCoord);
                        if (this.parentApp.isAllocateApp && oldIdblock != undefined) {
                            position.Position.IdBlock = oldIdblock;
                        }
                    };
                })(this, fromIndex, toFixture, toIndex, oldDropCoord, oldIdblock);
                this.historyService.captureActionExec({
                    funoriginal: original,
                    funRevert: revert,
                    funName: 'MoveItems',
                }, this.$sectionID);
            }
            /* ends here */
        }
        //Added this condition for scope highlight in assort when product is dropped from shopping cart or moved in the shelf
    }

    public findIntersectBayAtXpos(XposToPog: number, bayList?: Modular[]): Modular {
        const rootObject: Section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        const bayObj: Modular = null;
        if (isUndefined(bayList)) {
            bayList = rootObject.Children;
        }
        for (let i = 0; i < bayList.length; i++) {
            const eachObj = bayList[i];
            if (eachObj.asModular()) {
                const x1Cord = Number(eachObj.Location.X.toFixed(2));
                const x2Cord = Number((x1Cord + eachObj.Dimension.Width).toFixed(2));
                if (XposToPog >= x1Cord && XposToPog < x2Cord) {
                    return eachObj;
                }
            }
        }
        return bayObj;
    }
    public findIntersectShelfAtYpos(yposToPog: number, bayList: FixtureList[]): FixtureList {
        let shelf: FixtureList;
        const sortedShelfs = Utils.sortByYPos(bayList);
        for (let i = 0; i < sortedShelfs.length; i++) {
            shelf = sortedShelfs[i];
            if (shelf.asStandardShelf() || shelf.asPegType()) {
                const y1Cord = shelf.Location.Y;
                const y2Cord = y1Cord + shelf.Dimension.Height;
                if (yposToPog >= y1Cord && yposToPog <= y2Cord) {
                    return shelf;
                }
            }
        }
        return shelf;
    }

    public findNotchWithKeykeyStroke(dropY: number, notchData: number[], type: number, isMoveUp: boolean): number {
        if (notchData != undefined && notchData.length > 0 && type == 1) {
            if (isMoveUp) {
                for (let j = 0; j < notchData.length; j++) {
                    if (dropY < notchData[j]) {
                        dropY = notchData[j];
                        break;
                    }
                }
            } else {
                for (let j = notchData.length - 1; j >= 0; j--) {
                    if (dropY > notchData[j]) {
                        dropY = notchData[j];
                        break;
                    }
                }
            }
        } else {
            if (isMoveUp) {
                dropY += 0.5;
            } else {
                dropY -= 0.5;
            }
        }
        //bug fix
        if (dropY < 0) dropY = 0;
        return dropY;
    }

    public getFrontYToPog(): number {
        let yPos = 0;
        const parentObj: Modular = this.sharedService.getObject(this.$idParent, this.$sectionID) as Modular;
        if (parentObj.ObjectType != 'POG') {
            yPos = parentObj.Location.Y;
        }
        return yPos + this.getFrontLocation().Y;
    }
    public getSelectFrontYToPog(): number {
        return this.getFrontYToPog();
    }

    public getXPosRelative(xCord: number): number {
        const rootObject: Section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        const bayList = rootObject.Children;
        for (let i = 0; i < bayList.length; i++) {
            const bayObj: Modular = bayList[i];
            if (bayObj.asModular()) {
                const x1Cord = bayObj.Location.X;
                const x2Cord = x1Cord + bayObj.Dimension.Width;
                if (xCord >= x1Cord && xCord < x2Cord) {
                    xCord = xCord - x1Cord;
                    break;
                }
            }
        }
        if (xCord < 0) {
            xCord = 0;
        }
        return xCord;
    }

    public getYPosRelative(yCord: number): number {
        //future implementation
        return yCord;
    }

    public minHeightRequired(): number {
        return this.Fixture.Thickness + this.minMerchHeight;
    }
    public maxHeightRequired(): number {
        return this.Fixture.Thickness + this.maxItemHeight;
    }

    public doeShelfValidateFitCheck(
        ctx: Context,
        XCord1: number,
        YCord1: number,
        XCord1ToPog: number,
        withFix?: FixtureList,
    ): boolean {
        //1. Get the co-ordinates of the dragged fictures with relative to Bays, POG as input parameter
        //2. Using yPos find the below intersecting fixtures
        //3. this.minMerchHeight gets calculated based on autocompute fronts high of the INTERSECTED SHELF
        //4. so we validate fitcheck against 3.
        let flag = false;
        const oldYpos = this.Location.Y;
        const oldXpos = this.Location.X;
        this.Location.Y = YCord1;
        withFix = Utils.isNullOrEmpty(withFix) ? this : withFix;
        /*
     Asume with Bay Case: If we Drag a Shelf and Drop it another Bay.Before apply Still Drag shelf parent is refrering the same parent.
     For calcualtioon purpose we are changing idParent.
     */
        this.Location.X = XCord1;

        const intersectingShelfYPos = withFix.getIntersectingShelfAboveInfo(ctx).Y;
        const currentMerchHt = intersectingShelfYPos - (YCord1 + this.minHeightRequired());
        if (currentMerchHt >= 0) {
            if (currentMerchHt > 0 && currentMerchHt <= this.minMerchHeight) {
                this.Location.X = oldXpos;
                this.Location.Y = oldYpos;
                flag = true;
            }
            const intersectingFixtures = withFix.getBottomIntersectingFixture(ctx, XCord1ToPog, YCord1);
            //commented on 22nd July, 2015
            //bug fix before coke demo
            //this.$idParent = oldIdParent;
            if (intersectingFixtures.length > 0) {
                for (let i = 0; i < intersectingFixtures.length; i++) {
                    const dropFixture = intersectingFixtures[i];
                    const merchHt = dropFixture.Location.Y + dropFixture.minHeightRequired();
                    if (merchHt <= YCord1) {
                        flag = true;
                    } else {
                        this.Location.X = oldXpos;
                        this.Location.Y = oldYpos;
                        flag = false;
                        break;
                    }
                }
            } else {
                flag = true; // Dropped on emptyArea;
            }
        }
        this.Location.X = oldXpos;
        this.Location.Y = oldYpos;
        //commented on 22nd July, 2015
        //bug fix before coke demo
        //this.$idParent = oldIdParent;
        return flag;
    }

    public getBottomIntersectingFixture(
        ctx: Context,
        XCord1: number,
        YCord1: number,
        flag: boolean = false,
        intersectionFlag: boolean = false,
    ): FixtureList[] {
        let belowFixturesList: FixtureList[] = [];
        const XCord2 = XCord1 + this.Dimension.Width;
        const orderedStandardShelf = ctx.allLimitingShelvesYPosDesc.filter(it => it !== this);
        //// for Worksheet Grid ItemData is different
        // const currentShelfScope = angular.element('#' + this.$id).scope();

        for (let i = 0; i < orderedStandardShelf.length; i++) {
            const belowShelf = orderedStandardShelf[i];
            const shelfCompleteWidth = belowShelf.getXPosToPog() + belowShelf.Dimension.Width;
            const shelfCompleteHeight =
                belowShelf.getFrontLocation().Y + belowShelf.Fixture.Thickness + belowShelf.minHeightRequired();

            let intersectingShelf = flag ? true : shelfCompleteHeight >= YCord1;
            intersectingShelf = intersectionFlag
                ? belowShelf.getFrontLocation().Y == YCord1
                    ? true
                    : shelfCompleteHeight >= YCord1
                : intersectingShelf;
            let instersectingBelowLocationY = flag
                ? belowShelf.getFrontLocation().Y < YCord1
                : belowShelf.getFrontLocation().Y <= YCord1;
            instersectingBelowLocationY = intersectionFlag
                ? belowShelf.getFrontLocation().Y <= YCord1
                : instersectingBelowLocationY;
            if (
                intersectingShelf &&
                instersectingBelowLocationY &&
                belowShelf.getXPosToPog() < XCord2 &&
                shelfCompleteWidth > XCord1
            ) {
                if (belowShelf.Dimension.Width == this.Dimension.Width && belowShelf.getXPosToPog() == XCord1) {
                    const STopCenterXCood =
                        (belowShelf.getXPosToPog() + (belowShelf.getXPosToPog() + belowShelf.Dimension.Width)) / 2;
                    const thisCenterXCood = (XCord1 + XCord2) / 2;
                    if (STopCenterXCood == thisCenterXCood) {
                        belowFixturesList.push(belowShelf);
                    }
                } else {
                    belowFixturesList.push(belowShelf);
                }
            }
        }
        return Utils.sortByYPosDesendingOrder(belowFixturesList);
    }
    //used by position and standardshelf ss
    //if param <position> is passed then it finds intersecting standard shelf for the position
    //if param <postion> is null then it finds the intersecting standard shelf for the standard shelf
    //returns an object i.e. standardshelf responsible for intersection

    public getIntersectingShelfAboveInfo(ctx: Context, position?: Position): IntersectingShelfInfo {
        let XCord1 = this.getXPosToPog(),
            XCord2 = this.getXPosToPog() + this.Dimension.Width,
            YCord = this.Location.Y;
        let ZCord1 = this.getZPosToPog(),
            ZCord2 = this.getZPosToPog() + this.Dimension.Depth;
        let intersectTo: FixtureList | Position = this;
        //if position is not null then take the absolute co-ordinate of the position
        //override default init to position obj from parameter
        if (position) {
            XCord1 = position.getXPosToPog();
            XCord2 = position.getXPosToPog() + position.Dimension.Width;
            YCord = position.getYPosToPog();
            (ZCord1 = position.getZPosToPog()), (ZCord2 = position.getZPosToPog() + position.Dimension.Depth);
            intersectTo = position;
        }
        const rootObj: Section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section; //sharedService.getRootObject(this, this.$sectionID);
        const orderedStandardShelf = ctx.allLimitingShelvesYPosAsc;
        let responsibleY = 0,
            responsibleSlope = 0,
            responsibleDepth = 0,
            responsibleThickness = 0,
            shelfsAbove: FixtureList[] = [];
        let flag = true;
        while (flag) {
            const shelfList = this.getImmediateTopShelfs(YCord, orderedStandardShelf);
            if (shelfList.length == 0) {
                flag = false;
                responsibleY = rootObj.Dimension.Height;
                responsibleDepth = rootObj.Dimension.Depth;
                responsibleSlope = 0;
                responsibleThickness = 0;
            }
            for (let i = 0; i < shelfList.length; i++) {
                if (this.IsIntersecting(intersectTo, shelfList[i], XCord1, XCord2, ZCord1, ZCord2)) {
                    if (flag) {
                        responsibleY = shelfList[i].Location.Y;
                        responsibleDepth = shelfList[i].Dimension.Depth;
                        responsibleSlope = shelfList[i].Rotation.X;
                        responsibleThickness = shelfList[i].Fixture.Thickness;
                        shelfsAbove.push(shelfList[i]);
                    } else if (Utils.checkIfPegType(shelfList[i])) {
                        shelfsAbove.push(shelfList[i]);
                    }
                    flag = false;
                }
            }
            if (flag) {
                YCord = shelfList[0].Location.Y;
            }
        }
        //to get the above shelf children for fitchecks added Shelfabove parameter
        return {
            Y: responsibleY,
            Slope: responsibleSlope,
            Depth: responsibleDepth,
            Thickness: responsibleThickness,
            shelfsAbove: shelfsAbove,
        };
    }

    public getImmediateTopShelfs(YCord: number, orderedStandardShelf: FixtureList[]): FixtureList[] {
        let list = [];
        let flag = false;
        let currY = 0;
        for (let i = 0; i < orderedStandardShelf.length; i++) {
            const ImmediateTopS = orderedStandardShelf[i];
            if (ImmediateTopS.Location.Y > YCord && !flag) {
                flag = true;
                currY = ImmediateTopS.Location.Y;
            }

            if (flag && currY == ImmediateTopS.Location.Y) {
                list.push(ImmediateTopS);
            }
        }
        return list;
    }
    public IsZCordIntersecting(
        pos: Position | StandardShelf,
        STop: FixtureList,
        ZCord1: number,
        ZCord2: number,
        ZCordStop1: number,
        ZCordStop2: number,
    ): boolean {
        if (ZCordStop1 > ZCord1 && ZCordStop1 < ZCord2) {
            return true;
        }
        if (ZCordStop2 > ZCord1 && ZCordStop2 < ZCord2) {
            return true;
        }
        if (STop.Dimension.Depth > pos.Dimension.Depth) {
            if (ZCord1 > ZCordStop1 && ZCord1 < ZCordStop2) {
                return true;
            }
            if (ZCord2 > ZCordStop1 && ZCord2 < ZCordStop2) {
                return true;
            }
        }
        if (STop.Dimension.Depth == pos.Dimension.Depth) {
            const STopCenterZCood = (STop.getZPosToPog() + ZCordStop2) / 2;
            const thisCenterZCood = (ZCord1 + ZCord2) / 2;
            if (STopCenterZCood == thisCenterZCood) {
                return true;
            }
        }
        return false;
    }
    public IsIntersecting(
        pos: Position | StandardShelf,
        STop: FixtureList,
        XCord1: number,
        XCord2: number,
        ZCord1: number,
        ZCord2: number,
    ): boolean {
        const ZCordStop1 = STop.getZPosToPog(),
            ZCordStop2 = STop.getZPosToPog() + STop.Dimension.Depth;
        const XCordStop1 = STop.getXPosToPog(),
            XCordStop2 = STop.getXPosToPog() + STop.Dimension.Width;
        if (XCordStop1 > XCord1 && XCordStop1 < XCord2) {
            return this.IsZCordIntersecting(pos, STop, ZCord1, ZCord2, ZCordStop1, ZCordStop2);
        }
        if (XCordStop2 > XCord1 && XCordStop2 < XCord2) {
            return this.IsZCordIntersecting(pos, STop, ZCord1, ZCord2, ZCordStop1, ZCordStop2);
        }
        if (STop.Dimension.Width > pos.Dimension.Width) {
            if (XCord1 > XCordStop1 && XCord1 < XCordStop2) {
                return this.IsZCordIntersecting(pos, STop, ZCord1, ZCord2, ZCordStop1, ZCordStop2);
            }
            if (XCord2 > XCordStop1 && XCord2 < XCordStop2) {
                return this.IsZCordIntersecting(pos, STop, ZCord1, ZCord2, ZCordStop1, ZCordStop2);
            }
        }
        if (STop.Dimension.Width == pos.Dimension.Width) {
            const STopCenterXCood = (STop.getXPosToPog() + XCordStop2) / 2;
            const thisCenterXCood = (XCord1 + XCord2) / 2;
            if (STopCenterXCood == thisCenterXCood) {
                return this.IsZCordIntersecting(pos, STop, ZCord1, ZCord2, ZCordStop1, ZCordStop2);
            }
        }
        return false;
    }

    public getChildOffsetX(): number {
        let xOffset = 0;
        if (this.spreadSpanProperties.isSpreadSpan) {
            if (this.spreadSpanProperties.isLeftMostShelf) {
                xOffset -= this.Fixture.OverhangXLeft;
            }
        }
        if (!this.spreadSpanProperties.isSpreadSpan) {
            xOffset -= this.Fixture.OverhangXLeft;
        }
        return xOffset;
    }

    public getChildOffsetZ(): number {
        let zOffset = 0;
        // shelf overhang Z implementation
        // we only need OverhangZBack for standard shelf *as to decide from where it should start in z-axis*
        // -ive overhang means less depth ( inward from either side )
        // +ive overhang means more depth ( outward from either side )
        // -= given to make positive overhang go outward that is more negative z axis
        // eg z = 0; z - (OverhangZBack ~ +10); z = -10, so  product start from backwards.
        zOffset -= this.Fixture.OverhangZBack;
        if (this.Fixture.HasGrills) {
            const grillEdgeInfo = this.getGrillEdgeInfo('Front');
            if (grillEdgeInfo != null) {
                zOffset -= grillEdgeInfo.Thickness;
            }
        }
        return zOffset;
    }

    public getChildDimensionWidth(): number {
        let dimWidth = this.Dimension.Width;
        if (this.spreadSpanProperties.isSpreadSpan) {
            if (this.spreadSpanProperties.isLeftMostShelf) {
                dimWidth += this.Fixture.OverhangXLeft;
            }
            if (this.spreadSpanProperties.isRightMostShelf) {
                dimWidth += this.Fixture.OverhangXRight;
            }
        }
        if (!this.spreadSpanProperties.isSpreadSpan) {
            dimWidth += this.Fixture.OverhangXLeft;
            dimWidth += this.Fixture.OverhangXRight;
        }
        if (this.Fixture.MaxMerchWidth != null && this.Fixture.MaxMerchWidth > 0) {
            dimWidth = Math.min(this.Fixture.MaxMerchWidth, dimWidth);
        }
        return dimWidth;
    }

    public getChildDimensionDepth(pos?: Position): number {
        //shelf overhang implementation
        // -ive overhang means less depth ( inward from either side )
        // +ive overhang means more depth ( outward from either side )
        let merchDepth = Math.max(0, this.Dimension.Depth + this.Fixture.OverhangZFront + this.Fixture.OverhangZBack);

        if (this.Fixture.HasGrills) {
            const grillEdgeInfo = this.getGrillEdgeInfo('Front');
            if (grillEdgeInfo != null) {
                merchDepth -= grillEdgeInfo.Thickness;
            }
        }

        if (this.Fixture.MaxMerchDepth != null && this.Fixture.MaxMerchDepth > 0) {
            merchDepth = Math.min(this.Fixture.MaxMerchDepth, merchDepth);
        }

        return merchDepth + (pos ? pos.Position.ProductPackage.OverhangZ || 0 : 0);
    }

    public computeMerchHeight(ctx: Context, refresh?: RefreshParams): void {
      const rootObj: Section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
      rootObj.hasFixtureType[this.Fixture.FixtureType] = true;
        const intersectingShelfInfo = this.getIntersectingShelfAboveInfo(ctx);
        const intersectingShelfYPos = intersectingShelfInfo.Y;
        this.Dimension.Width = this.Fixture.Width;
        this.Dimension.Height = intersectingShelfYPos - this.Location.Y;
        this.Dimension.Depth = this.Fixture.Depth;
        // Calculate child area dimensions and offsets
        this.ChildDimension.Width = this.getChildDimensionWidth();
        this.ChildDimension.Height = Math.max(0, this.Dimension.Height - this.Fixture.Thickness);
        this.ChildDimension.Depth = this.getChildDimensionDepth();
        //this.ChildDimension.Depth = this.Dimension.Depth;
        // Handle sloped shelves
        // Temp flip because can't enter negative slope right now.
        const shelfSlope = this.Rotation.X;
        if (intersectingShelfInfo.Slope != 0 || shelfSlope != 0) {
            if (shelfSlope == 0) {
                // Do nothing for intersectingShelfInfo.Slope >= 0
                if (intersectingShelfInfo.Slope < 0) {
                    this.ChildDimension.Height =
                        this.ChildDimension.Height +
                        intersectingShelfInfo.Depth * Math.sin(Utils.degToRad(intersectingShelfInfo.Slope));
                }
            } else if (shelfSlope < 0) {
                // Downward sloping
                if (intersectingShelfInfo.Slope >= shelfSlope) {
                    this.ChildDimension.Height = this.ChildDimension.Height * Math.cos(Utils.degToRad(shelfSlope));
                } else {
                    const Z3 = intersectingShelfInfo.Depth * Math.cos(Utils.degToRad(intersectingShelfInfo.Slope));
                    const Y3 =
                        this.ChildDimension.Height +
                        intersectingShelfInfo.Depth * Math.sin(Utils.degToRad(intersectingShelfInfo.Slope));
                    const tanS2 = Math.tan(Utils.degToRad(shelfSlope));

                    this.ChildDimension.Height = Math.abs(tanS2 * Z3 - Y3) / Math.sqrt(tanS2 * tanS2 + 1);
                }
            } else {
                // Upward sloping
                if (intersectingShelfInfo.Slope >= shelfSlope) {
                    this.ChildDimension.Height = this.ChildDimension.Height * Math.cos(Utils.degToRad(shelfSlope));
                    this.ChildDimension.Depth =
                        this.Dimension.Depth - this.ChildDimension.Height * Math.sin(Utils.degToRad(shelfSlope));
                } else {
                    const Z3 = intersectingShelfInfo.Depth * Math.cos(Utils.degToRad(intersectingShelfInfo.Slope));
                    const Y3 =
                        this.ChildDimension.Height +
                        intersectingShelfInfo.Depth * Math.sin(Utils.degToRad(intersectingShelfInfo.Slope));
                    const tanS2 = Math.tan(Utils.degToRad(shelfSlope));

                    this.ChildDimension.Height = Math.abs(tanS2 * Z3 - Y3) / Math.sqrt(tanS2 * tanS2 + 1);
                    this.ChildDimension.Depth = this.Dimension.Depth - this.ChildDimension.Height * tanS2;
                }
            }
        }

        // Handle Max Merch
        if (this.Fixture.MaxMerchHeight != null && this.Fixture.MaxMerchHeight > 0) {
            this.ChildDimension.Height = rootObj.fitCheck
                ? Math.min(this.Fixture.MaxMerchHeight, this.ChildDimension.Height)
                : this.Fixture.MaxMerchHeight;
        }

        this.Fixture.Height = this.Dimension.Height;

        this.ChildOffset.X = this.getChildOffsetX();
        this.ChildOffset.Y = this.Fixture.Thickness;
        this.ChildOffset.Z = this.getChildOffsetZ();
        //this.ChildOffset.Z = 0;

        //if (!(refresh && refresh.Load && !refresh.IsCalculationRequired))
        this.computePositionsAfterChange(ctx, refresh);
    }
    public getFrontLocation(): Location {
        if (this.Rotation.X != 0) {
            const Location = {
                X: this.Location.X,
                Y: this.Location.Y + this.Dimension.Depth * Math.sin(Utils.degToRad(this.Rotation.X)),
                Z: this.Location.Z,
            };
            //const newT = this.Fixture.Thickness * Math.cos(Utils.degToRad(this.Rotation.X));
            return Location;
        }
        return this.Location;
    }

    public getDividerInfo(position: Position): DividerInfo {
        return position.getDividerInfo(this);
    }

    public getGrillEdgeInfo(edge): GrillEdgeInfo {
        const grillInfo = this.getGrillInfo();
        let GI = null;
        for (let i = 0; i < grillInfo.Info.length; i++) {
            if (grillInfo.Info[i].Type.toLowerCase().indexOf(edge.toLowerCase()) >= 0) {
                GI = grillInfo.Info[i];
                break;
            }
        }
        if (GI != null) {
            const Info: GrillEdgeInfo = {
                Display: grillInfo.Display,
                Spacing: grillInfo.Spacing,
                Height: GI.Height,
                Thickness: GI.Thickness,
                Color: grillInfo.Color,
            };
            return Info;
        }
        return null;
    }

    private getGrillInfo(): GrillInfo {
        const grillInfo: GrillInfo = {
            Display: false,
            Spacing: 1,
            Info: [],
            Color: '',
        };
        const grillArray = [];
        if (this.Fixture.Grills) {
            this.Fixture.Grills = this.Children.filter(
                (obj) => obj.ObjectDerivedType == AppConstantSpace.GRILLOBJ,
            ) as Grill[];
            this.Fixture.Grills.forEach((item, key) => {
                const obj: any = {};
                if (!isUndefined(item.Fixture._GrillSpacing)) {
                    obj.spacing = item.Fixture._GrillSpacing.ValData;
                } else {
                    item.Fixture._GrillSpacing = {} as ValData;
                    item.Fixture._GrillSpacing.Key = '_GrillSpacing';
                    item.Fixture._GrillSpacing.IDDictionary = 639;
                    (item.Fixture._GrillSpacing.IDPOGObject = null), (item.Fixture._GrillSpacing.ValData = 0);
                    obj.spacing = item.Fixture._GrillSpacing.ValData;
                }
                if (!isUndefined(item.Fixture._GrillPlacement)) {
                    obj.Type = item.Fixture._GrillPlacement.ValData;
                } else {
                    item.Fixture._GrillPlacement = {} as ValData;
                    item.Fixture._GrillPlacement.Key = '_GrillPlacement';
                    item.Fixture._GrillPlacement.IDDictionary = 638;
                    (item.Fixture._GrillPlacement.IDPOGObject = null), (item.Fixture._GrillPlacement.ValData = 2);
                    obj.Type = item.Fixture._GrillPlacement.ValData;
                }
                obj.Height = item.Fixture.Height;
                obj.Thickness = item.Fixture.Thickness;
                obj.PartNumber = item.Fixture.PartNumber;
                obj.Color = item.Fixture.Color;
                grillArray.push(obj);
            }, grillArray);
        }
        if (grillArray.length > 0) {
            if (grillArray[0].Type != GrillPlacementTypes.None) {
                grillInfo.Info.push({
                    Height: grillArray[0].Height,
                    Type: 'LeftRight',
                    Thickness: grillArray[0].Thickness,
                });
                grillInfo.Info.push({
                    Height: grillArray[0].Height,
                    Type: 'Front',
                    Thickness: grillArray[0].Thickness,
                });
                if (grillArray[0].spacing != null) {
                    grillInfo.Spacing = grillArray[0].spacing;
                }
                grillInfo.Color = grillArray[0].Color;
            }
        }
        let maxGrillHeight = 0;
        for (let i = 0; i < grillInfo.Info.length; i++) {
            maxGrillHeight = Math.max(maxGrillHeight, grillInfo.Info[i].Height);
        }
        if (maxGrillHeight <= 0) grillInfo.Display = false;
        else {
            grillInfo.Display = true;
        }
        return grillInfo;
    }

    public setPositionLocationX(position: Position, X: number): void {
        const dividerInfo = this.getDividerInfo(position);
        switch (dividerInfo.Type) {
            case DividerTypes.None:
            default:
                position.Location.X = X;
                break;
            case DividerTypes.DividerLeft:
            case DividerTypes.DividerFacingsLeft:
                let loc;
                if (
                    X <= dividerInfo.SlotStart &&
                    this.Fixture.LKCrunchMode != CrunchMode.SpanLeft &&
                    this.Fixture.LKCrunchMode != CrunchMode.SpanRight &&
                    this.Fixture.LKCrunchMode != CrunchMode.SpreadSpan
                ) {
                    loc = dividerInfo.SlotStart;
                } else {
                    loc =
                        dividerInfo.SlotStart +
                        Math.ceil((X - dividerInfo.SlotStart) / dividerInfo.SlotSpacing) * dividerInfo.SlotSpacing;
                }
                position.Location.X = loc;
                break;
        }
    }

    public linearWidthPosition(pos: Position, toValue: number, toField: string, skipShrink?: boolean, skipUnits?: boolean): number {
        // view will need to change based on the POV of this POG for now it is just from the Front
        const view = this.OrientNS.View.Front;
        let orientation = pos.getOrientation();
        let posFacingsX = pos.Position.FacingsX;
        if (toValue != undefined) {
            if (toField == 'Position.IDOrientation') {
                orientation = toValue & 0x1f;
            } else if (toField == 'Position.FacingsX') {
                posFacingsX = toValue;
            }
        }
        //@commented by millan for squeeze in x direction
        const dimensions = this.OrientNS.GetDimensions(
            orientation,
            false,
            view,
            pos.Position.ProductPackage.Width,
            pos.Position.ProductPackage.Height,
            pos.Position.ProductPackage.Depth,
        );
        const dimensionWidth = dimensions.Width + pos.getShrinkWidth(skipShrink, posFacingsX, skipUnits);
        const height = dimensions.Height + pos.getShrinkHeight(skipShrink, skipUnits);
        const depth = dimensions.Depth + pos.getShrinkDepth(skipShrink, skipUnits);
        const width = dimensionWidth + pos.getSKUGap(true, dimensionWidth); //Need to add neg xgap here
        const nesting = this.OrientNS.GetDimensions(
            orientation,
            false,
            view,
            pos.Position.ProductPackage.NestingX,
            pos.Position.ProductPackage.NestingY,
            pos.Position.ProductPackage.NestingZ,
        );
        // Nesting should not be greater than the product dimension
        nesting.Width = nesting.Width > dimensionWidth ? 0 : nesting.Width;
        nesting.Height = nesting.Height > height ? 0 : nesting.Height;
        nesting.Depth = nesting.Depth > depth ? 0 : nesting.Depth;

        let lw = 0;
        const dividerInfo = this.getDividerInfo(pos);
        if (posFacingsX > 0) {
            switch (dividerInfo.Type) {
                case DividerTypes.None:
                default:
                    if (this.Fixture.LKCrunchMode == CrunchMode.SpreadFacings) {
                        lw =
                            width * posFacingsX +
                            (posFacingsX - 1) * (pos.Position.SpreadFacingsFactor - nesting.Width);
                    } else {
                        lw = width * posFacingsX + (posFacingsX - 1) * (pos.Position.GapX - nesting.Width);
                    }
                    if (this.isLogStack(pos)) {
                        const direction = this.logDirection(dimensionWidth, height, depth);
                        if (direction == 'Y') {
                            const halfSqrt3 = Math.sqrt(3) / 2;
                            lw = width + (posFacingsX - 1) * width * halfSqrt3;
                        }
                    }
                    break;
                case DividerTypes.DividerLeft:
                    if (this.Fixture.LKCrunchMode == CrunchMode.SpreadFacings) {
                        lw =
                            dividerInfo.Width +
                            width * posFacingsX +
                            (posFacingsX - 1) * (pos.Position.SpreadFacingsFactor - nesting.Width);
                        lw = Math.ceil(lw / dividerInfo.SlotSpacing) * dividerInfo.SlotSpacing;
                    } else {
                        lw =
                            dividerInfo.Width +
                            width * posFacingsX +
                            (posFacingsX - 1) * (pos.Position.GapX - nesting.Width);
                        lw = Math.ceil(lw / dividerInfo.SlotSpacing) * dividerInfo.SlotSpacing;
                    }
                    break;
                case DividerTypes.DividerFacingsLeft:
                    if (this.Fixture.LKCrunchMode == CrunchMode.SpreadFacings) {
                        const Facing_Width = dividerInfo.Width + width + pos.Position.SpreadFacingsFactor;
                        lw =
                            Facing_Width +
                            (posFacingsX - 1) *
                            (Math.ceil(Facing_Width / dividerInfo.SlotSpacing) * dividerInfo.SlotSpacing);
                        lw = Math.ceil(lw / dividerInfo.SlotSpacing) * dividerInfo.SlotSpacing;
                    } else {
                        const Facing_Width = dividerInfo.Width + width + pos.Position.GapX;
                        lw =
                            Facing_Width +
                            (posFacingsX - 1) *
                            (Math.ceil(Facing_Width / dividerInfo.SlotSpacing) * dividerInfo.SlotSpacing);
                        lw = (Math.ceil(lw / dividerInfo.SlotSpacing) * dividerInfo.SlotSpacing) - pos.Position.GapX;
                    }
                    break;
            }
        }
        // check for whitespace
        if (
            (pos.Position.attributeObject.WhiteSpacePosition == 1 ||
                pos.Position.attributeObject.WhiteSpacePosition == 2) &&
            pos.Position.attributeObject.WhiteSpaceWidth > 0
        ) {
            lw += pos.Position.attributeObject.WhiteSpaceWidth;
        }
        return lw;
    }

    public linearHeightPosition(pos: Position, toValue?: number, toField?: string, skipShrink?: boolean, skipUnits?: boolean): number {
        // view will need to change based on the POV of this POG for now it is just from the Front
        const view = this.OrientNS.View.Front;
        let orientation = pos.getOrientation();
        let posFacingsY = pos.Position.FacingsY;
        const isLayunder = pos.Position.IsLayUnder;
        let layoverHigh = pos.Position.LayoversY;
        let layunderHigh = pos.Position.LayundersY;
        const rootObj: Section = this.sharedService.getObject(pos.$sectionID, pos.$sectionID) as Section; //sharedService.getRootObject(this, this.$sectionID);
        const SuppressFingerSpace = rootObj.SuppressFingerSpace;
        if (toValue != undefined) {
            if (toField == 'Position.IDOrientation') {
                orientation = toValue & 0x1f;
            } else if (toField == 'Position.FacingsY') {
                posFacingsY = toValue;
            } else if (toField == 'Position.LayoversY') {
                layoverHigh = toValue;
            }
        }
        //@commented by millan for squeeze in Y direction
        //const dimensions = this.OrientNS.GetDimensions(orientation, false, view, pos.Position.ProductPackage.Width, pos.Position.ProductPackage.Height, pos.Position.ProductPackage.Depth);
        const dimensions = this.OrientNS.GetDimensions(
            orientation,
            false,
            view,
            pos.Position.ProductPackage.Width,
            pos.Position.ProductPackage.Height,
            pos.Position.ProductPackage.Depth,
        );
        const width = dimensions.Width + pos.getShrinkWidth(skipShrink, undefined, skipUnits);
        const height = dimensions.Height + pos.getShrinkHeight(skipShrink, skipUnits, false, true);
        const depth = dimensions.Depth + pos.getShrinkDepth(skipShrink, skipUnits);
        const nesting = this.OrientNS.GetDimensions(
            orientation,
            false,
            view,
            pos.Position.ProductPackage.NestingX,
            pos.Position.ProductPackage.NestingY,
            pos.Position.ProductPackage.NestingZ,
        );
        // Nesting should not be greater than the product dimension
        nesting.Width = nesting.Width > width ? 0 : nesting.Width;
        nesting.Height = nesting.Height > height ? 0 : nesting.Height;
        nesting.Depth = nesting.Depth > depth ? 0 : nesting.Depth;

        if (isLayunder) {
            layoverHigh = 0;
        } else {
            layunderHigh = 0;
        }
        const layOverHeight = dimensions.Depth + pos.getShrinkHeight(skipShrink, skipUnits, true);
        let lh: number = height * posFacingsY + layOverHeight * layoverHigh + layOverHeight * layunderHigh;

        if (posFacingsY + layoverHigh + layunderHigh > 0) {
            lh += (posFacingsY - 1) * (pos.Position.GapY - nesting.Height) + (layoverHigh + layunderHigh) * (pos.Position.GapY - nesting.Depth);
        }
        if (!SuppressFingerSpace && !this.Fixture.IgnoreFingerSpace) {
            lh += pos.Position.ProductPackage.FingerSpace;
        }
        if (this.isLogStack(pos)) {
            const direction = this.logDirection(width, height, depth);
            if ((direction == "X") || (direction == "Z")) {
                const halfSqrt3 = Math.sqrt(3) / 2;
                lh = width + ((posFacingsY - 1) * width * halfSqrt3);
            }
        }
        if(!skipUnits){
          if(pos.unitTopCapCapacity > 0 || pos.unitBackCapCapacity > 0){
            let topUnitHT = pos.unitTopCapFacingsY * pos.unitDimensions.unitHeight,
            backUnitHT = pos.unitBackCapFacingsY * pos.unitDimensions.unitHeight;
            (lh+topUnitHT) > backUnitHT ? (lh += topUnitHT) : (lh = backUnitHT);
          }
        }
        return lh;
    }

    public linearDepthPosition(pos: Position, toValue?: number, toField?: string, skipShrink?: boolean, skipUnits?: boolean, baseItem?: boolean): number {
        // view will need to change based on the POV of this POG for now it is just from the Front

        const view = this.OrientNS.View.Front;
        let orientation = pos.getOrientation();
        if (toValue != undefined) {
            if (toField == 'Position.IDOrientation') {
                orientation = toValue & 0x1f;
            }
        }
        //@commented by millan for squeeze in Y direction
        //const dimensions = this.OrientNS.GetDimensions(orientation, false, view, pos.Position.ProductPackage.Width, pos.Position.ProductPackage.Height, pos.Position.ProductPackage.Depth);
        const dimensions = this.OrientNS.GetDimensions(
            orientation,
            false,
            view,
            pos.Position.ProductPackage.Width,
            pos.Position.ProductPackage.Height,
            pos.Position.ProductPackage.Depth,
        );
        const width = dimensions.Width + pos.getShrinkWidth(skipShrink, undefined, skipUnits);
        const height = dimensions.Height + pos.getShrinkHeight(skipShrink, skipUnits);
        const depth = dimensions.Depth + pos.getShrinkDepth(skipShrink, skipUnits, false, true);
        const nesting = this.OrientNS.GetDimensions(
            orientation,
            false,
            view,
            pos.Position.ProductPackage.NestingX,
            pos.Position.ProductPackage.NestingY,
            pos.Position.ProductPackage.NestingZ,
        );
        // Nesting should not be greater than the product dimension
        nesting.Width = nesting.Width > width ? 0 : nesting.Width;
        nesting.Height = nesting.Height > height ? 0 : nesting.Height;
        nesting.Depth = nesting.Depth > depth ? 0 : nesting.Depth;
        let FrontDepth = 0;
        if (pos.Position.FacingsZ > 0) {
            FrontDepth =
                depth * pos.Position.FacingsZ + (pos.Position.FacingsZ - 1) * (pos.Position.GapZ - nesting.Depth);
        }
        let ld: number = FrontDepth;
        if (!baseItem) {
            let layOverUnderDepth = 0;
            let layOverUnderZ = pos.Position.IsLayUnder ? pos.Position.LayundersZ : pos.Position.LayoversZ;
            if (layOverUnderZ > 0) {
                layOverUnderDepth = (dimensions.Height + pos.getShrinkDepth(skipShrink, skipUnits, true)) * layOverUnderZ + (layOverUnderZ - 1) * (pos.Position.GapZ - nesting.Height);
            }
            ld = Math.max(FrontDepth, layOverUnderDepth);
        }

        if (this.isLogStack(pos)) {
            const IDMerchStyle =
                typeof pos.Position.IDMerchStyle === 'string'
                    ? Number(pos.Position.IDMerchStyle)
                    : pos.Position.IDMerchStyle;
            switch (IDMerchStyle) {
                case AppConstantSpace.MERCH_HALF_PYRAMID:
                case AppConstantSpace.MERCH_RECTANGLE_LOG:
                    const direction = this.logDirection(width, height, depth);
                    if (direction == 'X' || direction == 'Z') {
                        const merchDepth = this.getChildDimensionDepth();
                        if ((pos.Position.FacingsZ + 0.5) * depth > merchDepth) {
                            ld = pos.Position.FacingsZ * depth;
                        } else {
                            ld = (pos.Position.FacingsZ + 0.5) * depth;
                        }
                    }
                    break;
            }
        }
        if(!skipUnits){
          if(pos.unitTopCapCapacity > 0 || pos.unitBackCapCapacity > 0){
            let topUnitDep = pos.unitTopCapFacingsZ * pos.unitDimensions.unitDepth,
            backUnitDep = pos.unitBackCapFacingsZ * pos.unitDimensions.unitDepth;
            (ld+backUnitDep) > topUnitDep ? (ld += backUnitDep) : (ld = topUnitDep)/*If any usecase is there where topunitDep is greater than Tray depth + backunitDep*/;
          }
        }

        return ld;
    }

    public getNotchThicknes(): number {
        return this.planogramStore.appSettings.notchThicknessCalculation.includeStandardShelfThickness ? this.Fixture.Thickness : 0;
    }

    public calculatePositionDistribution(ctx: Context, position: Position, merchHeight?: number): void {
        if(merchHeight){
            if (ctx.positionDistributionCalculated[position.$id + merchHeight]) {
                return;
            }
            ctx.positionDistributionCalculated[position.$id + merchHeight] = true;
        }
        const rootObj: Section = ctx.section;
        const height = position.computeHeight();
        const width = position.computeWidth();
        const depth = position.computeDepth();

        const orgHeight = position.computeHeight(undefined, undefined, true);
        const orgDepth = position.computeDepth(undefined, undefined, true);

        // Note: While incresing LayunderZ, it will update LayoversZ first and after some operations it will update LayunderZ,
        // But we require new Layunderz for calculating shrinking. Same for LayunderY
        const tempLayundersZ = position.Position.LayundersZ;
        position.Position.LayundersZ = position.Position.LayoversZ;
        const layoverUnderShrinkDepth = position.getShrinkDepth(false, false, true);
        position.Position.LayundersZ = tempLayundersZ;

        const tempLayundersY = position.Position.LayundersY;
        position.Position.LayundersY = position.Position.LayoversY;
        const layoverUnderShrinkHeight = position.getShrinkHeight(false, false, true);
        position.Position.LayundersY = tempLayundersY;

        // when item is in between shelves this prevents fronts from growing out of bounds
        if (this.Dimension.Width < (width + position.Location.X)) {
            const index = this.spanShelfs.findIndex(it => it == this.$id);
            if (index !== -1 && this.spanShelfs[index + 1]) {
                const nextShelf = this.sharedService.getObjectAs<StandardShelf>(this.spanShelfs[index + 1], this.section.$id);
                if (nextShelf) {
                    nextShelf.calculatePositionDistribution(ctx, position);
                    return;
                }
            }
        }

        // view will need to change based on the POV of this POG for now it is just from the Front
        const view = this.OrientNS.View.Front;
        let orientation = position.getOrientation();
        const nesting = this.OrientNS.GetDimensions(
            orientation,
            false,
            view,
            position.Position.ProductPackage.NestingX,
            position.Position.ProductPackage.NestingY,
            position.Position.ProductPackage.NestingZ,
        );
        // Nesting should not be greater than the product dimension
        nesting.Width = nesting.Width > width ? 0 : nesting.Width;
        nesting.Height = nesting.Height > height ? 0 : nesting.Height;
        nesting.Depth = nesting.Depth > depth ? 0 : nesting.Depth;
        merchHeight = merchHeight || Math.max(0, this.ChildDimension.Height);
        let merchDepth = this.getChildDimensionDepth();
        // LayUnders
        // TODO deal with layunders: Need a way to say wether to use layover or layunders
        let layundersHigh = 0;
        let layundersDeep = 0;
        let frontsHigh = 1;
        let layoversHigh = 0;
        let layoversDeep = 0;
        const isLayunder = position.Position.IsLayUnder;
        const fingerSpaceHigh = position.Position.ProductPackage.FingerSpace;
        const SuppressFingerSpace = rootObj.SuppressFingerSpace;
        /*fix: check if facingY is 0 then turn it to atleast 1*/
        position.Position.FacingsY = position.Position.FacingsY == 0 ? 1 : position.Position.FacingsY;
        position.Position.FacingsX = position.Position.FacingsX == 0 ? 1 : position.Position.FacingsX;
        position.Position.FacingsZ = position.Position.FacingsZ == 0 ? 1 : position.Position.FacingsZ;
        // test if there really is an above item and fix hasAboveItem if there is not one.
        if (position.hasAboveItem && AppConstantSpace.MERCH_MANUAL == Number(position.Position.IDMerchStyle)) {
            const positionIndex = indexOf(this.Children, position);
            const nextIndex = positionIndex + 1;
            if (
                this.Children.length > nextIndex &&
                this.Children[nextIndex].asPosition() &&
                AppConstantSpace.MERCH_ABOVE != Number(this.Children[nextIndex].Position.IDMerchStyle)
            ) {
                position.hasAboveItem = false;
            }
        }
        if (AppConstantSpace.MERCH_ABOVE == Number(position.Position.IDMerchStyle)) {
            const positionIndex = indexOf(this.Children, position);
            const previousIndex = positionIndex - 1;
            if (previousIndex >= 0 && previousIndex < this.Children.length) {
                const previousPosition = this.Children[previousIndex] as Position;
                if (AppConstantSpace.MERCH_MANUAL == Number(previousPosition.Position.IDMerchStyle)) {
                    if (position.baseItem != previousPosition.$id) {
                        position.baseItem = previousPosition.$id;
                        previousPosition.hasAboveItem = true;
                        position.Location.X = previousPosition.Location.X;
                        position.Location.Y = previousPosition.Location.Y + previousPosition.Dimension.Height;
                    }
                    if (previousPosition.linearWidth() / position.linearWidth() < 1) {
                        position.Position.FacingsX =
                            Math.floor(
                                (previousPosition.linearWidth() / position.linearWidth()) * position.Position.FacingsX,
                            ) || 1;
                    }
                    merchHeight = merchHeight - (previousPosition.Location.Y + previousPosition.Dimension.Height);
                    merchDepth = previousPosition.Dimension.Depth;
                }
            }
        }
        if (AppConstantSpace.MERCH_BEHIND == Number(position.Position.IDMerchStyle)) {
            const positionIndex = indexOf(this.Children, position);
            const previousIndex = positionIndex - 1;
            if (previousIndex >= 0 && previousIndex < this.Children.length) {
                const previousPosition = this.Children[previousIndex] as Position;
                if (AppConstantSpace.MERCH_MANUAL == Number(previousPosition.Position.IDMerchStyle)) {
                    if (position.baseItem != previousPosition.$id) {
                        position.baseItem = previousPosition.$id;
                        previousPosition.hasBackItem = true;
                        position.Location.X = previousPosition.Location.X;
                        position.Location.Y = previousPosition.Location.Y;
                    }
                    if (previousPosition.linearWidth() / position.linearWidth() < 1) {
                        position.Position.FacingsX =
                            Math.floor(
                                (previousPosition.linearWidth() / position.linearWidth()) * position.Position.FacingsX,
                            ) || 1;
                    }

                    merchDepth = merchDepth - previousPosition.Dimension.Depth;
                }
            }
        }
        if (!SuppressFingerSpace) {
            merchHeight = merchHeight - fingerSpaceHigh;
        }

        const UnreducedMerchHeight = merchHeight;

        //Fronts high and fronts deep calculations
        if (
            this.Fixture.AutoComputeFronts &&
            [AppConstantSpace.MERCH_MANUAL].indexOf(Number(position.Position.IDMerchStyle)) == -1
        ) {
            // Fronts
            const maxSqueezedHeight = position.computeMaxSqueezedHeight();
            frontsHigh = Math.floor(
                (merchHeight + position.Position.GapY - nesting.Height) /
                (maxSqueezedHeight + position.Position.GapY - nesting.Height),
            );
            frontsHigh = Math.min(frontsHigh, position.Position.MaxFacingsY);

            // facingshigh can never be more than facings for pyramid-log merch Style  9th sep 2017 Arijit
            if (position.Position.IDMerchStyle == AppConstantSpace.MERCH_PYRAMID) {
                if (frontsHigh > position.Position.FacingsX) {
                    frontsHigh = position.Position.FacingsX;
                }
            }

            if (frontsHigh == 0) {
                frontsHigh = 1;
            }
        } else {
            frontsHigh = position.Position.FacingsY;
        }
        let frontsDeep;
        let tempMerchHt = merchHeight;
        if (
            this.Fixture.AutoComputeDepth &&
            [AppConstantSpace.MERCH_MANUAL].indexOf(Number(position.Position.IDMerchStyle)) == -1
        ) {
            frontsDeep = Math.floor(
                (merchDepth +
                    (position.Position.ProductPackage.OverhangZ || 0) +
                    position.Position.GapZ -
                    nesting.Depth) /
                (depth + position.Position.GapZ - nesting.Depth),
            );
        } else {
            frontsDeep = position.Position.FacingsZ;
        }
        frontsDeep = Math.min(frontsDeep, position.Position.MaxFacingsZ);
        if (frontsDeep == 0) {
            frontsDeep = 1;
        }
        if (
            this.Fixture.AutoComputeFronts &&
            [AppConstantSpace.MERCH_MANUAL].indexOf(Number(position.Position.IDMerchStyle)) == -1
        ) {
            const minLayovers = frontsHigh > 0 ? 0 : 1;

            if (frontsHigh > 0 && frontsDeep > 0) {
              tempMerchHt -= frontsHigh * height + (frontsHigh - 1) * (position.Position.GapY - nesting.Height);
            } else {
                frontsHigh = 0;
                frontsDeep = 0;
            }
            // Layovers

            layoversHigh = Math.max(
                minLayovers,
                Math.floor(
                    (tempMerchHt + position.Position.GapY - nesting.Depth) /
                    (position.computeDepth() + position.Position.GapY - nesting.Depth),
                ),
            );
        } else {
            layoversHigh = position.Position.LayoversY;
        }

        layoversHigh = Math.min(layoversHigh, position.Position.MaxLayoversY);
        while (layoversHigh > 0 && layoversHigh * (orgDepth + layoverUnderShrinkHeight + position.Position.GapY - nesting.Depth) > tempMerchHt) {
            layoversHigh = layoversHigh - 1;
        }
        //Layovers calculations
        if (
            this.Fixture.AutoComputeDepth &&
            [AppConstantSpace.MERCH_MANUAL].indexOf(Number(position.Position.IDMerchStyle)) == -1
        ) {
            layoversDeep = Math.floor(
                (merchDepth +
                    (position.Position.ProductPackage.OverhangZ || 0) +
                    position.Position.GapZ -
                    nesting.Height) /
                (height + position.Position.GapZ - nesting.Height),
            );
        } else {
            layoversDeep = position.Position.LayoversZ;
        }
        //layoversDeep restriction Based on Fronts deep
        if (
            height + position.Position.GapZ - nesting.Height > 0 &&
            depth + position.Position.GapZ - nesting.Depth > 0
        ) {
            while (
                // To get the proper height with shrink for layovers as cannot calculate layover as separate position as we are counting base and layover as a single position
                (layoversDeep * (orgHeight + layoverUnderShrinkDepth + position.Position.GapZ - nesting.Height)) -
                (frontsDeep * (depth + position.Position.GapZ - nesting.Depth)) >
                ((orgHeight + layoverUnderShrinkDepth) / 2)
            ) {
                layoversDeep = layoversDeep - 1;
            }
        }
        layoversDeep = Math.min(layoversDeep, position.Position.MaxLayoversZ);
        //Why this condition unknown. @Narendra
        //Commented temporarly to see the edge case where it will gives unexpected behaviour

        if (isLayunder) {
            layundersHigh = layoversHigh;
        }
        if (layundersHigh > 0) {
            layundersDeep > 0 ? '' : (layundersDeep = 1);
            tempMerchHt -= layundersHigh * depth + (layundersHigh - 1) * (position.Position.GapY - nesting.Depth);
        } else {
            layundersHigh = 0;
            layundersDeep = 0;
        }
        if (layoversHigh > 0) {
            layoversDeep > 0 ? '' : (layoversDeep = 1);
            //We need to calculate merchHeight here if layunders is false, because it is already calculating in layunderheight
            !isLayunder &&
                (tempMerchHt -= layoversHigh * depth + (layoversHigh - 1) * (position.Position.GapY - nesting.Depth));
        } else {
            //uncommented layoversHigh @narendra Need to see the edge case
            //there should be minimum one layoverY and layoverZ to render layovers
            layoversHigh = 0;
            layoversDeep = 0;
        }
        //Layunder calculations
        if (isLayunder && layoversHigh > 0) {
            if (
                this.Fixture.AutoComputeDepth &&
                [AppConstantSpace.MERCH_MANUAL].indexOf(Number(position.Position.IDMerchStyle)) == -1
            ) {
                layundersDeep = Math.floor(
                    (merchDepth +
                        (position.Position.ProductPackage.OverhangZ || 0) +
                        position.Position.GapZ -
                        nesting.Height) /
                    (height + position.Position.GapZ - nesting.Height),
                );
                layundersDeep = Math.min(layundersDeep, position.Position.MaxLayoversZ);

                while (
                    (frontsDeep * (depth + position.Position.GapZ - nesting.Depth)) -
                    (layundersDeep * (height + position.Position.GapZ - nesting.Height)) >
                    (depth / 2)
                ) {
                    frontsDeep = frontsDeep - 1;
                }

                frontsDeep = Math.min(frontsDeep, position.Position.MaxFacingsZ);
                if (frontsDeep == 0) {
                    frontsDeep = 1;
                }
            } else {
                layundersDeep = layoversDeep;
            }
        } else {
            //If is layunders is false
            layundersDeep = 0;
            layundersHigh = 0;
        }

        // Make sure at least one product is drawn
        if (
            (frontsHigh < 1 || frontsDeep < 1) &&
            (layoversHigh < 1 || layoversDeep < 1) &&
            (layundersHigh < 1 || layundersDeep < 1)
        ) {
            frontsHigh = frontsHigh < 1 ? 1 : frontsHigh;
            frontsDeep = frontsDeep < 1 ? 1 : frontsDeep;
            merchHeight = tempMerchHt;
        }
        position.Position.FacingsY = frontsHigh;
        position.Position.FacingsZ = frontsDeep;
        position.Position.LayoversY = layoversHigh;
        position.Position.LayoversZ = layoversDeep;
        position.Position.LayundersY = layundersHigh;
        position.Position.LayundersZ = layundersDeep;

        if (position.$packageBlocks.length > 0) {
            position.$packageBlocks = new Array();
        }
        position.Position.MultiOrientation = -1;
        position.Position.MultiX = 0;
        position.Position.MultiY = 0;
        position.Position.MultiZ = 0;
        let multiOrientation = null;
        let shrinkWChanges = 0;
        const IDMerchStyle =
            typeof position.Position.IDMerchStyle === 'string'
                ? Number(position.Position.IDMerchStyle)
                : position.Position.IDMerchStyle;
        let unitPackageItemInfos:UnitPackageItemInfos;
        switch (IDMerchStyle) {
            case AppConstantSpace.MERCH_DEFAULT:
                break;
            case AppConstantSpace.MERCH_ABOVE:
                break;
            case AppConstantSpace.MERCH_BEHIND:
                break;
            case AppConstantSpace.MERCH_MULTI_ORIENT:
                const calculateMultiOrient = (product, area) => {
                    const multiorient = { orient: null, count: 0, wide: 0, high: 0, deep: 0, dimD: 0, dimH: 0 };
                    const oreintKey = [
                        { oreint: this.OrientNS.Orientation.Front_Bottom, W: 'Width', H: 'Height', D: 'Depth' },
                        { oreint: this.OrientNS.Orientation.Front_Right, W: 'Height', H: 'Width', D: 'Depth' },
                        { oreint: this.OrientNS.Orientation.Right_Bottom, W: 'Depth', H: 'Height', D: 'Width' },
                        { oreint: this.OrientNS.Orientation.Right_Front, W: 'Height', H: 'Depth', D: 'Width' },
                        { oreint: this.OrientNS.Orientation.Bottom_Front, W: 'Width', H: 'Depth', D: 'Height' },
                        { oreint: this.OrientNS.Orientation.Bottom_Right, W: 'Depth', H: 'Width', D: 'Height' },
                    ];
                    for (let i = 0; i < oreintKey.length; i++) {
                        const wide = Math.floor(area.X / product[oreintKey[i].W]);
                        const high = Math.floor(area.Y / product[oreintKey[i].H]);
                        const deep = Math.floor(area.Z / product[oreintKey[i].D]);
                        const count = wide * high * deep;
                        if (count > multiorient.count) {
                            multiorient.orient = oreintKey[i].oreint;
                            multiorient.count = count;
                            multiorient.wide = wide;
                            multiorient.high = high;
                            multiorient.dimH = high * product[oreintKey[i].H];
                            multiorient.deep = deep;
                            multiorient.dimD = deep * product[oreintKey[i].D];
                        }
                    }
                    return multiorient;
                };
                const product: any = {};
                product.Width = position.Position.ProductPackage.Width;
                product.Height = position.Position.ProductPackage.Height;
                product.Depth = position.Position.ProductPackage.Depth;
                const area: any = {};
                area.X = position.linearWidth();
                area.Y = this.ChildDimension.Height;
                area.Z = this.ChildDimension.Depth - position.linearDepth();
                let multiorient = calculateMultiOrient(product, area);
                if (multiorient.count > 0) {
                    multiOrientation = multiorient;
                    position.Position.MultiOrientation = multiorient.orient;
                    // Uncomment when MultiX added to view model (delete this line too)

                    position.Position.MultiY = multiorient.high;
                    position.Position.MultiZ = multiorient.deep;
                }

                break;
            case AppConstantSpace.MERCH_HALF_PYRAMID:
            case AppConstantSpace.MERCH_PYRAMID:
            case AppConstantSpace.MERCH_RECTANGLE_LOG:
                const max = {
                    wide: position.Position.MaxFacingsX,
                    high: this.Fixture.AutoComputeFronts ? position.Position.MaxFacingsY : frontsHigh, // If autocomputefronts is false, then consider the fronts high defined by the user as Max.
                    deep: position.Position.MaxFacingsZ,
                };
                const drawingList = this.logStack(
                    IDMerchStyle,
                    width,
                    height,
                    depth,
                    position.Position.FacingsX,
                    UnreducedMerchHeight,
                    merchDepth + (position.Position.ProductPackage.OverhangZ || 0),
                    max,
                );
                drawingList.listObject.forEach((drawingItem) => {
                    const packageBlock = {
                        type: 'product',
                        x: drawingItem.x,
                        y: drawingItem.y,
                        z: drawingItem.z,
                        wide: drawingItem.wide,
                        high: drawingItem.high,
                        deep: drawingItem.deep,
                        gapX: 0,
                        gapY: 0,
                        gapZ: 0,
                        orientation: orientation,
                        itemHeight: position.Position.ProductPackage.Height,
                        itemWidth: position.Position.ProductPackage.Width,
                        itemDepth: position.Position.ProductPackage.Depth,
                        shape: drawingList.shape,
                        isFingerSpaceIgnored: SuppressFingerSpace,
                        isShrinkDirty: shrinkWChanges,
                    };
                    position.$packageBlocks.push(packageBlock);
                });
                position.Position.FacingsY = drawingList.facingsY;
                position.Position.FacingsZ = drawingList.facingsZ;
                position.Position.LayoversY = 0;
                position.Position.LayoversZ = 0;
                position.Position.LayundersY = 0;
                position.Position.LayundersZ = 0;

                position.$packageBlocks.hashFix = drawingList.facingsY;

                break;
            case AppConstantSpace.MERCH_BASKET:
            case AppConstantSpace.MERCH_LOOSE:
                break;
        }

        if (this.Rotation.X != 0) {
            position.$packageBlocks['FrontScale'] = Math.cos(Utils.degToRad(this.Rotation.X));
        } else {
            position.$packageBlocks['FrontScale'] = 1;
        }

        orientation = position.getOrientation();

        let positionY = 0;
        let positionX = 0,
            gapX = 0;
        if (this.Fixture.LKCrunchMode == CrunchMode.SpreadFacings) {
            gapX = position.Position.SpreadFacingsFactor - nesting.Width;
        } else {
            gapX = position.Position.GapX - nesting.Width;
        }

        const dividerInfo = this.getDividerInfo(position);
        if (position.Position.FacingsX > 0) {
            switch (dividerInfo.Type) {
                case DividerTypes.DividerLeft:
                    positionX = dividerInfo.Width;
                    break;
                case DividerTypes.DividerFacingsLeft:
                    positionX = dividerInfo.Width;
                    break;
            }
        }

        if (dividerInfo.Type == DividerTypes.DividerLeft) {
            const packageBlock = {
                type: 'divider',
                x: 0,
                y: 0,
                z: 0,
                wide: dividerInfo.Width,
                high: dividerInfo.Height,
                deep: dividerInfo.Depth,
                gapX: 0,
                gapY: 0,
                gapZ: 0,
                color: dividerInfo.Color,
                orientation: this.OrientNS.LayoverOrientation[orientation],
                itemHeight: position.Position.ProductPackage.Height,
                itemWidth:
                    position.Position.ProductPackage.Width +
                    position.getShrinkWidth() +
                    position.getSKUGap(true, position.Position.ProductPackage.Width + position.getShrinkWidth()),
                itemDepth: position.Position.ProductPackage.Depth,
                slotSpacing: dividerInfo.SlotSpacing,
                slotStart: dividerInfo.SlotStart,
                isFingerSpaceIgnored: SuppressFingerSpace,
            };
            position.$packageBlocks.push(packageBlock);
        }
        let FacingWidth = 0;
        if (dividerInfo.Type == DividerTypes.DividerFacingsLeft) {
            if (this.Fixture.LKCrunchMode == CrunchMode.SpreadFacings) {
                FacingWidth =
                    Math.ceil(
                        (dividerInfo.Width + width + position.Position.SpreadFacingsFactor) / dividerInfo.SlotSpacing,
                    ) * dividerInfo.SlotSpacing;
            } else {
                FacingWidth =
                    Math.ceil((dividerInfo.Width + width + position.Position.GapX) / dividerInfo.SlotSpacing) *
                    dividerInfo.SlotSpacing;
            }
            gapX = FacingWidth - width;
            for (let n = 0; n < position.Position.FacingsX; n++) {
                const packageBlock = {
                    type: 'divider',
                    x: n * FacingWidth,
                    y: 0,
                    z: 0,
                    wide: dividerInfo.Width,
                    high: dividerInfo.Height,
                    deep: dividerInfo.Depth,
                    gapX: 0,
                    gapY: 0,
                    gapZ: 0,
                    color: dividerInfo.Color,
                    orientation: this.OrientNS.LayoverOrientation[orientation],
                    itemHeight: 0,
                    itemWidth: 0,
                    itemDepth: 0,
                    slotSpacing: dividerInfo.SlotSpacing,
                    slotStart: dividerInfo.SlotStart,
                    isFingerSpaceIgnored: SuppressFingerSpace,
                };
                position.$packageBlocks.push(packageBlock);
            }
        }

        if (multiOrientation != null && multiOrientation.count > 0) {
            const packageBlock = {
                type: 'product',
                x: positionX,
                y: positionY,
                z: -position.linearDepth(),
                wide: multiOrientation.wide,
                high: multiOrientation.high,
                deep: multiOrientation.deep,
                gapX: 0,
                gapY: 0,
                gapZ: 0,
                orientation: multiOrientation.orient,
                itemHeight: position.Position.ProductPackage.Height,
                itemWidth:
                    position.Position.ProductPackage.Width +
                    position.getShrinkWidth() +
                    position.getSKUGap(true, position.Position.ProductPackage.Width + position.getShrinkWidth()),
                itemDepth: position.Position.ProductPackage.Depth,
                isFingerSpaceIgnored: SuppressFingerSpace,
                //                    viewIn2D: false,
                isShrinkDirty: shrinkWChanges,
            };
            position.$packageBlocks.push(packageBlock);
        }
        if (layundersHigh > 0) {
            const packageBlock = {
                type: 'product',
                x: positionX,
                y: positionY,
                z: 0,
                wide: position.Position.FacingsX,
                high: position.Position.LayundersY,
                deep: position.Position.LayundersZ,
                gapX: gapX,
                gapY: position.Position.GapY - nesting.Depth,
                gapZ: position.Position.GapZ - nesting.Height,
                orientation: this.OrientNS.LayoverOrientation[orientation],
                itemHeight: 0,
                itemWidth: 0,
                itemDepth: 0,
                isFingerSpaceIgnored: SuppressFingerSpace,
                layoverUnder:true
            };
            position.$packageBlocks.push(packageBlock);
        }
        if (position.Position.LayundersY > 0) {
            positionY += position.Position.LayundersY * (orgDepth + layoverUnderShrinkHeight + position.Position.GapY - nesting.Depth);
        }

        //modified dt 28th Sept, 2016
        //to handle the changes in shrink and to avoid one $watch
        //we store shrink changes at $packageBlock
        //since $packageBlocks are $watched anyways
        shrinkWChanges = position.getShrinkWidth();

        if (!this.isLogStack(position))
            if (frontsHigh > 0) {
                const packageBlock = {
                    type: 'product',
                    x: positionX,
                    y: positionY,
                    z: 0,
                    wide: position.Position.FacingsX,
                    high: position.Position.FacingsY,
                    deep: position.Position.FacingsZ,
                    gapX: gapX,
                    gapY: position.Position.GapY - nesting.Height,
                    gapZ: position.Position.GapZ - nesting.Depth,
                    orientation: orientation,
                    itemHeight: position.Position.ProductPackage.Height,
                    itemWidth:
                        position.Position.ProductPackage.Width +
                        shrinkWChanges +
                        position.getSKUGap(true, position.Position.ProductPackage.Width + shrinkWChanges),
                    itemDepth: position.Position.ProductPackage.Depth,
                    isFingerSpaceIgnored: SuppressFingerSpace,
                    isShrinkDirty: shrinkWChanges,
                };
                position.$packageBlocks.push(packageBlock);
            }
        if (position.Position.FacingsY > 0) {
            positionY += position.Position.FacingsY * (height + position.Position.GapY - nesting.Height);
        }
        if (layoversHigh > 0 && !isLayunder) {
            const packageBlock = {
                type: 'product',
                x: positionX,
                y: positionY,
                z: 0,
                wide: position.Position.FacingsX,
                high: position.Position.LayoversY,
                deep: position.Position.LayoversZ,
                gapX: gapX,
                gapY: position.Position.GapY - nesting.Depth,
                gapZ: position.Position.GapZ - nesting.Height,
                orientation: this.OrientNS.LayoverOrientation[orientation],
                itemHeight: 0,
                itemWidth: 0,
                itemDepth: 0,
                isFingerSpaceIgnored: SuppressFingerSpace,
                isShrinkDirty: shrinkWChanges,
                layoverUnder:true
            };
            position.$packageBlocks.push(packageBlock);
        }
        //Add packageBlock for advanced tray. Check if advacnced tray is true or false and get dimensions for it
        //check the default orientation of the unit.
        if (position.Position.LayoversY > 0) {
            positionY += position.Position.LayoversY * (depth + position.Position.GapY - nesting.Depth);
        }

        if (Number(position.Position.IDMerchStyle) == AppConstantSpace.MERCH_ABOVE && position.baseItem != '') {
            position.Location.Y = (
                this.sharedService.getObject(position.baseItem, position.$sectionID) as Position
            ).linearHeight();
            position.Location.Z =
                this.getChildDimensionDepth() > position.linearDepth()
                    ? this.getChildDimensionDepth() - position.linearDepth()
                    : 0;
        } else if (Number(position.Position.IDMerchStyle) == AppConstantSpace.MERCH_BEHIND && position.baseItem != '') {
            position.Location.Z = merchDepth > position.linearDepth() ? merchDepth - position.linearDepth() : 0;
        } else {
            position.Location.Y = 0;
            position.Location.Z = merchDepth > position.linearDepth() ? merchDepth - position.linearDepth() : 0;
        }

        if (multiOrientation != null && multiOrientation.count > 0) {
            position.Dimension.Height = Math.max(position.Dimension.Height, multiOrientation.dimH);
            position.Dimension.Depth += multiOrientation.dimD;
            position.Location.Z -= multiOrientation.dimD;
        }

        position.Position.Capacity = 0;
        position.$packageBlocks.forEach((packageBlock) => {
            if (packageBlock.type == 'product') {
                position.Position.Capacity += packageBlock.wide * packageBlock.high * packageBlock.deep;
            }
        });

        /*including casepack in capcity calculation*/
        if (
            position.Position.ProductPackage.CasePack == undefined ||
            position.Position.ProductPackage.CasePack == 0 ||
            position.Position.ProductPackage.CasePack == null
        ) {
            position.Position.ProductPackage.CasePack = 1;
        }

        /*Multiplying Capacity with Inner Packs if available & greater than zero else multiplying with case packs */
        if (
            position.Position.ProductPackage.IdPackageStyle != 0 &&
            position.Position.ProductPackage.IdPackageStyle != null
        ) {
            if (position.Position.ProductPackage.NumInnerPacks && position.Position.ProductPackage.NumInnerPacks > 0) {
                position.Position.Capacity =
                    position.Position.Capacity * position.Position.ProductPackage.NumInnerPacks;
            } else if (
                position.Position.ProductPackage.InnerPackWide &&
                position.Position.ProductPackage.InnerPackHigh &&
                position.Position.ProductPackage.InnerPackDeep &&
                position.Position.ProductPackage.InnerPackWide > 0 &&
                position.Position.ProductPackage.InnerPackHigh > 0 &&
                position.Position.ProductPackage.InnerPackDeep > 0
            ) {
                position.Position.Capacity =
                    position.Position.Capacity *
                    position.Position.ProductPackage.InnerPackHigh *
                    position.Position.ProductPackage.InnerPackDeep *
                    position.Position.ProductPackage.InnerPackWide;
            } else {
                position.Position.Capacity = position.Position.Capacity * position.Position.ProductPackage.CasePack;
            }
        }
         //Get the unit dimensions, images and orientaion for the advanced tray.
        //Need to what's the value selected to fill top or back or both
        //Need to check if position is supporting advanced tray(boolean flag).
        position.unitTopCapCapacity = 0;
        position.unitTopCapFacingsX = 0;
        position.unitTopCapFacingsY = 0;
        position.unitTopCapFacingsZ = 0;
        position.unitBackCapCapacity = 0;
        position.unitBackCapFacingsY = 0;
        position.unitBackCapFacingsZ = 0;
        position.Position.UnitCappingCount = 0;
        let currentUnitCappingOrientation = position.Position.UnitCappingOrientation;
        position.Position.UnitCappingOrientation = null;
        if(Number(position.Position.IDMerchStyle) == AppConstantSpace.MERCH_ADVANCED_TRAY &&
        !Utils.isNullOrEmpty(position.Position.UnitCapping) &&  position.Position.UnitCapping != 0 && position.Position.ProductPackage.IdPackageStyle == 1){
        //we need to check if it is having advanced tray position merch style selected and
          let unitPackageItemInfos = rootObj.UnitPackageItemInfos.filter((unitDim)=> { return unitDim.IDProduct == position.Position.IDProduct; })[0];
          let bestFitOrientation = this.GetBestFitOrientation(position, unitPackageItemInfos, orientation, currentUnitCappingOrientation, merchHeight, merchDepth);
          position.Position.UnitCappingOrientation = bestFitOrientation;
          const dimensions = this.OrientNS.GetDimensions(
            bestFitOrientation,
            false,
            view,
            unitPackageItemInfos.Width,
            unitPackageItemInfos.Height,
            unitPackageItemInfos.Depth,
          );
          if(!position.unitDimensions || bestFitOrientation != position.unitPackageItemInfos.orientation){
            position.unitDimensions = { unitHeight: dimensions.Height, unitWidth: dimensions.Width, unitDepth: dimensions.Depth };
            position.unitPackageItemInfos = unitPackageItemInfos;
          }
          let unitTopCapFacingsY = 0, unitTopCapFacingsZ = 0,
          unitTopCaplocX = 0, unitTopCaplocY = 0, unitTopCaplocZ = 0,
          unitBackCapFacingsY = 0, unitBackCapFacingsZ =0,
          unitBackCaplocX = 0, unitBackCaplocY = 0, unitBackCaplocZ = 0;
          let unitTopCapCapacity = 0, unitBackCapCapacity = 0;
          let trayHeight = position.linearHeight(undefined, true),
          trayWidth = position.linearWidth(undefined, true),
          trayDepth = position.linearDepth(undefined, true);
            //ignoring finger space value
            if (!this.Fixture.IgnoreFingerSpace) {
                let trayHeightWithoutFingerSpace = trayHeight - position.Position.ProductPackage.FingerSpace;
                trayHeight = trayHeightWithoutFingerSpace;
            }
          let unitTopCapFacingsX = Math.floor(trayWidth / dimensions.Width);
          let locationX = position?.$packageBlocks?.find(block => block.type == 'product' && !block.isUnitCap)?.x || 0;
          //top capping
          if(unitTopCapFacingsX > 0){
            if({1:1,3:3}[position.Position.UnitCapping]){
              let fixCapHt = merchHeight - trayHeight;
              unitTopCapFacingsY = Math.floor(fixCapHt / dimensions.Height);
              unitTopCapFacingsZ = Math.floor(trayDepth / dimensions.Depth);
              if(unitTopCapFacingsZ > 0 && unitTopCapFacingsY > 0){
                unitTopCaplocX = locationX
                unitTopCaplocY = trayHeight;
                unitTopCaplocZ = unitTopCapFacingsZ * dimensions.Depth;
                unitTopCapCapacity = unitTopCapFacingsX * unitTopCapFacingsY * unitTopCapFacingsZ;
              } else {
                unitTopCapFacingsY = 0;
                unitTopCapFacingsZ = 0;
              }
            }
            if({2:2,3:3}[position.Position.UnitCapping]){
              unitBackCapFacingsY = Math.floor(merchHeight / dimensions.Height);
              let fixCapDp = merchDepth - trayDepth;
              unitBackCapFacingsZ = Math.floor(fixCapDp / dimensions.Depth);
              if(unitBackCapFacingsY > 0 && unitBackCapFacingsZ > 0){
                unitBackCaplocX = locationX;
                unitBackCaplocY = 0;
                unitBackCaplocZ = unitBackCapFacingsZ * dimensions.Depth;
                unitBackCapCapacity = unitTopCapFacingsX *  unitBackCapFacingsY * unitBackCapFacingsZ;
              } else {
                unitBackCapFacingsY = 0;
                unitBackCapFacingsZ = 0;
              }
            }
          } else {
            unitTopCapFacingsX = 0;
          }
          if(unitTopCapCapacity>0){
            position.unitTopCapCapacity = unitTopCapCapacity;
            position.unitTopCapFacingsX = unitTopCapFacingsX;
            position.unitTopCapFacingsY = unitTopCapFacingsY;
            position.unitTopCapFacingsZ = unitTopCapFacingsZ;
          }
          if(unitBackCapCapacity){
            position.unitBackCapCapacity = unitBackCapCapacity;
            position.unitTopCapFacingsX = unitTopCapFacingsX;
            position.unitBackCapFacingsY = unitBackCapFacingsY;
            position.unitBackCapFacingsZ = unitBackCapFacingsZ;
          }
          position.Position.UnitCappingCount = unitTopCapCapacity + unitBackCapCapacity;
          position.Position.Capacity += position.Position.UnitCappingCount;
          position.Dimension.Width = position.linearWidth();
          position.Dimension.Height = position.linearHeight();
          position.Dimension.Depth = position.linearDepth();
          if (unitTopCapCapacity > 0) {
            const packageBlock = {
                type: 'product',
                x: unitTopCaplocX,
                y: unitTopCaplocY,
                z: 0,
                wide: unitTopCapFacingsX,
                high: unitTopCapFacingsY,
                deep: unitTopCapFacingsZ,
                gapX: 0,
                gapY: 0,
                gapZ: 0,
                orientation: bestFitOrientation,
                itemHeight: unitPackageItemInfos.Height,
                itemWidth: unitPackageItemInfos.Width,
                itemDepth: unitPackageItemInfos.Depth,
                isFingerSpaceIgnored: false,
                layoverUnder:false,
                isUnitCap: true,
                isFrontsCap: true
            };
            position.$packageBlocks.push(packageBlock);
          }
          if (unitBackCapCapacity > 0) {
            const packageBlock = {
                type: 'product',
                x: unitBackCaplocX,
                y: unitBackCaplocY,
                z: - position.Dimension.Depth + unitBackCaplocZ,
                wide: unitTopCapFacingsX,
                high: unitBackCapFacingsY,
                deep: unitBackCapFacingsZ,
                gapX: 0,
                gapY: 0,
                gapZ: 0,
                orientation: bestFitOrientation,
                itemHeight: unitPackageItemInfos.Height,
                itemWidth: unitPackageItemInfos.Width,
                itemDepth: unitPackageItemInfos.Depth,
                isFingerSpaceIgnored: false,
                layoverUnder:false,
                isUnitCap: true,
                isDepthCap: true
            };
            position.$packageBlocks.splice(0, 0, packageBlock);
          }
        } else {
            position.Position.Capacity += position.Position.UnitCappingCount;
            position.Dimension.Width = position.linearWidth();
            position.Dimension.Height = position.linearHeight();
            position.Dimension.Depth = position.linearDepth();
        }
        // TODO @karthik handle capacity update from facing change outside this logic.
        // preserve commented code for reference
        //Updating calculated vlaue of position.Position.Capacity in Worksheet
        // const dObj = {
        //     field: 'Position.Capacity',
        //     newValue: position.Position.Capacity,
        //     IDPOGObject: position.IDPOGObject,
        //     gridType: 'Position',
        //     tab: '',
        //     products: position,
        // };
        //this.sharedService.workSheetEvent.next(dObj);
        /*updating UsedCubic/UsedLinear/UsedSquare*/
        position.Position.UsedCubic = position.Dimension.Height * position.Dimension.Width * position.Dimension.Depth;
        position.Position.UsedLinear = position.Dimension.Width;
        position.Position.UsedSquare = position.Dimension.Height * position.Dimension.Width;
        position.setCases();
    }

    private GetBestFitOrientation(position: Position, unitPackageItemInfos: UnitPackageItemInfos, trayOrientation: number, currentUnitCappingOrientation: number, merchHeight: number, merchDepth: number): number {
        let orientationGroups = [0, 1, 4, 5, 8, 9];
        let matchedOrientations = [];
        let maxCapacity = 0;

        let trayDimensions = { Height: position.linearHeight(undefined, true), Width: position.linearWidth(undefined, true), Depth: position.linearDepth(undefined, true), X:0, Y:0, Z:0 };

        let capacityAndOrientations = {};

        for (let i = 0; i < orientationGroups.length; i++) {
            const unitDimensions = this.OrientNS.GetDimensions(
                orientationGroups[i],
                false,
                this.OrientNS.View.Front,
                unitPackageItemInfos.Width,
                unitPackageItemInfos.Height,
                unitPackageItemInfos.Depth,
            );

            let totalCapacity = this.GetTotalCapacity(position.Position.UnitCapping, unitDimensions, trayDimensions, merchHeight, merchDepth);
            capacityAndOrientations[totalCapacity] = capacityAndOrientations[totalCapacity]
                ? [...capacityAndOrientations[totalCapacity], ...this.GetOrientationGroup(orientationGroups[i])]
                : [...this.GetOrientationGroup(orientationGroups[i])];
            if (totalCapacity > maxCapacity) {
                maxCapacity = totalCapacity;
            }
        }

        matchedOrientations = maxCapacity ? capacityAndOrientations[maxCapacity] : [];

        let bestOrientation = trayOrientation;

        if (matchedOrientations.length) {
            if (!matchedOrientations.some(orientation => orientation === trayOrientation)) {
                if (currentUnitCappingOrientation > -1 && matchedOrientations.some(orientation => orientation === currentUnitCappingOrientation)) {
                    bestOrientation = currentUnitCappingOrientation;
                } else {
                    bestOrientation = matchedOrientations[Math.floor(Math.random() * matchedOrientations.length)];
                }
            }
        }
        return bestOrientation;
    }

    private GetOrientationGroup(orientationGroupNumber: number): number[] {
        switch (orientationGroupNumber) {
            case 0: return [this.OrientNS.Orientation.Front_Bottom, this.OrientNS.Orientation.Front_Top, this.OrientNS.Orientation.Back_Bottom, this.OrientNS.Orientation.Back_Top];
            case 1: return [this.OrientNS.Orientation.Front_Right, this.OrientNS.Orientation.Front_Left, this.OrientNS.Orientation.Back_Left, this.OrientNS.Orientation.Back_Right];
            case 4: return [this.OrientNS.Orientation.Left_Bottom, this.OrientNS.Orientation.Left_Top, this.OrientNS.Orientation.Right_Bottom, this.OrientNS.Orientation.Right_Top];
            case 5: return [this.OrientNS.Orientation.Left_Front, this.OrientNS.Orientation.Left_Back, this.OrientNS.Orientation.Right_Front, this.OrientNS.Orientation.Right_Back];
            case 8: return [this.OrientNS.Orientation.Top_Front, this.OrientNS.Orientation.Top_Back, this.OrientNS.Orientation.Bottom_Front, this.OrientNS.Orientation.Bottom_Back];
            case 9: return [this.OrientNS.Orientation.Top_Right, this.OrientNS.Orientation.Top_Left, this.OrientNS.Orientation.Bottom_Left, this.OrientNS.Orientation.Bottom_Right];
        }
    }

    private GetTotalCapacity = (unitCapping: number, unitDimensions: OrientationDimensions, trayDimensions: OrientationDimensions, merchHeight: number, merchDepth: number) => {
        let topCapFacingsX = Math.floor(trayDimensions.Width / unitDimensions.Width);
        let topCapCapacity = 0, topCapFacingsY = 0, topCapFacingsZ = 0, backCapCapacity = 0, backCapFacingsY = 0, backCapFacingsZ = 0;
        if (topCapFacingsX > 0) {
            if ({ 1: 1, 3: 3 }[unitCapping]) {
                let fixCapHt = merchHeight - trayDimensions.Height;
                topCapFacingsY = Math.floor(fixCapHt / unitDimensions.Height);
                topCapFacingsZ = Math.floor(trayDimensions.Depth / unitDimensions.Depth);
                if (topCapFacingsZ > 0 && topCapFacingsZ > 0) {
                    topCapCapacity = topCapFacingsX * topCapFacingsY * topCapFacingsZ;
                }
            }
            if ({ 2: 2, 3: 3 }[unitCapping]) {
                backCapFacingsY = Math.floor(merchHeight / unitDimensions.Height);
                let fixCapDp = merchDepth - trayDimensions.Depth;
                backCapFacingsZ = Math.floor(fixCapDp / unitDimensions.Depth);
                if (backCapFacingsY > 0 && backCapFacingsZ > 0) {
                    backCapCapacity = topCapFacingsX * backCapFacingsY * backCapFacingsZ;
                }
            }
        }
        return topCapCapacity + backCapCapacity;
    }

    public calculateDistribution(ctx: Context, refresh?: RefreshParams): void {
        const sectionObj: Section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        sectionObj.IDPOGStatus < 4 || this.sharedService.isLivePogEditable ? this.renumberPositions() : '';
        if (ctx.distributionCalculated[this.$id] && !refresh) {
            return;
        }
        ctx.distributionCalculated[this.$id] = true;

        // if (sectionObj.getSkipShelfCalculateDistribution()) {
        //     return;
        // }
        this.Fixture.Capacity = 0;
        let isModular = false;
        let spanShelfsArry = [];
        const parentItemdata = this.sharedService.getObject(this.$idParent, this.$sectionID);
        this.Fixture.FixtureFullPath = 'F' + this.Fixture.FixtureNumber;
        if (parentItemdata.asModular()) {
            this.Fixture.ModularNumber = parentItemdata.Fixture.FixtureNumber;
            this.Fixture.FixtureFullPath =
                'M' + parentItemdata.Fixture.FixtureNumber + 'F' + this.Fixture.FixtureNumber;
            isModular = true;
        }
        if (this.spreadSpanProperties.isSpreadSpan) {
            spanShelfsArry = this.getAllSpreadSpanShelfs();
        }
        //Commented to be removed @Narendra 11th may 2016
        const arry = this.Children;
        //Changing shelf Child should be in reverse order if it is span right
        const calcDistribution = (position: Position, merchHeight: number): any => {
            let removedPosition = 0;
            if (position.isPosition) {
                removedPosition = position.calculateDistribution(ctx, this, refresh, spanShelfsArry, merchHeight) as number;
                const posFixture = this.sharedService.getObject(position.$idParent, this.$sectionID);
                if (Utils.isNullOrEmpty(position.Fixture)) {
                    // This adds fixture number to all the positions in standard shelf
                    position.Fixture = {};
                    position.Fixture.FixtureNumber = posFixture.Fixture.FixtureNumber;
                    position.Fixture.FixtureFullPath = 'F' + posFixture.Fixture.FixtureNumber;
                    position.Fixture.FixtureDesc = posFixture.Fixture.FixtureDesc;
                    position.Fixture.AutoComputeFronts = posFixture.Fixture.AutoComputeFronts;
                } else {
                    position.Fixture.FixtureNumber = posFixture.Fixture.FixtureNumber;
                    position.Fixture.FixtureFullPath = 'F' + posFixture.Fixture.FixtureNumber;
                    position.Fixture.FixtureDesc = posFixture.Fixture.FixtureDesc;
                    position.Fixture.AutoComputeFronts = posFixture.Fixture.AutoComputeFronts;
                }
                if (isModular) {
                    position.Fixture.ModularNumber = posFixture.Fixture.ModularNumber;
                    position.Fixture.FixtureFullPath =
                        'M' + posFixture.Fixture.ModularNumber + 'F' + posFixture.Fixture.FixtureNumber;
                }
                if ((position as any).ObjectType == AppConstantSpace.FIXTUREOBJ) {
                    posFixture.Fixture.Capacity += position.Fixture.Capacity;
                } else {
                    posFixture.Fixture.Capacity += position.Position.Capacity;
                }
            }
            return removedPosition;
        };
        let merchHeight: number = Math.max(0, this.ChildDimension.Height);
        let ifBeyondEdgeEnabled = this.planogramStore.appSettings.overhanging_items_beyond_edge;
        let pegTypeFixtures = [];

        let aboveFixtures = this.getAboveShelfs(ctx);    //(ifBeyondEdgeEnabled || sectionObj.IsVariableHeightShelf) ? []:this.getAboveShelfs();
        this.Fixture.FixtureWeightCapacity = 0;
        const isVariableHeight: boolean = sectionObj.IsVariableHeightShelf && (this.Fixture.MaxMerchHeight == null || this.Fixture.MaxMerchHeight == 0);
        if (ifBeyondEdgeEnabled) {
            //This is applicable for pegboard items only.
            pegTypeFixtures = aboveFixtures.filter(fixture => {
                return Utils.checkIfPegType(fixture);
            });
            if (pegTypeFixtures.length == 0) {
                ifBeyondEdgeEnabled = false;
            }
        }
        for (let i = 0; i < this.Children.length; i++) {
            let pos = arry[i];
            if (pos != undefined && pos.asPosition()) {
                if (isVariableHeight &&
                    [AppConstantSpace.MERCH_ABOVE, AppConstantSpace.MERCH_BEHIND, AppConstantSpace.MERCH_MANUAL].indexOf(Number(pos.Position.IDMerchStyle)) == -1) {
                    let XCord1 = pos.getXPosToPog(),
                        XCord2 = XCord1 + pos.Dimension.Width,
                        ZCord1 = pos.getZPosToPog(),
                        ZCord2 = ZCord1 + pos.Dimension.Depth;
                    const intersectingShelfInfo = { Y: sectionObj.Dimension.Height };
                    if(XCord2 < this.getXPosToPog() ||  XCord1 > (this.getXPosToPog() + this.Dimension.Width)){
                      intersectingShelfInfo.Y = this.getIntersectingShelfAboveInfo(ctx, pos.asPosition()).Y;
                    }else{
                      for (var j = 0; j < aboveFixtures.length; j++) {
                        let fixture = aboveFixtures[j];
                        if (this.IsIntersecting(pos as Position, fixture, XCord1, XCord2, ZCord1, ZCord2)) {
                            intersectingShelfInfo.Y = fixture.Location.Y;
                            break;
                        }
                      }
                    }
                    merchHeight = intersectingShelfInfo.Y - this.Location.Y - this.ChildOffset.Y - pos.ChildOffset.Y;
                }
                ifBeyondEdgeEnabled &&
                    AppConstantSpace.MERCH_ABOVE != Number(pos.Position.IDMerchStyle) &&
                    (merchHeight = this.getMaxMerchPOSHeight(pos as Position, pegTypeFixtures, merchHeight));
                i = i - calcDistribution(pos as Position, merchHeight);
                i < 0 ? (i = -1) : '';

                pos.calculateWeightCapacity();
                //Need to check if this pos is overflowing the current fixture or not from start and end
                //if yes then add the overlapped percentage only to the fixture weight capacity
                //if no then add the whole weight capacity of the pos to the fixture weight capacity
                let percentageOfPosOverlapped = this.getPercentageOverlapped(pos as Position, this);
                //add the percentage of weight capacity to the fixture weight capacity
                //This will be the total weight of all positions in that fixture.
                this.Fixture.FixtureWeightCapacity += pos.Position.PositionWeightCapacity * percentageOfPosOverlapped;
            }
        }
        //find the pending items weight capacity in this fixture
        this.Fixture.FixtureWeightCapacity += this.getPendingWeightCapacity();
    }
    private getPercentageOverlapped(pos: Position, fixture: Fixture): number {
        //find out if the pos and fixture are overlapping in x direction
        //if yes return true else return false
        if (!this.spreadSpanProperties.isSpreadSpan) {
          return 1;
        }
        let percentageOverlapped = 1;
        let posXCord1 = pos.getXPosToPog();
        let posXCord2 = posXCord1 + pos.Dimension.Width;
        let fixtureXCord1 = fixture.getXPosToPog();
        let fixtureXCord2 = fixtureXCord1 + fixture.Dimension.Width;
        if (posXCord1 < fixtureXCord1 && posXCord2 > fixtureXCord1) {
          //if pos is overflowing from start and through the end of the fixture we need to take only the percentage of the pos which is overlapping with the fixture
            let lengthDiff = posXCord2 - fixtureXCord1;
            lengthDiff = lengthDiff > this.Dimension.Width ? this.Dimension.Width : lengthDiff;
            percentageOverlapped = lengthDiff / pos.Dimension.Width;
        } else if (posXCord2 > fixtureXCord2 && posXCord1 < fixtureXCord2){// && spannedIndex != (this.spanShelfs.length - 1)) {
          let lengthDiff = fixtureXCord2 - posXCord1;
            lengthDiff = lengthDiff > this.Dimension.Width ? this.Dimension.Width : lengthDiff;
          percentageOverlapped = lengthDiff / pos.Dimension.Width;
        }
        return percentageOverlapped;
    }
    private getPendingWeightCapacity(): number {
      //find items which are not yet added to fixture and not part of current fixtures children
      //loop through all the spanned items and find out which are not part of current fixture and part of it is on the current fixture
      //and add the weight capacity of those items to the current fixture
      let pendingWeightCapacity = 0;
      let spannedPositions: Position[] = [];
      //take spanned positions from the current fixture
      if (this.spreadSpanProperties.isSpreadSpan) {
        spannedPositions = this.getAllSpreadSpanPositions();
      } else {
        return pendingWeightCapacity;
      }
      //check if any of the spanned positions are not part of current fixture and overlapping with current fixture
      //show me previous suggession
      //if yes add the weight capacity of those items to current fixture
      for (let i = 0; i < spannedPositions.length; i++) {
        let spannedPosition = spannedPositions[i];
        if (spannedPosition.$idParent != this.$id && this.isOverlapping(spannedPosition, this)) {
          spannedPosition.calculateWeightCapacity();
          //find the percentage of the spanned position which is overlapping with current fixture
          let percentageOfSpannedPosition = this.getPercentageOverlapped(spannedPosition, this);
          //add that percentage of weight capacity to the current fixture
          pendingWeightCapacity += spannedPosition.Position.PositionWeightCapacity * percentageOfSpannedPosition;
        }
      }
      return pendingWeightCapacity;
    }
    //construct IsIntersecting method, to check if any positions is overflowing to the current fixture in x direction or not
    private isOverlapping(pos: Position, fixture: Fixture): boolean {
        //find out if the pos and fixture are overlapping in x direction
        //if yes return true else return false
        let isOverlapping = false;
        let posXCord1 = pos.getXPosToPog();
        let posXCord2 = posXCord1 + pos.Dimension.Width;
        let fixtureXCord1 = fixture.getXPosToPog();
        let fixtureXCord2 = fixtureXCord1 + fixture.Dimension.Width;
        if (posXCord1 < fixtureXCord2 && posXCord2 > fixtureXCord1) {
          isOverlapping = true;
        }
        return isOverlapping;
    }

    private renumberPositions(): void {
        let counter = 1;
        const rootObj: Section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        const trafficFlow : number = rootObj.OverrideSectionPosNumbering ? rootObj._StandardShelfLKTraffic.ValData : rootObj.LKTraffic;
        const verticalFlow : number = rootObj.OverrideSectionPosNumbering ? rootObj._StandardShelfStackOrder.ValData : rootObj.shelfStackOrder;
        let positions = this.Children;
        if (trafficFlow == 2) {
            positions = (this.Children as []).slice().reverse();
        }
        for (let i = 0; i < positions.length; i++) {
          const posObj = positions[i] as Position;
          if (!posObj.baseItem && posObj.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
            let abvItem: Position[] = [];
            let bakItem: Position[] = [];
            if (posObj.hasBackItem || posObj.hasAboveItem) {
                  const backNAbvItms = this.Children.filter(function (val: Position, key) {
                      return posObj.$id == val.baseItem;
                  });
                  abvItem = backNAbvItms.filter(function (val) {
                      return val.Position.IDMerchStyle == AppConstantSpace.MERCH_ABOVE;
                  }) as Position[];
                  bakItem = backNAbvItms.filter(function (val) {
                      return val.Position.IDMerchStyle == AppConstantSpace.MERCH_BEHIND;
                  }) as Position[];
              }
              if(verticalFlow == 1 && abvItem.length != 0){
                abvItem[0].Position.PositionNo = counter++;
                posObj.Position.PositionNo = counter++;
              }else{
                posObj.Position.PositionNo = counter++;
                (abvItem.length != 0) && (abvItem[0].Position.PositionNo = counter++)
              }
              //((abvItem[0].Position.PositionNo = counter++),(posObj.Position.PositionNo = counter++)) : (posObj.Position.PositionNo = counter++),((abvItem.length != 0) && (abvItem[0].Position.PositionNo = counter++));
              bakItem.length != 0 ? (bakItem[0].Position.PositionNo = counter++) : '';
          }
      }
    }

    computePositionXPosByCrunchMode() { }

    public computePositionsAfterChange(ctx: Context, refresh?: RefreshParams): void {
        if (this.section.getSkipComputePositions()) {
            return;
        }
        const rootObj: Section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;

        if (rootObj.addToComputePositionsFixtureList(this)) {
            return;
        }
        // TODO @og why is this called rootObj.getAllLimitingSortedShelves();
        const positions = this.getAllPosition();
        let isModular = false;
        // updateing Modular number
        this.Fixture.FixtureFullPath = 'F' + this.Fixture.FixtureNumber;
        const parentItemdata = this.sharedService.getObject(this.$idParent, this.$sectionID);
        if (parentItemdata.asModular()) {
            this.Fixture.ModularNumber = parentItemdata.Fixture.FixtureNumber;
            this.Fixture.FixtureFullPath =
                'M' + parentItemdata.Fixture.FixtureNumber + 'F' + this.Fixture.FixtureNumber;
            isModular = true;
        }

        if (this.Fixture.LKCrunchMode > 0 && this.Fixture.LKCrunchMode === CrunchMode.SpreadFacings) {
            this.crunchMode.rePositionStandardShelfOnCrunch(ctx, this, this.Fixture.LKCrunchMode);
        }

        const minData = [];
        const maxData = [];
        const minPosDepth = [];
        if (positions) {
            this.Fixture.UsedLinear = 0;
            this.Fixture.UsedSquare = 0;
            this.Fixture.UsedCubic = 0;
            let posLen = positions.length;
            for (let i = 0; i < posLen; i++) {
                const item = positions[i];
                //if (item.hasOwnProperty('linearWidth'))
                {
                    if (item.ObjectType == 'Position') {
                        if (
                            [AppConstantSpace.MERCH_ABOVE, AppConstantSpace.MERCH_BEHIND].indexOf(
                                Number(item.Position.IDMerchStyle),
                            ) != -1 &&
                            item.baseItem != ''
                        ) {
                            continue;
                        }
                        let skuXGap = item.getSKUGap();
                        if (i == 0 || i == posLen - 1) {
                            skuXGap = skuXGap / 2;
                        }
                        let usedWidth = item.linearWidth() + skuXGap;
                        let usedHeight = item.linearHeight();
                        let usedDepth = item.linearDepth();
                        if (item.hasAboveItem || item.hasBackItem) {
                            const aboveBehindMerchStylePos = positions.filter(function (pos) {
                                return pos.baseItem == item.$id;
                            });
                            aboveBehindMerchStylePos.push(item);
                            let minLocX = aboveBehindMerchStylePos[0].Location.X,
                                maxLocX = 0,
                                minLocY = aboveBehindMerchStylePos[0].Location.Y,
                                maxLocY = 0,
                                minLocZ = aboveBehindMerchStylePos[0].Location.Z,
                                maxLocZ = 0;
                            aboveBehindMerchStylePos.forEach((itm) => {
                                minLocX = Math.min(minLocX, itm.Location.X);
                                maxLocX = Math.max(maxLocX, itm.Location.X + usedWidth);
                                minLocY = Math.min(minLocY, itm.Location.Y);
                                maxLocY = Math.max(maxLocY, itm.Location.Y + usedHeight);
                                minLocZ = Math.min(minLocZ, itm.Location.Z);
                                maxLocZ = Math.max(maxLocZ, itm.Location.Z + usedDepth);
                            });
                            usedWidth = maxLocX - minLocX + skuXGap;
                            usedHeight = maxLocY - minLocY;
                            usedDepth = maxLocZ - minLocZ;
                        }
                        this.Fixture.UsedLinear += usedWidth;
                        this.Fixture.UsedSquare += usedWidth * usedHeight;
                        this.Fixture.UsedCubic += usedWidth * usedHeight * usedDepth;
                        if (!Utils.isNullOrEmpty(item.Fixture) && isModular) {
                            item.Fixture.ModularNumber = this.Fixture.ModularNumber;
                            item.Fixture.FixtureFullPath =
                                'M' + this.Fixture.ModularNumber + 'F' + this.Fixture.FixtureNumber;
                        }
                        minData.push(item.computeHeight());
                        maxData.push(item.linearHeight());
                        minPosDepth.push(item.computeDepth());
                    }
                }
            }
        }
        this.minMerchHeight = Math.max.apply(Math, minData);
        if (!isFinite(this.minMerchHeight)) {
            this.minMerchHeight = 0;
        }

        this.maxItemHeight = Math.max.apply(Math, maxData);
        if (!isFinite(this.maxItemHeight)) {
            this.maxItemHeight = 0;
        }

        if (!this.Fixture.AutoComputeFronts) {
            this.minMerchHeight = this.maxItemHeight;
        }

        this.minMerchDepth = Math.max.apply(Math, minPosDepth);
        this.unUsedLinear = this.getChildDimensionWidth() - this.Fixture.UsedLinear;
        this.unUsedSquare =
            this.getChildDimensionWidth() * Math.max(0, this.Dimension.Height - this.Fixture.Thickness) -
            this.Fixture.UsedSquare;
        this.unUsedCubic =
            this.getChildDimensionWidth() *
            this.getChildDimensionDepth() *
            Math.max(0, this.Dimension.Height - this.Fixture.Thickness) -
            this.Fixture.UsedCubic;
        this.Fixture.AvailableLinear = Utils.preciseRound(this.unUsedLinear, 2);
        this.Fixture.UsedLinear = Utils.preciseRound(this.Fixture.UsedLinear, 2);
        this.Fixture.AvailableSquare = Utils.preciseRound(this.unUsedSquare, 2);
        this.Fixture.UsedSquare = Utils.preciseRound(this.Fixture.UsedSquare, 2);
        this.Fixture.AvailableCubic = Utils.preciseRound(this.unUsedCubic, 2);
        this.Fixture.UsedCubic = Utils.preciseRound(this.Fixture.UsedCubic, 2);

        if (this.Fixture.LKCrunchMode > 0 && this.Fixture.LKCrunchMode !== CrunchMode.SpreadFacings) {
            this.crunchMode.rePositionStandardShelfOnCrunch(ctx, this, this.Fixture.LKCrunchMode);
        }

        let inputObj: any = {};
        inputObj.attr1 = 'IdBlock';
        inputObj.sectionId = this.$sectionID;
        if (rootObj.PogBlocks.length > 0) {
            inputObj.isAutoBlocks = true;
        }
        //comented For Adjacent shelves having span left is considered as a single shelf.
        if (this.spreadSpanProperties.isSpreadSpan && !refresh ) {
            rootObj.setSpreadSpanStandardshelfs(ctx);
        }
        this.calculateDistribution(ctx, refresh);
        if (!refresh) {
            rootObj.computeSectionUsedLinear();
            rootObj.ComputeSectionUsedSquare();
            rootObj.computeSKUCount(ctx);
            rootObj.calculateDistribution(ctx);
        }
    }

    public getColor(): string {
        let color = Utils.isNullOrEmpty(this.Fixture.Color) ? '#00ff00' : this.Fixture.Color;
        let posWidth, xGap;
        let itemsWidth: number = 0;
        let items: Position[] = [];
        let len: number = 0;
        if (this.spreadSpanProperties.isSpreadSpan) {
            let items = this.getAllSpreadSpanPositions();
            let len = items.length;
            items.forEach((obj, key) => {
                xGap = obj.getSKUGap();
                if (xGap <= 0) {
                    itemsWidth += obj.Dimension.Width;
                } else {
                    itemsWidth += obj.Dimension.Width + (key == 0 || key == len - 1 ? xGap / 2 : xGap);
                }
            });
            if (Utils.preciseRound(itemsWidth - this.spreadSpanProperties.width, 2) > 0.09) {
                color = 'red';
            }
        }
        if (!this.spreadSpanProperties.isSpreadSpan) {
            itemsWidth = 0;
            items = this.getAllPosition();
            len = items.length;
            items.forEach((obj, key) => {
                xGap = obj.getSKUGap();
                if (xGap <= 0) {
                    posWidth = obj.Dimension.Width;
                } else {
                    posWidth = obj.Dimension.Width + (key == 0 || key == len - 1 ? xGap / 2 : xGap);
                }
                [AppConstantSpace.MERCH_ABOVE, AppConstantSpace.MERCH_BEHIND].indexOf(
                    Number(obj.Position.IDMerchStyle),
                ) == -1 &&
                    obj.baseItem == '' &&
                    (itemsWidth += posWidth);
            });
            if (Utils.preciseRound(itemsWidth - this.getChildDimensionWidth(), 2) > 0.09) {
                color = 'red';
            }

        }
        const rootObj: Section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        if (rootObj.fitCheck && this.planogramStore.appSettings.isWeightCapacityValidationEnable){
            if(this.Fixture.MaxFixtureWeight > 0 && this.Fixture.FixtureWeightCapacity > this.Fixture.MaxFixtureWeight) {
                color = 'red';
            }
        }
        return color;
    }

    getAllPosition(): Position[] {
        return this.Children.filter(Utils.checkIfPosition);
    }

    // Note: Get all position which requires for shrinking width based on current position
    getAllPosInXDirection(pos: Position): Position[] {
        const allPos = this.spanShelfs.length != 0 ? this.getAllSpreadSpanPositions() : this.getAllPosition();
        return allPos.filter(p => p.Location.Y === pos.Location.Y && p.baseItem == '');
    }

    // Note: Get all position which requires for shrinking height based on current position
    getAllPosInYDirection(pos: Position): Position[] {
        return this.getAllPosition().filter(p => p.Location.X === pos.Location.X && (p.Location.Y !== pos.Location.Y || p.$id == pos.$id));
    }

    // Note: Get all position which requires for shrinking depth based on current position
    getAllPosInZDirection(pos: Position): Position[] {
        return this.getAllPosition().filter(p => p.Location.X === pos.Location.X && p.Location.Y === pos.Location.Y);
    }

    public getAllSpreadSpanPositions(fromFillOption: boolean = false): Position[] {
        if (fromFillOption && this.spanShelfs.length == 0) {
            return this.getAllPosition();
        } else {
            return this.spanShelfs
                .map((item) =>
                    this.sharedService
                        .getObject(item, this.$sectionID)
                        .Children.filter((obj) => obj.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT),
                )
                .reduce((p, n) => p.concat(n), []);
        }
    }

    getAllSpreadSpanBlocks(): Block[] {
        return this.spanShelfs
            .map((item) =>
                this.sharedService
                    .getObject(item, this.$sectionID)
                    .Children.filter((obj) => obj.ObjectDerivedType == AppConstantSpace.BLOCKOBJECT),
            )
            .reduce((p, n) => p.concat(n), []);
    }

    public getAllSpreadSpanShelfs(): StandardShelf[] {
        const spanShelfsArry: StandardShelf[] = [];
        for (let i = 0; i < this.spanShelfs.length; i++) {
            spanShelfsArry.push(this.sharedService.getObject(this.spanShelfs[i], this.$sectionID) as StandardShelf);
        }
        return spanShelfsArry;
    }

    public allPositionsFlip(): void {
        // angular.forEach(this.Children, function (child, key) {
        // if (!child.isPosition && !child.isLikePosition) {// FIXTURE
        const fixture: any = this;
        const positions = fixture.Children;
        const allPosInFix = fixture.Children.filter(function (itm) {
            return itm.asPosition();
        });
        const selectRange = {
            startIndex: -1,
            endIndex: -1,
        };
        /* Commented dt 14th Aug, 2014 - Abhishek
     Do we need to find the selected position again here? this does not allow me to
     add my undo redo code at atomic level mixin method for position flip */
        const selectedArray = [];
        if (positions != undefined) {
            if (positions.length > 0) {
                for (let i = 0; i < positions.length; i++) {
                    if (!positions[i].asPosition()) {
                        continue;
                    }
                    if (i == allPosInFix.length - 1 && positions[i].selected == true) {
                        selectRange.endIndex = i;
                        const temp = cloneDeep(selectRange); //angular.copy(selectRange);
                        selectedArray.push(temp);

                        selectRange.startIndex = -1;
                        selectRange.endIndex = -1;
                    } else if (positions[i].selected == true) {
                        if (selectRange.startIndex < 0) {
                            selectRange.startIndex = i;
                        }
                    } else if (positions[i].selected == false) {
                        if (selectRange.endIndex < 0 && selectRange.startIndex >= 0) {
                            selectRange.endIndex = i - 1;
                            const temp = cloneDeep(selectRange); //angular.copy(selectRange);
                            selectedArray.push(temp);
                            selectRange.startIndex = -1;
                            selectRange.endIndex = -1;
                        }
                    }
                }
            }
        }
        // Flip logic
        for (let i = 0; i < selectedArray.length; i++) {
            const start = selectedArray[i].startIndex;
            const end = selectedArray[i].endIndex;

            if (end > 0 && start >= 0 && end != start) {
                for (let j = start; j < (start + end) / 2; j++) {
                    let temp = positions[j];
                    let tempPositionNumber1 = positions[j].number;
                    positions[j] = positions[end - (j - start)];
                    let tempPositionNumber2 = positions[end - (j - start)].number;
                    positions[j].number = tempPositionNumber1;
                    positions[end - (j - start)] = temp;
                    positions[end - (j - start)].number = tempPositionNumber2;
                    temp = tempPositionNumber1 = tempPositionNumber2 = null; //GC
                }
            } else {
                this.notifyService.warn('ITEMS_SELECTED_ARE_NOT_CONSECUTIVE');
            }
        }
    } //All positions Flip ends here

    public moveSelectedToCart(ctx: Context, shoppingCart: ShoppingCart): void {
        const currentParentObj = this.sharedService.getObject(this.$idParent, this.$sectionID) as Modular;
        const currentShelfIndex = currentParentObj.Children.indexOf(this);
        // added for SAve functionality as suggested by Vamsi
        this.IDPOGObjectParent = null;
        this.IDPOGObject = null;
        this.Fixture.IDPOGObject = null;
        this.TempId = Utils.generateUID();
        const len = this.Children != undefined ? this.Children.length : 0;
        for (let i = len - 1; i >= 0; i--) {
            const child = this.Children[i] as Position;
            if (child.asPosition()) {
                child.moveSelectedToCart(ctx, shoppingCart);
            }
        }
        //UNDO:REDO
        //fixture object deleted is stored in closure scope.
        const deletedShelf = currentParentObj.Children.splice(currentShelfIndex, 1);
        const original = ((currentParentObj, idex) => {
            return () => {
                currentParentObj.Children.splice(idex, 1);
            };
        })(currentParentObj, currentShelfIndex);
        const revert = ((currentParentObj, idex, shelf) => {
            return () => {
                currentParentObj.Children.splice(idex, 0, shelf[0]);
            };
        })(currentParentObj, currentShelfIndex, deletedShelf);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'DeleteFixtures',
        }, this.$sectionID);
    }

    public getZIndex(): number {
        if (this.Location.Z > 0) {
            return 9;
        }
        return 8;
    }

    public initiateAdd(locationX: number, locationY: number, parentObj: Modular): void {
        const rootObj: Section = this.sharedService.getObject(parentObj.$sectionID, parentObj.$sectionID) as Section;
        const copiedFixture = this;
        if (locationY > rootObj.Dimension.Height || locationY < 0) {
            this.notifyService.error('FIX_HEIGHT_EXCEEDING_SECTION');
            return;
        }
        //@todo @Naren Need to check if we are using this '$$hashKey' or not. Untill we comment this one.
        //copiedFixture.$$hashKey = null;
        copiedFixture.IdPog = rootObj.IDPOG;
        copiedFixture.IDPOGObject = null;
        copiedFixture.IDPOGObjectParent = parentObj.IDPOGObject;
        copiedFixture.Fixture.IDPOGObject = null;
        this.planogramCommonService.extend(copiedFixture, true, parentObj.$sectionID);
        this.planogramCommonService.setParent(copiedFixture, parentObj);
        copiedFixture.Children.forEach((obj) => {
            //obj.$$hashKey = null;
            obj.IDPOGObject = null;
            obj.IDPOGObjectParent = copiedFixture.IDPOGObject;
            this.planogramCommonService.extend(obj, true, copiedFixture.$sectionID);
            this.planogramCommonService.setParent(obj, copiedFixture);
        });
        copiedFixture.Location.X = locationX;
        copiedFixture.Location.Y = locationY;
        if (this.parentApp.isAllocateApp) {
            this.allocateUtils.updatePAFixtureKey(copiedFixture, parentObj);
         }
        parentObj.Children.push(copiedFixture);
        this.planogramService.removeAllSelection(parentObj.$sectionID);
        this.planogramService.addToSelectionByObject(copiedFixture, parentObj.$sectionID);
        const original = ((copiedFixture, locationX, locationY, parentObj) => {
            return () => {
                copiedFixture.initiateAdd(locationX, locationY, parentObj);
            };
        })(copiedFixture, locationX, locationY, parentObj);
        const revert = ((obj) => {
            return () => {
                obj.removeFixtureFromSection();
            };
        })(copiedFixture);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'addCopiedFixture',
        }, this.$sectionID);
    }

    public addCopiedFixtureToTopORBottom(ctx: Context, fixtureObj: FixtureList) {
        const locationX = this.Location.X;
        const locationYTop = this.Location.Y + this.Fixture.Thickness + this.minMerchHeight;
        const locationYBottom = this.Location.Y - fixtureObj.Fixture.Thickness - fixtureObj.minMerchHeight;
        const parentObj = this.sharedService.getObject(this.$idParent, this.$sectionID) as Modular;
        const rootObj: Section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        const sectionWidth = rootObj.Dimension.Width;
        const isFitCheckRequired = rootObj.fitCheck;

        const isExceedsSectionWidth = fixtureObj.Dimension.Width + this.getXPosToPog() > sectionWidth ? true : false;
        if (isExceedsSectionWidth) {
            this.notifyService.error('FIX_WIDTH_EXCEEDING_SECTION');
            return false;
        }
        const proposedYPosToPog = rootObj.getNearestYCoordinate(locationYTop);
        if (isFitCheckRequired) {
            let isValidFitcheck = fixtureObj.doeShelfValidateFitCheck(
                ctx,
                locationX,
                proposedYPosToPog,
                this.getXPosToPog(),
                this,
            );
            if (!isValidFitcheck) {
                const proposedYPosToPog_Bottom = rootObj.getNearestYCoordinate(locationYBottom);
                isValidFitcheck = fixtureObj.doeShelfValidateFitCheck(
                    ctx,
                    locationX,
                    proposedYPosToPog_Bottom,
                    this.getXPosToPog(),
                    this,
                );
                if (!isValidFitcheck) {
                    this.notifyService.warn('FITCHECH_ERR');
                    return false;
                }
                fixtureObj.initiateAdd(locationX, proposedYPosToPog_Bottom, parentObj);
                return;
            }
            fixtureObj.initiateAdd(locationX, proposedYPosToPog, parentObj);
        } else {
            fixtureObj.initiateAdd(locationX, proposedYPosToPog, parentObj);
        }
    }

    public addCopiedFixtureToLocation(ctx: Context, proposedXPosToPOG, proposedYPosToPOG, selectedObj) {
        const rootObj: Section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        const isFitCheckRequired = rootObj.fitCheck;
        const isBayPresents = rootObj.isBayPresents;
        const sectionWidth = rootObj.Dimension.Width;
        const pastingFixture: StandardShelf = this;
        let pasteOverObj: Modular;
        if (isBayPresents) {
            const dropBay = this.findIntersectBayAtXpos(proposedXPosToPOG);
            if (dropBay != null) {
                pasteOverObj = dropBay;
            }
        }
        const isExceedsSectionWidth = pastingFixture.Dimension.Width + proposedXPosToPOG > sectionWidth ? true : false;
        if (isExceedsSectionWidth) {
            this.notifyService.error('FIX_WIDTH_EXCEEDING_SECTION');
            return false;
        }
        const xPosRelative = this.getXPosRelative(proposedXPosToPOG);
        if (isFitCheckRequired && Utils.checkIfFixture(selectedObj)) {
            const isValidFitcheck = this.doeShelfValidateFitCheck(
                ctx,
                xPosRelative,
                proposedYPosToPOG,
                proposedXPosToPOG,
                selectedObj as FixtureList,
            );

            if (!isValidFitcheck) {
                this.notifyService.error('FIT_CHECK_ERROR');
                return false;
            }
        }
        pastingFixture.initiateAdd(xPosRelative, proposedYPosToPOG, pasteOverObj);
    }

    public getSpreadIndex(spreadPosition) {
        const shelfChildren = this.Children;
        let positions = [];
        let index = 0,
            indexFound = false;
        //const sortSpreadPositoins(obj) {
        //    return obj.sort(function (a, b) { return a.spredSpanPositionProperties.xSpread - b.spredSpanPositionProperties.xSpread; });
        //}
        positions = shelfChildren.filter((obj) => obj.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT);

        for (let i = 0; i < positions.length; i++) {
            if (positions[i].getXPosToPog() > spreadPosition.getXPosToPog()) {
                index = i;
                indexFound = true;
                break;
            }
        }
        if (!indexFound) {
            index = positions.length;
        }
        return index;
    }

    public getImmediateBelowShelfs(ctx: Context) {
        //get max of Y value of all the shelfs

        const belowShelfList = this.getBottomIntersectingFixture(ctx, this.getXPosToPog(), this.getYPosToPog(), true);
        let immediateBelowShelfs = [];
        if (belowShelfList.length > 0) {
            let firstYval = belowShelfList[0].Location.Y;
            for (let j = 0; j < belowShelfList.length; j++) {
                if (firstYval <= belowShelfList[j].Location.Y) {
                    if (firstYval != belowShelfList[j].Location.Y) {
                        immediateBelowShelfs = [];
                    }
                    immediateBelowShelfs.push(belowShelfList[j]);
                    firstYval = belowShelfList[j].Location.Y;
                }
            }
        }

        return immediateBelowShelfs;
    }

    public getAboveShelfs(ctx: Context) {
        const rootObj: Section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section; //sharedService.getRootObject(this, this.$sectionID);
        const allStandardShelf = Utils.sortByYPos(rootObj.getAllLimitingShelves());
        const orderedStandardShelf = allStandardShelf;
        const currIndex = orderedStandardShelf.indexOf(this);
        const XCord1 = this.getXPosToPog(),
            XCord2 = XCord1 + this.Dimension.Width,
            YCord = this.Location.Y;
        const aboveShelfList = [];

        if (currIndex != -1) {
            orderedStandardShelf.splice(currIndex, 1);
        }
        const getImmediateTopShelfs = (YCord, orderedStandardShelf) => {
            let list = [];
            let flag = false;
            let currY = 0;
            for (let i = 0; i < orderedStandardShelf.length; i++) {
                const ImmediateTopS = orderedStandardShelf[i];
                if (ImmediateTopS.Location.Y > YCord && !flag) {
                    flag = true;
                    currY = ImmediateTopS.Location.Y;
                }

                if (flag && currY == ImmediateTopS.Location.Y) {
                    flag = false;
                    list.push(ImmediateTopS);
                }
            }
            return list;
        };
        const shelfList = getImmediateTopShelfs(YCord, orderedStandardShelf);
        const IsIntersecting = (STop, XCord1, XCord2) => {
          let sTopXCord1 = STop.getXPosToPog();
          let sTopXCord2 = sTopXCord1 + STop.Dimension.Width;
            if (sTopXCord1 > XCord1 && sTopXCord1 < XCord2) {
                return true;
            }
            if (sTopXCord2 > XCord1 && sTopXCord2 < XCord2) {
                return true;
            }

            if (STop.Dimension.Width > this.Dimension.Width) {
                if (XCord1 > sTopXCord1 && XCord1 < sTopXCord2) {
                    return true;
                }
                if (XCord2 > sTopXCord1 && XCord2 < sTopXCord2) {
                    return true;
                }
            }

            if (STop.Dimension.Width == this.Dimension.Width) {
                const STopCenterXCood = (sTopXCord1 + sTopXCord2) / 2;
                const thisCenterXCood = (XCord1 + XCord2) / 2;
                if (STopCenterXCood == thisCenterXCood) {
                    return true;
                }
            }

            return false;
        };
        for (let i = 0; i < shelfList.length; i++) {
            if (IsIntersecting(shelfList[i], XCord1, XCord2)) {
                aboveShelfList.push(shelfList[i]);
            }
        }
        return aboveShelfList;
    }

    public checkIfValidChange(position, widthAfterChange, heightAfterChange, depthAfterChange) {
        //Check if item intersecting with the above shelfs
        if (widthAfterChange == undefined) {
            widthAfterChange = position.linearWidth();
        }
        if (heightAfterChange == undefined) {
            heightAfterChange = position.linearHeight();
        }
        if (depthAfterChange == undefined) {
            depthAfterChange = position.linearDepth();
        }
        //Child dimension height will consider thickness and max merch height of the fixture in to consideration
        if (!(this.Fixture.IgnoreMerchHeight && position.Position.FacingsY == 1 ) && heightAfterChange > this.ChildDimension.Height) {
          return false;
        }
        //It will consider max merch depth too. If max merch depth is not zero it will take the minimum of max merch and actual depth
        if (depthAfterChange > this.getChildDimensionDepth(position)) {
            return false;
        }
        return true;
    }
    //To get the thickness to calculate intersection
    public getRectDimension(): Size3 {
        return { height: this.Fixture.Thickness, width: this.Dimension.Width, depth: this.Dimension.Depth };
    }
    public getSelectRectDimension(): Size3 {
        return { height: this.Fixture.Thickness, width: this.Dimension.Width, depth: this.Dimension.Depth };
    }

    public getMaxAvailableSqueeze(pos: Position): number {
        if (this.planogramService.hasCacheShrinkFactors && pos.baseItem == '' && Context.cacheShrinkFactors[this.$id] && Context.cacheShrinkFactors[this.$id].maxAvailableSqueeze != undefined) {
            return Context.cacheShrinkFactors[this.$id].maxAvailableSqueeze;
        }

        let allPos = [];
        if (pos.baseItem != '') {
            allPos.push(pos);
        } else {
            allPos = this.getAllPosInXDirection(pos);
        }

        let maxAvailableSqueeze = this.calculateMaxAvailableSqueeze(allPos);

        if (this.planogramService.hasCacheShrinkFactors && pos.baseItem == '' && Context.cacheShrinkFactors[this.$id]) {
            Context.cacheShrinkFactors[this.$id].maxAvailableSqueeze = maxAvailableSqueeze;
        }
        return maxAvailableSqueeze;
    }

    public calculateMaxAvailableSqueeze(allPos: Position[]): number{
        let maxAvailableSqueeze = 0;
        let squeezeLinear: number = 0;
        for (let i = 0; i < allPos.length; i++) {
            squeezeLinear = allPos[i].getShrinkX();
            maxAvailableSqueeze += squeezeLinear;
        }
        return maxAvailableSqueeze;
    }

    public getMaxAvailableSqueezeY(pos: Position): number {
        let maxAvailableSqueeze = 0;
        let position: any = {};
        let squeezeLinear;
        const allPos = this.getAllPosInYDirection(pos);
        for (let i = 0; i < allPos.length; i++) {
            position = allPos[i];
            squeezeLinear = position.getShrinkY();
            maxAvailableSqueeze += squeezeLinear;
        }

        return maxAvailableSqueeze;
    }

    // Note: added params to calculate max available squeeze separetly for layoverUnder and baseItem
    public getMaxAvailableSqueezeZ(pos: Position, layoverUnder?: boolean, baseItem?: boolean): number {
        let maxAvailableSqueeze = 0;
        let position: any = {};
        let squeezeLinear;
        const allPos = this.getAllPosInZDirection(pos);
        for (let i = 0; i < allPos.length; i++) {
            position = allPos[i];
            squeezeLinear = position.getShrinkZ(layoverUnder, baseItem);
            maxAvailableSqueeze += squeezeLinear;
        }

        return maxAvailableSqueeze;
    }

    public getRequiredLinear(pos: Position): number {
        if (this.planogramService.hasCacheShrinkFactors && pos.baseItem == '' && Context.cacheShrinkFactors[this.$id] && Context.cacheShrinkFactors[this.$id].requiredLinear != undefined) {
            return Context.cacheShrinkFactors[this.$id].requiredLinear;
        }

        let basePosition = null;
        let allPos = [];
        if (pos.baseItem != '') {
            basePosition = this.sharedService.getObject(pos.baseItem, this.$sectionID) as Position;
            allPos.push(pos);
        } else {
            allPos = this.getAllPosInXDirection(pos);
        }

        const requiredLinear = this.calculateRequiredLinear(allPos, basePosition);
        if (this.planogramService.hasCacheShrinkFactors && Context.cacheShrinkFactors[this.$id] && pos.baseItem == '') {
            Context.cacheShrinkFactors[this.$id].requiredLinear = requiredLinear;
        }
        return requiredLinear;
    }

    // Note: While having above merch style, need to calculate required linear base on base position's width as above position will not extend outside the base position
    private calculateRequiredLinear(allPos: Position[], basePosition?: Position): number{
        let requiredLinear,
            allItemsWidth = 0;
        allPos.forEach((position) => {
            allItemsWidth += position.linearWidth(true) + position.getSKUGap();
        });
        let totalAvailLinear = 0;
        if (basePosition) {
            totalAvailLinear = basePosition.Dimension.Width;
        } else {
            this.spanShelfs.length != 0
                ? this.spanShelfs.forEach((itm) => {
                    totalAvailLinear += this.sharedService.getObject(itm, this.$sectionID).Dimension.Width;
                })
                : (totalAvailLinear = this.Dimension.Width);
        }

        requiredLinear = allItemsWidth - totalAvailLinear;

        return Math.abs(requiredLinear);
    }

    public getRequiredLinearY(pos: Position): number {
        let allItemsHeight = 0;
        const allPos = this.getAllPosInYDirection(pos);
        allPos.forEach((position) => {
            allItemsHeight += position.linearHeight(true);
        });
        return Math.abs(allItemsHeight - this.ChildDimension.Height);
    }

    public getRequiredLinearZ(pos: Position, layoverUnder?: boolean): number {
        let allItemsDepth = 0;
        const allPos = this.getAllPosInZDirection(pos);
        allPos.forEach((position) => {
            let orientation = position.getOrientation();
            let posFacingsZ = position.Position.FacingsZ;
            if (layoverUnder) {
                orientation = this.OrientNS.LayoverOrientation[orientation];
                posFacingsZ = position.Position.IsLayUnder ? position.Position.LayundersZ : position.Position.LayoversZ;
            }
            const dimensions = this.OrientNS.GetDimensions(
                orientation,
                false,
                this.OrientNS.View.Front,
                position.Position.ProductPackage.Width,
                position.Position.ProductPackage.Height,
                position.Position.ProductPackage.Depth,
            );

            allItemsDepth += dimensions.Depth * posFacingsZ + (posFacingsZ - 1) * position.Position.GapZ;
        });
        const fixtureDepth = layoverUnder ? pos.Dimension.Depth : this.ChildDimension.Depth;
        return Math.abs(allItemsDepth - fixtureDepth);
    }

    percentageRequiredLinear(requiredLinear, maxAvailableShrink) {
        const percentageRequiredLinear = (Math.round((requiredLinear / maxAvailableShrink) * 100) / 100) * 100;

        return percentageRequiredLinear;
    }

    public unitCapPosition(ctx, positionObj, eventName) {
        // const deferred = new Promise(deferred); //$q.defer();
        const observable = new Observable((subscriber) => {
            const shelfObject: any = this;
            const nextItemIndex = indexOf(shelfObject.Children, positionObj) + 1;
            if (
                shelfObject.Children[nextItemIndex] &&
                shelfObject.Children[nextItemIndex].Position &&
                AppConstantSpace.MERCH_ABOVE == Number(shelfObject.Children[nextItemIndex].Position.IDMerchStyle)
            ) {
                // setTimeout(function ()
                // {
                return;
                // deferred.reject();
                // }, 0);
            } else {
                const Pkg = find(positionObj.Position.AvailablePackageType, function (p) {
                    return p.IdPackageStyle == 0;
                });
                this.planogramService.getPackageTypeInfo(Pkg.IDPackage).subscribe(
                    (d: IApiResponse<ProductPackageResponse>) => {
                        const unitPoduct = {
                            UPC: positionObj.Position.Product.UPC,
                            IDProduct: positionObj.Position.Product.IDProduct,
                            IDPackage: d.Data.IDPackage,
                            UOM: positionObj.Position.Product.UOM,
                            PkgUOM: d.Data.UOM,
                            ProdUOM: positionObj.Position.Product.UOM,
                            Product: JSON.parse(JSON.stringify(positionObj.Position.Product)),
                            ProductPackage: d.Data,
                        };
                        const rootObject: Section = shelfObject.sharedService.getObject(
                          positionObj.$sectionID,
                          positionObj.$sectionID,
                        );
                        if (rootObject.fitCheck) {
                          if (eventName == 'unit-capping-fronts' && d.Data.Height + positionObj.linearHeight() > this.ChildDimension.Height) {
                            this.notifyService.warn('ITEM_CROSSING_EDGE');
                            return;
                          }
                          if (eventName == 'unit-capping-layovers' && d.Data.Depth + positionObj.linearDepth() > this.ChildDimension.Depth) {
                            this.notifyService.warn('ITEM_CROSSING_EDGE');
                            return;
                          }
                        }
                        let multiElementsList = [];
                        multiElementsList.push(unitPoduct);
                        multiElementsList = this.planogramCommonService.initPrepareModel(multiElementsList, rootObject);
                        const newItem = multiElementsList[0];
                        newItem.Position.IDMerchStyle = AppConstantSpace.MERCH_ABOVE;
                        newItem.Position.IDOrientation = this.OrientNS.Orientation.Front_Bottom;
                        newItem.Position.FacingsX = newItem.Position.FacingsX;
                        newItem.baseItem = positionObj.$id;
                        if (shelfObject.Fixture.LKCrunchMode == 5) {
                            newItem.Location.X = positionObj.Location.X;
                            newItem.Location.Y = positionObj.Location.Y;
                            newItem.Location.Z = positionObj.Location.Z;
                        }
                        if (eventName == 'unit-capping-layovers') {
                            newItem.Position.IDOrientation = this.OrientNS.Orientation.Top_Front;
                            newItem.Position.MaxFacingsY = newItem.Position.MaxLayoversY;
                            newItem.Position.MaxFacingsZ = newItem.Position.MaxLayoversZ;
                        }
                        newItem.Position.MaxLayoversY = 0;
                        const oldIDMerchStyle = positionObj.Position.IDMerchStyle;
                        const oidhasAboveItem = positionObj.hasAboveItem;
                        positionObj.Position.IDMerchStyle = AppConstantSpace.MERCH_MANUAL;
                        positionObj.hasAboveItem = true;
                        const nextItemIndex = indexOf(shelfObject.Children, positionObj) + 1;
                        shelfObject.addPosition(ctx, newItem, nextItemIndex);
                        const original = ((obj, position, index) => {
                            return () => {
                                const rootObject: Section = this.sharedService.getObject(
                                    obj.$sectionID,
                                    obj.$sectionID,
                                ) as Section;
                                const ctx = new Context(rootObject);
                                this.planogramService.addByID(rootObject.$sectionID, position.$id, position);
                                this.planogramService.addPosInvModel(position, rootObject);
                                obj.addPosition(ctx, position, index);
                                const pos = obj.Children[index - 1] as Position;
                                pos.Position.IDMerchStyle = AppConstantSpace.MERCH_MANUAL;
                                pos.hasAboveItem = true;
                            };
                        })(this, newItem, nextItemIndex);
                        const revert = ((obj, index, newItem, IDMerchStyle, hasAboveItem) => {
                            return () => {
                                const ctx = new Context(this.sharedService.getObjectAs(obj.$sectionID, obj.$sectionID));
                                const pos = obj.Children[index - 1] as Position;
                                pos.Position.IDMerchStyle = IDMerchStyle;
                                pos.hasAboveItem = hasAboveItem;
                                obj.removePosition(ctx, index);
                                this.planogramService.deleteFromInvModel(obj.$sectionID, newItem);
                                this.planogramService.cleanByID(obj.$sectionID, newItem.$id);
                            };
                        })(this, nextItemIndex, newItem, oldIDMerchStyle, oidhasAboveItem);
                        this.historyService.captureActionExec({
                            funoriginal: original,
                            funRevert: revert,
                            funName: 'unitCapPosition',
                        }, this.$sectionID);
                        this.planogramService.updateNestedStyleDirty = true;;
                        this.planogramService.rootFlags[this.$sectionID].isSaveDirtyFlag = true;
                        this.planogramService.updateSaveDirtyFlag(
                            this.planogramService.rootFlags[this.$sectionID].isSaveDirtyFlag,
                        );
                        subscriber.next(true);
                    },
                    (err) => {
                        return err;
                    },
                );
            }
        });
        return observable;
    }
    public removeUnitCapPosition(ctx: Context, positionObj: Position, eventName: 'unit-capping-remove') {
        const shelfObject: any = this;
        const nextItemIndex = indexOf(shelfObject.Children, positionObj) + 1;
        const cappingItem = shelfObject.Children[nextItemIndex];
        if (cappingItem && AppConstantSpace.MERCH_ABOVE == Number(cappingItem.Position.IDMerchStyle)) {
            if (cappingItem.Position.Product.IDProduct == positionObj.Position.Product.IDProduct) {
                positionObj.Position.IDMerchStyle; //= AppConstantSpace.MERCH_HAND;
                positionObj.hasAboveItem = false;
                this.removePosition(ctx, nextItemIndex);
                const original = ((obj, position, index) => {
                    return () => {
                        const rootObject: Section = this.sharedService.getObject(
                            obj.$sectionID,
                            obj.$sectionID,
                        ) as Section;
                        const ctx = new Context(rootObject);
                        let pos = obj.Children[index - 1] as Position;
                        pos.Position.IDMerchStyle; //= AppConstantSpace.MERCH_HAND;
                        pos.hasAboveItem = false;
                        obj.removePosition(ctx, index);
                        //planogramHelper.deleteFromInvModel(obj.$sectionID, obj.Children[index]);
                        obj.planogramService.cleanByID(obj.$sectionID, position.$id);
                    };
                })(this, cappingItem, nextItemIndex);
                const revert = ((obj, position, index) => {
                    return () => {
                        obj.planogramService.addByID(obj.$sectionID, position.$id, position);
                        const rootObject: Section = obj.sharedService.getObject(
                            obj.$sectionID,
                            obj.$sectionID,
                        ) as Section;
                        obj.planogramService.addPosInvModel(position, rootObject);
                        const ctx = new Context(rootObject);
                        obj.addPosition(ctx, position, index);
                        let pos = obj.Children[index - 1] as Position;
                        pos.Position.IDMerchStyle = AppConstantSpace.MERCH_MANUAL;
                        pos.hasAboveItem = true;
                    };
                })(this, cappingItem, nextItemIndex);
                this.historyService.captureActionExec({
                    funoriginal: original,
                    funRevert: revert,
                    funName: 'removeUnitCapPosition',
                }, this.$sectionID);
            }
        }
    }

    public getXPosToPog(): number {
        let xPos = 0;
        const parentObj = this.sharedService.getObject(this.$idParent, this.$sectionID);
        if (parentObj != undefined && parentObj.ObjectType != 'POG') {
            xPos = parentObj.Location.X;
        }
        return xPos + this.Location.X;
    }

    public getYPosToPog(): number {
        let yPos = 0;
        const parentObj = this.sharedService.getObject(this.$idParent, this.$sectionID);
        if (parentObj.ObjectType != 'POG') {
            yPos = parentObj.Location.Y;
        }
        return yPos + this.Location.Y;
    }
    public getZPosToPog(): number {
        let zPos = 0;
        const parentObj = this.sharedService.getObject(this.$idParent, this.$sectionID);
        if (parentObj != undefined && parentObj.ObjectType != 'POG') {
            zPos = parentObj.Location.Z;
        }
        return zPos + this.Location.Z;
    }
    public moveFixture(
        proposedX1PosToPog: number,
        proposedYPosToPog: number,
        proposedWidth: number,
        propertygrid?: FromPropertyGrid,
        validityErrorMsg?:string,
    ): boolean {
        return this.moveFixtureService.moveFixtureType(
            proposedX1PosToPog,
            proposedYPosToPog,
            this,
            proposedWidth,
            propertygrid,
            validityErrorMsg
        );
    }

    public getUsedLinear(): number {
        return Utils.preciseRound(this.Fixture.UsedLinear, 3);
    }
    public addFixtureFromGallery(ctx, parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth) {
        const rootObj: Section = this.sharedService.getObject(parentData.$sectionID, parentData.$sectionID) as Section;
        const isFitCheckRequired = rootObj.fitCheck;
        //shelf drag drop varies when within bays and accross bays so we need this flag
        const isBayPresents = rootObj.isBayPresents;

        const sectionWidth = rootObj.Dimension.Width;

        //if Notch is enabled
        //1. LKFixtureMovement ==  ~ notch enabled
        //2. rootObj.Notch > 0 && !angular.isUndefined(rootObj.notchIntervels) to prevent bugs we double check it
        //if (rootObj.LKFixtureMovement == 1 && rootObj.Notch > 0 && !angular.isUndefined(rootObj.notchIntervels)) {
        // notch Case set the nearest notch Value
        //    proposedYPosToPog = this.findNearestNotch(proposedYPosToPog, rootObj.notchIntervels);
        // }
        //if Notch is enabled
        //1. LKFixtureMovement ==  ~ notch enabled
        //2. rootObj.Notch > 0 && !angular.isUndefined(rootObj.notchIntervels) to prevent bugs we double check it
        // if (rootObj.LKFixtureMovement == 1 && rootObj.Notch > 0 && !angular.isUndefined(rootObj.notchIntervels)) {
        // notch Case set the nearest notch Value
        //    proposedYPosToPog = this.findNearestNotch(proposedYPosToPog, rootObj.notchIntervels);
        //}
        const addFixture = (parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth) => {
            //undo redo
            const original = ((obj, methodName, parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth) => {
                return () => {
                    methodName.call(obj, parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth);
                };
            })(this, addFixture, parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth);
            const revert = ((obj: any) => {
                return () => {
                    obj.removeFixtureFromSection();
                };
            })(this);
            this.historyService.captureActionExec({
                funoriginal: original,
                funRevert: revert,
                funName: 'addFixture',
            }, this.$sectionID);

            const rootObj: Section = this.sharedService.getObject(
                parentData.$sectionID,
                parentData.$sectionID,
            ) as Section;
            this.Location.Y = proposedYPosToPog;
            this.Location.X = this.getXPosRelative(proposedXPosToPog);
            this.Fixture.Width = proposedWidth;
            let dropIndex = 0;

            // finding dropIndex from Modular/Section
            for (let i = 0; i < parentData.Children.length; i++) {
                const shelf = parentData.Children[i];
                const shelfCompleteHt = shelf.Location.Y + shelf.Dimension.Height;
                if (shelf.ObjectDerivedType != AppConstantSpace.SHOPPINGCARTOBJ) {
                    dropIndex++;
                    if (shelfCompleteHt > proposedYPosToPog) {
                        break;
                    }
                }
            }
            this.IdPog = rootObj.IDPOG;
            this.IDPOGObject = null;
            this.IDPOGObjectParent = parentData.IDPOGObject;
            this.setParentId(parentData.$id);
            this.Children.forEach((obj) => {
              //obj.$$hashKey = null;
              obj.IDPOGObject = null;
              obj.IDPOGObjectParent = this.IDPOGObject;
              Utils.checkIfFixture(obj) && this.planogramService.prepareModelFixture(obj, rootObj);
              Utils.checkIfPosition(obj) && this.planogramService.prepareModelPosition(obj, rootObj);
              this.planogramCommonService.extend(obj, true, this.$sectionID);
              this.planogramCommonService.setParent(obj, this);
            });
            parentData.Children.splice(dropIndex, 0, this);

            // const dropShelf = angular.element('#' + parentData.$sectionID).scope();

            if (this.parentApp.isAllocateApp) {
                this.allocateUtils.updatePAFixtureKey(this, parentData);
            }
            //perforamance fix: Nov, 2015
            //rootObj.computeMerchHeight(ctx);
            rootObj.applyRenumberingShelfs();
            //dropShelf.$apply();
        };

        const revertBack = (msg: string) => {
            this.dragDropUtilsService.revertBackFixtureGallery();
            this.notifyService.warn(msg);
            this.historyService.abandonCaptureActionExec(undefined, this.$sectionID);
            this.$sectionID = null;
            this.$id = null;
            return false;
        };

        const isExceedsSectionWidth = proposedWidth + proposedXPosToPog > sectionWidth ? true : false;
        if (isExceedsSectionWidth) {
            revertBack('Shelf Width Exceeding Section Length');
            return false;
        }

        if (isFitCheckRequired) {
            const xPosRelative = this.getXPosRelative(proposedXPosToPog);
            const isValidFitcheck = this.doeShelfValidateFitCheck(ctx, xPosRelative, proposedYPosToPog, proposedXPosToPog);

            if (!isValidFitcheck) {
                revertBack('FITCHECH_ERR');
                return false;
            }

            addFixture(parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth);
        } else {
            addFixture(parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth);
        }
        return true;
    }

    public removeFixtureFromSection(): void {
        const parentItemData = this.sharedService.getObject(this.$idParent, this.$sectionID) as Modular;
        const currentShelfIndex = parentItemData.Children.indexOf(this);
        // added for SAve functionality as suggested by Vamsi
        this.IDPOGObjectParent = null;
        this.IDPOGObject = null;
        this.Fixture.IDPOGObject = null;
        this.TempId = Utils.generateUID();
        parentItemData.Children.splice(currentShelfIndex, 1);
    }
    public getUnUsedLinear(): number {
        return Utils.preciseRound(this.unUsedLinear, 3);
    }

    public setFitCheckErrorMessages(code: number): void {
        //feature undo-redo: by abhishek
        //dt. 11th, Aug, 2014

        const original = ((that, code) => {
            return () => {
                that.Fixture.LKFitCheckStatus = code;
                that.updateFitCheckStatusText();
            };
        })(this, code);
        const revert = ((that, code) => {
            return () => {
                that.Fixture.LKFitCheckStatus = code;
                that.updateFitCheckStatusText();
            };
        })(this, this.Fixture.LKFitCheckStatus);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'MoveFixtures',
        }, this.$sectionID);
        /*undo-redo ends here*/
        this.Fixture.LKFitCheckStatus = code;
        this.updateFitCheckStatusText();
    }

    asStandardShelf(): StandardShelf {
        return this;
    }

    public setCanUseShrinkVal(pos: Position, skipUnits?: boolean): boolean {
        if (this.planogramService.hasCacheShrinkFactors && pos.baseItem == '' && Context.cacheShrinkFactors[this.$id] && Context.cacheShrinkFactors[this.$id].canUseShrinkVal != undefined) {
            return Context.cacheShrinkFactors[this.$id].canUseShrinkVal;
        }

        let basePosition = null;
        let allPos = [];
        if (pos.baseItem != '') {
            basePosition = this.sharedService.getObject(pos.baseItem, this.$sectionID) as Position;
            allPos.push(pos);
        } else {
            allPos = this.getAllPosInXDirection(pos);
        }

        const canUseShrinkVal = this.calculateCanUseShrinkVal(allPos, skipUnits, basePosition);

        if (this.planogramService.hasCacheShrinkFactors && Context.cacheShrinkFactors[this.$id] && pos.baseItem == '') {
            Context.cacheShrinkFactors[this.$id].canUseShrinkVal = canUseShrinkVal;
        }
        return canUseShrinkVal;
    }

    private calculateCanUseShrinkVal(allPos: Position[], skipUnits?: boolean, basePosition?: Position): boolean{
        let totalLinear = 0;
        allPos.forEach((itm) => {
            totalLinear += itm.linearWidth(true, skipUnits) + itm.getSKUGap();
        });
        let totalFixLin = 0;
        if (basePosition) {
            totalFixLin = basePosition.Dimension.Width;
        } else {
            this.spanShelfs.length != 0
                ? this.spanShelfs.forEach((itm) => {
                    totalFixLin += this.sharedService.getObject(itm, this.$sectionID).Dimension.Width;
                })
                : (totalFixLin = this.Dimension.Width);
        }
        return totalLinear > totalFixLin ? true : false;
    }

    public calculateCacheShrinkFactors(draggedPositions: Position[] = []): void {
        let allSSPositions = this.getAllSpreadSpanPositions(true).filter(pos => pos.baseItem == '');
        allSSPositions = allSSPositions.concat(draggedPositions);

        const maxAvailableSqueeze = this.calculateMaxAvailableSqueeze(allSSPositions);;
        const requiredLinear = this.calculateRequiredLinear(allSSPositions);
        const canUseShrinkVal = this.calculateCanUseShrinkVal(allSSPositions);

        if (this.isSpreadShelf) {
            this.spanShelfs.forEach((id) => {
                Context.cacheShrinkFactors[id] = {
                    maxAvailableSqueeze: maxAvailableSqueeze,
                    requiredLinear: requiredLinear,
                    canUseShrinkVal: canUseShrinkVal
                };
            });
        } else {
            Context.cacheShrinkFactors[this.$id] = {
                maxAvailableSqueeze: maxAvailableSqueeze,
                requiredLinear: requiredLinear,
                canUseShrinkVal: canUseShrinkVal
            };
        }
    }

    public checkIfLastPosition(position: Position): boolean {
        let onlyPositions = this.getAllPosition();
        const currentIndex = onlyPositions.indexOf(position);
        return currentIndex == onlyPositions.length - 1;
    }

    public checkIfFirstPosition(position: Position): boolean {
        let onlyPositions = this.getAllPosition();
        const currentIndex = onlyPositions.indexOf(position);
        return currentIndex == 0;
    }

    public movePositionDirectlyInShelf(direction: string, position: Position): Offset {
        let currentFixtureObj = this.sharedService.getParentObject(position, position.$sectionID);
        let offSet: Offset = {
            left : null,
            top : null
        };
        let x, y: number;
        switch (direction) {
            case AppConstantSpace.POSITION_DIRECTION.RIGHT:
                let rightIntersectedPositions = this.Children.filter(p => p.$id != position.$id && p.Location.X > position.Location.X).sort((a, b) => a.Location.X - b.Location.X);
                if (rightIntersectedPositions.length > 0) {
                    x = Utils.preciseRound(rightIntersectedPositions[0].Location.X - position.linearWidth(), 2);
                    y = Utils.preciseRound(rightIntersectedPositions[0].Location.Y, 2);
                }
                else {
                    x = Utils.preciseRound(currentFixtureObj.ChildDimension.Width - position.linearWidth(), 2);
                    y = Utils.preciseRound(position.Location.Y + position.linearHeight(), 2);
                }
                break;
            case AppConstantSpace.POSITION_DIRECTION.LEFT:
                const leftIntersectedPos = currentFixtureObj.Children.filter(p => p.$id != position.$id && p.Location.X < position.Location.X).sort((a, b) => b.Location.X - a.Location.X);
                if (leftIntersectedPos.length > 0) {
                    const positionWidth = leftIntersectedPos[0].linearWidth();
                    x = Utils.preciseRound(leftIntersectedPos[0].Location.X + positionWidth, 2);
                    y = Utils.preciseRound(leftIntersectedPos[0].Location.Y + position.linearHeight(), 2);
                }
                else {
                    x = 0;
                    y = Utils.preciseRound(position.Location.Y + position.linearHeight(), 2);
                }
                break;
        }
        offSet.left = x;
        offSet.top = y;
        return offSet;
    }
}
