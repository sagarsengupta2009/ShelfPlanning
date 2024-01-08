import * as _ from 'underscore';
import { Fixture } from './fixture';
import { AppConstantSpace } from '../constants/appConstantSpace';
import { TranslateService } from '@ngx-translate/core';
import { Orientation } from './orientation';
import { ElementRef } from '@angular/core';
import { Utils } from '../constants/utils';
import {
    NotifyService,
    PlanogramCommonService,
    HistoryService,
    PlanogramStoreService,
    PlanogramService,
    SharedService,
    CollisionService,
    CrunchMode,
    CrunchModeService,
    CrunchRect,
    MoveFixtureService,
    ParentApplicationService, Render2dService, ShelfbumpService
} from '../services';
import {
    Dimension,
    FromPropertyGrid,
    Location,
    Size3,
    SpreadSpanProperties,
    CoffincaseResponse,
    Dimension2,
    StyleCoffineCase,
    RefreshParams,
} from '../models';
import { Position } from './position';
import { Divider } from './divider';
import { DividerInfo, NextLocXDirection, NextLocYDirection, PackageBlock, PegHoleInfo, RectangleCoordinates2d, XYCords } from 'src/app/shared/models/planogram';
import { FixtureList, MerchandisableList, ObjectListItem } from '../services/common/shared/shared.service';
import { LimitingShelf, Section } from './section';
import { PegBoard } from './peg-board';
import { Annotation, Modular, StandardShelf } from '.';
import { ShoppingCart } from './shopping-cart';
import { Context } from './context';
import { AllocateUtilitiesService } from '../services/layouts/allocate/utilities/allocate-utilities.service';
import { cloneDeep } from 'lodash';
import { PositionRect } from '../services/layouts/crunch-mode/crunch-mode.service';
import { DividerTypes } from '../constants/fixtureCrunchModes';
import { Offset } from '../models/planogram/pog-object';
import { ShrinkService } from '../services/layouts/shrink/shrink.service';

declare const window: any;

export class Coffincase extends Fixture {
    ObjectDerivedType: 'CoffinCase' | 'Basket';
    Children: (Position | Divider)[];
    private _elementRef: ElementRef;

    isMerchandisable: boolean = true;
    AutoComputeFronts: boolean = true;
    UsedLinear: number = null;
    UsedSquare: number = 0;
    UsedCubic: number = 0;
    unUsedLinear: number = null;
    unUsedCubic: number;
    PercentageUsedSquare: number = 0;
    allowOverflow: boolean = true;
    enableBayProperty: boolean = false;
    minMerchHeight: number = 0;
    maxItemHeight: number = 0;
    isSpreadShelf: boolean = false;
    public LKCrunchMode?: number;

    spreadSpanProperties: SpreadSpanProperties = new SpreadSpanProperties();
    itemsInXaxis = [];
    private itemsInYaxis: Position[] = [];
    private DividerTypes = {
        Inherit: -1,
        None: 0,
        DividerLeft: 1,
        DividerFacingsLeft: 2,
        DividerRight: 3,
        DividerFacingsRight: 4,
        DividerLeftRight: 5,
        DividerFacingsLeftRight: 6,
        PositionOnSlot: 7,
        FacingonSlot: 8,
    };

    public placed: CrunchRect[];
    private OrientNS = new Orientation();
    private frontViewFlag?: boolean;
    private topViewFlag: boolean;
    public shrinkMode?: boolean;
    /** added by pog-drag-drop.service, if true prevents rePositionOnCrunch */
    public dragFlag?: boolean;
    public uiProperties: string[] = ['dragFlag', 'shrinkMode', 'topViewFlag', 'frontViewFlag', 'OrientNS',
    'placed', 'DividerTypes', 'itemsInYaxis', 'spreadSpanProperties', 'isSpreadShelf', 'maxItemHeight', 'minMerchHeight',
        'enableBayProperty', 'allowOverflow', 'PercentageUsedSquare', 'unUsedCubic', 'unUsedLinear', '_elementRef',];

    public allPosInXDirection: { [key: string]: Position[][] } = {};
    public allPosInYDirection: { [key: string]: Position[][] } = {};
    public doNotCalWH: boolean = false;

    constructor(
        data: CoffincaseResponse,
        public readonly notifyService: NotifyService,
        public readonly translateService: TranslateService,
        public readonly sharedService: SharedService,
        public readonly planogramService: PlanogramService,
        public readonly historyService: HistoryService,
        public readonly  planogramCommonService: PlanogramCommonService,
        public readonly planogramStore: PlanogramStoreService,
        public readonly collision: CollisionService,
        private readonly crunchMode: CrunchModeService,
        public readonly moveFixtureService: MoveFixtureService,
        public readonly parentApp: ParentApplicationService,
        public readonly render2d: Render2dService,
        public readonly allocateUtils: AllocateUtilitiesService,
        public readonly shelfBumpService: ShelfbumpService,
        public readonly shrinkService: ShrinkService
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
        this.dragDropSettings.drop = true;
    }

    public getType() {
        return AppConstantSpace.COFFINCASEOBJ as string;
    }
    // This method is already available in common mixin
    public getRenderingDimensionFor2D(): Dimension2 {
        if (this.frontViewFlag) {
            return {
                Width: this.ChildDimension.Width,
                Height: this.ChildDimension.Height,
            };
        }
        if (this.topViewFlag || this.Fixture.DisplayViews) {
            return {
                Width: this.ChildDimension.Width,
                Height: this.ChildDimension.Depth,
            };
        } else {
            return {
                Width: this.ChildDimension.Width,
                Height: this.ChildDimension.Height,
            };
        }
    }

    public getFrontLocation(frontViewFlag?: boolean, topViewFlag?: boolean): Location {
        if (frontViewFlag) {
            return this.Location;
        }
        if (topViewFlag || this.Fixture.DisplayViews) {
            return {
                X: this.Location.X,
                Y: this.Location.Y + this.Dimension.Height - (this.Dimension.Depth + this.Location.Z),
                Z: this.Location.Z,
            };
        } else {
            return this.Location;
        }
    }

    public getSelectFrontYToPog(): number {
        return this.getFrontLocation().Y;
    }

    public getRectDimension(): Size3 {
        return {
            height: this.Dimension.Height,
            width: this.Dimension.Width,
            depth: this.Dimension.Depth,
        };
    }

    protected getSelectRectDimension(): Size3 {
        let height = this.Dimension.Height;
        let depth = this.Dimension.Depth;
        if (this.Fixture.DisplayViews) {
            height = this.Dimension.Depth;
            depth = this.Dimension.Height;
        }
        return {
            height: height,
            width: this.Dimension.Width,
            depth: depth,
        };
    }

    getPosFrontYToPog(): number {
        let yPos = 0;
        let parentObj = this.parent;
        if (parentObj.ObjectType != 'POG') {
            yPos = parentObj.Location.Y;
        }
        const diff = this.Dimension.Depth - this.Dimension.Height;
        return yPos + this.Location.Y - diff;
    }

    public getRenderingChildOffsetFor2D(frontViewFlag?: boolean, topViewFlag?: boolean): { X: number; Y: number } {
        const info = this.getCoffinCaseInfo();
        if (frontViewFlag) {
            return {
                X: this.ChildOffset.X,
                Y: info.BottomThickness,
            };
        }
        if (topViewFlag || this.Fixture.DisplayViews) {
            return {
                X: this.ChildOffset.X,
                Y: info.FrontThickness,
            };
        } else {
            return {
                X: this.ChildOffset.X,
                Y: info.BottomThickness,
            };
        }
    }

    public getRenderingChildDimensionFor2D(): Dimension2 {
        return {
            Width: this.ChildDimension.Width,
            Height: this.Fixture.DisplayViews ? this.ChildDimension.Depth : this.ChildDimension.Height,
        };
    }

    public getCoffinCaseInfo(): Dimension & { SideThickness: number; FrontThickness: number; BottomThickness: number } {
        return {
            Height: this.Fixture.Height,
            Width: this.Fixture.Width,
            Depth: this.Fixture.Depth,
            SideThickness: this.Fixture._X04_WallWidth.ValData ? this.Fixture._X04_WallWidth.ValData : 0,
            FrontThickness: this.Fixture._X04_WallDepth.ValData ? this.Fixture._X04_WallDepth.ValData : 0,
            BottomThickness: this.Fixture.Thickness ? this.Fixture.Thickness : 0,
        };
    }

    private computeMerchHeight(ctx: Context): void {
      const rootObj: Section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
      rootObj.hasFixtureType[this.getType()] = true;
        const info = this.getCoffinCaseInfo();
        this.Dimension.Width = info.Width;
        this.Dimension.Height = info.Height;
        this.Dimension.Depth = info.Depth;
        // Calculate child area dimensions and offsets
        this.ChildDimension.Width = info.Width - info.SideThickness * 2;
        this.ChildDimension.Height = info.Height - info.BottomThickness;
        this.ChildDimension.Depth = info.Depth - info.FrontThickness * 2;
        this.ChildOffset.X = info.SideThickness;
        this.ChildOffset.Y = info.FrontThickness;
        this.ChildOffset.Z = info.BottomThickness;
        this.computePositionsAfterChange(ctx);
    }

    private calculateDividerDimensionToUse(
        position: Position,
        DividerInfo: Dimension,
        height?: number,
        depth?: number,
    ): { dividerHeight: number; dividerDepth: number } {
        // Height and depth are reversed and Coffin case presentation reverses them.
        if (!this.Fixture.DisplayViews) {
            return {
                dividerHeight: DividerInfo.Depth,
                dividerDepth:
                    position.Position.FacingsZ * position.computeDepth() +
                    position.Position.GapY * (position.Position.FacingsZ - 1),
            };
        } else {
            return {
                dividerHeight:
                    (DividerInfo.Height > height ? height : DividerInfo.Height) * position.Position.FacingsY +
                    position.Position.GapY * (position.Position.FacingsY - 1),
                dividerDepth: DividerInfo.Depth > depth ? depth : DividerInfo.Depth,
            };
        }
    }

