import { TranslateService } from '@ngx-translate/core';
import { AppConstantSpace } from '../constants/appConstantSpace';
import { Fixture } from './fixture';
import { Utils } from '../constants/utils';
import { IDragDropSettings } from '../drag-drop.module';
import {
    NotifyService,
    PlanogramStoreService,
    PlanogramService,
    SharedService,
    PlanogramCommonService,
    HistoryService,
    DragDropUtilsService,
    CollisionService,
    MoveFixtureService
} from '../services';
import { FromPropertyGrid, BlockFixtureResponse } from '../models';
import { Modular } from './modular';
import { Position } from './position';
import { BlockFixtureStyle, IntersectingShelfAboveInfo } from '../models/planogram';
import { FixtureList } from '../services/common/shared/shared.service';
import { Section } from './section';
import { Context } from './context';
import { ShoppingCart } from './shopping-cart';

export class BlockFixture extends Fixture {
    ObjectDerivedType: 'BlockFixture';
    public isMerchandisable: boolean = false;
    blocks = [];
    usedWidth: number;
    overflowLength = 0;
    ChildOffset = {
        X: 0.0,
        Y: 0.0,
        Z: 0.0,
    };
    ChildDimension = {
        Height: 0.0,
        Width: 0.0,
        Depth: 0.0,
    };

    public uiProperties: string[] = ['overflowLength','usedWidth', 'blocks', 'ObjectDerivedType'];
    constructor(
        data: BlockFixtureResponse,
        public readonly notifyService: NotifyService,
        public readonly translateService: TranslateService,
        public readonly sharedService: SharedService,
        public readonly planogramService: PlanogramService,
        public readonly historyService: HistoryService,
        private readonly dragDropUtilsService: DragDropUtilsService,
        private readonly planogramCommonService: PlanogramCommonService,
        public readonly planogramStore: PlanogramStoreService,
        collision: CollisionService,
        public moveFixtureService: MoveFixtureService

    ) {
        super(
            data,
            notifyService,
            translateService,
            sharedService,
            planogramService,
            historyService,
            planogramStore,
            collision,
        );
        this.usedWidth = data.Dimension.Width;
        this.dragDropSettings.drop = false;
    }

    public getType(): string {
        return AppConstantSpace.BLOCK_FIXTURE;
    }
    public calculateDistribution(ctx: Context): void {
        this.Fixture.Capacity = 0;
        this.Fixture.FixtureWeightCapacity = 0;
        this.Children.forEach((position) => {
            if (position.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                position.calculateWeightCapacity();
                //This will be the total weight of all positions in that fixture.
                this.Fixture.FixtureWeightCapacity += position.Position.PositionWeightCapacity;
            }
        });
    }
    public computeMerchHeight(ctx: Context): void {
        this.Dimension.Width = this.Fixture.Width;
        this.Dimension.Height = this.Fixture.Height;
        this.Dimension.Depth = this.Fixture.Depth;

        this.ChildDimension.Width = this.Dimension.Width;
        this.ChildDimension.Height = this.Dimension.Height;
        this.ChildDimension.Depth = this.Dimension.Depth;
        this.ChildOffset.X = 0;
        this.ChildOffset.Y = 0;
        this.ChildOffset.Z = 0;
    }

