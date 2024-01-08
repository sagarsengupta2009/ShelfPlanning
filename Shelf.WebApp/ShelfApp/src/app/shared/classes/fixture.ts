import { TranslateService } from '@ngx-translate/core';
import { AppConstantSpace } from '../constants';
import { CollisionService, NotifyService, PlanogramService, PlanogramStoreService } from '../services';
import { FixtureList, SharedService, } from '../services/common/shared/shared.service';
import { PlanogramObject } from './planogram-object';
import { Utils } from '../constants/utils';
import { HistoryService } from '../services/common/history/history.service';
import { IDragDropSettings } from '../drag-drop.module';
import {
    FromPropertyGrid, FourDirectionValues, LogStackMax,
    LogStackListObject, DrawingList, Size3, Location,
    ValidaMoveParams, NextLocXDirection, NextLocYDirection,
    FixtureObjectResponse, RectangleCoordinates2d, ClipBoardTempItem
} from '../models';
import { Modular, Position, Section, ShoppingCart } from '.';
import { Context } from './context';

export class Fixture extends PlanogramObject {

    public ObjectDerivedType: 'Fixture' | 'Grill' | 'BlockFixture' | 'Modular' | 'StandardShelf' | 'ShoppingCart' | 'Pegboard' | 'Slotwall' | 'Crossbar' | 'Divider' | 'CoffinCase' | 'Basket';
    public dragDropSettings: IDragDropSettings = { drag: false, drop: false };
    public ObjectType: string = 'Fixture';
    public ParentKey?: string;
    public minMerchHeight: number;
    public selected: boolean = false;
    public isLoaded: boolean = false;
    public temp: ClipBoardTempItem; // TODO: What does this do?
    public uiFixtureProperties: string[] = ['minMerchHeight', 'selected', 'isLoaded', 'dragDropSettings', 'ObjectDerivedType',

  ];
    constructor(
        data: FixtureObjectResponse,
        public notifyService: NotifyService,
        public translate: TranslateService,
        public sharedService: SharedService,
        public planogramService: PlanogramService,
        public historyService: HistoryService,
        public planogramStore: PlanogramStoreService,
        protected collision: CollisionService,
    ) {
        super(sharedService, data);
        this.dragDropSettings.drag = data.Fixture.IsMovable;
    }
    protected $blocks = []; //todo @karthik Please need your help here.

    public getType(): string {
        return AppConstantSpace.FIXTUREOBJ;
    }

    public override asFixture(): Fixture {
        return this;
    }

    public intersect(positionDirection: FourDirectionValues): boolean {
        const fixtureDirection: FourDirectionValues = {
            left: this.Location.X,
            top: this.Location.Y,
            right: this.Location.X + this.Dimension.Width,
            bottom: this.Location.Y + this.Dimension.Height,
        };
        return positionDirection.left > fixtureDirection.left && positionDirection.left < fixtureDirection.right;
    }
    // public moveBetweenBays(newX: number, newY: number, dragScope, dragScopeChildren:[], dropScopecChildren:[], dropIndex: number, dragIndex: number): void {}
    // Try avoiding using the child class specific functions in parent class.
    public moveFixture(
        proposedX1PosToPog: number,
        proposedYPosToPog: number,
        proposedWidth: number,
        propertygrid?: FromPropertyGrid,
    ): void { }

    public getColor() {
        return this.Fixture.Color;
    }
    public findIntersectBayAtXpos(xPosToPog: number, bayList?: Modular[]): Modular {
        if (!bayList) {
            const rootObject = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
            bayList = rootObject.Children;
        }
        for (const bay of bayList) {
            if (bay.asModular()) {
                const x1Cord = bay.Location.X;
                const x2Cord = x1Cord + bay.Dimension.Width;
                if (xPosToPog >= x1Cord && xPosToPog <= x2Cord) {
                    return bay;
                }
            }
        }
        return null;
    }