    public calculatePositionDistribution(ctx: Context, position: Position): void {
        let rootObj: Section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        let height = position.computeHeight();
        let width = position.computeWidth();
        let depth = position.computeDepth();
        // view will need to change based on the POV of this POG for now it is just from the Front
        let view = this.OrientNS.View.Front;
        let orientation = position.getOrientation();
        let nesting = this.OrientNS.GetDimensions(
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

        //in coffincase we dont have maxMerchHeight and maxMerchWidth Contrains
        //it's just the ChildDimension.Height & Width that is available
        //Note: merchHeight = ChildDimension.Depth and vice versa, its coffincase when seen from top the merchDepth is ChildDimension.Height
        let merchHeight = Math.max(0, this.ChildDimension.Depth);
        let merchDepth = Math.max(0, this.ChildDimension.Height);
        /*fix: check if facingY is 0 then turn it to atleast 1*/
        position.Position.FacingsY = position.Position.FacingsY == 0 ? 1 : position.Position.FacingsY;
        position.Position.FacingsX = position.Position.FacingsX == 0 ? 1 : position.Position.FacingsX;
        position.Position.FacingsZ = position.Position.FacingsZ == 0 ? 1 : position.Position.FacingsZ;
        //Fixture Merch Constrain checks only for MerchDepth
        //if not 0 or empty add the constrain
        if (this.Fixture.MaxMerchHeight) {
            merchDepth = Math.min(merchDepth, this.Fixture.MaxMerchHeight);
        }
        //incase of coffincase this will changes to "AutoComputeDepth", might change/add a new variable in future
        let frontsDeep = position.Position.FacingsZ;
        const orgDepth = position.computeDepth(undefined, undefined, true);
        const dimension = position.getDimByOrientation(position.Position.ProductPackage.ShrinkPctX, position.Position.ProductPackage.ShrinkPctY, position.Position.ProductPackage.ShrinkPctZ);
        const shrinkPctZ = dimension.Depth;
        if (this.Fixture.AutoComputeDepth) {
            frontsDeep = Math.floor(
                (merchDepth + position.Position.GapZ - nesting.Depth) /
                (orgDepth - (Math.round((shrinkPctZ * orgDepth * 100) / 100) / 100) + position.Position.GapZ - nesting.Depth),
            );
            //validate with max contrain of postion
            frontsDeep = Math.min(frontsDeep, position.Position.MaxFacingsZ);
        }

        position.Position.FacingsZ = frontsDeep;
        position.Position.LayoversY = 0;
        position.Position.LayoversZ = 0;
        position.Position.LayundersY = 0;
        position.Position.LayundersZ = 0;

        //making sure atleast one Fronts High
        if (position.Position.FacingsY == 0) {
            position.Position.FacingsY = 1;
        }

        //making sure atleast one Facing
        if (position.Position.FacingsX == 0) {
            position.Position.FacingsX = 1;
        }

        //making sure atleast one Fronts Deep
        if (position.Position.FacingsZ == 0) {
            position.Position.FacingsZ = 1;
        }

        if (position.$packageBlocks.length > 0) {
            position.$packageBlocks = new Array();
        }
        if (this.Rotation.X != 0) {
            position.$packageBlocks.FrontScale = Math.cos(Utils.degToRad(this.Rotation.X));
        } else {
            position.$packageBlocks.FrontScale = 1;
        }

        let positionY = 0;
        let positionX = 0;
        /*********** DIVIDERS IN COFFINCASE *******/
        let DividerInfo: any = position.getDividerInfo(this);
        if (position.Position.FacingsX > 0) {
            switch (DividerInfo.Type) {
                case this.DividerTypes.None:
                default:
                    break;
                case this.DividerTypes.DividerLeft:
                    positionX = DividerInfo.Width;
                    break;
                case this.DividerTypes.DividerFacingsLeft:
                    positionX = DividerInfo.Width;
                    break;
            }
        }

        let gapXBetweenFacings = 0;
        if (DividerInfo.Type == this.DividerTypes.DividerLeft) {
            let divd = this.calculateDividerDimensionToUse(position, DividerInfo, height, depth);

            let packageBlock: PackageBlock = {
                type: 'divider',
                x: 0,
                y: 0,
                z: 0,
                wide: DividerInfo.Width,
                high: divd.dividerHeight,
                deep: divd.dividerDepth,
                gapX: 0,
                gapY: 0,
                gapZ: 0,
                color: DividerInfo.Color,
                orientation: this.OrientNS.LayoverOrientation[orientation],
                itemHeight: position.Position.ProductPackage.Height,
                itemWidth:
                    position.Position.ProductPackage.Width +
                    position.getShrinkWidth() +
                    position.getSKUGap(true, position.Position.ProductPackage.Width + position.getShrinkWidth()),
                itemDepth: position.Position.ProductPackage.Depth,
                slotSpacing: DividerInfo.SlotSpacing,
                slotStart: DividerInfo.SlotStart,
                isFingerSpaceIgnored: false,
            };
            position.$packageBlocks.push(packageBlock);
        }
        let FacingWidth;
        if (DividerInfo.Type == this.DividerTypes.DividerFacingsLeft) {
            if (this.Fixture.LKCrunchMode == CrunchMode.SpreadFacings) {
                FacingWidth =
                    Math.ceil(
                        (DividerInfo.Width + width + position.Position.SpreadFacingsFactor) / DividerInfo.SlotSpacing,
                    ) * DividerInfo.SlotSpacing;
            } else {
                FacingWidth =
                    Math.ceil((DividerInfo.Width + width + position.Position.GapX) / DividerInfo.SlotSpacing) *
                    DividerInfo.SlotSpacing;
            }
            gapXBetweenFacings = FacingWidth - width;

            let divd = this.calculateDividerDimensionToUse(position, DividerInfo, height, depth);
            for (let n = 0; n < position.Position.FacingsX; n++) {
                const packageBlock = {
                    type: 'divider',
                    x: n * FacingWidth,
                    y: 0,
                    z: 0,
                    wide: DividerInfo.Width,
                    high: divd.dividerHeight,
                    deep: divd.dividerDepth,
                    gapX: 0,
                    gapY: 0,
                    gapZ: 0,
                    color: DividerInfo.Color,
                    orientation: this.OrientNS.LayoverOrientation[orientation],
                    itemHeight: 0,
                    itemWidth: 0,
                    itemDepth: 0,
                    slotSpacing: DividerInfo.SlotSpacing,
                    slotStart: DividerInfo.SlotStart,
                    isFingerSpaceIgnored: false,
                };
                position.$packageBlocks.push(packageBlock);
            }
        }

        /*****************/

        let IDMerchStyle =
            typeof position.Position.IDMerchStyle === 'string'
                ? Number(position.Position.IDMerchStyle)
                : position.Position.IDMerchStyle;
        switch (IDMerchStyle) {
            default:
                //these will be introduced when divider is in place
                if (position.Position.FacingsY > 0) {
                    const packageBlock = {
                        type: 'product',
                        x: positionX,
                        y: positionY,
                        z: 0,
                        wide: position.Position.FacingsX,
                        high: position.Position.FacingsY,
                        deep: position.Position.FacingsZ,
                        gapX: gapXBetweenFacings || position.Position.GapX - nesting.Width,
                        gapY: position.Position.GapY - nesting.Height,
                        gapZ: position.Position.GapZ - nesting.Depth,
                        orientation: orientation,
                        itemHeight: position.computeHeight(), // This is introduced because for NPI variable changes Prod dimension and we need to rerender the Package blocks
                        itemWidth: position.computeWidth(), // for sake of uniformaity, we have this vairable in every package
                        itemDepth: position.computeDepth(),
                    };

                    position.$packageBlocks.push(packageBlock);
                }
                break;
            case AppConstantSpace.MERCH_HALF_PYRAMID:
            case AppConstantSpace.MERCH_PYRAMID:
            case AppConstantSpace.MERCH_RECTANGLE_LOG:
                let shrinkWChanges = position.getShrinkWidth();

                let max = {
                    wide: position.Position.MaxFacingsX,
                    high: position.Position.MaxFacingsY,
                    deep: position.Position.MaxFacingsZ,
                };
                let drawingList = this.logStack(
                    IDMerchStyle,
                    width,
                    height,
                    depth,
                    position.Position.FacingsX,
                    merchHeight,
                    merchDepth,
                    max,
                );
                drawingList.listObject.forEach(function (drawingItem) {
                    let packageBlock: PackageBlock = {
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
                        itemHeight: position.computeHeight(), // This is introduced because for NPI variable changes Prod dimension and we need to rerender the Package blocks
                        itemWidth: position.computeWidth(), // for sake of uniformaity, we have this vairable in every package
                        itemDepth: position.computeDepth(),
                        shape: drawingList.shape,
                        isFingerSpaceIgnored: false,
                        isShrinkDirty: Boolean(shrinkWChanges),
                    };
                    position.$packageBlocks.push(packageBlock);
                });
                position.Position.FacingsY = drawingList.facingsY;
                position.Position.FacingsZ = drawingList.facingsZ;
                position.Position.LayoversY = 0;
                position.Position.LayoversZ = 0;
                position.Position.LayundersY = 0;
                position.Position.LayundersZ = 0;
                break;
        }

        position.Dimension.Width = position.linearWidth();
        position.Dimension.Height = position.linearHeight();
        position.Dimension.Depth = position.linearDepth();
        //calc capacity
        position.Position.Capacity = 0;
        position.$packageBlocks.forEach((packageBlock: any) => {
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
        if (position.Position.ProductPackage.IdPackageStyle != 0) {
            if (
                position.Position.ProductPackage.NumInnerPacks &&
                position.Position.ProductPackage.NumInnerPacks != null &&
                position.Position.ProductPackage.NumInnerPacks > 1
            ) {
                position.Position.Capacity =
                    position.Position.Capacity * position.Position.ProductPackage.NumInnerPacks;
            } else {
                position.Position.Capacity = position.Position.Capacity * position.Position.ProductPackage.CasePack;
            }
        }

        position.Location.Z = 0;
        if (
            !rootObj.fitCheck &&
            this.minMerchHeight > this.ChildDimension.Height &&
            this.ChildDimension.Height < height
        ) {
            let itemHeight = this.Location.Y + height;
            if (rootObj.Dimension.Height < itemHeight) {
                //position.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_TOO_TALL);
                this.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_OK);
            }
        } else {
            position.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_OK);
        }
    }

    calculateDistribution(ctx: Context): void {
        if (this.section.getSkipShelfCalculateDistribution()) {
            return;
        }
        this.Fixture.Capacity = 0;
        let isModular = false;
        let parentItemdata = this.sharedService.getParentObject(this, this.$sectionID);
        this.Fixture.FixtureFullPath = 'F' + this.Fixture.FixtureNumber;
        this.Fixture.FixtureWeightCapacity = 0;
        if (Utils.checkIfBay(parentItemdata)) {
            this.Fixture.ModularNumber = parentItemdata.Fixture.FixtureNumber;
            this.Fixture.FixtureFullPath =
                'M' + parentItemdata.Fixture.FixtureNumber + 'F' + this.Fixture.FixtureNumber;
            isModular = true;
        }
        let doNotCalcShrink = false;
        for (const position of this.Children) {
            if (Utils.checkIfPosition(position) && (position.Dimension.Width <= 0 || position.Dimension.Height <= 0 || position.Dimension.Depth <= 0)) {
                doNotCalcShrink = true;
                break;
            }
        }
        if (this.Children.filter(Utils.checkIfPosition).length > 0 && Object.entries(this.allPosInXDirection).length <= 0 && !doNotCalcShrink) {
            this.doNotCalWH = true;
            const rects = this.crunchMode.getRects(this, this.Fixture.LKCrunchMode, { lx: 0, rx: 0, ty: 0 });
            this.doNotCalWH = false;
            this.shrinkService.setAllPositionsForShrink(this, rects as PositionRect[], true);
        }
        this.Children.forEach((position) => {
            if (position.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                position.calculateDistribution(ctx, this);
                position.Fixture = position.Fixture || ({} as any);
                // This adds fixture number to all the positions in standard shelf
                position.Fixture = {} as any;
                position.Fixture.FixtureNumber = this.Fixture.FixtureNumber;
                position.Fixture.FixtureFullPath = 'F' + this.Fixture.FixtureNumber;
                position.Fixture.FixtureDesc = this.Fixture.FixtureDesc;

                if (isModular) {
                    position.Fixture.ModularNumber = this.Fixture.ModularNumber;
                    position.Fixture.FixtureFullPath =
                        'M' + this.Fixture.ModularNumber + 'F' + this.Fixture.FixtureNumber;
                }
                // TODO: @og check with Narendra if was safe to remove
                //if (position.ObjectType == AppConstantSpace.FIXTUREOBJ) {
                //    this.Fixture.Capacity += position.Fixture.Capacity;
                //} else {
                this.Fixture.Capacity += position.Position.Capacity;
                position.Position.UsedCubic = position.Dimension.Height * position.Dimension.Width * position.Dimension.Depth;
                position.Position.UsedLinear = position.Dimension.Width;
                position.Position.UsedSquare = position.Dimension.Height * position.Dimension.Width;

                position.calculateWeightCapacity();
                //This will be the total weight of all positions in that fixture.
                this.Fixture.FixtureWeightCapacity += position.Position.PositionWeightCapacity;
            }
        });
    }

    public computePositionsAfterChange(ctx: Context, refresh?: RefreshParams) {
        //Declaring this variable above to avoid the case of NaN
        this.Fixture.UsedSquare = 0;
        this.Fixture.UsedCubic = 0;
        const section = this.section;
        if (section.addToComputePositionsFixtureList(this)) {
            return;
        }
        let perUsedSquare = 0;
        let perUsedCubic = 0;
        const minData = [];
        if (this.Children?.length) {
            this.Fixture.UsedLinear = null;
            perUsedSquare = 0;
            perUsedCubic = 0;
            const rootObject = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
            const opticalResemblance : boolean = rootObject.OverrideSectionPosNumbering ? this.getType() == AppConstantSpace.COFFINCASEOBJ ? rootObject._CoffinCaseOpticalResemblance.FlagData : this.getType() == AppConstantSpace.BASKETOBJ ? rootObject._BasketOpticalResemblance.FlagData : false : false;
            let clonedPositions;
               clonedPositions= this.coffincasePositionSort(this.Fixture,this.Fixture.Width,this.Fixture.Height);
            clonedPositions.forEach((it, i) => {
                {
                    if (it.ObjectType == 'Position') {
                        const item = this.Children.find((x) => x.$id == it.$id) as Position;
                        let skuXGap = item.getSKUGap();
                        if (i == 0 || i == clonedPositions.length - 1) {
                            skuXGap /= 2;
                        }

                        const square = (item.linearWidth() + skuXGap) * item.linearDepth();

                        this.Fixture.UsedSquare += square;
                        this.Fixture.UsedCubic += square * item.linearDepth();

                        if(!opticalResemblance){
                            section.IDPOGStatus < 4 || this.sharedService.isLivePogEditable
                            ? (item.Position.PositionNo = i + 1)
                            : ''; //Update position numbers on delete
                        }
                        else{
                            if(i==0){
                                rootObject.IDPOGStatus < 4 || this.sharedService.isLivePogEditable
                                ? (clonedPositions[i].Position["Congruent"]) ? (clonedPositions[i].Position.PositionNo = i+1) : (clonedPositions[i].Position.PositionNo = i+1)
                                : ''; //Update position numbers on delete
                                clonedPositions[i].Position["CongruentPosition"]= clonedPositions[i].Position.PositionNo
                            }
                            else{
                                rootObject.IDPOGStatus < 4 || this.sharedService.isLivePogEditable
                                ? (clonedPositions[i].Position["Congruent"]) ? (clonedPositions[i].Position.PositionNo = clonedPositions[i-1].Position.PositionNo) : (clonedPositions[i].Position.PositionNo = clonedPositions[i-1].Position.PositionNo+1)
                                : ''; //Update position numbers on delete
                                clonedPositions[i].Position["CongruentPosition"]= i+1;
                            }
                        }
                        minData.push(item.computeHeight());
                    }
                }
            });
        }
        this.maxItemHeight = this.ChildDimension.Height;
        this.minMerchHeight = Math.max.apply(Math, minData);
        if (!isFinite(this.minMerchHeight)) {
            this.minMerchHeight = 0;
        }

        if (!this.Fixture.AutoComputeFronts) {
            this.minMerchHeight = this.maxItemHeight;
        }
        this.Fixture.unUsedLinear = null;
        this.Fixture.unUsedSquare = this.ChildDimension.Width * this.ChildDimension.Depth - this.Fixture.UsedSquare;
        this.Fixture.unUsedCubic =
            this.ChildDimension.Width * this.ChildDimension.Height * this.ChildDimension.Depth - this.Fixture.UsedCubic;

        let unUsedSquare = this.Fixture.unUsedSquare;
        let unUsedCubic = this.Fixture.unUsedCubic;
        if (this.Fixture.UsedSquare + this.Fixture.unUsedSquare != 0) {
            perUsedSquare = (this.Fixture.UsedSquare / (this.Fixture.UsedSquare + this.Fixture.unUsedSquare)) * 100;
        } else {
            this.Fixture.UsedSquare = 0;
            unUsedSquare = this.Fixture.unUsedSquare;
        }
        if (this.Fixture.UsedCubic + this.Fixture.unUsedCubic) {
            perUsedCubic = (this.Fixture.UsedCubic / (this.Fixture.UsedCubic + this.Fixture.unUsedCubic)) * 100;
        } else {
            this.Fixture.UsedCubic = 0;
            unUsedCubic = this.Fixture.unUsedCubic;
        }
        this.Fixture.AvailableLinear = this.Fixture.unUsedLinear;
        this.Fixture.UsedLinear = this.Fixture.UsedLinear;
        this.Fixture.UsedSquare = Utils.preciseRound(this.Fixture.UsedSquare, 2);
        this.Fixture.UsedLinear = null;
        this.Fixture.UsedCubic = Utils.preciseRound(this.Fixture.UsedCubic, 2);
        this.Fixture.AvailableLinear = null;
        this.Fixture.AvailableSquare = Utils.preciseRound(this.Fixture.unUsedSquare, 2);
        this.Fixture.AvailableCubic = Utils.preciseRound(this.Fixture.unUsedCubic * this.Fixture.Coefficient, 2);
        perUsedSquare = Utils.preciseRound(perUsedSquare, 2);
        this.Fixture.PercentageUsedSquare = Number(perUsedSquare).toFixed(2) + '%';
        this.Fixture.AvailableSquare = this.Fixture.AvailableSquare;
        this.Fixture.PercentageUsedCubic = Number(perUsedCubic).toFixed(2) + '%';
        this.Fixture.AvailableCubic = Utils.preciseRound(unUsedCubic, 2);
        this.computePositionXPosByCrunchMode();
        this.calculateDistribution(ctx);
        if (!refresh) {
            section.computeSectionUsedLinear();
            section.ComputeSectionUsedSquare();
            section.ComputeSectionUsedCubic();
            section.calculateDistribution(ctx);
        }
    }

    coffincasePositionSort(fixture,fixWidth,fixHeight): Position[] {
        //Check the trafficflow
        //1.	Item's XPEGHOLEPOS - Ascending (if trafficflow is left to right) or 2.	Item's XPEGHOLEPOS ' Descending (if trafficflow is right to left)
        //2.	Item's YPEGHOLEPOS - Ascending
        //3.	Item's ZPOS - Descending
        const positions: Position[] = this.Children.filter((item) => item.ObjectType == 'Position') as Position[]; //eliminate Dividers
        const rootObject = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        const opticalResemblance : boolean = rootObject.OverrideSectionPosNumbering ? this.getType() == AppConstantSpace.COFFINCASEOBJ ? rootObject._CoffinCaseOpticalResemblance.FlagData : this.getType() == AppConstantSpace.BASKETOBJ ? rootObject._BasketOpticalResemblance.FlagData : false : false;
        if (positions.length == 0) {
            return positions;
        }
        if(opticalResemblance){
            return this.planogramService.posOpticalSort(this.$sectionID,positions,AppConstantSpace.COFFINCASEOBJ,fixture,fixWidth,fixHeight)
        }
        else{
            const section = this.section;
            const trafficFlow : number = section.OverrideSectionPosNumbering ? this.getType() == AppConstantSpace.BASKETOBJ ? section._BasketLKTraffic.ValData : section._CoffinCaseLKTraffic.ValData : section.LKTraffic;
            const verticalFlow : number = section.OverrideSectionPosNumbering ? this.getType() == AppConstantSpace.BASKETOBJ ? section._BasketStackOrder.ValData : section._CoffinCaseStackOrder.ValData : section.shelfStackOrder;
            //check for the traffic flow
            //check for the vertical flow bottom to top
            if (verticalFlow == 0) {
                if (trafficFlow == 1) {
                    //left to right
                    return this.sortByYXZPegHoleXAscending(positions);
                } else {
                    //right to left
                    return this.sortByYXZPegHoleXDecending(positions);
                }
            } else if (verticalFlow == 1) {
                //vertical arrangement top to bottom
                //check for the traffic flow
                if (trafficFlow == 1) {
                    //left to right
                    return this.sortByXYZPegHoleXAscYDsc(positions);
                } else {
                    //right to left
                    return this.sortByXYZPegHoleXDesYDsc(positions);
                }
            }
        }
    }

    // For coffincase sorting based on trafficflow
    //Bottom to top
    private sortByYXZPegHoleXAscending(positions: Position[]): Position[] {
      return Utils.sortPositions(
          positions,
          [{ fun: 'getLocationX' }, { fun: 'getLocationY' }, { fun: 'getLocationZ' }],
          [Utils.ascendingOrder, Utils.ascendingOrder, Utils.descendingOrder],
      );
  }

  // Ends
  // Conffincase sorting starts
  private sortByYXZPegHoleXDecending(positions: Position[]): Position[] {
      return Utils.sortPositions(
          positions,
          [{ fun: 'getLocationX' }, { fun: 'getLocationY' }, { fun: 'getLocationZ' }],
          [Utils.descendingOrder, Utils.ascendingOrder, Utils.descendingOrder],
      );
  }
    // For coffincase sorting based on trafficflow
    //top to bottom
    private sortByXYZPegHoleXAscYDsc(positions: Position[]): Position[] {
        return Utils.sortPositions(
            positions,
            [{ fun: 'getLocationX' }, { fun: 'getLocationY' }, { fun: 'getLocationZ' }],
            [Utils.ascendingOrder, Utils.descendingOrder, Utils.descendingOrder],
        );
    }

    // Ends
    // Conffincase sorting starts
    private sortByXYZPegHoleXDesYDsc(positions: Position[]): Position[] {
        return Utils.sortPositions(
            positions,
            [{ fun: 'getLocationX' }, { fun: 'getLocationY' }, { fun: 'getLocationZ' }],
            [Utils.descendingOrder, Utils.descendingOrder, Utils.descendingOrder],
        );
    }

    computePositionXPosByCrunchMode(): void {
        if ([CrunchMode.Right, CrunchMode.Left].includes(this.Fixture.LKCrunchMode)) {
            this.crunchMode.rePositionCoffinCaseOnCrunch(this, this.Fixture.LKCrunchMode);
        }
        this.Fixture.LKCrunchModetext = this.planogramStore.lookUpHolder.CrunchMode.options.find(
            (x) => x.value == Number(this.Fixture.LKCrunchMode),
        ).text;
    }

    findNextDropCord(position: Position, dropCord: { left: number; top: number }): { left: number; top: number } {
        const shelfDepth = this.Dimension.Depth;
        const shelfHeight = this.Dimension.Height;
        let diff = 0;
        if (shelfHeight < shelfDepth) {
            diff = shelfDepth - shelfHeight;
        }
        const dropCordLeft = dropCord.left - position.linearWidth();
        const dropCordTop = dropCord.top - position.linearHeight() - diff;
        dropCord.left = dropCordLeft;
        dropCord.top = dropCordTop;
        return dropCord;
    }

    private checkIfIntersectsAnyPosition(
        eachPositionItemData: Position,
        dropCord: DropCord,
        exculdedContainerItems: Position[],
    ) {
        let dragPosHt = this.linearHeightPosition(eachPositionItemData);
        let positions = exculdedContainerItems;
        let intersectingFlag = false;
        let positionXYCords = this.findXYofPosition(eachPositionItemData, dropCord);
        let intersectingPostion = {};
        let isIntersecting = (pos: Position) => {
            let X1 = pos.Location.X,
                X2 = X1 + pos.linearWidth(),
                Y1 = pos.Location.Y,
                Y2 = Y1 + pos.linearHeight();
            //checking intersecting conditions
            if (
                Y1 > positionXYCords.Y2 ||
                Y2 < positionXYCords.Y1 ||
                X2 < positionXYCords.X1 ||
                X1 > positionXYCords.X2
            ) {
                return false;
            }
            let maxX = Math.max(X2, positionXYCords.X2);
            let minX = Math.min(X1, positionXYCords.X1);
            let maxY = Math.max(Y2, positionXYCords.Y2);
            let minY = Math.min(Y1, positionXYCords.Y1);

            if (
                maxX - minX + 0.01 < pos.linearWidth() + eachPositionItemData.linearWidth() &&
                maxY - minY < pos.linearHeight() + dragPosHt
            ) {
                return true;
            }
            return false;
        };

        //Checking the position if it is intersecting with other position
        for (const pos of positions) {
            intersectingFlag = isIntersecting(pos);
            if (intersectingFlag) {
                intersectingPostion = pos;
                break;
            }
        }

        return { Flag: intersectingFlag, Position: intersectingPostion };
    }

    private isIntersectingPosition(
        pos: Position,
        axis: number,
        positionXYCords: XYCords,
        dragPosHt: number,
        eachPositionItemData: Position,
    ): boolean {
        const positionLinearWidth = pos.linearWidth();
        let X1 = pos.Location.X,
            X2 = X1 + positionLinearWidth,
            Y1 = pos.Location.Y,
            Y2 = Y1 + pos.linearHeight();
        //checking intersecting conditions
        if (Y1 > positionXYCords.Y2 || Y2 < positionXYCords.Y1 || X2 < positionXYCords.X1 || X1 > positionXYCords.X2) {
            return false;
        }
        let maxX = Math.max(X2, positionXYCords.X2);
        let minX = Math.min(X1, positionXYCords.X1);
        let maxY = Math.max(Y2, positionXYCords.Y2);
        let minY = Math.min(Y1, positionXYCords.Y1);

        if (axis == 2) {
            if (maxY - minY < pos.linearHeight() + dragPosHt) {
                return true;
            }
        } else {
            if (maxX - minX + 0.01 < positionLinearWidth + eachPositionItemData.linearWidth()) {
                return true;
            }
        }

        return false;
    }

    getIntersectingPosition(
        eachPositionItemData: Position,
        dropCord: DropCord,
        positions: Position[],
        axis: number,
    ): { Flag: boolean; Position: Position } {
        const dragPosHt = this.linearHeightPosition(eachPositionItemData);
        let intersectingFlag = false;

        let intersectingPostion = {} as any;

        //Checking the position if it is intersecting with other position
        for (const pos of positions) {
            if (axis == 2) {
                dropCord.left = pos.Location.X;
            } else {
                dropCord.top = pos.Location.Y;
            }
            const positionXYCords = this.findXYofPosition(eachPositionItemData, dropCord);
            intersectingFlag = this.isIntersectingPosition(pos, axis, positionXYCords, dragPosHt, eachPositionItemData);
            if (intersectingFlag) {
                intersectingPostion = pos;
                break;
            }
        }

        return { Flag: intersectingFlag, Position: intersectingPostion };
    }

    private isIntersectingGetDropCordsAuto(
        pos: Position,
        positionXYCords: XYCords,
        eachPositionItemData: Position,
        dragPosHt: number,
    ): boolean {
        let X1 = pos.Location.X,
            X2 = X1 + pos.linearWidth(),
            Y1 = pos.Location.Y,
            Y2 = Y1 + pos.linearHeight();
        //checking intersecting conditions
        if (Y1 > positionXYCords.Y2 || Y2 < positionXYCords.Y1 || X2 < positionXYCords.X1 || X1 > positionXYCords.X2) {
            return false;
        }
        let maxX = Math.max(X2, positionXYCords.X2);
        let minX = Math.min(X1, positionXYCords.X1);
        let maxY = Math.max(Y2, positionXYCords.Y2);
        let minY = Math.min(Y1, positionXYCords.Y1);

        if (
            maxX - minX < pos.linearWidth() + eachPositionItemData.linearWidth() &&
            maxY - minY < pos.linearHeight() + dragPosHt
        ) {
            return true;
        }
        return false;
    }

    // used by drag & drop
    public findXYofPosition(position: Position, dropCoord: DropCord): XYCords {
        let positionHeight: number;
        let positionWidth: number;
        let X = dropCoord.left;
        let Y = dropCoord.top;
        if (position.ObjectType == 'Position') {
            positionHeight = Number(this.linearHeightPosition(position));
            positionWidth = Number(position.linearWidth());
        } else {
            positionHeight = Number(position.Dimension.Height);
            positionWidth = Number(position.Dimension.Width);
        }

        return { X1: X - positionWidth, X2: X, Y1: Y - positionHeight, Y2: Y };
    }

    // used by drag & drop
    public checkIfItemCrossesShelfBoundary(position: Position, dropCord: DropCord, positionHeight: number): boolean {
        let flag = false;
        if (!positionHeight) {
            positionHeight = this.linearHeightPosition(position);
        }
        if (dropCord.top > this.ChildDimension.Depth || dropCord.top - positionHeight < 0) {
            flag = true;
        } else if (
            dropCord.right > this.ChildDimension.Width ||
            (dropCord.left && dropCord.left < 0)
        ) {
            flag = true;
        }
        return flag;
    }

    public moveFixture(
        proposedXPosToPog: number,
        proposedYPosToPog: number,
        proposedWidth: number,
        propertygird?: FromPropertyGrid,
    ): boolean {
        return this.moveFixtureService.moveFixtureType(proposedXPosToPog, proposedYPosToPog, this, proposedWidth, propertygird);
    }

    public getBottomIntersectingFixture(
        ctx: Context,
        XCord1: number,
        YCord1: number,
        flag?: boolean,
        intersectionFlag?: boolean,
    ): any[] {
        const belowFixturesList = [];
        const XCord2 = XCord1 + this.Dimension.Width;
        //// for Worksheet Grid ItemData is different

        for (const ordShelf of ctx.allLimitingShelvesYPosDesc.filter(it => it !== this)) {
            const shelfCompleteWidth = ordShelf.getXPosToPog() + ordShelf.Dimension.Width;
            const shelfCompleteHeight = ordShelf.Location.Y + ordShelf.minHeightRequired();

            let intersectingShelf = flag ? true : shelfCompleteHeight >= YCord1;
            intersectingShelf = intersectionFlag
                ? ordShelf.Location.Y == YCord1
                    ? true
                    : shelfCompleteHeight >= YCord1
                : intersectingShelf;
            let instersectingBelowLocationY = flag ? ordShelf.Location.Y < YCord1 : ordShelf.Location.Y <= YCord1;
            instersectingBelowLocationY = intersectionFlag
                ? ordShelf.Location.Y <= YCord1
                : instersectingBelowLocationY;
            if (
                intersectingShelf &&
                instersectingBelowLocationY &&
                ordShelf.getXPosToPog() < XCord2 &&
                shelfCompleteWidth > XCord1
            ) {
                if (ordShelf.Dimension.Width == this.Dimension.Width && ordShelf.getXPosToPog() == XCord1) {
                    let STopCenterXCood =
                        (ordShelf.getXPosToPog() + (ordShelf.getXPosToPog() + ordShelf.Dimension.Width)) / 2;
                    let thisCenterXCood = (XCord1 + XCord2) / 2;
                    if (STopCenterXCood == thisCenterXCood) {
                        belowFixturesList.push(ordShelf);
                    }
                } else {
                    belowFixturesList.push(ordShelf);
                }
            }
        }
        return Utils.sortByYPosDesendingOrder(belowFixturesList);
    }

    private getAboveShelfs(): LimitingShelf[] {
        const allStandardShelf = this.section.getAllLimitingShelves();
        const orderedStandardShelf = Utils.sortByYPos(allStandardShelf).filter((it) => it !== this);
        const XCord1 = this.getXPosToPog();
        const XCord2 = XCord1 + this.Dimension.Width;
        const YCord = this.Location.Y;

        const getImmediateTopShelfs = (YCord: number, orderedStandardShelf: LimitingShelf[]): LimitingShelf[] => {
            const list = [];
            let flag = false;
            let currY = 0;
            for (const ordShelf of orderedStandardShelf) {
                let ImmediateTopS = ordShelf;
                if (ImmediateTopS.Location.Y > YCord && !flag) {
                    flag = true;
                    currY = ImmediateTopS.Location.Y;
                }

                if (flag && currY == ImmediateTopS.Location.Y) {
                    list.push(ImmediateTopS);
                }
            }
            return list;
        };
        const shelfList = getImmediateTopShelfs(YCord, orderedStandardShelf);
        const IsIntersecting = (STop: LimitingShelf, XCord1: number, XCord2: number) => {
            if (STop.getXPosToPog() > XCord1 && STop.getXPosToPog() < XCord2) {
                return true;
            }
            if (
                STop.getXPosToPog() + STop.Dimension.Width > XCord1 &&
                STop.getXPosToPog() + STop.Dimension.Width < XCord2
            ) {
                return true;
            }

            if (STop.Dimension.Width > this.Dimension.Width) {
                if (XCord1 > STop.getXPosToPog() && XCord1 < STop.getXPosToPog() + STop.Dimension.Width) {
                    return true;
                }
                if (XCord2 > STop.getXPosToPog() && XCord2 < STop.getXPosToPog() + STop.Dimension.Width) {
                    return true;
                }
            }

            if (STop.Dimension.Width == this.Dimension.Width) {
                const STopCenterXCood = (STop.getXPosToPog() + (STop.getXPosToPog() + STop.Dimension.Width)) / 2;
                const thisCenterXCood = (XCord1 + XCord2) / 2;
                if (STopCenterXCood == thisCenterXCood) {
                    return true;
                }
            }

            return false;
        };

        return shelfList.filter((shelf) => IsIntersecting(shelf, XCord1, XCord2));
    }

    checkifValidChangeFixtureDimension(
        widthAfterChange: number,
        heightAfterChange: number,
        depthAfterChange?: number,
    ): boolean {
        let endPoint = { left: widthAfterChange, right: 0, top: 0 };
        for (const child of this.Children) {
            if (child.ObjectDerivedType !== AppConstantSpace.POSITIONOBJECT) {
                continue;
            }

            const lx = child.Location.X;
            const rx = lx + child.linearWidth() + (child.Location.X === 0 ? child.getSKUGap() / 2 : child.getSKUGap());
            const ty = child.Location.Y + child.linearHeight();

            endPoint.left = lx < endPoint.left ? lx : endPoint.left;
            endPoint.right = rx > endPoint.right ? rx : endPoint.right;
            endPoint.top = ty > endPoint.top ? ty : endPoint.top;
        }
        const coffinCaseInfo = this.getCoffinCaseInfo();
        if (widthAfterChange !== undefined) {
            let reqWidth = endPoint.right; // In case of left and no crunch.
            if (this.Fixture.LKCrunchMode == CrunchMode.Right) {
                reqWidth = endPoint.right - endPoint.left;
            }
            if (reqWidth > widthAfterChange - coffinCaseInfo.SideThickness * 2) {
                return false;
            }
        }
        if (depthAfterChange !== undefined) {
            if (endPoint.top > depthAfterChange - coffinCaseInfo.FrontThickness * 2) {
                return false;
            }
        }
        return true;
    }

    checkIfValidChange(
        position: Position,
        widthAfterChange: number,
        heightAfterChange: number,
        depthAfterChange: number,
        field?: any,
    ): boolean {
        //Need to check if it is crossing the width of the shelf or height of shelf
        if (field == 'Fixture.Width' || field == 'Fixture.Depth') {
            return this.checkifValidChangeFixtureDimension(widthAfterChange, heightAfterChange, depthAfterChange);
        }

        //Check if it is intersecting with other items in the coffincase
        let validFlag = true;

        let fixtureDepth = this.getMerchDepth();
        if (widthAfterChange == undefined) {
            widthAfterChange = position.linearWidth();
        }
        if (heightAfterChange == undefined) {
            heightAfterChange = position.linearHeight();
        }
        if (depthAfterChange == undefined) {
            depthAfterChange = position.linearDepth();
        }

        if (fixtureDepth < depthAfterChange) {
            return false;
        }

        let positionXYCords: any = {};

        if (this.Fixture.LKCrunchMode == CrunchMode.Right) {
            positionXYCords.X1 = position.Location.X + position.Dimension.Width - widthAfterChange;
            positionXYCords.X2 = positionXYCords.X1;
        } else {
            positionXYCords.X1 = position.Location.X;
            positionXYCords.X2 = positionXYCords.X1 + widthAfterChange;
        }
        positionXYCords.Y1 = position.Location.Y;
        positionXYCords.Y2 = positionXYCords.Y1 + heightAfterChange;

        let dropCord = {
            left: positionXYCords.X1,
            right: positionXYCords.X2,
            top: positionXYCords.Y2,
        };
        if (this.checkIfItemCrossesShelfBoundary(position, dropCord, heightAfterChange)) {
            return false;
        }

        this.itemsInXaxis = [];
        this.getItemsInXaxis(position, dropCord);

        let left = positionXYCords.X1;
        let right = positionXYCords.X2;

        for (const item of this.itemsInXaxis) {
            if (this.Fixture.LKCrunchMode == CrunchMode.Right) {
                left -= this.linearWidth(item);
            } else {
                right += this.linearWidth(item);
            }
        }

        dropCord = {
            left: left,
            right: right,
            top: positionXYCords.Y2,
        };

        if (this.checkIfItemCrossesShelfBoundary(position, dropCord, heightAfterChange)) {
            validFlag = false;
            return validFlag;
        }

        this.itemsInYaxis = [];
        this.getItemsInYaxis(position, dropCord);
        right = positionXYCords.X2;
        let top = 0;
        for (const item of this.itemsInYaxis) {
            top += item.linearHeight();
        }

        if (this.itemsInYaxis.length > 0) {
            const dropCord = {
                right: positionXYCords.X2,
                top,
            };

            if (this.checkIfItemCrossesShelfBoundary(position, dropCord, heightAfterChange)) {
                validFlag = false;
                return validFlag;
            }
        }
        return validFlag;
    }

    public linearWidth(pos: Position): number {
        return typeof pos.linearWidth == 'function' ? pos.linearWidth() : pos.Dimension.Width;
    }

    public linearHeight(pos: Position): number {
        return typeof pos.linearHeight == 'function' ? pos.linearHeight() : pos.Dimension.Height;
    }

    private getItemsInXaxis(position: Position, dropCord: DropCord): void {
        let filteredArrToRight: Position[];
        const allPos = this.getAllPosInXDirection(position);
        if (this.Fixture.LKCrunchMode == CrunchMode.Right) {
            filteredArrToRight = allPos.filter(val => val.Location.X < position.Location.X);
        } else {
            filteredArrToRight = allPos.filter(val => val.Location.X > position.Location.X);
        }

        for (const filteredItem of filteredArrToRight) {
            dropCord.left = filteredItem.Location.X;

            const positionXYCords = this.findXYofPosition(position, dropCord);

            if (position === filteredItem) continue;
            if (this.isIntersecting(position, filteredItem, positionXYCords, 2)) {
                //push intersecting object in ItemsInXaxis array
                this.itemsInXaxis.push(filteredItem);
                const dropCord = {
                    left: filteredItem.Location.X + this.linearWidth(filteredItem),
                    top: filteredItem.Location.Y + this.linearHeight(filteredItem),
                };
                return this.getItemsInXaxis(filteredItem, dropCord);
            }
        }
    }

    private getItemsInYaxis(position: Position, dropCord: DropCord): void {
        const allPos = this.getAllPosInYDirection(position);
        const filteredArrToTop = allPos.filter(val => val.Location.Y > position.Location.Y);
        for (const filteredItem of filteredArrToTop) {
            dropCord.top = filteredItem.Location.Y;
            let positionXYCords = this.findXYofPosition(position, dropCord);
            if (this.isIntersecting(position, filteredItem, positionXYCords, 1)) {
                //push intersecting object in ItemsInYaxis array
                this.itemsInYaxis.push(filteredItem);
                const dropCord = {
                    left: filteredItem.Location.X + this.linearWidth(filteredItem),
                    top: filteredItem.Location.Y + this.linearHeight(filteredItem),
                };
                return this.getItemsInYaxis(filteredItem, dropCord);
            }
        }
        return;
    }

    private isIntersecting(
        eachPositionItemData: Position,
        pos: Position,
        positionXYCords: XYCords,
        axis: number,
    ): boolean {
        let dragPosHt =
            eachPositionItemData.ObjectType == 'Position'
                ? this.linearHeightPosition(eachPositionItemData)
                : eachPositionItemData.Dimension.Height;
        let X1 = pos.Location.X,
            X2 = X1 + this.linearWidth(pos),
            Y1 = pos.Location.Y,
            Y2 = Y1 + this.linearHeight(pos);
        //checking intersecting conditions
        if (Y1 > positionXYCords.Y2 || Y2 < positionXYCords.Y1 || X2 < positionXYCords.X1 || X1 > positionXYCords.X2) {
            return false;
        }
        let maxX = Math.max(X2, positionXYCords.X2);
        let minX = Math.min(X1, positionXYCords.X1);
        let maxY = Math.max(Y2, positionXYCords.Y2);
        let minY = Math.min(Y1, positionXYCords.Y1);

        if (axis == 2) {
            if (maxY - minY < this.linearHeight(pos) + dragPosHt) {
                return true;
            }
        } else if (axis == 1) {
            if (maxX - minX < this.linearWidth(pos) + this.linearWidth(eachPositionItemData)) {
                return true;
            }
        } else {
            if (
                maxX - minX < this.linearWidth(pos) + (positionXYCords.X2 - positionXYCords.X1) &&
                maxY - minY < this.linearHeight(pos) + (positionXYCords.Y2 - positionXYCords.Y1)
            ) {
                return true;
            }
        }

        return false;
    }

    getOffsetValueX(position: Position) {
        let info = this.getCoffinCaseInfo();
        let thickness = 0,
            dividerItemData;
        let offset = 0;
        if (this.Fixture.LKCrunchMode == CrunchMode.Right) {
            // let dividerItemDataArr = this.Children.filter({ ObjectDerivedType: AppConstantSpace.DIVIDERS });
            var dividerItemDataArr = _.where(this.Children, { ObjectDerivedType: AppConstantSpace.DIVIDERS });
            dividerItemDataArr = _.sortBy(dividerItemDataArr, function (val: Position) {
                return Math.max(val.Location.X);
            });
            dividerItemData = dividerItemDataArr[dividerItemDataArr.length - 1];
        } else {
            dividerItemData = this.Children.filter((x) => x.ObjectDerivedType == AppConstantSpace.DIVIDERS)
                ? this.Children.filter((x) => x.ObjectDerivedType == AppConstantSpace.DIVIDERS)[0]
                : undefined;
        }
        if (dividerItemData) {
            thickness = dividerItemData.Fixture.Thickness;
            let dividerInfo = this.Fixture.SeparatorsData ? JSON.parse(this.Fixture.SeparatorsData): '';

            if (dividerInfo?.vertical?.length > 0) {
                if (this.Fixture.LKCrunchMode == CrunchMode.Left) {
                    if (position.Location.X > dividerItemData.Location.X) {
                        offset = info.SideThickness + thickness / 2;
                    }
                } else if (this.Fixture.LKCrunchMode == CrunchMode.Right) {
                    if (position.Location.X < dividerItemData.Location.X) {
                        offset = info.SideThickness + thickness / 2;
                    }
                } else {
                    if (position.Location.X < dividerItemData.Location.X) {
                        offset = info.SideThickness;
                    }
                }
            }
        }

        return offset;
    }

    getOffsetValueY(): number {
        let info = this.getCoffinCaseInfo();
        let thickness = 0;
        let offset = 0;
        //let dividerItemData = this.Children.filter({ ObjectDerivedType: AppConstantSpace.DIVIDERS })[0];
        const dividerItemData = _.where(this.Children, { ObjectDerivedType: AppConstantSpace.DIVIDERS })[0];

        if (dividerItemData) {
            thickness = dividerItemData.Fixture.Thickness;
            const dividerInfo = this.Fixture.SeparatorsData ? JSON.parse(this.Fixture.SeparatorsData):'';

            if (dividerInfo?.horizontal?.length > 0) {
                if (this.Fixture.LKCrunchMode == CrunchMode.Left) {
                } else if (this.Fixture.LKCrunchMode == CrunchMode.Right) {
                    const offset = info.SideThickness - thickness / 2;
                } else {
                }
            }
        }

        return offset;
    }

    /*NEW CODE ENDS*/

    fixtureFlip(): void {
        //feature undo-redo: by Abhishek
        const original = () => this.fixtureFlip();
        const revert = () => this.fixtureFlip();
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'fixtureFlip',
        });
        /*undo-redo ends here*/