    public moveSelectedToCart(ctx: Context, cart: ShoppingCart): void {
        const currentParentObj = this.sharedService.getParentObject(this, this.$sectionID);
        const currentShelfIndex = currentParentObj.Children.indexOf(this);

        this.IDPOGObjectParent = null;
        this.IDPOGObject = null;
        this.Fixture.IDPOGObject = null;

        this.TempId = Utils.generateUID();

        const deletedBlock = currentParentObj.Children.splice(currentShelfIndex, 1);
        const original = ((currentParentObj, idex) => {
            return () => {
                currentParentObj.Children.splice(idex, 1);
            };
        })(currentParentObj, currentShelfIndex);
        const revert = ((currentParentObj, idex, shelf) => {
            return () => {
                currentParentObj.Children.splice(idex, 0, shelf[0]);
            };
        })(currentParentObj, currentShelfIndex, deletedBlock);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'DeleteFixtures',
        }, this.$sectionID);
    }

    public getXPosToPog(): number {
        let xPos = 0;
        const parentObj = this.sharedService.getParentObject(this, this.$sectionID);
        if (parentObj && parentObj.ObjectType !== 'POG') {
            xPos = parentObj.Location.X;
        }
        return xPos + this.Location.X;
    }

    public getYPosToPog(): number {
        let yPos = 0;
        const parentObj = this.sharedService.getParentObject(this, this.$sectionID);
        if (parentObj.ObjectType !== 'POG') {
            yPos = parentObj.Location.Y;
        }
        return yPos + this.Location.Y;
    }

    public getZPosToPog(): number {
        let zPos = 0;
        const parentObj = this.sharedService.getParentObject(this, this.$sectionID);
        if (parentObj && parentObj.ObjectType !== 'POG') {
            zPos = parentObj.Location.Z;
        }
        return zPos + this.Location.Z;
    }

    public getXPosRelative(xCord: number): number {
        const rootObject = this.sharedService.getObject(this.$sectionID, this.$sectionID);
        const bayList = rootObject.Children;

        let shelfXpos = xCord;
        for (const bay of bayList) {
            if (Utils.checkIfBay(bay)) {
                const x1Cord = bay.Location.X;
                const x2Cord = x1Cord + bay.Dimension.Width;
                if (xCord >= x1Cord && xCord < x2Cord) {
                    shelfXpos = xCord - x1Cord;
                    break;
                }
            }
        }
        if (shelfXpos < 0) {
            shelfXpos = 0;
        }
        return shelfXpos;
    }

    public getYPosRelative(yCord: number): number {
        //future implementation
        return yCord;
    }

    public findRelativeXposToBay(XposToPog: number, bayList: Modular[]): number {
        const rootObject = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        let shelfXpos = XposToPog;
        if (!bayList) {
            bayList = rootObject.Children;
        }

        for (const bay of bayList) {
            if (Utils.checkIfBay(bay)) {
                const x1Cord = bay.Location.X;
                const x2Cord = x1Cord + bay.Dimension.Width;
                if (XposToPog >= x1Cord && XposToPog < x2Cord) {
                    shelfXpos = XposToPog - x1Cord;
                    break;
                }
            }
        }
        if (shelfXpos < 0) {
            shelfXpos = 0;
        }
        return shelfXpos;
    }

    public findIntersectBayAtXpos(XposToPog: number, bayList?: Modular[]): Modular {
        const rootObject = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        if (!bayList) {
            bayList = rootObject.Children;
        }
        for (const bay of bayList) {
            if (Utils.checkIfBay(bay)) {
                const x1Cord = bay.Location.X;
                const x2Cord = x1Cord + bay.Dimension.Width;
                if (XposToPog >= x1Cord && XposToPog < x2Cord) {
                    return bay;
                }
            }
        }
        return;
    }

    public findIntersectShelfAtYpos(yposToPog: number, bayList: FixtureList[]): FixtureList {
        const sortedShelfs: FixtureList[] = Utils.sortByYPos(bayList);
        for (const sortedShelf of sortedShelfs) {
            if (
                Utils.checkIfPegboard(sortedShelf) ||
                Utils.checkIfstandardShelf(sortedShelf) ||
                Utils.checkIfBlock(sortedShelf)
            ) {
                const y1Cord = sortedShelf.Location.Y;
                const y2Cord = y1Cord + sortedShelf.Dimension.Height;
                if (yposToPog >= y1Cord && yposToPog <= y2Cord) {
                    return sortedShelf;
                }
            }
        }
        return;
    }
    public minHeightRequired(): number {
        return this.Dimension.Height;
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
        const rootObj = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        const isBayPresents = rootObj.isBayPresents;
        const oldIdParent = this.$idParent;
        if (isBayPresents) {
            const dropBay = withFix.findIntersectBayAtXpos(XCord1ToPog);
            if (dropBay !== undefined && dropBay !== null && oldIdParent !== dropBay.$id) {
            }
        }
        this.Location.X = XCord1;

        const intersectingShelfYPos = withFix.getIntersectingShelfAboveInfo(ctx).Y;
        const currentMerchHt = intersectingShelfYPos - (YCord1 + this.minHeightRequired());
        if (currentMerchHt >= 0) {
            let intersectingFixtures = this.getBottomIntersectingFixture(ctx, XCord1ToPog, YCord1);

            if (intersectingFixtures.length) {
                for (const intFix of intersectingFixtures) {
                    const merchHt = intFix.Location.Y + intFix.minHeightRequired();
                    if (merchHt < YCord1) {
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
        return flag;
    }

    public getBottomIntersectingFixture(ctx: Context, XCord1: number, YCord1: number) {
        //TODO add return type
        const belowFixturesList = [];
        const XCord2 = XCord1 + this.Dimension.Width;
        // for Worksheet Grid ItemData is different

        for (const ordLimShelf of ctx.allLimitingShelvesYPosDesc.filter(it => it !== this)) {
            const shelfCompleteWidth = ordLimShelf.getXPosToPog() + ordLimShelf.Dimension.Width;
            const shelfCompleteHeight = ordLimShelf.Location.Y + ordLimShelf.minHeightRequired();
            if (
                ordLimShelf.Location.Y <= YCord1 &&
                shelfCompleteHeight >= YCord1 &&
                ordLimShelf.getXPosToPog() < XCord2 &&
                shelfCompleteWidth > XCord1
            ) {
                if (
                    ordLimShelf.Dimension.Width === this.Dimension.Width &&
                    ordLimShelf.getXPosToPog() === this.getXPosToPog()
                ) {
                    const STopCenterXCood =
                        (ordLimShelf.getXPosToPog() + (ordLimShelf.getXPosToPog() + ordLimShelf.Dimension.Width)) / 2;
                    const thisCenterXCood = (XCord1 + XCord2) / 2;
                    if (STopCenterXCood === thisCenterXCood) {
                        belowFixturesList.push(ordLimShelf);
                    }
                } else {
                    belowFixturesList.push(ordLimShelf);
                }
            }
        }
        return Utils.sortByYPosDesendingOrder(belowFixturesList);
    }

    //used by position and Pegboard
    //if param <position> is passed then it finds intersecting standard shelf for the position
    //if param <postion> is null then it finds the intersecting standard shelf for the standard shelf
    //returns an object i.e. Pegboard responsible for intersection
    public getIntersectingShelfAboveInfo(ctx: Context, position?: Position): IntersectingShelfAboveInfo {
        //default init to the fixture object it called
        let XCord1 = this.getXPosToPog(),
            XCord2 = this.getXPosToPog() + this.Dimension.Width,
            YCord = this.Location.Y;

        //if position is not null then take the absolute co-ordinate of the position
        //override default init to position obj from parameter
        if (position) {
            XCord1 = position.getXPosToPog();
            XCord2 = position.getXPosToPog() + position.Dimension.Width;
            YCord = position.getYPosToPog();
        }

        const rootObj = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        let orderedLimitingShelves = ctx.allLimitingShelvesYPosAsc.filter(it => it !== this);

        let responsibleY = 0;
        let responsibleSlope = 0;
        let responsibleDepth = 0;
        let responsibleThickness = 0;
        let flag = true;
        while (flag) {
            let shelfList = this.getImmediateTopShelf(YCord, orderedLimitingShelves);
            if (shelfList.length === 0) {
                flag = false;
                responsibleY = rootObj.Dimension.Height;
                responsibleDepth = rootObj.Dimension.Depth;
                responsibleSlope = 0;
                responsibleThickness = 0;
            }
            for (const shelf of shelfList) {
                if (this.IsIntersecting(shelf, XCord1, XCord2)) {
                    flag = false;
                    responsibleY = shelf.Location.Y;
                    responsibleDepth = shelf.Dimension.Depth;
                    responsibleSlope = shelf.Rotation.X;
                    responsibleThickness = shelf.Fixture.Thickness;
                    break;
                }
            }

            if (flag) {
                YCord = shelfList[0].Location.Y;
            }
        }

        if (responsibleY === 0) {
        }
        return { Y: responsibleY, Slope: responsibleSlope, Depth: responsibleDepth, Thickness: responsibleThickness };
    }

    public getImmediateTopShelf(YCord: number, orderedPegboard: FixtureList[]): FixtureList[] {
        let list = [];
        let flag = false;
        let currY = 0;
        for (const ordPeg of orderedPegboard) {
            if (ordPeg.Location.Y > YCord && !flag) {
                flag = true;
                currY = ordPeg.Location.Y;
            }

            if (flag && currY === ordPeg.Location.Y) {
                list.push(ordPeg);
            }
        }
        return list;
    }
    public IsIntersecting(stop: FixtureList, xCord1: number, xCord2: number): boolean {
        if (stop.getXPosToPog() > xCord1 && stop.getXPosToPog() < xCord2) {
            return true;
        }
        if (
            stop.getXPosToPog() + stop.Dimension.Width > xCord1 &&
            stop.getXPosToPog() + stop.Dimension.Width < xCord2
        ) {
            return true;
        }

        if (stop.Dimension.Width > this.Dimension.Width) {
            if (xCord1 > stop.getXPosToPog() && xCord1 < stop.getXPosToPog() + stop.Dimension.Width) {
                return true;
            }
            if (xCord2 > stop.getXPosToPog() && xCord2 < stop.getXPosToPog() + stop.Dimension.Width) {
                return true;
            }
        }

        if (stop.Dimension.Width === this.Dimension.Width) {
            const STopCenterXCood = (stop.getXPosToPog() + (stop.getXPosToPog() + stop.Dimension.Width)) / 2;
            const thisCenterXCood = (xCord1 + xCord2) / 2;
            if (STopCenterXCood === thisCenterXCood) {
                return true;
            }
        }

        return false;
    }

    public moveFixture(
        proposedX1PosToPog: number,
        proposedYPosToPog: number,
        proposedWidth: number,
        propertygrid?: FromPropertyGrid,
    ): boolean {
        return this.moveFixtureService.moveFixtureType(proposedX1PosToPog, proposedYPosToPog, this, proposedWidth, propertygrid);
    }


    public removeFixtureFromSection(): void {
        const parentItemData = this.sharedService.getParentObject(this, this.$sectionID);
        const currentShelfIndex = parentItemData.Children.indexOf(this);
        this.IDPOGObjectParent = null;
        this.IDPOGObject = null;
        this.Fixture.IDPOGObject = null;
        let deletedShelf = parentItemData.Children.splice(currentShelfIndex, 1);
    }

    public addFixtureFromGallery(
        ctx: Context,
        parentData: Modular,
        proposedXPosToPog: number,
        proposedYPosToPog: number,
        proposedWidth: number,
    ): boolean {
        const rootObj = ctx.section;
        const isFitCheckRequired = rootObj.fitCheck;
        const sectionWidth = rootObj.Dimension.Width;
        const sectionHeight = rootObj.Dimension.Height;
        const pegboardStartYCoord = proposedYPosToPog;
        const pegboardEndYCoord = proposedYPosToPog + this.Fixture.Height;
        const pegboardStartXCoord = proposedXPosToPog;
        const pegboardEndXCoord = proposedXPosToPog + proposedWidth;

        const addFixture = (parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth) => {

            //undo redo
            const original = ((obj, methodName, parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth) => {
                return () => {
                    methodName.call(obj, parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth);
                };
            })(this, addFixture, parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth);
            const revert = ((obj) => {
                return () => {
                    obj.removeFixtureFromSection();
                };
            })(this);
            this.historyService.captureActionExec({
                funoriginal: original,
                funRevert: revert,
                funName: 'addFixture',
            }, this.$sectionID);

            const rootObj = this.sharedService.getObject(parentData.$sectionID, parentData.$sectionID) as Section; //
            this.Location.Y = proposedYPosToPog;
            this.Location.X = this.getXPosRelative(proposedXPosToPog);
            this.Fixture.Width = proposedWidth;
            let dropIndex = 0;

            // finding dropIndex from Modular/Section
            for (const item of parentData.Children) {
                const shelfCompleteHt = item.Location.Y + item.Dimension.Height;
                if (item.ObjectDerivedType !== AppConstantSpace.SHOPPINGCARTOBJ) {
                    dropIndex++;
                    if (shelfCompleteHt > proposedYPosToPog) {
                        break;
                    }
                }
            }
            this.IDPOGObject = null;
            this.IDPOGObjectParent = parentData.IDPOGObject;
            this.setParentId(parentData.$id);
            parentData.Children.splice(dropIndex, 0, this);
            rootObj.computeMerchHeight(ctx);
            rootObj.applyRenumberingShelfs();
        };

        const revertBack = (msg, obj) => {
            this.dragDropUtilsService.revertBackFixtureGallery();
            this.notifyService.warn(msg);
            this.historyService.abandonCaptureActionExec(undefined, this.$sectionID);
            obj.$sectionID = null;
            obj.$id = null;
            return false;
        };

        //check if the pegboard fits into section container logic
        //because Pegboard child dimension doesn't change
        let doesPegboardFitsInSection = false;
        if (pegboardStartXCoord >= 0 && pegboardStartYCoord >= 0) {
            if (pegboardEndXCoord <= sectionWidth && pegboardEndYCoord <= sectionHeight) {
                doesPegboardFitsInSection = true;
            }
        }

        if (!doesPegboardFitsInSection) {
            revertBack('Block doesnot fit well in the section', this);
            return false;
        }

        if (isFitCheckRequired) {
            let xPosRelative = this.getXPosRelative(proposedXPosToPog);
            let isValidFitcheck = this.doeShelfValidateFitCheck(ctx, xPosRelative, proposedYPosToPog, proposedXPosToPog);

            if (!isValidFitcheck) {
                revertBack(this.translate.instant('FITCHECH_ERR'), this);
                return false;
            }

            addFixture.call(this, parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth);
        } else {
            addFixture.call(this, parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth);
        }
        return true;
    }

    public findNotchWithKeykeyStroke(y: number, notchData, type: number, isMoveUp: boolean): number {
        let draopY = y;
        if (notchData !== undefined && notchData.length > 0 && type === 1) {
            if (isMoveUp) {
                for (const nData of notchData) {
                    if (y < nData) {
                        draopY = nData;
                        break;
                    }
                }
            } else {
                for (let j = notchData.length - 1; j >= 0; j--) {
                    if (y > notchData[j]) {
                        draopY = notchData[j];
                        break;
                    }
                }
            }
        } else {
            if (isMoveUp) {
                draopY += 0.5;
            } else {
                draopY -= 0.5;
            }
        }

        //bug fix
        if (draopY < 0) draopY = 0;

        return draopY;
    }

    public getZIndex(): number {
        return 1;
    }

    public initiateAdd(locationX: number, locationY: number, parentObj: Modular): void {
        const rootObj = this.sharedService.getObject(parentObj.$sectionID, parentObj.$sectionID);
        let copiedFixture: any = this;
        if (locationY > rootObj.Dimension.Height || locationY < 0) {
            this.notifyService.error('FIX_HEIGHT_EXCEEDING_SECTION');
            return;
        }
        copiedFixture.$$hashKey = null;
        copiedFixture.IDPOGObject = null;
        copiedFixture.Fixture.IDPOGObject = null;
        copiedFixture.IDPOGObjectParent = parentObj.IDPOGObject;
        this.planogramCommonService.extend(copiedFixture, true, parentObj.$sectionID);
        this.planogramCommonService.setParent(copiedFixture, parentObj);
        copiedFixture.Children.forEach((obj) => {
            obj.$$hashKey = null;
            obj.IDPOGObject = null;
            obj.IDPOGObjectParent = copiedFixture.IDPOGObject;
            this.planogramCommonService.extend(obj, true, copiedFixture.$sectionID);
            this.planogramCommonService.setParent(obj, copiedFixture);
        });

        copiedFixture.Location.X = locationX;
        copiedFixture.Location.Y = locationY;
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

    public addCopiedFixtureToTopORBottom(ctx: Context, fixtureObj: FixtureList): void {
        const locationX = this.Location.X;
        const locationYTop = this.Location.Y + this.Dimension.Height;
        const locationYBottom = this.Location.Y - fixtureObj.Dimension.Height;
        const parentObj = this.sharedService.getParentObject(this, this.$sectionID);
        const rootObj = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        const sectionWidth = rootObj.Dimension.Width;
        const isFitCheckRequired = rootObj.fitCheck;

        const isExceedsSectionWidth = fixtureObj.Dimension.Width + this.getXPosToPog() > sectionWidth ? true : false;
        if (isExceedsSectionWidth) {
            this.notifyService.error('FIX_WIDTH_EXCEEDING_SECTION');
            return;
        }
        const proposedYPosToPog = rootObj.getNearestYCoordinate(locationYTop);
        if (isFitCheckRequired) {
            let isValidFitcheck = fixtureObj.doeShelfValidateFitCheck(ctx, locationX, proposedYPosToPog, this.getXPosToPog());
            if (!isValidFitcheck) {
                const proposedYPosToPog_Bottom = rootObj.getNearestYCoordinate(locationYBottom);
                isValidFitcheck = fixtureObj.doeShelfValidateFitCheck(ctx, locationX, proposedYPosToPog_Bottom, this.getXPosToPog());
                if (!isValidFitcheck) {
                    this.notifyService.error('FITCHECH_ERR');
                    return;
                }
                fixtureObj.initiateAdd(locationX, proposedYPosToPog_Bottom, parentObj);
                return;
            }
            fixtureObj.initiateAdd(locationX, proposedYPosToPog, parentObj);
        } else {
            fixtureObj.initiateAdd(locationX, proposedYPosToPog, parentObj);
        }
    }

    public addCopiedFixtureToLocation(ctx: Context, proposedXPosToPOG: number, proposedYPosToPOG: number, selectedObj): void {
        const rootObj = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        const isFitCheckRequired = rootObj.fitCheck;
        const isBayPresents = rootObj.isBayPresents;
        const sectionWidth = rootObj.Dimension.Width;
        let pastingFixture = this;
        let pasteOverObj; // Section always  have bays

        //if (isBayPresents) {  // section will always  be there  with one  bay
        let dropBay = this.findIntersectBayAtXpos(proposedXPosToPOG);
        if (dropBay !== null) {
            pasteOverObj = dropBay;
        }
        // }

        const isExceedsSectionWidth = pastingFixture.Dimension.Width + proposedXPosToPOG > sectionWidth ? true : false;
        if (isExceedsSectionWidth) {
            this.notifyService.error('FIX_WIDTH_EXCEEDING_SECTION');
            return;
        }
        const xPosRelative = this.getXPosRelative(proposedXPosToPOG);
        if (isFitCheckRequired) {
            const isValidFitcheck = this.doeShelfValidateFitCheck(
                ctx,
                xPosRelative,
                proposedYPosToPOG,
                proposedXPosToPOG,
                selectedObj,
            );

            if (!isValidFitcheck) {
                this.notifyService.warn('FITCHECH_ERR');
                return;
            }
            pastingFixture.initiateAdd(xPosRelative, proposedYPosToPOG, pasteOverObj);
        } else {
            pastingFixture.initiateAdd(xPosRelative, proposedYPosToPOG, pasteOverObj);
        }
    }
    public setFitCheckErrorMessages(code: number): void {
        const original = ((code) => {
            return () => {
                this.Fixture.LKFitCheckStatus = code;
                this.updateFitCheckStatusText();
            };
        })(code);
        const revert = ((code) => {
            return () => {
                this.Fixture.LKFitCheckStatus = code;
                this.updateFitCheckStatusText();
            };
        })(this.Fixture.LKFitCheckStatus);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'MoveFixtures',
        }, this.$sectionID);
        /*undo-redo ends here*/
        this.Fixture.LKFitCheckStatus = code;
        this.updateFitCheckStatusText();
    }

    public fixtureFlip(): void {
        const original = (() => {
            return () => {
                this.fixtureFlip();
            };
        })();
        const revert = (() => {
            return () => {
                this.fixtureFlip();
            };
        })();
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'fixtureFlip',
        });
        /*undo-redo ends here*/

        let currentFixture = this;
        const tempSnapLeft = currentFixture.Fixture.SnapToLeft;
        currentFixture.Fixture.SnapToLeft = currentFixture.Fixture.SnapToRight;
        currentFixture.Fixture.SnapToRight = tempSnapLeft;
    }

    public asBlockFixture(): BlockFixture {
        return this;
    }

}