    public changeFixWidth(newWidth: number, locX: number): void {
        const oldWidth = this.Dimension.Width,
            oldLocX = this.Location.X;
        const original = ((that, xPosToPog, locX) => {
            return () => {
                that.Fixture.Width = that.Dimension.Width = xPosToPog;
                that.Location.X = locX;
                const rootObject = that.sharedService.getObject(that.$sectionID, that.$sectionID) as  Section;
                rootObject.reassignLocationXofBays();
            };
        })(this, newWidth, locX);
        const revert = ((that, oldWidth, oldLocX) => {
            return () => {
                that.Fixture.Width = that.Dimension.Width = oldWidth;
                that.Location.X = oldLocX;
                const rootObject = that.sharedService.getObject(that.$sectionID, that.$sectionID) as Section;
                rootObject.reassignLocationXofBays();
            };
        })(this, oldWidth, oldLocX);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'FixtureWidthChange',
        });
        this.Fixture.Width = this.Dimension.Width = newWidth;
        this.Location.X = locX;
    }

    public getNotchThicknes(): number {
        return 0;
    }

    public isLogStack(position: Position): boolean {
        const IDMerchStyle =
            typeof position.Position.IDMerchStyle === 'string'
                ? Number(position.Position.IDMerchStyle)
                : position.Position.IDMerchStyle;
        const iDMerchStyleExists = [AppConstantSpace.MERCH_MANUAL, AppConstantSpace.MERCH_BEHIND, AppConstantSpace.MERCH_ABOVE].indexOf(Number(position.Position.IDMerchStyle));
        return (iDMerchStyleExists == -1 && Math.floor(IDMerchStyle / 100) == Math.floor(AppConstantSpace.MERCH_PYRAMID_BASE / 100));
    }
    public logDirection(width: number, height: number, depth: number): string {
        const diffX = Math.abs(height - depth);
        const diffY = Math.abs(width - depth);
        const diffZ = Math.abs(height - width);
        let lType = 'X';
        if (diffY < Math.min(diffX, diffZ)) lType = 'Y';
        if (diffZ < Math.min(diffX, diffY)) lType = 'Z';
        return lType;
    }

    public logStack(iDMerchStyle: number, width: number, height: number, depth: number, facings: number, UnreducedMerchHeight: number, merchDepth: number, max: LogStackMax): DrawingList {
        const round = (value: any, decimals: any) => {
            const data: any = value + 'e' + decimals;
            return Number(Math.round(data) + 'e-' + decimals);
        };
        const makeListObj = (lType, x, y, z, wide, blocks): LogStackListObject => {
            let listObj: LogStackListObject = null;
            // need to switch dimension to match orientation
            switch (lType) {
                case 'X':
                    listObj = { x: z, y: y, z: -x, wide: blocks, high: 1, deep: lWide };
                    break;
                case 'Y':
                    listObj = { x: y, y: z, z: -x, wide: 1, high: blocks, deep: lWide };
                    break;
                case 'Z':
                    listObj = { x: x, y: y, z: -z, wide: lWide, high: 1, deep: blocks };
                    break;
            }
            return listObj;
        };
        const lType: string = this.logDirection(width, height, depth);
        let shelfHeight: number = 0,
            shelfDepth: number = 0,
            shelfWidth: number = 0,
            positionDepth: number = 0,
            positionWidth: number = 0,
            maxX: number = 100,
            maxY: number = 100,
            maxZ: number = 100;
        switch (lType) {
            case 'X':
                shelfHeight = UnreducedMerchHeight;
                shelfWidth = merchDepth;
                shelfDepth = round(width * facings, 4);
                positionDepth = depth;
                positionWidth = width;
                maxX = max.deep;
                maxY = max.high;
                maxZ = max.wide;
                break;
            case 'Y':
                shelfDepth = UnreducedMerchHeight;
                shelfWidth = merchDepth;
                shelfHeight = round(width * facings, 4);
                positionDepth = width;
                positionWidth = height;
                maxX = max.deep;
                maxY = max.wide;
                maxZ = max.high;
                break;
            case 'Z':
                shelfHeight = UnreducedMerchHeight;
                shelfDepth = merchDepth;
                shelfWidth = round(width * facings, 4);
                positionDepth = width;
                positionWidth = depth;
                maxX = max.wide;
                maxY = max.high;
                maxZ = max.deep;
                break;
        }
        let blocks = Math.floor(round(shelfDepth / positionWidth, 4));
        let countHigh = Math.floor(round(((shelfHeight / positionDepth - 1) * 2) / Math.sqrt(3), 4)) + 1;
        let Wide = Math.floor(round(shelfWidth / positionDepth, 4));
        blocks = Math.min(blocks, maxZ);
        countHigh = Math.min(countHigh, maxY);
        //Temp fix to load the planogram in uat environment 19th Mar 2017 Narendra
        countHigh = countHigh <= 0 || isNaN(countHigh) ? 1 : countHigh;
        Wide = Math.min(Wide, maxX);
        let drawingList: DrawingList = { listObject: [] };

        const halfSqrt3 = Math.sqrt(3) / 2;
        const r = 0.5 * positionDepth;
        const dem = positionDepth;
        const maxDeep = Math.min(round(Wide * dem + r, 4), shelfWidth);
        let lWide = Wide;
        const z = 0;

        switch (iDMerchStyle) {
            case AppConstantSpace.MERCH_RECTANGLE_LOG:
                for (let i = 0; i < countHigh; i++) {
                    lWide = Wide;
                    const x = r * (i % 2);
                    while (round(x + lWide * dem, 4) > maxDeep) {
                        lWide--;
                        if (lWide <= 0) break;
                    }
                    const y = i * halfSqrt3 * dem;
                    const listObj = makeListObj(lType, x, y, z, lWide, blocks);
                    drawingList.listObject.push(listObj);
                }
                break;
            case AppConstantSpace.MERCH_PYRAMID:
                for (let i = 0; i < countHigh; i++) {
                    const x = r * i;
                    const y = i * halfSqrt3 * dem;
                    const listObj = makeListObj(lType, x, y, z, lWide, blocks);
                    drawingList.listObject.push(listObj);
                    lWide--;
                    if (lWide <= 0) {
                        countHigh = i + 1;
                        break;
                    }
                }
                break;
            case AppConstantSpace.MERCH_HALF_PYRAMID:
                for (let i = 0; i < countHigh; i++) {
                    const x = r * i;
                    lWide = Wide;
                    while (round(x + lWide * dem, 4) > maxDeep) {
                        lWide--;
                        if (lWide <= 0) {
                            countHigh = i + 1;
                            break;
                        }
                    }
                    const y = i * halfSqrt3 * dem;
                    const listObj = makeListObj(lType, x, y, z, lWide, blocks);
                    drawingList.listObject.push(listObj);
                }
                break;
        }
        drawingList.listObject.sort((a, b) => {
            return a.z == b.z ? a.y - b.y : a.z - b.z;
        });
        switch (lType) {
            case 'X':
                drawingList.facingsY = countHigh;
                drawingList.facingsZ = Wide;
                drawingList.shape = 'CylX';
                break;
            case 'Y':
                drawingList.facingsY = blocks;
                drawingList.facingsZ = Wide;
                drawingList.shape = 'CylY';
                break;
            case 'Z':
                drawingList.facingsY = countHigh;
                drawingList.facingsZ = blocks;
                drawingList.shape = 'CylZ';
                break;
        }

        if (drawingList != null && drawingList.listObject.length <= 0) drawingList = null;

        return drawingList;
    }

    public validate(): boolean {
        return true;
    }

    public getUsedLinear(): void { }

    public getUsedCubic(): void { }

    public getUnUsedLinear(): void { }
    public isBaysEnabled(): boolean {

        if (!this.Fixture.IsMerchandisable && this.Fixture.FixtureType === AppConstantSpace.FIXTUREOBJ) {
            return true;
        }
        return false;
    }
    public moveSelectedToCart(ctx: Context, shoppingCart: ShoppingCart): void {
        const currentParentObj = this.sharedService.getParentObject(this, this.$sectionID);
        const currentShelfIndex = currentParentObj.Children.indexOf(this);
        const len = this.Children !== undefined ? this.Children.length : 0;
        for (let i = len - 1; i >= 0; i--) {
            const child = this.Children[i];
            if (typeof child === 'object' && typeof child.moveSelectedToCart === 'function') {
                child.moveSelectedToCart(ctx, shoppingCart);
            }
        }
        //feature undo-redo: by abhishek
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
        return 1;
    }
    public getMaxMerchPOSHeight(position: Position, aboveShelfs: FixtureList[], merchHeightPrev?: number): number {
        let allPositions = [];
        aboveShelfs.forEach(function (item) {
            if ('getAllPosition' in item) {
                allPositions = allPositions.concat(item.getAllPosition());
            }
        });
        const merchHeight = Math.max(0, this.ChildDimension.Height, merchHeightPrev);

        const xstart = position.getXPosToPog();
        const xend = xstart + position.linearWidth();
        const ystart = position.getYPosToPog();
        const yend = ystart + merchHeight;

        const rect1: RectangleCoordinates2d = { xstart, xend, ystart, yend };

        const intersectingLocY = position.getYPosToPog(),
            intersectPos = [];
        allPositions.forEach((item) => {

            const xstart = item.getXPosToPog();
            const xend = xstart + item.Dimension.Width;
            const ystart = item.getYPosToPog();
            const yend = ystart + item.getRectDimension().height;

            const rect2: RectangleCoordinates2d = { xstart, xend, ystart, yend };

            if (this.collision.isIntersecting2D(rect1, rect2, this.planogramStore.appSettings.FITCHECKTOLERANCE)) {
                if (intersectingLocY < item.getYPosToPog()) {
                    intersectPos.push(item.getYPosToPog());
                }
            }
        });
        if (intersectPos.length == 0) {
            return merchHeight;
        }
        const minYPos = Math.min.apply(Math, intersectPos);
        return minYPos - intersectingLocY >= position.computeHeight()
            ? minYPos - intersectingLocY
            : position.computeHeight();
    }
    public getRectDimension(): Size3 {
        return { height: this.Dimension.Height, width: this.Dimension.Width, depth: this.Dimension.Depth };
    }

    public getBottomThickness(): number {
        //By defalut to get the bottom thickness of any fixture.
        return this.Fixture.Thickness;
    }

    public getSideThickness(): number {
        return 0;
    }

    public getFrontThickness(): number {
        return 0;
    }

    public getFrontLocation(): Location {
        return this.Location;
    }
    //This is for Clipboard SVG generation. to know max linear height of the positoin in SS
    public maxHeightRequired(): number {
        return this.Dimension.Height;
    }

    //It will check basic validation like change causing crossing the height and width
    public isBasicValidMove(validObj: ValidaMoveParams) {
        if (validObj) {
            if (validObj.forSelf || validObj.forBoth) {
                if (!Utils.isNullOrEmpty(validObj.height) && validObj.height) {
                    if (!Utils.isNullOrEmpty(validObj.newHeight) && validObj.newHeight > this.Dimension.Height) {
                        return { flag: false, errMsg: this.translate.instant('ITEM_HEIGHT_EXCEEDING_FIXTURE_HEIGHT') };
                    }
                }
                if (!Utils.isNullOrEmpty(validObj.width) && validObj.width) {
                    if (!Utils.isNullOrEmpty(validObj.newWidth) && validObj.newWidth > this.Dimension.Width) {
                        return { flag: false, errMsg: this.translate.instant('ITEM_WIDTH_EXCEEDING_FIXTURE_WIDTH') };
                    }
                }
            } else if (validObj.forSection || validObj.forBoth) {
                const rootObj = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
                if (!Utils.isNullOrEmpty(validObj.height) && validObj.height) {
                    if (
                        !Utils.isNullOrEmpty(validObj.newHeight) &&
                        rootObj.fitCheck &&
                        (validObj.newHeight > rootObj.Dimension.Height || validObj.LocY < 0)
                    ) {
                        return { flag: false, errMsg: this.translate.instant('FIX_HEIGHT_EXCEEDING_SECTION') };
                    }
                }
                if (!Utils.isNullOrEmpty(validObj.width) && validObj.width) {
                    if (
                        !Utils.isNullOrEmpty(validObj.newWidth) &&
                        (validObj.newWidth > rootObj.Dimension.Width || validObj.LocX < 0)
                    ) {
                        return { flag: false, errMsg: this.translate.instant('FIX_WIDTH_EXCEEDING_SECTION') };
                    }
                }
            }
            return { flag: true };
        }
        return;
    }

    public updateFitCheckStatusText(): void {
        const fixtr: any = this;
        fixtr.Fixture.LKFitCheckStatustext = Utils.findObjectKey(
            this.planogramStore.lookUpHolder.FixtureFitCheckStatus.options,
            fixtr.Fixture.LKFitCheckStatus,
        );
    }

    public getChildOffsetX(): number {
        return 0;
    }

    public getLockErrorMsg(list: string | Array<string>): string {
        let msg = '';
        if (typeof list == 'string') {
            msg = list;
        } else {
            msg =
                list.length == 1
                    ? '[' + list.toString() + ']' + this.translate.instant('POSITOIN_LOCKED_CANT_MODIFY')
                    : '[' + list.toString() + ']' + this.translate.instant('POSITOINS_LOCKED_CANT_MODIFY');
        }

        return msg;
    }

    public getChildDimensionDepth(): number {
        let merchDepth: number = Math.max(0, this.Dimension.Depth);
        if (this.Fixture.MaxMerchDepth != null && this.Fixture.MaxMerchDepth > 0) {
            merchDepth = Math.min(this.Fixture.MaxMerchDepth, merchDepth);
        }
        return merchDepth;
    }

    public moveSelectedItemToRight(): void {
        this.moveSelectedFixtureToRight();
    }
    public moveSelectedItemToLeft(): void {
        this.moveSelectedFixtureToLeft();
    }
    public moveSelectedFixtureToRight(): void {
        const snapLeft = this.Fixture.SnapToLeft;
        const snapRight = this.Fixture.SnapToRight;
        const proposedYPosToPog = this.getYPosToPog();
        const rootObject = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        const uprights = rootObject.getAllAvailableXAxisIntervals();
        let proposedXPosToPog = this.getXPosToPog();
        let proposedWidth = this.Dimension.Width,
            nextInterval;
        if (snapRight) {
            if (true) {
                const getLocX = (rangeEnd, snapLeft) => {
                    rangeEnd = Utils.preciseRound(rangeEnd, 2);
                    const uprightIndex = uprights.indexOf(rangeEnd);
                    if (uprightIndex != -1) {
                        return snapLeft
                            ? uprights[uprightIndex]
                            : uprights[uprightIndex + 1]
                                ? uprights[uprightIndex + 1]
                                : undefined;
                    } else {
                        for (const [i, upright] of uprights.entries()) {
                            if (
                                rangeEnd > Utils.preciseRound(upright, 2) &&
                                rangeEnd <= Utils.preciseRound(uprights[i + 1], 2)
                            ) {
                                nextInterval = snapLeft ? uprights[i] : uprights[i + 1];
                                break;
                            }
                        }
                        return nextInterval;
                    }
                };
                const proposedXEnd = getLocX(proposedXPosToPog + proposedWidth, false);
                if (!Utils.isNullOrEmpty(proposedXEnd)) {
                    if (snapLeft) {
                        proposedXPosToPog = getLocX(proposedXEnd - proposedWidth, true);
                        proposedWidth = proposedXEnd - proposedXPosToPog;
                    } else {
                        proposedXPosToPog = proposedXEnd - proposedWidth;
                    }
                    this.moveFixture(proposedXPosToPog, proposedYPosToPog, proposedWidth);
                } else {
                    this.notifyService.warn("Can't move the fixture to right");
                    return;
                }
            }
        } else if (!snapLeft) {
            proposedXPosToPog = proposedXPosToPog + 0.5;
            this.moveFixture(proposedXPosToPog, proposedYPosToPog, proposedWidth);
        } else if (snapLeft) {
            const proposedXEnd = (function () {
                const rangeEnd = proposedXPosToPog;
                const uprightIndex = uprights.indexOf(rangeEnd);
                if (uprightIndex != -1) {
                    return uprights[uprightIndex + 1] ? uprights[uprightIndex + 1] : undefined;
                } else {
                    for (const [i, upright] of uprights.entries()) {
                        if (
                            rangeEnd > Utils.preciseRound(upright, 2) &&
                            rangeEnd <= Utils.preciseRound(uprights[i + 1], 2)
                        ) {
                            nextInterval = uprights[i + 1];
                            break;
                        }
                    }
                    return nextInterval;
                }
            })();
            if (!Utils.isNullOrEmpty(proposedXEnd)) {
                proposedXPosToPog = proposedXEnd;
                this.moveFixture(proposedXPosToPog, proposedYPosToPog, proposedWidth);
            } else {
                this.notifyService.warn("Can't move the fixture to right");
                return;
            }
        }
    }
    public getNextLocX(position: Position, dir?: NextLocXDirection, fixturePositionMovement?: number): number {
        return position.Location.X + (dir.left ? -(fixturePositionMovement) : fixturePositionMovement);
    }
    public getNextLocY(position: Position, dir?: NextLocYDirection): number {
        return position.Location.Y;
    }
    public checkIfLastPosition(position: Position): boolean {
        const currentIndex = this.Children.indexOf(position);
        return currentIndex == this.Children.length - 1;
    }
    public checkIfFirstPosition(position: Position): boolean {
        const currentIndex = this.Children.indexOf(position);
        return currentIndex == 0;
    }
    public moveSelectedFixtureToLeft(): void {
        let snapLeft = this.Fixture.SnapToLeft,
            snapRight = this.Fixture.SnapToRight,
            proposedXPosToPog = this.getXPosToPog(),
            proposedYPosToPog = this.getYPosToPog(),
            proposedWidth = this.Dimension.Width;
        const rootObject = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        //get the next available upright and move
        let uprights = rootObject.getAllAvailableXAxisIntervals(),
            nextInterval;
        if (snapLeft) {
            if (true) {
                const getLocX = (rangeEnd, snapRight) => {
                    rangeEnd = Utils.preciseRound(rangeEnd, 2);
                    const uprightIndex = uprights.indexOf(rangeEnd);
                    if (uprightIndex > 0) {
                        return snapRight
                            ? uprights[uprightIndex]
                            : Utils.isNullOrEmpty(uprights[uprightIndex - 1])
                                ? undefined
                                : uprights[uprightIndex - 1];
                    } else {
                        for (const [i, upright] of uprights.entries()) {
                            if (
                                rangeEnd > Utils.preciseRound(upright, 2) &&
                                rangeEnd <= Utils.preciseRound(uprights[i + 1], 2)
                            ) {
                                nextInterval = snapRight ? uprights[i + 1] : uprights[i];
                                break;
                            }
                        }
                        return nextInterval;
                    }
                };
                const proposedX = getLocX(proposedXPosToPog, false);
                if (!Utils.isNullOrEmpty(proposedX)) {
                    if (snapRight) {
                        const proposedXEnd = getLocX(proposedX + proposedWidth, true);
                        proposedWidth = proposedXEnd - proposedX;
                    }
                    proposedXPosToPog = proposedX;
                    this.moveFixture(proposedXPosToPog, proposedYPosToPog, proposedWidth);
                } else {
                    this.notifyService.warn("Can't move the fixture to left");
                    return;
                }
            }
        } else if (!snapRight) {
            proposedXPosToPog = proposedXPosToPog - 0.5;
            this.moveFixture(proposedXPosToPog, proposedYPosToPog, proposedWidth);
        } else if (snapRight) {
            const getLocX = (rangeEnd) => {
                rangeEnd = Utils.preciseRound(rangeEnd, 2);
                const uprightIndex = uprights.indexOf(rangeEnd);
                if (uprightIndex > 0) {
                    return Utils.isNullOrEmpty(uprights[uprightIndex - 1]) ? undefined : uprights[uprightIndex - 1];
                } else {
                    for (const [i, upright] of uprights.entries()) {
                        if (
                            rangeEnd > Utils.preciseRound(upright, 2) &&
                            rangeEnd <= Utils.preciseRound(uprights[i + 1], 2)
                        ) {
                            nextInterval = upright;
                            break;
                        }
                    }
                    return nextInterval;
                }
            };
            const proposedXEnd = getLocX(proposedXPosToPog + proposedWidth);
            if (!Utils.isNullOrEmpty(proposedXEnd)) {
                proposedXPosToPog = proposedXEnd - proposedWidth;
                this.moveFixture(proposedXPosToPog, proposedYPosToPog, proposedWidth);
            } else {
                this.notifyService.warn("CANT_MOVE_THE_FIXTURE");
                return;
            }
        }
    }

    public getChildDimensionWidth(): number {
        return this.Dimension.Width;
    }

    public getOffsetValueX(position: Position): number {
        return 0;
    }

    public getOffsetValueY(position: Position): number {
        return 0;
    }
    //@todo @naren Added deleted funcitons where we are using this method in other places. Comment to be removed in the next PR.
    public interchangeFixture(fromIndex: number, toIndex: number): void {
        let unqHistoryID = this.historyService.startRecording();
        /*feature undo-redo: Ravindra -
           dt. 16th Oct, 2014*/
        let that: any = this;
        let original = (function (that, fromIndex, toIndex) {
            return function () {
                that.interchangeFixture(fromIndex, toIndex)
            }
        })(that, fromIndex, toIndex);
        let revert = (function (that, toIndex, fromIndex) {
            return function () {
                that.interchangeFixture(toIndex, fromIndex)
            }
        })(that, toIndex, fromIndex);
        this.historyService.captureActionExec({
            'funoriginal': original,
            'funRevert': revert,
            'funName': 'interchangeFixture'
        }, this.$sectionID);
        /*undo-redo ends here*/
        let rootObject = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        let fromBayXpos = this.Location.X;
        let fromBayYpos = this.Location.Y;

        if (rootObject.Children.length > toIndex) {
            let dropBay = rootObject.Children[toIndex];
            this.Location.X = dropBay.Location.X;
            this.Location.Y = dropBay.Location.Y;

            dropBay.Location.X = fromBayXpos;
            dropBay.Location.Y = fromBayYpos;
        }

        rootObject.Children.splice(fromIndex, 1);
        rootObject.Children.splice(toIndex, 0, this);
        const ctx = new Context(this.section);
        rootObject.computeMerchHeight(ctx);
        this.planogramService.insertPogIDs([this], true);
        this.historyService.stopRecording(undefined, undefined, unqHistoryID);
    }
}