        if (this.hasOwnProperty('Children')) {
            if (
                this.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
                this.ObjectDerivedType == AppConstantSpace.BASKETOBJ
            ) {
                switch (this.Fixture.LKCrunchMode) {
                    case 2:
                        this.Fixture.LKCrunchMode = 1;
                        break;
                    case 1:
                        this.Fixture.LKCrunchMode = 2;
                        break;

                    case 8:
                        this.Fixture.LKCrunchMode = 9;
                        break;
                    case 9:
                        this.Fixture.LKCrunchMode = 8;
                        break;
                }
                //snap left to snap right and vice versa
                let tempSnapLeft = this.Fixture.SnapToLeft;
                this.Fixture.SnapToLeft = this.Fixture.SnapToRight;
                this.Fixture.SnapToRight = tempSnapLeft;
                this.Children.forEach((position, key) => {
                    if ('isPosition' in position && position.isPosition) {
                        // changed key-1 to key as it is ignoring last position
                        this.setPositionLocationX(
                            position,
                            this.Dimension.Width - position.Location.X - position.linearWidth(),
                        );
                    }
                });
            }
        }
    }

    getChildDimensionWidth() {
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

    private sortByYXDescPos(obj: any[]): any[] {
        return Utils.sortPositions(
            obj,
            [{ fun: 'getYPosToPog', args: [true] }, { fun: 'getLocationX' }],
            [Utils.ascendingOrder, Utils.descendingOrder],
        );
        //return obj.sort(function (a, b) {
        //    if (a.getYPosToPog(true) === b.getYPosToPog(true)) {
        //        return b.Location.X - a.Location.X;
        //    } else {
        //        return a.getYPosToPog(true) - b.getYPosToPog(true);
        //    }
        //});
    }

    private sortByYXPos(positions: Position[]): Position[] {
        return Utils.sortPositions(
            positions,
            [{ fun: 'getYPosToPog', args: [true] }, { fun: 'getLocationX' }],
            [Utils.ascendingOrder, Utils.ascendingOrder],
        );
        //return obj.sort(function (a, b) {
        //    if (a.getYPosToPog(true) === b.getYPosToPog(true)) {
        //        return a.Location.X - b.Location.X;
        //    } else {
        //        return a.getYPosToPog(true) - b.getYPosToPog(true);
        //    }
        //});
    }

    stackOrder(draggedPositions, stackAll, estDropCordTopFlag, checkFlag) {
        let stackOrder = 1;
        if (stackOrder) {
            if (this.hasOwnProperty('Children')) {
                let positionsLength = 0;
                let positionsInFixture = [];
                this.Children.forEach((item, key) => {
                    if (Utils.checkIfPosition(item)) {
                        positionsLength++;
                        positionsInFixture.push(item);
                    }
                });
                if (this.Fixture.LKCrunchMode == 1) {
                    positionsInFixture = this.sortByYXDescPos(positionsInFixture);
                } else {
                    //Arrange all items in XY pos ascending order
                    positionsInFixture = this.sortByYXPos(positionsInFixture);
                }
                let exculdedContainerItems = [];
                if (!stackAll) {
                    let position = draggedPositions;
                    let dropCord = {
                        left: position.Location.X + position.linearWidth(),
                        top: position.Location.Y + position.linearHeight(),
                    };
                    exculdedContainerItems = Utils.sortByYPosDesendingOrder(exculdedContainerItems);
                    let filterArr = _.filter(positionsInFixture, function (val) {
                        return val.Location.Y + val.linearHeight() < position.Location.Y;
                    });
                    let filteredArrToTop = _.filter(positionsInFixture, function (val) {
                        return val.Location.Y + val.linearHeight() > position.Location.Y;
                    });
                    filterArr = this.sortByYEndDescPos(filterArr);

                    //get if position is intersecting along X axis with already positioned items
                    let intersectingObj: any = this.getIntersectingPosition(position, dropCord, filterArr, 1);
                    if (intersectingObj.Flag) {
                        dropCord.top = intersectingObj.Position.Location.Y + intersectingObj.Position.linearHeight();
                        let overlapObj = this.checkIfIntersectsAnyPosition(position, dropCord, filteredArrToTop);
                        if (!overlapObj.Flag) {
                            if (typeof estDropCordTopFlag != 'undefined' && estDropCordTopFlag) {
                                return dropCord.top;
                            }
                            this.setPositionLocationY(position, dropCord.top); //break;
                        }
                    } else {
                        if (typeof estDropCordTopFlag != 'undefined' && estDropCordTopFlag) {
                            return 0;
                        }
                        this.setPositionLocationY(position, 0);
                    }
                } else {
                    positionsInFixture = this.sortByYXPos(positionsInFixture);
                    for (const posInFix of positionsInFixture) {
                        const dropCord = {
                            left: posInFix.Location.X + posInFix.linearWidth(),
                            top: posInFix.Location.Y + posInFix.linearHeight(),
                        };
                        exculdedContainerItems = Utils.sortByYPosDesendingOrder(exculdedContainerItems);
                        //get all positions whose height is less than the current items location Y
                        let filterArr = _.filter(positionsInFixture, function (val) {
                            return val.Location.Y + val.linearHeight() <= posInFix.Location.Y;
                        });
                        let filteredArrToTop = _.filter(positionsInFixture, function (val) {
                            return val.Location.Y + val.linearHeight() > posInFix.Location.Y;
                        });
                        filterArr = this.sortByYEndDescPos(filterArr);
                        //get if position is intersecting along X axis with already positioned items
                        let intersectingObj: any = this.getIntersectingPosition(posInFix, dropCord, filterArr, 1);
                        if (intersectingObj.Flag) {
                            dropCord.top =
                                intersectingObj.Position.Location.Y + intersectingObj.Position.linearHeight();
                            let overlapObj = this.checkIfIntersectsAnyPosition(posInFix, dropCord, filteredArrToTop);
                            if (!overlapObj.Flag) {
                                this.setPositionLocationY(posInFix, dropCord.top); //break;
                            }
                        } else {
                            this.setPositionLocationY(posInFix, 0);
                        }
                    }
                    this.crunchMode.rePositionCoffinCaseOnCrunch(this, this.Fixture.LKCrunchMode);
                    let i = 0;
                    if (typeof checkFlag == 'undefined') {
                        i = 0;
                    }
                    if (i == 0) {
                        i++;
                        this.stackOrder('', true, false, i);
                    }
                }
            }
        }
    }

    private sortByYEndDescPos(positions: Position[]): Position[] {
        return Utils.sortPositions(positions, [{ fun: 'getPosEndY' }], [Utils.descendingOrder]);
    }

    public getDividerInfo(position: Position): DividerInfo {
        return position.getDividerInfo(this);
    }

    public snapToPeg(position: Position): void {
        // might need undo-redo
        let pegHole = position.getPegInfo();
        let PHI = this.getPegHoleInfo();

        let pegOffsetX = pegHole.Type == 1 ? PHI.PegIncrementX / 2 : 0;
        let pegOffsetY = 0;

        let PegHoleX = position.Location.X + pegHole.OffsetX - pegOffsetX;
        if (PegHoleX < PHI.PegOffsetLeft) {
            PegHoleX = PHI.PegOffsetLeft;
        } else {
            if (PHI.PegIncrementX < 0.01) PHI.PegIncrementX = 0.01;
            let holeX = Math.round((PegHoleX - PHI.PegOffsetLeft) / PHI.PegIncrementX);
            PegHoleX = holeX * PHI.PegIncrementX + PHI.PegOffsetLeft;
        }
        this.setPositionLocationX(position, PegHoleX - pegHole.OffsetX + pegOffsetX);

        let PegHoleY = position.Location.Y + pegHole.OffsetY - pegOffsetY;
        if (PegHoleY < PHI.PegOffsetBottom) {
            PegHoleY = PHI.PegOffsetBottom;
        } else {
            if (PHI.PegIncrementY < 0.01) PHI.PegIncrementY = 0.01;
            let holeY = Math.round((PegHoleY - PHI.PegOffsetBottom) / PHI.PegIncrementY);
            PegHoleY = holeY * PHI.PegIncrementY + PHI.PegOffsetBottom;
        }
        this.setPositionLocationY(position, PegHoleY - pegHole.OffsetY + pegOffsetY);
    }

    public addCopiedPositions(ctx: Context, copiedItemsToInsert: number[], index: number): void {
        Array.prototype.splice.apply(this.Children, [index, 0].concat(copiedItemsToInsert));
        this.computePositionsAfterChange(ctx);
    }

    public addClonedPosition(ctx: Context, position: Position, toIndex: number): void {
        let original = ((obj, position, toIndex) => {
            return () => {
                obj.addClonedPosition(ctx, position, toIndex);
            };
        })(this, position, toIndex);
        let revert = ((obj, toIndex) => {
            return () => {
                obj.removePosition(ctx, toIndex);
            };
        })(this, toIndex);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'CopiedPosition',
        }, this.$sectionID);

        this.planogramCommonService.resetPegFields(this, position);
        const rootObj = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        position.Position.IDPOGObject = null;
        position.IDPOGObject = null;
        position.IDPOGObjectParent = this.IDPOGObject;
        position.selected = false;
        position.$sectionID != this.$sectionID && this.planogramService.prepareModelPosition(position, rootObj);
        this.planogramCommonService.extend(position, true, this.$sectionID);
        this.planogramCommonService.setParent(position, this);
        this.Children.splice(toIndex, 0, position);
        this.computePositionsAfterChange(ctx);
    }

    // This method is used to paste copied positions
    public addPosition(ctx: Context, position: Position, index: number, dropCoord: DropCord): void {
        this.planogramCommonService.resetPegFields(this, position);
        position.IDPOGObjectParent = this.IDPOGObject; // Kuldip changes for IDPOGObject
        position.setParentId(this.$id);

        position.justmod = true;

        this.Children.splice(index, 0, position);
        delete Context.linearWidth[position.$id];
        delete Context.linearHeight[position.$id];
        const positionHeight = position.linearHeight() || position.computeHeight();
        const positionWidth = position.linearWidth() || position.computeWidth();

        position.Location.X = Utils.preciseRound(dropCoord.left, 2) - Utils.preciseRound(positionWidth, 2);
        position.Location.Y = Utils.preciseRound(dropCoord.top, 2) - Utils.preciseRound(positionHeight, 2);
        if (this.parentApp.isAllocateApp) {
          this.allocateUtils.updatePaPositionKey(position);
        }
        this.computePositionsAfterChange(ctx);
    }

    removePosition(ctx: Context, index: number): void {
        this.Children.splice(index, 1);
        this.computePositionsAfterChange(ctx);
    }

    movePosition(ctx: Context, fromIndex: number, toFixture, toIndex, dropCoord, originalLocation?) {
        if (this.Children.length > 0) {
            const position = this.Children[fromIndex] as Position;
            const oldDropCoord = {
                left: position.Location.X + position.linearWidth(),
                top: position.Location.Y + position.linearHeight(),
            };

            //@Millan If toFixture is standard shelf, it is required to change the facings to 1
            //it is needed to avoid the ctrl + Z issue. When item placed on ss it's facings Y will be calculated auto
            //When reverting it won't get it's previous facings Y viz it's facing change is not recorded
            const originalFacingsY = position.Position.FacingsY;

            if (toFixture.ObjectDerivedType != this.ObjectDerivedType) {
                position.Position.FacingsY = 1;
            }
            this.removePosition(ctx, fromIndex);

            //exception handled : AM dt. 3rd April, 2014
            //make sure when droped to last position, index doesn't cross total index.
            //Note: toIndex cannot be at any cost > the total Children of the toFixture
            //if toIndex is greater then splice() by default put it in last position but it causes trouble in undo,
            //since invalid toIndex is stored in History where we dont have any items actually
            if (toIndex > toFixture.Children.length) {
                toIndex = toFixture.Children.length;
            }

            toFixture.addPosition(ctx ,position, toIndex, dropCoord, 'movePosition');
            position.calculateDistribution(ctx, toFixture);
            if (Utils.checkIfPegType(toFixture)) {
                toFixture.Children = toFixture.pegPositionSort(toFixture);
                toIndex = toFixture.Children.indexOf(position);
            }

            // assort nici
            if (this.sharedService.link == 'iAssort') {
                // undo on add
                if (toFixture.ObjectDerivedType == 'ShoppingCart')
                    window.parent.postMessage(
                        'invokePaceFunc:deleteProduct:["' + position.Position.IDProduct + '"]',
                        '*',
                    );
                else if (position.Position.attributeObject.RecADRI == 'A') window.footerStatusItemID = null;
            }

            //update key
            if (this.parentApp.isAllocateApp) {
                this.allocateUtils.updatePaPositionKey(position);
            }

            //feature undo-redo: by abhishek
            //dt. 11th, Aug, 2014
            const original = ((fromIndex, toFixture, toIndex, dropCoord, originalLocation) => {
                return () => {
                    this.movePosition(ctx, fromIndex, toFixture, toIndex, dropCoord, originalLocation);
                };
            })(fromIndex, toFixture, toIndex, dropCoord, originalLocation);
            //  original(me, fromIndex, toFixture, toIndex, dropCoord, originalLocation);
            const revert = ((toIndex, fromFixture: MerchandisableList, fromIndex, dropCoord, originalFacingsY, originalLocation) => {
                return () => {
                  fromFixture.Children[fromIndex].Position.FacingsY = originalFacingsY;
                  fromFixture.movePosition(ctx, fromIndex, this, toIndex, dropCoord);
                };
            })(fromIndex, toFixture, toIndex, oldDropCoord, originalFacingsY, originalLocation);
            this.historyService.captureActionExec({
                funoriginal: original,
                funRevert: revert,
                funName: 'MoveItems',
            }, this.$sectionID);
            /* ends here */
        }
    }

    findSpannedFixture() {
        let rootObj = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        let allPegboard = rootObj.getAllPegboards();
        // TODO @og @narendra, this should always return -1 since this is a coffincase sot it is not part of the pegboards list
        let currIndex = allPegboard.indexOf(this as any);
        allPegboard.splice(currIndex, 1);
        let moveablefixture = this.findFixture(allPegboard);
        if (!(moveablefixture == undefined)) {
            return moveablefixture;
        }
    }

    findFixture(PegboardList) {
        if (PegboardList == undefined || PegboardList == null || PegboardList.length == 0) {
            return;
        }
        let XCord1 = this.getXPosToPog(),
            XCord2 = Number((this.getXPosToPog() + this.Dimension.Width).toFixed(2)),
            YCord = this.Location.Y;
        for (const pegBoard of PegboardList) {
            if (pegBoard.Location.Y === YCord && pegBoard.getXPosToPog() === XCord2) {
                return pegBoard;
            }
        }
    }

    findRelativeXposToBay(XposToPog, bayList) {
        let rootObject = this.sharedService.getObject(this.$sectionID, this.$sectionID);
        let shelfXpos = XposToPog;
        if (_.isUndefined(bayList)) {
            bayList = rootObject.Children;
        }
        for (const bay of bayList) {
            if (Utils.checkIfBay(bay)) {
                let x1Cord = bay.Location.X;
                let x2Cord = x1Cord + bay.Dimension.Width;
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
        bayList = bayList || this.section.Children;
        for (const bay of bayList) {
            if (Utils.checkIfBay(bay)) {
                let x1Cord = bay.Location.X;
                let x2Cord = x1Cord + bay.Dimension.Width;
                if (XposToPog >= x1Cord && XposToPog < x2Cord) {
                    return bay;
                }
            }
        }
    }

    public findIntersectShelfAtYpos(
        yposToPog: number,
        bayList: ObjectListItem[],
    ): PegBoard | StandardShelf | undefined {
        const items = Utils.sortByYPos(bayList).filter(
            (it) => Utils.checkIfPegboard(it) || Utils.checkIfstandardShelf(it),
        ) as (PegBoard | StandardShelf)[];
        for (const sortedShelf of items) {
            if (Utils.checkIfPegboard(sortedShelf) || Utils.checkIfstandardShelf(sortedShelf)) {
                let y1Cord = sortedShelf.Location.Y;
                let y2Cord = y1Cord + sortedShelf.Dimension.Height;
                if (yposToPog >= y1Cord && yposToPog <= y2Cord) {
                    return sortedShelf;
                }
            }
        }
    }

    findNearestNotch(num, ar) {
        let closest, closestDiff, currentDiff;
        if (!(ar.length == undefined)) {
            closest = ar[0];
            for (const el of ar) {
                closestDiff = Math.abs(num - closest);
                currentDiff = Math.abs(num - el);
                if (currentDiff < closestDiff) {
                    closest = el;
                }
                closestDiff = null;
                currentDiff = null;
            }
            return closest;
        }
        return num;
    }

    movePegboardold(ctx: Context, dragShelfXPosToPog: number, dragShelfYPosToPog: number, dragShelfXPosToBay: number): boolean {
        let shelfFromScope = this._elementRef.nativeElement.querySelector('#' + this.$id);
        let baseControllerScope; //= Utils.getControllerScope(shelfFromScope);
        let isFitCheckRequired = baseControllerScope.POG.fitCheck;
        //shelf drag drop varies when within bays and accross bays so we need this flag
        let isBayPresents = baseControllerScope.POG.isBayPresents;

        //if Notch is enabled
        //1. LKFixtureMovement ==  ~ notch enabled
        //2. baseControllerScope.POG.Notch > 0 && !angular.isUndefined(baseControllerScope.POG.notchIntervels) to prevent bugs we double check it
        if (
            baseControllerScope.POG.LKFixtureMovement == 1 &&
            baseControllerScope.POG.Notch > 0 &&
            !(baseControllerScope.POG.notchIntervels == undefined)
        ) {
            // notch Case set the nearest notch Value
            dragShelfYPosToPog = this.findNearestNotch(dragShelfYPosToPog, baseControllerScope.POG.notchIntervels);
        }

        let sectionWidth = baseControllerScope.POG.Dimension.Width;
        let sectionHeight = baseControllerScope.POG.Dimension.Height;
        let pegboardStartYCoord = dragShelfYPosToPog;
        let pegboardEndYCoord = dragShelfYPosToPog + this.ChildDimension.Height;
        let pegboardStartXCoord = dragShelfXPosToPog;
        let pegboardEndXCoord = dragShelfXPosToPog + this.ChildDimension.Width;

        //check if the pegboard fits into section container logic
        let doesPegboardFitsInSection = false;
        if (pegboardStartXCoord >= 0 && pegboardStartYCoord >= 0) {
            if (pegboardEndXCoord <= sectionWidth && pegboardEndYCoord <= sectionHeight) {
                doesPegboardFitsInSection = true;
            }
        }
        if (!doesPegboardFitsInSection) {
            // EYC.dragdrop.revertBackItem(this.$id);
            this.notifyService.error('FIT_CHECK_ERROR');
            return false;
        }

        if (isFitCheckRequired) {
            let isValidFitcheck = this.doeShelfValidateFitCheck(
                ctx,
                dragShelfXPosToBay,
                dragShelfYPosToPog,
                dragShelfXPosToPog,
            );
            if (isValidFitcheck) {
                if (isBayPresents) {
                    //1. accross bay we splice shelf object and push to the other bay object.
                    //2. within bay we just change the yPos
                    this.moveFixtureService.moveBetweenBays(dragShelfXPosToPog, dragShelfYPosToPog, this);
                } else {
                    //we just change the yPos
                    this.moveFixtureService.move(dragShelfXPosToBay, dragShelfYPosToPog, shelfFromScope.$parent, this); //true
                }
            } else {
                //EYC.dragdrop.revertBackItem(this.$id);
                this.notifyService.error('FIT_CHECK_ERROR');
                return false;
            }
        } else {
            if (isBayPresents) {
                //1. accross bay we splice shelf object and push to the other bay object.
                //2. within bay we just change the yPos
                this.moveFixtureService.moveBetweenBays(dragShelfXPosToPog, dragShelfYPosToPog, this);
            } else {
                //we just change the yPos
                this.moveFixtureService.move(dragShelfXPosToBay, dragShelfYPosToPog, shelfFromScope.$parent, this); //true
            }
        }
    }

    movePegboard(ctx: Context, proposedXPosToPog, proposedYPosToPog, proposedWidth) {
        //let shelfFromScope = this._elementRef.nativeElement.querySelector('#' + this.$id);
        let rootObj = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section; //this.sharedService.getRootObject(this, this.$sectionID);
        let isFitCheckRequired = rootObj.fitCheck;
        let isBayPresents = rootObj.isBayPresents;
        let xPosRelative = this.getXPosRelative(proposedXPosToPog);

        //if Notch is enabled
        //1. LKFixtureMovement ==  ~ notch enabled
        //2. baseControllerScope.POG.Notch > 0 && !angular.isUndefined(baseControllerScope.POG.notchIntervels) to prevent bugs we double check it
        //if (rootObj.LKFixtureMovement == 1 && rootObj.Notch > 0 && !angular.isUndefined(rootObj.notchIntervels)) {
        // notch Case set the nearest notch Value
        //   dragShelfYPosToPog = this.findNearestNotch(dragShelfYPosToPog, rootObj.notchIntervels);
        // }

        let sectionWidth = rootObj.Dimension.Width;
        let sectionHeight = rootObj.Dimension.Height;
        let pegboardStartYCoord = proposedYPosToPog;
        let pegboardEndYCoord = proposedYPosToPog + this.ChildDimension.Height;
        let pegboardStartXCoord = proposedXPosToPog;
        let pegboardEndXCoord = proposedXPosToPog + proposedWidth;

        let revertBack = (msg) => {
            this.notifyService.error(msg);
        };

        let initiateMove = () => {
            if (isBayPresents) {
                //1. accross bay we splice shelf object and push to the other bay object.
                //2. within bay we just change the yPos
                this.moveFixtureService.moveBetweenBays(proposedXPosToPog, proposedYPosToPog, this, proposedWidth);
            } else {
                //we just change the yPos
                //this.move(xPosRelative, proposedYPosToPog, rootObj, true);
                this.moveFixtureService.move(proposedXPosToPog, proposedYPosToPog, proposedWidth, this);
            }
        };

        //check if the pegboard fits into section container logic
        let doesCoffinCaseFitsInSection = false;
        if (pegboardStartXCoord >= 0 && pegboardStartYCoord >= 0) {
            if (pegboardEndXCoord <= sectionWidth && pegboardEndYCoord <= sectionHeight) {
                doesCoffinCaseFitsInSection = true;
            }
        }

        if (!doesCoffinCaseFitsInSection) {
            revertBack(this.getType() + ' does not fit well in the section'); //need to be localized /*millan*/
            return false;
        }

        if (isFitCheckRequired) {
            let isValidFitcheck = this.doeShelfValidateFitCheck(ctx, xPosRelative, proposedYPosToPog, proposedXPosToPog);
            if (!isValidFitcheck) {
                revertBack(this.translate.instant('FIT_CHECK_ERROR'));
                return false;
            }

            initiateMove();
        } else {
            initiateMove();
        }
    }

    public findNotchWithKeykeyStroke(y, notchData, type, isMoveUp) {
        let draopY = y;
        if (!(notchData == undefined) && notchData.length > 0 && type == 1) {
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
        return draopY;
    }

    // used by section
    public setFitCheckErrorMessages(code: number): void {
        //feature undo-redo: by abhishek
        //dt. 11th, Aug, 2014
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

    public getXPosToPog(): number {
        let parentObj = this.sharedService.getParentObject(this, this.$sectionID);
        if (parentObj.ObjectType != 'POG') {
            return parentObj.Location.X + this.Location.X;
        }
        return this.Location.X;
    }

    // used by position
    public getSideThickness(): number {
        let info = this.getCoffinCaseInfo();
        return info.SideThickness;
    }

    getBottomThickness(): number {
        const info = this.getCoffinCaseInfo();
        return this.Fixture.DisplayViews ? info.FrontThickness : info.BottomThickness;
    }

    //@Narendra For most of the actions need to get the actual Y location insetead if Depth is greter or not
    //So adding ignoreView flag to get the actual location(i.e location in front view)
    getYPosToPog(ignoreView?: boolean): number {
        let yPos = 0,
            diff = 0;
        let parentObj = this.parent;
        if (parentObj.ObjectType != 'POG') {
            yPos = parentObj.Location.Y;
        }
        if (!ignoreView && this.Fixture.DisplayViews) {
            if (this.Dimension.Depth > this.Dimension.Height) {
                diff = this.Dimension.Depth - this.Dimension.Height;
            }
        }
        return yPos + this.Location.Y - diff;
    }

    // used by 3d & renderer
    public getZPosToPog(): number {
        const parentObj = this.parent;
        if (!(parentObj == undefined) && parentObj.ObjectType != 'POG') {
            return parentObj.Location.Z + this.Location.Z;
        }
        return this.Location.Z;
    }

    public getXPosRelative(xCord: number): number {
        const section = this.section;
        let shelfXpos = xCord;
        for (const bay of section.Children) {
            if (Utils.checkIfBay(bay)) {
                let x1Cord = bay.Location.X;
                let x2Cord = x1Cord + bay.Dimension.Width;
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

    // used by position
    public getMaxAvailableSqueeze(pos: Position): number {
        let allPos = [];
        if (pos.baseItem != '') {
            allPos.push(pos);
        } else {
            allPos = this.getAllPosInXDirWithNearest(pos);
        }
        return allPos.reduce((p, n) => p + n.getShrinkX(), 0);
    }

    public getMaxAvailableSqueezeY(pos: Position): number {
        const allPos = this.getAllPosInYDirWithNearest(pos);
        return allPos.reduce((p, n) => p + n.getShrinkY(), 0);
    }

    public getMaxAvailableSqueezeZ(pos: Position): number {
        const allPos = this.getAllPosInZDirection(pos);
        return allPos.reduce((p, n) => p + n.getShrinkZ(), 0);
    }

    public getRequiredLinear(pos: Position): number {
        let allPos = this.getAllPosInXDirWithNearest(pos);
        let requiredLinear: number,
            allItemsWidth: number = 0;
        allPos.forEach((position) => {
            const width = position.linearWidth(true);
            allItemsWidth += width + this.getSKUGapXBaseOnCrunch(position, width);
        });
        const totalAvailLinear = this.getTotalAvailLinear(pos);
        requiredLinear = allItemsWidth - totalAvailLinear;
        return Math.abs(requiredLinear);
    }

    public getRequiredLinearY(pos: Position): number {
        let allItemsHeight = 0;
        const allPos = this.getAllPosInYDirWithNearest(pos);
        allPos.forEach((position) => {
            allItemsHeight += position.linearHeight(true);
        });
        const totalAvailLinear = this.getTotalAvailLinearY(pos);
        return Math.abs(allItemsHeight - totalAvailLinear);
    }

    public getRequiredLinearZ(pos: Position): number {
        let allItemsDepth = 0;
        const allPos = this.getAllPosInZDirection(pos);
        allPos.forEach((position) => {
            allItemsDepth += position.linearDepth(true);
        });
        return Math.abs(allItemsDepth - this.ChildDimension.Height);
    }

    public percentageRequiredLinear(requiredLinear: number, maxAvailableShrink: number): number {
        let percentageRequiredLinear = (Math.round((requiredLinear / maxAvailableShrink) * 100) / 100) * 100;

        return percentageRequiredLinear;
    }

    addFixtureFromGallery(
        ctx,
        parentData: Position,
        proposedXPosToPog: number,
        proposedYPosToPog: number,
        proposedWidth: number,
    ): boolean {
        let rootObj = this.sharedService.getObject(parentData.$sectionID, parentData.$sectionID) as Section;
        let isFitCheckRequired = rootObj.fitCheck;
        //shelf drag drop varies when within bays and accross bays so we need this flag
        let isBayPresents = rootObj.isBayPresents;

        let sectionWidth = rootObj.Dimension.Width;
        let sectionHeight = rootObj.Dimension.Height;
        let pegboardStartYCoord = proposedYPosToPog;
        let pegboardEndYCoord = proposedYPosToPog + this.Fixture.Depth;
        let pegboardStartXCoord = proposedXPosToPog;
        let pegboardEndXCoord = proposedXPosToPog + proposedWidth;

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
        let addFixture = (parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth) => {
            //undo redo
            let original = (function (
                obj,
                methodName,
                parentData,
                proposedXPosToPog,
                proposedYPosToPog,
                proposedWidth,
            ) {
                return function () {
                    methodName.call(obj, parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth);
                };
            })(this, addFixture, parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth);
            let revert = (function (obj) {
                return function () {
                    obj.removeFixtureFromSection();
                };
            })(this);
            this.historyService.captureActionExec({
                funoriginal: original,
                funRevert: revert,
                funName: 'addFixture',
            });

            const rootObj = this.sharedService.getObject(parentData.$sectionID, parentData.$sectionID) as Section;
            this.Location.Y = proposedYPosToPog;
            this.Location.X = this.getXPosRelative(proposedXPosToPog);
            this.Fixture.Width = proposedWidth;
            let dropIndex = 0;

            // finding dropIndex from Modular/Section
            for (const pChild of parentData.Children) {
                const shelfCompleteHt = pChild.Location.Y + pChild.Dimension.Height;
                if (pChild.ObjectDerivedType !== AppConstantSpace.SHOPPINGCARTOBJ) {
                    dropIndex++;
                    if (shelfCompleteHt > proposedYPosToPog) {
                        break;
                    }
                }
            }
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

            if (this.parentApp.isAllocateApp) {
              this.allocateUtils.updatePAFixtureKey(this, parentData);
            }

            rootObj.computeMerchHeight(ctx);
            rootObj.applyRenumberingShelfs();
        };

        const revertBack = (msg: string, obj: Coffincase) => {
            // DragDropUtils.revertBackFixtureGallery();
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
            revertBack(this.getType() + ' does not fit well in the section', this);
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

    removeFixtureFromSection(): void {
        let parentItemData = this.parent;
        // added for SAve functionality as suggested by Vamsi

        this.IDPOGObjectParent = null;
        this.IDPOGObject = null;
        this.Fixture.IDPOGObject = null;
        this.TempId = Utils.generateUID();
        parentItemData.Children = parentItemData.Children.filter((it) => it !== (this as any));
    }

    minHeightRequired(): number {
        return this.Dimension.Height;
    }

    public doeShelfValidateFitCheck(ctx: Context,
        XCord1: number, YCord1: number, XCord1ToPog: number, withFix?: FixtureList) {
        //1. Get the co-ordinates of the dragged fictures with relative to Bays, POG as input parameter
        //2. Using yPos find the below intersecting fixtures
        //3. this.minMerchHeight gets calculated based on autocompute fronts high of the INTERSECTED SHELF
        //4. so we validate fitcheck against 3.
        let flag = false;
        let oldYpos = this.Location.Y;
        let oldXpos = this.Location.X;
        this.Location.Y = YCord1;
        withFix = Utils.isNullOrEmpty(withFix) ? this : withFix;
        /*
     Asume with Bay Case: If we Drag a Shelf and Drop it another Bay.Before apply Still Drag shelf parent is refrering the same parent.
     For calcualtioon purpose we are changing idParent.
     */
        //let currentShelfScope = this._elementRef.nativeElement.querySelector('#' + this.$id);
        const rootObj = this.section;
        const isBayPresents = rootObj.isBayPresents;
        const oldIdParent = this.$idParent;
        if (isBayPresents) {
            let dropBay = this.findIntersectBayAtXpos(XCord1ToPog);
            if (!(dropBay == undefined) && dropBay != null && oldIdParent !== dropBay.$id) {
                //changes in 30th July, 2015
            }
        }
        this.Location.X = XCord1;

        let intersectingShelfYPos = withFix.getIntersectingShelfAboveInfo(ctx).Y;
        let currentMerchHt = intersectingShelfYPos - (YCord1 + this.minHeightRequired());
        if (currentMerchHt >= 0) {
            // For Peg board not required.Because Pegboard doesn't have Mech ht/wd
            let intersectingFixtures = withFix.getBottomIntersectingFixture(ctx, XCord1ToPog, YCord1);
            //changes in 30th July, 2015
            if (intersectingFixtures.length > 0) {
                for (const iFix of intersectingFixtures) {
                    let merchHt = iFix.Location.Y + iFix.minHeightRequired();
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
        //commented on 30th July, 2015
        return flag;
    }

    // getBottomIntersectingFixture(XCord1, YCord1) {
    //     let fixtures = [];
    //     let belowFixturesList = [];
    //     let XCord2 = XCord1 + this.Dimension.Width;
    //     let rootObj = this.sharedService.getRootObject(this, this.$sectionID);
    //     let allLimitingShelves = rootObj.getAllLimitingShelves();
    //     let orderedLimitingShelves = Utils.sortByYPosDesendingOrder(allLimitingShelves);
    //     // for Worksheet Grid ItemData is different
    //     let currentShelfItemData = this;

    //     let currIndex = orderedLimitingShelves.indexOf(currentShelfItemData);
    //     orderedLimitingShelves.splice(currIndex, 1);
    //     for (let i = 0; i < orderedLimitingShelves.length; i++) {
    //         let belowShelf = orderedLimitingShelves[i];
    //         let shelfCompleteWidth = (belowShelf.getXPosToPog() + belowShelf.Dimension.Width);
    //         let shelfCompleteHeight = (belowShelf.Location.Y + belowShelf.minHeightRequired());
    //         if ((belowShelf.Location.Y <= YCord1) && (shelfCompleteHeight >= YCord1) && (belowShelf.getXPosToPog() < XCord2) && (shelfCompleteWidth > XCord1)) {
    //             if (belowShelf.Dimension.Width == this.Dimension.Width && belowShelf.getXPosToPog() == this.getXPosToPog()) {
    //                 let STopCenterXCood = (belowShelf.getXPosToPog() + (belowShelf.getXPosToPog() + belowShelf.Dimension.Width)) / 2;
    //                 let thisCenterXCood = (XCord1 + XCord2) / 2;
    //                 if (STopCenterXCood == thisCenterXCood) {
    //                     belowFixturesList.push(belowShelf);
    //                 }
    //             } else {
    //                 belowFixturesList.push(belowShelf);
    //             }

    //         }
    //     }
    //     return Utils.sortByYPosDesendingOrder(belowFixturesList);
    // };

    //used by position and Pegboard
    //if param <position> is passed then it finds intersecting standard shelf for the position
    //if param <postion> is null then it finds the intersecting standard shelf for the standard shelf
    //returns an object i.e. Pegboard responsible for intersection
    getIntersectingShelfAboveInfo(ctx: Context, position?: Position): Responsible {
        //default init to the fixture object it called
        let XCord1 = this.getXPosToPog(),
            XCord2 = this.getXPosToPog() + this.Dimension.Width,
            YCord = this.Location.Y;
        let intersectTo: Position | Coffincase = this;

        //if position is not null then take the absolute co-ordinate of the position
        //override default init to position obj from parameter
        if (position) {
            XCord1 = position.getXPosToPog();
            XCord2 = position.getXPosToPog() + position.Dimension.Width;
            YCord = position.getYPosToPog(true);
            intersectTo = position;
        }

        let orderedLimitingShelves = ctx.allLimitingShelvesYPosAsc.filter(it => it !== this);

        let responsibleY = 0;
        let responsibleSlope = 0;
        let responsibleDepth = 0;
        let responsibleThickness = 0;
        let flag = true;
        while (flag) {
            let shelfList = this.getImmediateTopShelf(YCord, orderedLimitingShelves);
            if (shelfList.length == 0) {
                flag = false;
                responsibleY = ctx.section.Dimension.Height;
                responsibleDepth = ctx.section.Dimension.Depth;
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

        if (responsibleY == 0) {
        }
        return { Y: responsibleY, Slope: responsibleSlope, Depth: responsibleDepth, Thickness: responsibleThickness };
    }

    private getImmediateTopShelf(YCord: number, orderedPegboard: FixtureList[]): FixtureList[] {
        const list: FixtureList[] = [];
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

    private IsIntersecting(STop: FixtureList, XCord1: number, XCord2: number) {
        if (STop.getXPosToPog() > XCord1 && STop.getXPosToPog() < XCord2) {
            return true;
        }
        if (
            STop.getXPosToPog() + STop.Dimension.Width > XCord1 &&
            STop.getXPosToPog() + STop.Dimension.Width < XCord2
        ) {
            return true;
        }

        if (STop.Dimension.Width > this.Dimension.Width) {
            if (XCord1 > STop.getXPosToPog() && XCord1 < STop.getXPosToPog() + STop.Dimension.Width) {
                return true;
            }
            if (XCord2 > STop.getXPosToPog() && XCord2 < STop.getXPosToPog() + STop.Dimension.Width) {
                return true;
            }
        }

        if (STop.Dimension.Width == this.Dimension.Width) {
            let STopCenterXCood = (STop.getXPosToPog() + (STop.getXPosToPog() + STop.Dimension.Width)) / 2;
            let thisCenterXCood = (XCord1 + XCord2) / 2;
            if (STopCenterXCood == thisCenterXCood) {
                return true;
            }
        }

        return false;
    }

    getPegHoleInfo(): PegHoleInfo {
        return {
            PegIncrementX: this.Fixture._X04_XINC.ValData,
            PegIncrementY: this.Fixture._X04_YINC.ValData,
            PegOffsetLeft: this.Fixture._X04_XPEGSTART.ValData,
            PegOffsetRight: this.Fixture._X04_XPEGEND.ValData,
            PegOffsetTop: this.Fixture._X04_YPEGEND.ValData,
            PegOffsetBottom: this.Fixture._X04_YPEGSTART.ValData,
        };
    }

    setPositionLocationX(position: Position, X: number): void {
        position.Location.X = X;
    }

    setPositionLocationY(position: Position, Y: number): void {
        position.Location.Y = Y;
    }

    public linearHeightPosition(pos: Position, toValue?: number, toField?: string, skipShrink?: boolean, skipUnits?: boolean, shrinkValues?: any): number {
        // view will need to change based on the POV of this POG for now it is just from the Front
        let view = this.OrientNS.View.Front;
        let orientation = pos.getOrientation();
        let posFacingsY = pos.Position.FacingsY;
        if (!(toValue == undefined)) {
            if (toField == 'Position.IDOrientation') {
                orientation = toValue;
            } else if (toField == 'Position.FacingsY') {
                posFacingsY = toValue;
            }
        }
        let dimensions = this.OrientNS.GetDimensions(
            orientation,
            false,
            view,
            pos.Position.ProductPackage.Width,
            pos.Position.ProductPackage.Height,
            pos.Position.ProductPackage.Depth,
        );

        const shrinkValueX = shrinkValues ? shrinkValues.X : pos.getShrinkWidth(skipShrink, undefined, skipUnits);
        const shrinkValueY = shrinkValues ? shrinkValues.Y : pos.getShrinkHeight(skipShrink, skipUnits, false, true);
        const shrinkValueZ = shrinkValues ? shrinkValues.Z : pos.getShrinkDepth(skipShrink, skipUnits);

        let width = dimensions.Width + shrinkValueX;
        let height = dimensions.Height + shrinkValueY;
        let depth = dimensions.Depth + shrinkValueZ;

        let nesting = this.OrientNS.GetDimensions(
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
        let lh = height * posFacingsY + (posFacingsY - 1) * (pos.Position.GapY - nesting.Height);

        if (this.isLogStack(pos)) {
            let direction = this.logDirection(width, height, depth);
            if (direction == 'X' || direction == 'Z') {
                let halfSqrt3 = Math.sqrt(3) / 2;
                lh = height + (posFacingsY - 1) * height * halfSqrt3;
            }
        }

        return lh;
    }

    public linearWidthPosition(pos: Position, toValue: number, toField: string, skipShrink?: boolean, skipUnits?: boolean, shrinkValues?: any): number {
        // view will need to change based on the POV of this POG for now it is just from the Front
        let view = this.OrientNS.View.Front;
        let orientation = pos.getOrientation();
        let posFacingsX = pos.Position.FacingsX;
        if (!(toValue == undefined)) {
            if (toField == 'Position.IDOrientation') {
                orientation = toValue;
            } else if (toField == 'Position.FacingsX') {
                posFacingsX = toValue;
            }
        }
        let dimensions = this.OrientNS.GetDimensions(
            orientation,
            false,
            view,
            pos.Position.ProductPackage.Width,
            pos.Position.ProductPackage.Height,
            pos.Position.ProductPackage.Depth,
        );

        const shrinkValueX = shrinkValues ? shrinkValues.X : pos.getShrinkWidth(skipShrink, posFacingsX, skipUnits);
        const shrinkValueY = shrinkValues ? shrinkValues.Y : pos.getShrinkHeight(skipShrink, skipUnits);
        const shrinkValueZ = shrinkValues ? shrinkValues.Z : pos.getShrinkDepth(skipShrink, skipUnits);

        let width = dimensions.Width + shrinkValueX + pos.getSKUGap(true, dimensions.Width + shrinkValueX);
        let height = dimensions.Height + shrinkValueY;
        let depth = dimensions.Depth + shrinkValueZ;
        let nesting = this.OrientNS.GetDimensions(
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

        let lw = 0;
        let DividerInfo = pos.getDividerInfo(this);
        if (pos.Position.FacingsX > 0) {
            switch (DividerInfo.Type) {
                case this.DividerTypes.None:
                default:
                    lw = width * posFacingsX + (posFacingsX - 1) * (pos.Position.GapX - nesting.Width);

                    if (this.isLogStack(pos)) {
                        let direction = this.logDirection(width, height, depth);
                        if (direction == 'Y') {
                            let halfSqrt3 = Math.sqrt(3) / 2;
                            lw = width + (posFacingsX - 1) * width * halfSqrt3;
                        }
                    }
                    break;
                case this.DividerTypes.DividerLeft:
                    lw =
                        DividerInfo.Width +
                        width * posFacingsX +
                        (posFacingsX - 1) * (pos.Position.GapX - nesting.Width);
                    lw = Math.ceil(lw / DividerInfo.SlotSpacing) * DividerInfo.SlotSpacing;
                    break;
                case this.DividerTypes.DividerFacingsLeft:
                    let Facing_Width = DividerInfo.Width + width + pos.Position.GapX;
                    lw =
                        Facing_Width +
                        (posFacingsX - 1) *
                        (Math.ceil(Facing_Width / DividerInfo.SlotSpacing) * DividerInfo.SlotSpacing);
                    lw = (Math.ceil(lw / DividerInfo.SlotSpacing) * DividerInfo.SlotSpacing) - pos.Position.GapX;
                    break;
            }
        }
        return lw;
    }

    public linearDepthPosition(pos: Position, toValue?: number, toField?: string, skipShrink?: boolean, skipUnits?: boolean): number {
        // view will need to change based on the POV of this POG for now it is just from the Front
        let view = this.OrientNS.View.Front;
        let orientation = pos.getOrientation();
        if (!(toValue == undefined)) {
            if (toField == 'Position.IDOrientation') {
                orientation = toValue;
            }
        }
        let dimensions = this.OrientNS.GetDimensions(
            orientation,
            false,
            view,
            pos.Position.ProductPackage.Width,
            pos.Position.ProductPackage.Height,
            pos.Position.ProductPackage.Depth,
        );
        let width = dimensions.Width + pos.getShrinkWidth(skipShrink, undefined, skipUnits);
        let height = dimensions.Height + pos.getShrinkHeight(skipShrink, skipUnits);
        let depth = dimensions.Depth + pos.getShrinkDepth(skipShrink, skipUnits, false, true);
        let nesting = this.OrientNS.GetDimensions(
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
        let ld = FrontDepth;
        if (this.isLogStack(pos)) {
            let IDMerchStyle =
                typeof pos.Position.IDMerchStyle === 'string'
                    ? Number(pos.Position.IDMerchStyle)
                    : pos.Position.IDMerchStyle;
            switch (IDMerchStyle) {
                case AppConstantSpace.MERCH_HALF_PYRAMID:
                case AppConstantSpace.MERCH_PYRAMID:
                case AppConstantSpace.MERCH_RECTANGLE_LOG:
                    let direction = this.logDirection(width, height, depth);
                    if (direction == 'X' || direction == 'Z') {
                        let merchDepth = this.getChildDimensionDepth();
                        if ((pos.Position.FacingsZ + 0.5) * depth > merchDepth) {
                            ld = pos.Position.FacingsZ * depth;
                        } else {
                            ld = (pos.Position.FacingsZ + 0.5) * depth;
                        }
                    }
                    return ld;
            }
        } else {
            return FrontDepth;
        }
    }

    getChildDimensionDepth(): number {
        //shelf overhang implementation
        // -ive overhang means less depth ( inward from either side )
        // +ive overhang means more depth ( outward from either side )
        let merchDepth = Math.max(0, this.Dimension.Depth + this.Fixture.OverhangZFront + this.Fixture.OverhangZBack);

        if (this.Fixture.MaxMerchDepth != null && this.Fixture.MaxMerchDepth > 0) {
            merchDepth = Math.min(this.Fixture.MaxMerchDepth, merchDepth);
        }

        return merchDepth;
    }

    validate() {
        return true;
    }

    public getColor() {
        const rootObj: Section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        if (rootObj.fitCheck && this.planogramStore.appSettings.isWeightCapacityValidationEnable){
            if(this.Fixture.MaxFixtureWeight > 0 && this.Fixture.FixtureWeightCapacity > this.Fixture.MaxFixtureWeight) {
                return 'red';
            }
        }
        return this.Fixture.Color || 'grey';
    }

    public getAllPosition(): Position[] {
        return this.Children.filter(Utils.checkIfPosition) as Position[];
    }

    // Note: Get all position which requires for shrinking width based on current position
    getAllPosInXDirection(pos: Position): Position[] {
        const allPos = Object.entries(this.allPosInXDirection);
        if (allPos.length) {
            let possiblePosChain: Position[][] = [];
            allPos.forEach(([key, value]) => {
                possiblePosChain = possiblePosChain.concat(value.filter(positions => positions.find(p => p.$id == pos.$id) !== undefined));
            });
            if (possiblePosChain.length > 1) {
                // find longest chain
                let longestChain: Position[] = [];
                let maxWidth = 0;
                possiblePosChain.forEach(chain => {
                    //const totalWidth = chain.reduce((ac: number, po: Position) => Utils.preciseRound(ac + this.getPosWidthForRect(po, true), 2), 0);
                    const totalWidth = chain.reduce((ac: number, po: Position) => {
                        const poWidth = po.linearWidth(true);
                        return Utils.preciseRound(ac + poWidth + this.getSKUGapXBaseOnCrunch(po, poWidth) - po.getShrinkX(), 2);
                    }, 0);
                    if (longestChain.length <= 0) {
                        longestChain = chain;
                        maxWidth = totalWidth;
                    } else {
                        if (maxWidth < totalWidth) {
                            longestChain = chain;
                            maxWidth = totalWidth;
                        } else if (maxWidth == totalWidth) {
                            const lcTotalWidth = longestChain.reduce((ac: number, po: Position) => {
                                const poWidth = po.linearWidth(true);
                                return Utils.preciseRound(ac + poWidth + this.getSKUGapXBaseOnCrunch(po, poWidth) - po.getShrinkX(), 2);
                            }, 0);
                            const cTotalWidth = chain.reduce((ac: number, po: Position) => {
                                const poWidth = po.linearWidth(true);
                                return Utils.preciseRound(ac + poWidth + this.getSKUGapXBaseOnCrunch(po, poWidth) - po.getShrinkX(), 2);
                            }, 0);
                            if (lcTotalWidth < cTotalWidth) {
                                longestChain = chain;
                            }
                        }
                    }
                });
                return longestChain;
            } else {
                return possiblePosChain.length ? possiblePosChain[0] : [pos];
            }
        }
        return [pos];
    }

    public getAllPosInXDirWithNearest(pos: Position): Position[] {
        let allPos: Position[] = this.getAllPosInXDirection(pos).sort((a, b) => a.Location.X - b.Location.X);
        const mainPos = this.shrinkService.getParellelPositionsInXDir(this, pos)[0];
        if (mainPos.$id != pos.$id) {
            const rect1: RectangleCoordinates2d = {
                xstart: Utils.preciseRound(mainPos.Location.X, 2),
                xend: Utils.preciseRound(mainPos.Location.X + mainPos.Dimension.Width, 2),
                ystart: Utils.preciseRound(pos.Location.Y, 2),
                yend: Utils.preciseRound(pos.Location.Y + pos.Dimension.Height, 2)
            }
            const oldDoNotCalWH = this.doNotCalWH;
            this.doNotCalWH = true;
            const rects = this.crunchMode.getRects(this, this.Fixture.LKCrunchMode, { lx: 0, rx: 0, ty: 0 });
            this.doNotCalWH = oldDoNotCalWH;

            return this.getIntersectedPosition(rects, rect1);
        } else {
            return allPos;
        }
    }

    public getAllPosInYDirWithNearest(pos: Position): Position[] {
        let allPos: Position[] = this.getAllPosInYDirection(pos).sort((a, b) => a.Location.Y - b.Location.Y);
        const oldDoNotCalWH = this.doNotCalWH;
        this.doNotCalWH = true;
        const rects = this.crunchMode.getRects(this, this.Fixture.LKCrunchMode, { lx: 0, rx: 0, ty: 0 });
        this.doNotCalWH = oldDoNotCalWH;

        const mainPos = this.shrinkService.getParellelPositionsInYDir(this, pos)[0];
        if (mainPos.$id != pos.$id) {
            const rect1: RectangleCoordinates2d = {
                xstart: Utils.preciseRound(pos.Location.X, 2),
                xend: Utils.preciseRound(pos.Location.X + pos.Dimension.Width, 2),
                ystart: Utils.preciseRound(mainPos.Location.Y, 2),
                yend: Utils.preciseRound(mainPos.Location.Y + mainPos.Dimension.Height, 2)
            }
            return this.getIntersectedPosition(rects, rect1);
        } else {
            return allPos;
        }
    }

    public calculatePositionShrink(selPos: Position, oldChildren?: (Position | Divider)[], onlyShrink?: { X: boolean, Y: boolean }): { err?: string; message: string[]; revertFlag: boolean } | undefined {
        return this.shrinkService.calcShrinkForCoffinPositions(this, selPos, oldChildren, onlyShrink);
    }

    public checkShrinkForOrientation(newOrientation: number, pos: Position): { err?: string; message: string[]; revertFlag: boolean } | undefined {
        const oldChildren = cloneDeep(this.Children);
        pos.Position.IDOrientation = newOrientation;
        pos.Dimension.Width = pos.linearWidth();
        pos.Dimension.Height = pos.linearHeight();
        pos.Dimension.Depth = pos.linearDepth();
        const response = this.calculatePositionShrink(pos, oldChildren);
        if (response && response.revertFlag) {
            const oldPos = oldChildren.find(oc => oc.$id == pos.$id);
            pos.Dimension.Width = oldPos.Dimension.Width;
            pos.Dimension.Height = oldPos.Dimension.Height;
            pos.Dimension.Depth = oldPos.Dimension.Depth;
        }
        return response;
    }

    public getPosWidthForRect(pos: Position, doNotCalWH?: boolean): number {
        const posWidth = doNotCalWH ? pos.Dimension.Width : pos.linearWidth();
        const gap = this.getSKUGapXBaseOnCrunch(pos, posWidth);
        return posWidth + gap;
    }

    public getSKUGapXBaseOnCrunch(pos: Position, posWidth: number): number {
        const locX = Utils.preciseRound(pos.Location.X, 2);
        const crunchMode = this.Fixture.LKCrunchMode;
        let hasDivideGap = false;
        if (crunchMode == CrunchMode.Right) {
            hasDivideGap = (locX + posWidth >= this.ChildDimension.Width);
        } else {
            hasDivideGap = (locX == 0);
        }
        return pos.getSKUGap() / (hasDivideGap ? 2 : 1);
    }

    public getIntersectedPosition(rects: CrunchRect[], rect1: RectangleCoordinates2d): Position[] {
        const fillteredRect = rects.filter(p => {
            if (!Utils.checkIfPosition(p.ref)) {
                return false;
            }
            const rect2: RectangleCoordinates2d = {
                xstart: Utils.preciseRound(p.lx, 2),
                xend: Utils.preciseRound(p.rx, 2),
                ystart: Utils.preciseRound(p.by, 2),
                yend: Utils.preciseRound(p.ty, 2)
            }
            return this.collision.isIntersecting2D(rect1, rect2, 0);
        });
        return fillteredRect.map(fr => fr.ref) as Position[];
    }

    // Note: Get all position which requires for shrinking height based on current position
    getAllPosInYDirection(pos: Position): Position[] {
        const allPos = Object.entries(this.allPosInYDirection);
        if (allPos.length) {
            let possiblePosChain: Position[][] = [];
            allPos.forEach(([key, value]) => {
                possiblePosChain = possiblePosChain.concat(value.filter(positions => positions.find(p => p.$id == pos.$id) !== undefined));
            });
            if (possiblePosChain.length > 1) {
                // find longest chain
                let longestChain: Position[] = [];
                let maxHeight = 0;
                possiblePosChain.forEach(chain => {
                    const totalHeight = chain.reduce((ac: number, po: Position) => Utils.preciseRound(ac + po.linearHeight(true) + po.getSKUGapY() - po.getShrinkY(), 2), 0);
                    if (longestChain.length <= 0) {
                        longestChain = chain;
                        maxHeight = totalHeight;
                    } else {
                        if (maxHeight < totalHeight) {
                            longestChain = chain;
                            maxHeight = totalHeight;
                        }
                    }
                });
                return longestChain;
            } else {
                return possiblePosChain.length ? possiblePosChain[0] : [pos];
            }
        }
        return [pos];
    }

    // Note: Get all position which requires for shrinking depth based on current position
    getAllPosInZDirection(pos: Position): Position[] {
        return [pos];
    }

    public getNearestDividerRight(pos: Position): Divider {
        if (this.Fixture.HasDividers && this.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ) {
            const dividers = this.Children.filter(c => c.ObjectDerivedType === AppConstantSpace.DIVIDERS && c.Location.Y === 0 && c.Location.X > pos.Location.X) as Divider[];
            const sortedDividers = dividers.sort((a, b) => a.Location.X - b.Location.X);
            return sortedDividers[0];
        }
    }

    public getNearestDividerLeft(pos: Position): Divider {
        if (this.Fixture.HasDividers && this.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ) {
            const dividers = this.Children.filter(c => c.ObjectDerivedType === AppConstantSpace.DIVIDERS && c.Location.Y === 0 && c.Location.X < pos.Location.X) as Divider[];
            const sortedDividers = dividers.sort((a, b) => b.Location.X - a.Location.X);
            return sortedDividers[0];
        }
    }

    public getNearestDividerTop(pos: Position): Divider {
        if (this.Fixture.HasDividers && this.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ) {
            const dividers = this.Children.filter(c => c.ObjectDerivedType === AppConstantSpace.DIVIDERS && c.Location.X === 0 && c.Location.Y > pos.Location.Y) as Divider[];
            const sortedDividers = dividers.sort((a, b) => a.Location.Y - b.Location.Y);
            return sortedDividers[0];
        }
    }

    public getNearestDividerBottom(pos: Position): Divider {
        if (this.Fixture.HasDividers && this.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ) {
            const dividers = this.Children.filter(c => c.ObjectDerivedType === AppConstantSpace.DIVIDERS && c.Location.X === 0 && c.Location.Y < pos.Location.Y) as Divider[];
            const sortedDividers = dividers.sort((a, b) => b.Location.Y - a.Location.Y);
            return sortedDividers[0];
        }
    }

    allPositionsFlip() {
        let positions = this.Children as Position[];
        let selectRange = {
            startIndex: -1,
            endIndex: -1,
        };

        /* Commented dt 14th Aug, 2014 - Abhishek
     Do we need to find the selected position again here? this does not allow me to
     add my undo redo code at atomic level mixin method for position flip */
        let selectedArray = [];
        positions.sort(function (a, b) {
            if (a.Location.Y === b.Location.Y || Math.abs(a.Location.Y - b.Location.Y) < a.Dimension.Height) {
                return a.Location.X - b.Location.X; // Ascending order of Y.
            } else {
                return a.Location.Y - b.Location.Y; // Descending order of X - however right end;
            }
        });
        for (const [i, pos] of positions.entries()) {
            if (i == positions.length - 1 && pos.selected == true) {
                selectRange.endIndex = i;
                selectedArray.push({ ...selectRange });
                selectRange.startIndex = -1;
                selectRange.endIndex = -1;
            } else if (pos.selected) {
                if (selectRange.startIndex < 0) {
                    selectRange.startIndex = i;
                }
            } else if (!pos.selected) {
                if (selectRange.endIndex < 0 && selectRange.startIndex >= 0) {
                    selectRange.endIndex = i - 1;
                    let temp = null;

                    temp = _.clone(selectRange);
                    selectedArray.push(temp);

                    selectRange.startIndex = -1;
                    selectRange.endIndex = -1;
                }
            }
        }

        // Flip logic
        for (const selArray of selectedArray) {
            const start = selArray.startIndex;
            const end = selArray.endIndex;

            if (end > 0 && start >= 0 && end != start) {
                let itemsToFlip = [];
                let gapToPrev = 0;
                for (let j = start, k = 0; j <= end; j++, k++) {
                    let curPos = positions[j];
                    itemsToFlip.push({
                        ref: positions[end - k],
                        gapToPrev: gapToPrev,
                        oldPos: end - k,
                        newPos: j,
                        positionY: curPos.Location.Y,
                    });
                    gapToPrev = j != end ? positions[j + 1].Location.X - (curPos.Location.X + curPos.linearWidth()) : 0;
                }

                let positionX = positions[start].Location.X; // First selcted items Original position.
                for (let j = start, k = 0; j <= end; j++, k++) {
                    positions[j] = itemsToFlip[k].ref;
                    positionX = positionX + itemsToFlip[k].gapToPrev;
                    positions[j].Location.X = positionX;
                    positions[j].Location.Y = itemsToFlip[k].positionY;

                    positionX = positionX + itemsToFlip[k].ref.linearWidth();
                }
            } else {
                this.notifyService.warn('ITEMS_SELECTED_ARE_NOT_CONSECUTIVE');
            }
        }
    } //All positions Flip ends here

    flipSelectedPositions(selectedPositions: any[]): void {
        // Flip logic
        let positions = this.Children as Position[];
        for (const selPos of selectedPositions) {
            const start = selPos.startIndex;
            const end = selPos.endIndex;

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
    }

    moveSelectedToCart(ctx: Context, shoppingCart: ShoppingCart): void {
        //     let currentParentObj = parent.itemData;
        //    let currentShelfIndex = currentParentObj.Children.indexOf(this);
        // added for SAve functionality as suggested by Vamsi
        let currentParentObj = this.parent;
        let currentShelfIndex = currentParentObj.Children.indexOf(this as any);
        this.IDPOGObjectParent = null;
        this.IDPOGObject = null;
        this.Fixture.IDPOGObject = null;

        this.TempId = Utils.generateUID();


        let len = this.Children != undefined ? this.Children.length : 0;
        for (let i = len - 1; i >= 0; i--) {
            let child = this.Children[i];
            if (typeof child == 'object' && typeof child.moveSelectedToCart === 'function') {
                child.moveSelectedToCart(ctx, shoppingCart);
            }
        }

        //UNDO:REDO
        //fixture object deleted is stored in closure scope.
        let deletedShelf = currentParentObj.Children.splice(currentShelfIndex, 1);
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

    // this method is already present in base class
    getZIndex(): any {
        return 6;
    }

    public initiateAdd(locationX: number, locationY: number, parentObj: Section | Modular): boolean {
        const rootObj: Section = this.sharedService.getObject(parentObj.$sectionID, parentObj.$sectionID) as Section;
        if (locationY > rootObj.Dimension.Height || locationY < 0) {
            this.notifyService.error('FIX_HEIGHT_EXCEEDING_SECTION');
            return false;
        }
        this.IDPOGObject = null;
        this.IDPOGObjectParent = parentObj.IDPOGObject;
        this.planogramCommonService.extend(this, true, parentObj.$sectionID);
        this.planogramCommonService.setParent(this, parentObj);
        this.Children.forEach((obj) => {
            obj.IDPOGObject = null;
            obj.IDPOGObjectParent = this.IDPOGObject;
            this.planogramCommonService.extend(obj, true, this.$sectionID);
            this.planogramCommonService.setParent(obj, this);
        });
        this.Location.X = locationX;
        this.Location.Y = locationY;
        if (this.parentApp.isAllocateApp) {
            this.allocateUtils.updatePAFixtureKey(this, parentObj as Modular);
         }
        parentObj.Children.push(this);
        this.planogramService.removeAllSelection(parentObj.$sectionID);
        this.planogramService.addToSelectionByObject(this, parentObj.$sectionID);

        //undo redo
        let original = (function (copiedFixture, locationX, locationY, parentObj) {
            return function () {
                copiedFixture.initiateAdd(locationX, locationY, parentObj);
            };
        })(this, locationX, locationY, parentObj);
        let revert = (function (obj) {
            return function () {
                obj.removeFixtureFromSection();
            };
        })(this);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'addCopiedFixture',
        }, this.$sectionID);
    }

    // used by 2d planogram
    public addCopiedFixtureToTopORBottom(ctx: Context, fixtureObj: FixtureList): boolean {
        let locationX = this.Location.X;
        let locationYTop = this.Location.Y + this.Fixture.Thickness + this.minMerchHeight;
        let locationYBottom = this.Location.Y - fixtureObj.Fixture.Thickness - fixtureObj.minMerchHeight;
        let parentObj = this.sharedService.getParentObject(this, this.$sectionID);
        let rootObj = ctx.section; //this.sharedService.getRootObject(this, this.$sectionID);
        let sectionWidth = rootObj.Dimension.Width;
        let isFitCheckRequired = rootObj.fitCheck;

        let isExceedsSectionWidth = fixtureObj.Dimension.Width + this.getXPosToPog() > sectionWidth ? true : false;
        if (isExceedsSectionWidth) {
            this.notifyService.error('FIX_WIDTH_EXCEEDING_SECTION');
            return false;
        }
        const proposedYPosToPog = rootObj.getNearestYCoordinate(locationYTop);
        if (isFitCheckRequired) {
            let isValidFitcheck = fixtureObj.doeShelfValidateFitCheck(ctx, locationX, proposedYPosToPog, this.getXPosToPog());
            if (!isValidFitcheck) {
                const proposedYPosToPog_Bottom = rootObj.getNearestYCoordinate(locationYBottom);
                isValidFitcheck = fixtureObj.doeShelfValidateFitCheck(ctx, locationX, proposedYPosToPog_Bottom, this.getXPosToPog());
                if (!isValidFitcheck) {
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

    /** selectedObj except Modular */
    public addCopiedFixtureToLocation(
        ctx:Context,
        proposedXPosToPOG: number,
        proposedYPosToPOG: number,
        selectedObj: ObjectListItem,
    ): boolean {
        const section = this.section;
        let pasteOverObj: Section | Modular = section;

        if (section.isBayPresents) {
            let dropBay = this.findIntersectBayAtXpos(proposedXPosToPOG);
            if (dropBay != null) {
                pasteOverObj = dropBay;
            }
        }

        let isExceedsSectionWidth = this.Dimension.Width + proposedXPosToPOG > section.Dimension.Width ? true : false;
        if (isExceedsSectionWidth) {
            this.notifyService.error('FIX_WIDTH_EXCEEDING_SECTION');
            return false;
        }

        const xPosRelative = this.getXPosRelative(proposedXPosToPOG);
        if (section.fitCheck) {
            let isValidFitcheck = this.doeShelfValidateFitCheck(
                ctx,
                xPosRelative,
                proposedYPosToPOG,
                proposedXPosToPOG,
                selectedObj as any,
            );

            if (!isValidFitcheck) {
                this.notifyService.error('FIT_CHECK_ERROR');
                return false;
            }
            this.initiateAdd(xPosRelative, proposedYPosToPOG, pasteOverObj);
        } else {
            this.initiateAdd(xPosRelative, proposedYPosToPOG, pasteOverObj);
        }
    }

    public checkIfOffsetArea(dropCord: DropCord, item?: ObjectListItem): boolean {
        let shelfDepth = this.Dimension.Depth;
        if (shelfDepth < dropCord.top + item.Dimension.Height) {
            return false;
        } else {
            return true;
        }
    }

    // used by drag & drop
    public checkAllItemsIfCrossesShelfBoundary(): boolean {
        let crunchMode = this.Fixture.LKCrunchMode;
        let flag = false;
        let locArr = [];
        let estWidth = 0;

        if (crunchMode == CrunchMode.NoCrunch) {
            return flag;
        }

        for (const child of this.Children) {
            if (typeof locArr[child.Location.Y] === undefined) locArr[child.Location.Y] = [];
            locArr[child.Location.Y].push(child);
        }

        let width = this.Dimension.Width;

        locArr.forEach((child, key) => {
            locArr[key] = Utils.sortByXPos(locArr[key]);
            if (crunchMode == CrunchMode.Left) {
                let lastObjInEachRow = locArr[key][locArr[key].length - 1];

                estWidth = lastObjInEachRow.Location.X + lastObjInEachRow.linearWidth();

                if (estWidth > width && flag == false) {
                    flag = true;
                }
            } else {
                let firstObjInEachRow = locArr[key][0];

                estWidth = firstObjInEachRow.Location.X;

                if (estWidth < 0 && flag == false) {
                    flag = true;
                }
            }
        });

        return flag;
    }

    public getNextLocX(position: Position, dir?: NextLocXDirection, fixturePositionMovement?: number): number {
        if (!dir || dir.isUpDown) {
            return position.Location.X
        }
        let newLocationX = position.Location.X + (dir.left ? -(fixturePositionMovement) : fixturePositionMovement);
        if (this.Children.some(c => c.ObjectDerivedType === AppConstantSpace.DIVIDERS && c.Location.Y === 0)) {
            newLocationX = this.getNextLocXBasedDividers(newLocationX, position, dir);
        }
        newLocationX = dir.left
                        ? newLocationX < 0 ? 0 : newLocationX
                        : newLocationX + position.linearWidth() > this.ChildDimension.Width ? this.ChildDimension.Width - position.linearWidth() : newLocationX
        return newLocationX;
    }

    getNextLocXBasedDividers(newLocationX: number, position: Position, dir: NextLocXDirection): number {
        let positionWidth = position.linearWidth();
        let tempLocationX = dir.left ? newLocationX : newLocationX + positionWidth;

        let dividers = this.Children.filter(c => c.ObjectDerivedType === AppConstantSpace.DIVIDERS && c.Location.Y === 0);
        let sortedDividers = dir.left ? dividers.sort((a, b) => b.Location.X - a.Location.X) : dividers.sort((a, b) => a.Location.X - b.Location.X);

        let overlappingDividerIndex = sortedDividers.findIndex(d => d.Location.X <= tempLocationX && d.Location.X + d.Fixture.Thickness > tempLocationX);

        if (overlappingDividerIndex !== -1) {
            let lastDividerIndex = sortedDividers.length - 1;

            if (dir.left) {
                //This first if check to move item closer to divider boundary rather directly moving to different divider area
                if ((sortedDividers[overlappingDividerIndex].Location.X + sortedDividers[overlappingDividerIndex].Fixture.Thickness) - tempLocationX < 0.5) {
                    return sortedDividers[overlappingDividerIndex].Location.X + sortedDividers[overlappingDividerIndex].Fixture.Thickness;
                }
                //This for loop to check if item will fit in overlapping divider area or to try and see which next divider area will have space to fit the item
                for (let i = overlappingDividerIndex; i < lastDividerIndex; i++) {
                    let dividerAreaWidth = sortedDividers[i].Location.X - (sortedDividers[i + 1].Location.X + sortedDividers[i + 1].Fixture.Thickness);
                    if (positionWidth <= dividerAreaWidth) {
                        return sortedDividers[i].Location.X - positionWidth;
                    }
                }
                //Below check to handle last divider area, as item may fit or exceed coffincase boundary
                let dividerAreaWidth = sortedDividers[lastDividerIndex].Location.X;
                if (positionWidth <= dividerAreaWidth) {
                    return sortedDividers[lastDividerIndex].Location.X - positionWidth;
                } else {
                    return position.Location.X;
                }
            } else {
                if (tempLocationX - sortedDividers[overlappingDividerIndex].Location.X < 0.5) {
                    return sortedDividers[overlappingDividerIndex].Location.X - positionWidth;
                }
                for (let i = overlappingDividerIndex; i < lastDividerIndex; i++) {
                    let dividerAreaWidth = sortedDividers[i + 1].Location.X - (sortedDividers[i].Location.X + sortedDividers[i].Fixture.Thickness);
                    if (positionWidth <= dividerAreaWidth) {
                        return sortedDividers[i].Location.X + sortedDividers[i].Fixture.Thickness;
                    }
                }
                let dividerAreaWidth = this.ChildDimension.Width - (sortedDividers[lastDividerIndex].Location.X + sortedDividers[lastDividerIndex].Fixture.Thickness);
                if (positionWidth <= dividerAreaWidth) {
                    return sortedDividers[lastDividerIndex].Location.X + sortedDividers[lastDividerIndex].Fixture.Thickness;
                } else {
                    return position.Location.X;
                }
            }
        }

        return newLocationX;
    }

    public getNextLocY(position: Position, dir?: NextLocYDirection,fixturePositionMovement?: number): number {
        if (!dir || dir.leftRight) {
            return position.Location.Y;
        }
        let newLocationY = position.Location.Y + (dir.up ? fixturePositionMovement : -(fixturePositionMovement));
        if (this.Children.some(c => c.ObjectDerivedType === AppConstantSpace.DIVIDERS && c.Location.X === 0)) {
            newLocationY = this.getNextLocYBasedDividers(newLocationY, position, dir);
        }
        newLocationY = dir.up
                        ? newLocationY + position.linearHeight() > this.ChildDimension.Depth ? this.ChildDimension.Depth - position.linearHeight() : newLocationY
                        : newLocationY < 0 ? 0 : newLocationY;
        return newLocationY;
    }

    getNextLocYBasedDividers(newLocationY: number, position: Position, dir: NextLocYDirection): number {
        let positionHeight = position.linearHeight();

        let tempLocationY = dir.up ? newLocationY + positionHeight : newLocationY;

        let dividers = this.Children.filter(c => c.ObjectDerivedType === AppConstantSpace.DIVIDERS && c.Location.X === 0);
        let sortedDividers = dir.up ? dividers.sort((a, b) => a.Location.Y - b.Location.Y) : dividers.sort((a, b) => b.Location.Y - a.Location.Y);

        let overlappingDividerIndex = sortedDividers.findIndex(d => d.Location.Y <= tempLocationY && d.Location.Y + d.Fixture.Thickness > tempLocationY);

        if (overlappingDividerIndex !== -1) {
            let lastDividerIndex = sortedDividers.length - 1;

            if (dir.up) {
                if (tempLocationY - sortedDividers[overlappingDividerIndex].Location.Y < 0.5) {
                    return sortedDividers[overlappingDividerIndex].Location.Y - positionHeight;
                }
                for (let i = overlappingDividerIndex; i < lastDividerIndex; i++) {
                    let dividerAreaHeight = sortedDividers[i + 1].Location.Y - (sortedDividers[i].Location.Y + sortedDividers[i].Fixture.Thickness);
                    if (positionHeight <= dividerAreaHeight) {
                        return sortedDividers[i].Location.Y + sortedDividers[i].Fixture.Thickness;
                    }
                }
                let dividerAreaHeight = this.ChildDimension.Depth - (sortedDividers[lastDividerIndex].Location.Y + sortedDividers[lastDividerIndex].Fixture.Thickness);
                if (positionHeight <= dividerAreaHeight) {
                    return sortedDividers[lastDividerIndex].Location.Y + sortedDividers[lastDividerIndex].Fixture.Thickness;
                } else {
                    return position.Location.Y;
                }
            } else {
                if ((sortedDividers[overlappingDividerIndex].Location.Y + sortedDividers[overlappingDividerIndex].Fixture.Thickness) - tempLocationY < 0.5) {
                    return sortedDividers[overlappingDividerIndex].Location.Y + sortedDividers[overlappingDividerIndex].Fixture.Thickness;
                }
                for (let i = overlappingDividerIndex; i < lastDividerIndex; i++) {
                    let dividerAreaHeight = sortedDividers[i].Location.Y - (sortedDividers[i + 1].Location.Y + sortedDividers[i + 1].Fixture.Thickness);
                    if (positionHeight <= dividerAreaHeight) {
                        return sortedDividers[i].Location.Y - positionHeight;
                    }
                }
                let dividerAreaHeight = sortedDividers[lastDividerIndex].Location.Y;
                if (positionHeight <= dividerAreaHeight) {
                    return sortedDividers[lastDividerIndex].Location.Y - positionHeight;
                } else {
                    return position.Location.Y;
                }
            }
        }

        return newLocationY;
    }

    //This can be used to check if item is top most item
    public checkIfTopPosition(position: Position): boolean {
        const coffinCaseY = this.getNextLocY(position, { leftRight: true });
        return (coffinCaseY + position.linearHeight()) >= this.ChildDimension.Depth;
    }

    //This can be used to check if item is bottom most item
    public checkIfBottomPosition(position: Position): boolean {
        const coffinCaseY = this.getNextLocY(position, { leftRight: true });
        return coffinCaseY <= 0;
    }

    public checkIfFirstPosition(position: Position): boolean {
        let fixturePositionMovement: number = this.planogramStore.appSettings.CoffinPositionMovement;
        const coffinCaseX = this.getNextLocX(position, { isUpDown: true },fixturePositionMovement);
        return coffinCaseX <= 0;
    }

    public checkIfLastPosition(position: Position): boolean {
        let fixturePositionMovement: number = this.planogramStore.appSettings.CoffinPositionMovement;
        const coffinCaseX = this.getNextLocX(position, { isUpDown: true },fixturePositionMovement);
        return (coffinCaseX + position.linearWidth()) >= this.ChildDimension.Width;
    }

    public asCoffincase(): Coffincase {
        return this;
    }

    public setCanUseShrinkVal(pos: Position, skipUnits?: boolean): boolean {
        let allPos: Position[] = this.getAllPosInXDirWithNearest(pos);
        let totalLinear = 0;
        allPos.forEach((itm) => {
            const width = itm.linearWidth(true, skipUnits);
            totalLinear += width + this.getSKUGapXBaseOnCrunch(itm, width);
        });

        const totalFixLin = this.getTotalAvailLinear(pos);

        return totalLinear > totalFixLin ? true : false;
    }

    public canUseShrinkValInY(pos: Position, skipUnits?: boolean): boolean {
        let allPos: Position[] = this.getAllPosInYDirWithNearest(pos);
        let totalLinear = 0;
        allPos.forEach((itm) => {
            totalLinear += itm.linearHeight(true, skipUnits) + itm.getSKUGapY();
        });

        const totalFixLin = this.getTotalAvailLinearY(pos);
        return totalLinear > totalFixLin ? true : false;
    }

    public getTotalAvailLinear(pos: Position): number {
        const mainPos = this.shrinkService.getParellelPositionsInXDir(this, pos)[0];
        if (mainPos.$id != pos.$id) {
            const positions = this.getAllPosInXDirection(mainPos);
            const allPos = this.getAllPosInXDirection(pos);
            let targetPositions = allPos.filter(ap => positions.find(p => p.$id == ap.$id) != undefined);
            if (this.Fixture.LKCrunchMode == CrunchMode.Right) {
                targetPositions = targetPositions.filter(ap => ap.Location.X < pos.Location.X).sort((a, b) => b.Location.X - a.Location.X);
                const posRx = Utils.preciseRound(pos.Location.X + this.getPosWidthForRect(pos, true), 2);
                if (targetPositions.length) {
                    const mainPosWidth = positions.filter(po => po.Location.X > targetPositions[0].Location.X && Utils.preciseRound(po.Location.X + this.getPosWidthForRect(po, true), 2) <= posRx).reduce((ac, po) => ac + Utils.preciseRound(this.getPosWidthForRect(po, true), 2), 0);
                    return mainPosWidth;
                } else {
                    const leftDivider = this.getNearestDividerLeft(pos);
                    const startX = leftDivider ? (leftDivider.Location.X + leftDivider.Fixture.Thickness) : 0;
                    return Utils.preciseRound(posRx - startX, 2);
                }
            } else {
                targetPositions = targetPositions.filter(ap => ap.Location.X > pos.Location.X).sort((a, b) => a.Location.X - b.Location.X);
                if (targetPositions.length) {
                    const mainPosWidth = positions.filter(po => po.Location.X < targetPositions[0].Location.X && po.Location.X >= pos.Location.X).reduce((ac, po) => ac + Utils.preciseRound(this.getPosWidthForRect(po, true), 2), 0);
                    return mainPosWidth;
                } else {
                    const rightDivider = this.getNearestDividerRight(pos);
                    const fixtureWidth = rightDivider ? rightDivider.Location.X : this.ChildDimension.Width;
                    return Utils.preciseRound(fixtureWidth - pos.Location.X, 2);
                }
            }
        }

        let fixtureWidth = this.ChildDimension.Width;
        if (this.Fixture.HasDividers && this.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ) {
            fixtureWidth = this.getDividerBlockWidth(pos);
        }
        return fixtureWidth;
    }

    public getTotalAvailLinearY(pos: Position): number {
        const mainPos = this.shrinkService.getParellelPositionsInYDir(this, pos)[0];
        if (mainPos.$id != pos.$id) {
            const positions = this.getAllPosInYDirection(mainPos);
            const allPos = this.getAllPosInYDirection(pos);
            const targetPositions = allPos.filter(ap => positions.find(p => p.$id == ap.$id) != undefined && ap.Location.Y > pos.Location.Y).sort((a, b) => a.Location.Y - b.Location.Y);
            if (targetPositions.length) {
                const mainPosHeight = positions.filter(po => po.Location.Y < targetPositions[0].Location.Y).reduce((ac, po) => ac + Utils.preciseRound(po.Dimension.Height + po.getSKUGapY(), 2), 0);
                return mainPosHeight;
            } else {
                const topDivider = this.getNearestDividerTop(pos);
                const fixtureDepth = topDivider ? topDivider.Location.Y : this.ChildDimension.Depth;
                return Utils.preciseRound(fixtureDepth - pos.Location.Y, 2);
            }
        }

        let fixtureDepth = this.ChildDimension.Depth;
        if (this.Fixture.HasDividers && this.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ) {
            fixtureDepth = this.getDividerBlockHeight(pos);
        }
        return fixtureDepth;
    }

    public getDividerBlockWidth(pos: Position): number {
        const rightDividerXLoc = this.getNearestDividerRight(pos)?.Location.X ?? this.ChildDimension.Width;
        const leftDivider = this.getNearestDividerLeft(pos);
        const leftDividerXLoc = leftDivider?.Location.X ?? 0;
        return rightDividerXLoc - leftDividerXLoc - (leftDividerXLoc > 0 ? (leftDivider?.Fixture.Thickness ?? 0) : 0);
    }

    public getDividerBlockHeight(pos: Position): number {
        const topDividerYLoc = this.getNearestDividerTop(pos)?.Location.Y ?? this.ChildDimension.Depth;
        const bottomDivider = this.getNearestDividerBottom(pos);
        const bottomDividerYLoc = bottomDivider?.Location.Y ?? 0;
        return topDividerYLoc - bottomDividerYLoc - (bottomDividerYLoc > 0 ? (bottomDivider?.Fixture.Thickness ?? 0) : 0);
    }

    // Fill up Coffincase
    public fillCoffinCase(positionSel: Position): void {
        const sectionId = this.sharedService.getActiveSectionId();
        const ctx = new Context(this.sharedService.getObjectAs(sectionId, sectionId));

        // Find Available space and create Position
        const fillStatus = this.calculateFacingsAndFill(ctx, positionSel);

        let msg = '';
        switch (fillStatus) {
            case AppConstantSpace.FILLSTATUS.FILLED:
                this.sharedService.updatePosPropertGrid.next(true);
                msg = this.translate.instant('FILLING') + ' ' + this.ObjectDerivedType + ' ' + this.translate.instant('IS_COMPLETED');
                break;
            case AppConstantSpace.FILLSTATUS.MAX_CONSTRAINT:
                msg = this.translate.instant('UNABLE_FILL_DUE_MAX_CONSTRAINT');
                break;
            default:
                msg = this.translate.instant('NO_SPACE_AVAILABLE');
                break;
        }
        this.notifyService.warn(msg);
    }

    private calculateFacingsAndFill(ctx: Context, position: Position): number {
        const oldFacings = {
            X: position.Position.FacingsX,
            Y: position.Position.FacingsY,
            Z: position.Position.FacingsZ
        };
        let isSinglePos = this.getAllPosition().length === 1;
        let shrinkedWidth = position.getSingleFacingShrinkWidth();
        let shrinkedHeight = position.getSingleFacingShrinkHeight();

        if (this.Fixture.LKCrunchMode !== CrunchMode.NoCrunch) {
            let dimension = position.getDimByOrientation(position.Position.ProductPackage.Width, position.Position.ProductPackage.Height, position.Position.ProductPackage.Depth);
            shrinkedWidth = !this.Fixture.ForceApplyShrinkX ? dimension.Width : shrinkedWidth;
            shrinkedHeight = dimension.Height;
        }

        let newFacingsX = 0;
        let newFacingsY = 0;
        let maxFacings = 0;

        if (this.Fixture.HasDividers) {
            const dividerInfo = position.getDividerInfo(this);
            shrinkedWidth += dividerInfo.Type === DividerTypes.DividerFacingsLeft ? dividerInfo.Width : 0;
        }

        const rects = this.crunchMode.getRects(this, this.Fixture.LKCrunchMode, { lx: 0, rx: 0, ty: 0 });

        const topDivider = this.getNearestDividerTop(position);
        const rightDivider = this.getNearestDividerRight(position);
        const leftDivider = this.getNearestDividerLeft(position);
        const bottomDivider = this.getNearestDividerBottom(position);

        let fixtureDepth = topDivider ? topDivider.Location.Y : this.ChildDimension.Depth;
        let fixtureWidth = rightDivider ? rightDivider.Location.X : this.ChildDimension.Width;

        let startLocX = leftDivider ? leftDivider.Location.X + leftDivider.Fixture.Thickness : 0;
        let bottomLocY = bottomDivider ? bottomDivider.Location.Y + bottomDivider.Fixture.Thickness : 0;

        if (this.Fixture.LKCrunchMode === CrunchMode.NoCrunch && this.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ && this.Fixture.HasDividers) {
            const dividerBox: RectangleCoordinates2d = {
                xstart: Utils.preciseRound(startLocX, 2),
                xend: Utils.preciseRound(fixtureWidth, 2),
                ystart: Utils.preciseRound(bottomLocY, 2),
                yend: Utils.preciseRound(fixtureDepth, 2)
            }
            const dividerBoxPos = this.getIntersectedPosition(rects, dividerBox).filter(p => p.$id != position.$id);
            if (dividerBoxPos.length) {
                startLocX = position.Location.X;
                bottomLocY = position.Location.Y;
            } else {
                isSinglePos = true;
            }
        } else {
            if (isSinglePos) {
                startLocX = 0;
                bottomLocY = 0;
            } else {
                if (this.Fixture.LKCrunchMode === CrunchMode.Right) {
                    // Note: In right crunch mode, start loc X will be nearest left side position if have any otherwise 0
                    let selPosRect: RectangleCoordinates2d = {
                        xstart: Utils.preciseRound(startLocX, 2),
                        xend: Utils.preciseRound(fixtureWidth, 2),
                        ystart: Utils.preciseRound(position.Location.Y, 2),
                        yend: Utils.preciseRound(position.Location.Y + shrinkedHeight, 2)
                    };
                    let collidedPos = this.getIntersectedPosition(rects, selPosRect).filter(p => p.Location.X < position.Location.X).sort((a, b) => b.Location.X - a.Location.X);
                    if (collidedPos.length) {
                        startLocX = collidedPos[0].Location.X + collidedPos[0].linearWidth();
                    } else {
                        startLocX = 0;
                    }

                    // Note: If there is position above the selected pos then for that selected pos fixture depth will be the Location Y of the collided position
                    selPosRect = {
                        xstart: Utils.preciseRound(position.Location.X, 2),
                        xend: Utils.preciseRound(position.Location.X + shrinkedWidth, 2),
                        ystart: Utils.preciseRound(position.Location.Y, 2),
                        yend: Utils.preciseRound(fixtureDepth, 2)
                    };
                    collidedPos = this.getIntersectedPosition(rects, selPosRect).filter(p => p.Location.Y > position.Location.Y).sort((a, b) => a.Location.Y - b.Location.Y);
                    fixtureDepth = collidedPos.length ? collidedPos[0].Location.Y : fixtureDepth;
                } else {
                    startLocX = position.Location.X;
                }
                bottomLocY = position.Location.Y;
            }
        }

        // Note: Store the xEnd and yEnd if its creating max facings
        const calculateMaxFacings = (rect1: RectangleCoordinates2d) => {

            //Calculate facing x
            let facingX = 1;
            let newPosWidth = shrinkedWidth;
            while (newPosWidth <= (rect1.xend - rect1.xstart)) {
                facingX++;
                newPosWidth = ((shrinkedWidth) * facingX) + (facingX - 1) * position.Position.GapX;
                if (newPosWidth > (rect1.xend - rect1.xstart)) {
                    facingX--;
                }
            }

            //Calculate facing y
            let facingY = 1;
            let newPosHeight = shrinkedHeight;
            while (newPosHeight <= (rect1.yend - rect1.ystart)) {
                facingY++;
                newPosHeight = (shrinkedHeight * facingY) + (facingY - 1) * position.Position.GapY;
                if (newPosHeight > (rect1.yend - rect1.ystart)) {
                    facingY--;
                }
            }

            if (maxFacings == 0) {
                maxFacings = facingX * facingY;
                newFacingsX = facingX;
                newFacingsY = facingY;
            } else if (maxFacings < facingX * facingY) {
                maxFacings = facingX * facingY;
                newFacingsX = facingX;
                newFacingsY = facingY;
            }
        }

        // Note: Trying to find max facings from X Direction and increase facings Y one by one
        let rect1: RectangleCoordinates2d = {
            xstart: Utils.preciseRound(startLocX, 2),
            xend: Utils.preciseRound(fixtureWidth, 2),
            ystart: Utils.preciseRound(bottomLocY, 2),
            yend: Utils.preciseRound(bottomLocY + shrinkedHeight, 2)
        }
        let intersectedPos = this.getIntersectedPosition(rects, rect1).filter(p => p.$id != position.$id).sort((a, b) => a.Location.X - b.Location.X);
        if (intersectedPos.length) {
            rect1.xend = intersectedPos[0].Location.X;
        }
        calculateMaxFacings(rect1);
        let stopLoop: boolean = false;
        do {
            const newYEnd = Utils.preciseRound(rect1.yend + shrinkedHeight, 2);
            rect1.yend = newYEnd < fixtureDepth ? newYEnd : fixtureDepth;
            intersectedPos = this.getIntersectedPosition(rects, rect1).filter(p => p.$id != position.$id).sort((a, b) => a.Location.Y - b.Location.Y);
            if (intersectedPos.length) {
                if (rect1.xend == fixtureWidth) {
                    if (intersectedPos[0].Location.X > 0 && intersectedPos[0].Location.X > rect1.xend) {
                        rect1.xend = intersectedPos[0].Location.X;
                    } else {
                        rect1.yend = intersectedPos[0].Location.Y;
                        stopLoop = true;
                    }
                } else {
                    rect1.yend = intersectedPos[0].Location.Y;
                    stopLoop = true;
                }
            } else if (rect1.yend == fixtureDepth) {
                stopLoop = true;
            }
            calculateMaxFacings(rect1);
        } while (!stopLoop)

        // Note: Trying to find max facings from Y Direction and increase facings X one by one
        rect1 = {
            xstart: Utils.preciseRound(startLocX, 2),
            xend: Utils.preciseRound(startLocX + shrinkedWidth, 2),
            ystart: Utils.preciseRound(bottomLocY, 2),
            yend: Utils.preciseRound(fixtureDepth, 2)
        }
        intersectedPos = this.getIntersectedPosition(rects, rect1).filter(p => p.$id != position.$id).sort((a, b) => a.Location.Y - b.Location.Y);
        if (intersectedPos.length) {
            rect1.yend = intersectedPos[0].Location.Y;
        }
        calculateMaxFacings(rect1);
        stopLoop = false;
        do {
            const newXEnd = Utils.preciseRound(rect1.xend + shrinkedWidth, 2);
            rect1.xend = newXEnd < fixtureWidth ? newXEnd : fixtureWidth;
            intersectedPos = this.getIntersectedPosition(rects, rect1).filter(p => p.$id != position.$id).sort((a, b) => a.Location.X - b.Location.X);
            if (intersectedPos.length) {
                if (rect1.yend == fixtureDepth) {
                    if (intersectedPos[0].Location.Y > 0 && intersectedPos[0].Location.Y > rect1.yend) {
                        rect1.yend = intersectedPos[0].Location.Y;
                    } else {
                        rect1.xend = intersectedPos[0].Location.X;
                        stopLoop = true;
                    }
                } else {
                    rect1.xend = intersectedPos[0].Location.X;
                    stopLoop = true;
                }
            } else if (rect1.xend == fixtureWidth) {
                stopLoop = true;
            }
            calculateMaxFacings(rect1);
        } while (!stopLoop)

        const newFacingsZ = Math.floor(this.getMerchDepth() / (position.linearDepth(true) / position.Position.FacingsZ));

        if (newFacingsX > position.Position.MaxFacingsX || newFacingsY > position.Position.MaxFacingsY || newFacingsZ > position.Position.MaxFacingsZ) {
            return AppConstantSpace.FILLSTATUS.MAX_CONSTRAINT;
        }

        // Move position to 0,0 location for NoCrunch mode
        if (this.Fixture.LKCrunchMode === CrunchMode.NoCrunch && isSinglePos) {
            const fromToIndex = this.Children.findIndex(x => x.$id === position.$id);
            this.movePosition(ctx, fromToIndex, this, fromToIndex, { left: startLocX + position.linearWidth(true), top: bottomLocY + position.linearHeight(true) });
        }

        // Increase facing x
        if (oldFacings.X !== newFacingsX) {
            delete Context.linearWidth[position.$id];
            this.shelfBumpService.increaseFacing(ctx, [position], newFacingsX, 'FacingsX');
        }

        // Increase facing y
        if (oldFacings.Y !== newFacingsY) {
            delete Context.linearHeight[position.$id];
            this.shelfBumpService.increaseFacing(ctx, [position], newFacingsY, 'FacingsY');
        }

        // Increase facing z
        const isFacingsZChanged = this.increaseFacingZBeforeFill(ctx, position, false);

        if (oldFacings.X !== position.Position.FacingsX ||
            oldFacings.Y !== position.Position.FacingsY ||
            isFacingsZChanged) {
            return AppConstantSpace.FILLSTATUS.FILLED;
        }
        return AppConstantSpace.FILLSTATUS.NO_SPACE;
    }

    // Increase facing z of the selected position before fill
    private increaseFacingZBeforeFill(ctx: Context, position: Position, fillUptoMax: boolean): boolean {
        const oldFacingZ = position.Position.FacingsZ;
        if (!this.Fixture.AutoComputeDepth) {
            const linearDepth = position.linearDepth(true);
            let newFacingsZ = Math.floor(this.getMerchDepth() / (linearDepth / position.Position.FacingsZ));
            if (fillUptoMax && newFacingsZ > position.Position.MaxFacingsZ) {
                newFacingsZ = position.Position.MaxFacingsZ;
            }
            if (oldFacingZ != newFacingsZ) {
                this.shelfBumpService.increaseFacing(ctx, [position], newFacingsZ, 'FacingsZ');
            }
        }
        return oldFacingZ !== position.Position.FacingsZ;
    }

    public removeDuplicatePosition(sectionID: string , duplicatePositions: Position[]): void {
        const unqHistoryID = this.historyService.startRecording();
      const section = this.sharedService.getObject(sectionID, sectionID) as Section;
      const annotationsOfPositions = section.annotations.filter(ele => {
        return duplicatePositions.some(pos => pos.IDPOGObject === ele.IDPOGObject);
      });
      const annotations = cloneDeep(annotationsOfPositions);
      const ctx = new Context(section);
      this.callRemoveDuplicates(duplicatePositions, section, ctx);
      let original = ((duplicatePositions, section, ctx) => {
        return () => {
          this.callRemoveDuplicates(duplicatePositions, section, ctx);
        };
      })(duplicatePositions, section, ctx);
      let revert = ((duplicatePositions, section, ctx, annotationsOfPositions) => {
        return () => {
          this.undoRemoveDuplicates(duplicatePositions, section, ctx, annotationsOfPositions);
        };
      })(
        duplicatePositions, section, ctx, annotations
      );
      this.historyService.captureActionExec({
        funoriginal: original,
        funRevert: revert,
        funName: 'RemoveDuplicates',
      });
      this.historyService.stopRecording(undefined, undefined, unqHistoryID);
    }
    private callRemoveDuplicates(duplicatePositions: Position[], section: Section, ctx: Context): void {
        duplicatePositions.forEach(element => {
          let annotationForPosition = section.annotations.filter(ano => ano.IDPOGObject === element.IDPOGObject);
          if (annotationForPosition.length) {
            annotationForPosition.forEach(ele => {
              ele.status = 'deleted';
            });
          }
            const index = this.Children.findIndex(pos => {
                if (element.IDPOGObject) {
                    return pos.IDPOGObject === element.IDPOGObject
                } else {
                    return pos.TempId === element.TempId
                }
            });
          this.Children.splice(index, 1);
        });
        section.computePositionsAfterChange(ctx);
        if (this.Fixture.LKCrunchMode === CrunchMode.NoCrunch) {
            this.crunchMode.rePositionCoffinCaseOnCrunch(this, this.Fixture.LKCrunchMode);
        }
        this.render2d.isDirty = true;
        this.sharedService.updateAnnotationPosition.next(true);
      }

      private undoRemoveDuplicates(duplicatePositions: Position[], section: Section, ctx: Context, annotationsOfPositions: Annotation[]):void {
        duplicatePositions.forEach(element => {
          let annotationForPosition = section.annotations.filter(ano => ano.IDPOGObject === element.IDPOGObject);
          if (annotationForPosition.length) {
            annotationForPosition.forEach(ele => {
              const excitingAnnotation = annotationsOfPositions.find(anp => anp.IDPOGObject === element.IDPOGObject);
              ele.status = excitingAnnotation?.status;
            });
          }
          this.Children.push(element);
        });
        section.computePositionsAfterChange(ctx);
        this.render2d.isDirty = true;
        this.sharedService.updateAnnotationPosition.next(true);
    }

    public getMerchDepth(): number {
        let merchDepth = Math.max(0, this.ChildDimension.Height);
        if (!Utils.isNullOrEmpty(this.Fixture.MaxMerchHeight) && this.Fixture.MaxMerchHeight > 0) {
            merchDepth = Math.min(merchDepth, this.Fixture.MaxMerchHeight);
        }
        return merchDepth
    }

    public alignCoffins(positionList: Position[], action: string): void {
        const historyId = this.historyService.startRecording();
        let newLocationX: number;
        let newLocationY: number;
        switch (action.toLowerCase()) {
            case AppConstantSpace.COFFIN_POSITION_ALIGNMENT.LEFT:
                newLocationX = positionList[0].Location.X;
                positionList.forEach(pos => {
                    let oldLocationX = pos.Location.X;
                    let oldLocationY = pos.Location.Y;
                    this.setPositionLocationX(pos, newLocationX);
                    this.setPositionLocationY(pos, pos.Location.Y);
                    this.logHistoryForCoffinPositionAlignment(pos, newLocationX, pos.Location.Y, oldLocationX, oldLocationY);
                });
                break;
            case AppConstantSpace.COFFIN_POSITION_ALIGNMENT.RIGHT:
                newLocationX = positionList[0].Location.X + positionList[0].linearWidth();
                positionList.forEach(pos => {
                    let oldLocationX = pos.Location.X;
                    let oldLocationY = pos.Location.Y;
                    this.setPositionLocationX(pos, newLocationX - pos.linearWidth());
                    this.setPositionLocationY(pos, pos.Location.Y);
                    this.logHistoryForCoffinPositionAlignment(pos, (newLocationX - pos.linearWidth()), pos.Location.Y, oldLocationX, oldLocationY);
                });
                break;
            case AppConstantSpace.COFFIN_POSITION_ALIGNMENT.BOTTOM:
                newLocationY = positionList[0].Location.Y;
                positionList.forEach(pos => {
                    let oldLocationX = pos.Location.X;
                    let oldLocationY = pos.Location.Y;
                    this.setPositionLocationX(pos, pos.Location.X);
                    this.setPositionLocationY(pos, newLocationY);
                    this.logHistoryForCoffinPositionAlignment(pos, pos.Location.X, newLocationY, oldLocationX, oldLocationY);
                });
                break;
            case AppConstantSpace.COFFIN_POSITION_ALIGNMENT.TOP:
                newLocationY = positionList[0].Location.Y + positionList[0].linearHeight();
                positionList.forEach(pos => {
                    let oldLocationX = pos.Location.X;
                    let oldLocationY = pos.Location.Y;
                    this.setPositionLocationX(pos, pos.Location.X);
                    this.setPositionLocationY(pos, newLocationY - pos.linearHeight());
                    this.logHistoryForCoffinPositionAlignment(pos, pos.Location.X, (newLocationY - pos.linearHeight()), oldLocationX, oldLocationY);
                });
                break;
        }
        this.planogramService.insertPogIDs(this.Children, true);
        const ctx = new Context(this.section);
        this.computePositionsAfterChange(ctx);
        this.planogramService.updateNestedStyleDirty = true;
        this.historyService.stopRecording(undefined, undefined, historyId);
    }

    private logHistoryForCoffinPositionAlignment(pos: Position, newLocationX: number,newLocationY: number, oldLocationX: number, oldLocationY: number): void {
        const original = ((position, newLocationX, newLocationY) => {
            return () => {
                this.setPositionLocationX(position, newLocationX);
                this.setPositionLocationY(position, newLocationY);
            };
        })(pos, newLocationX, newLocationY);
        const revert = ((position, oldLocationX, oldLocationY) => {
            return () => {
                this.setPositionLocationX(position, oldLocationX);
                this.setPositionLocationY(position, oldLocationY);
            };
        })(pos, oldLocationX, oldLocationY);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'CoffinPositionLocationChanges',
        });
    }

    public movePositionDirectlyInCoffin(direction: string, position: Position): Offset {
        let currentFixtureObj = this.sharedService.getParentObject(position, position.$sectionID);
        const rects = this.crunchMode.getRects(this, this.Fixture.LKCrunchMode, { lx: 0, rx: 0, ty: 0 });
        let offSet: Offset = {
            left: null,
            top: null
        };
        switch (direction) {
            case AppConstantSpace.POSITION_DIRECTION.RIGHT:
                const selectedRightPosRect: RectangleCoordinates2d = {
                    xstart: Utils.preciseRound(position.Location.X, 2),
                    xend: Utils.preciseRound(currentFixtureObj.ChildDimension.Width, 2),
                    ystart: Utils.preciseRound(position.Location.Y, 2),
                    yend: Utils.preciseRound(position.Location.Y + position.linearHeight(), 2)
                }
                //if right divider exists
                const rightDivider = this.getNearestDividerRight(position);
                if (rightDivider) {
                    selectedRightPosRect.xend = Utils.preciseRound(rightDivider.Location.X, 2);
                }
                const rightIntersectedPositions = this.getIntersectedPosition(rects, selectedRightPosRect).filter(p => p.$id != position.$id).sort((a, b) => a.Location.X - b.Location.X);
                if (rightIntersectedPositions.length > 0) {
                    offSet.left = Utils.preciseRound(rightIntersectedPositions[0].Location.X, 2);
                    offSet.top = Utils.preciseRound(rightIntersectedPositions[0].Location.Y + position.linearHeight(), 2);
                }
                else {
                    offSet.left = selectedRightPosRect.xend;
                    offSet.top = selectedRightPosRect.yend;
                }
                break;
            case AppConstantSpace.POSITION_DIRECTION.LEFT:
                const selectedLeftPosRect: RectangleCoordinates2d = {
                    xstart: 0,
                    xend: Utils.preciseRound(position.Location.X, 2),
                    ystart: Utils.preciseRound(position.Location.Y, 2),
                    yend: Utils.preciseRound(position.Location.Y + position.linearHeight(), 2)
                }
                //if left divider exists
                const leftDivider = this.getNearestDividerLeft(position);
                if (leftDivider) {
                    selectedLeftPosRect.xstart = Utils.preciseRound(leftDivider.Location.X + leftDivider.Fixture.Thickness, 2);
                }
                const leftIntersectedPos = this.getIntersectedPosition(rects, selectedLeftPosRect).filter(p => p.$id != position.$id).sort((a, b) => b.Location.X - a.Location.X);
                if (leftIntersectedPos.length > 0) {
                    const positionWidth = position.linearWidth();
                    offSet.left = Utils.preciseRound(leftIntersectedPos[0].Location.X + leftIntersectedPos[0].linearWidth() + positionWidth, 2);
                    offSet.top = Utils.preciseRound(leftIntersectedPos[0].Location.Y + position.linearHeight(), 2);
                }
                else {
                    offSet.left = Utils.preciseRound(position.linearWidth(), 2);
                    offSet.top = selectedLeftPosRect.yend;
                }
                break;
            case AppConstantSpace.POSITION_DIRECTION.UP:
                const selectedTopPosRect: RectangleCoordinates2d = {
                    xstart: Utils.preciseRound(position.Location.X, 2),
                    xend: Utils.preciseRound(position.Location.X + position.linearWidth(), 2),
                    ystart: Utils.preciseRound(position.Location.Y, 2),
                    yend: Utils.preciseRound(currentFixtureObj.ChildDimension.Depth, 2)
                }
                //if top divider exists
                const topDivider = this.getNearestDividerTop(position);
                if (topDivider) {
                    selectedTopPosRect.yend = Utils.preciseRound(topDivider.Location.Y, 2);
                }
                const topIntersectedPositions = this.getIntersectedPosition(rects, selectedTopPosRect).filter(p => p.$id != position.$id).sort((a, b) => a.Location.Y - b.Location.Y);
                if (topIntersectedPositions.length > 0) {
                    offSet.left = Utils.preciseRound(topIntersectedPositions[0].Location.X + position.linearWidth(), 2);
                    offSet.top = Utils.preciseRound(topIntersectedPositions[0].Location.Y, 2);
                }
                else {
                    offSet.left = selectedTopPosRect.xend;
                    offSet.top = selectedTopPosRect.yend;
                }
                break;
            case AppConstantSpace.POSITION_DIRECTION.DOWN:
                const selectedBottomPosRect: RectangleCoordinates2d = {
                    xstart: Utils.preciseRound(position.Location.X, 2),
                    xend: Utils.preciseRound(position.Location.X + position.linearWidth(), 2),
                    yend: Utils.preciseRound(position.Location.Y, 2),
                    ystart: 0,
                }
                //if bottom divider exists
                const bottomDivider = this.getNearestDividerBottom(position);
                if (bottomDivider) {
                    selectedBottomPosRect.ystart = Utils.preciseRound(bottomDivider.Location.Y + bottomDivider.Fixture.Thickness, 2);
                }
                const bottomIntersectedPos = this.getIntersectedPosition(rects, selectedBottomPosRect).filter(p => p.$id != position.$id).sort((a, b) => b.Location.Y - a.Location.Y);
                if (bottomIntersectedPos.length > 0) {
                    offSet.left = Utils.preciseRound(bottomIntersectedPos[0].Location.X + position.linearWidth(), 2);
                    offSet.top = Utils.preciseRound(bottomIntersectedPos[0].Location.Y + bottomIntersectedPos[0].linearHeight() + position.linearHeight(), 2);
                }
                else {
                    offSet.left = selectedBottomPosRect.xend;
                    offSet.top = Utils.preciseRound(selectedBottomPosRect.ystart + position.linearHeight(), 2);
                }
                break;
        }
        return offSet;
    }
}

// private interfaces
interface DropCord {
    left?: number;
    top: number;
    right?: number;
}

interface Responsible {
    Y: number;
    Slope: number;
    Depth: number;
    Thickness: number;
}
