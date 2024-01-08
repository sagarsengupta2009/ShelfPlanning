import { TranslateService } from '@ngx-translate/core';
import { Utils } from '../constants/utils';
import { cloneDeep } from 'lodash-es';
import { Fixture } from './fixture';
import { Orientation } from './orientation';
import { Position } from './position';
import { PegBoard } from './peg-board';
import {
    PlanogramStoreService, PlanogramService,
    SharedService, HistoryService, NotifyService, CollisionService, ParentApplicationService, Render2dService
} from '../services';
import { PositionParentList } from '../services/common/shared/shared.service';
import { DropCoord, ShoppingcartResponse } from '../models';
import { Section } from './section';
import { Context } from './context';
import { AppConstantSpace } from '../constants';
import { AllocateUtilitiesService } from '../services/layouts/allocate/utilities/allocate-utilities.service';
declare var window;

export class ShoppingCart extends Fixture implements Partial<ShoppingcartResponse> {

  public FixtureType: string = 'ShoppingCart';
  ObjectDerivedType: 'ShoppingCart';

  public Children: Position[] = [];
  public IDFixtureType: number = -1;
  public FixtureDesc: string = 'Shelf 0';
  public FixtureNumber: number = 0.0;
  public IsLikePosition: boolean = false;
  public IsMerchandisable: boolean = false;
  public IsMovable: boolean = true;
  public Height: number = 26.75; // TODO @karthik remove?
  public Width: number = 144.0;
  public Depth: number = 25.0;
  public Thickness: number = 0.0;
  public MaxMerchWidth: number = 0.0;
  public MaxMerchDepth: number = 0.0;
  public MaxMerchHeight: number = 0.0;
  public LKCrunchMode: number = null;
  public CanJoin: boolean = null;
  public Color: string = null;

  public AvailableLinear: number = 144.0; // @karthik why this value?
  public isPosition: boolean = false;

    public Location = {
        X: 0.0,
        Y: 83.2,
        Z: 0.0,
    };
    public Dimension = {
        Height: 26.75,
        Width: 144.0,
        Depth: 25.0,
    };
    public Rotation = {
        X: 0.0,
        Y: 0.0,
        Z: 0.0,
    };
    public RotationOrigin = {
        X: 0.0,
        Y: 0.0,
        Z: 0.0,
    };
    public ChildOffset = {
        X: null,
        Y: null,
        Z: null,
    };
    public ChildDimension = {
        Height: 0.0,
        Width: 0.0,
        Depth: 0.0,
    };
    public spreadSpanProperties = {}; // Added only to avoid errors in Next prev using keyboard key.
    OrientNS = new Orientation();
    orderBy?: { predicate: string | string[]; reverse: boolean; };
    public uiProperties: string[] = ['orderBy', 'OrientNS', 'spreadSpanProperties', 'isPosition', ];
    constructor(
        data: ShoppingcartResponse,
        public readonly notifyService: NotifyService,
        public readonly translate: TranslateService,
        public readonly sharedService: SharedService,
        public readonly planogramservice: PlanogramService,
        public readonly historyService: HistoryService,
        public readonly planogramStore: PlanogramStoreService,
        public readonly collision: CollisionService,
        public readonly parentApp: ParentApplicationService,
        private readonly render2d: Render2dService,
        private readonly allocateUtils: AllocateUtilitiesService
    ) {
        super(data, notifyService, translate, sharedService, planogramservice, historyService, planogramStore,
            collision);
    }

    public isRenderingAllowed(): boolean {
        return false;
    }

    public getType(): string {
        return AppConstantSpace.SHOPPINGCARTOBJ as string;
    }

    public addPosition(ctx: Context,position: Position, index: number, dropCoord: DropCoord): void {
        position.IDPOGObjectParent = this.IDPOGObject; // Kuldip changes for IDPOGObject
        position.setParentId(this.$id); //fixes for this.ObjectProvider parentID
        this.Children.splice(index, 0, position);
        this.render2d.isCartDirty = true;
    }

    public removePosition(ctx: Context, index: number): void {
        this.Children.splice(index, 1);
        this.render2d.isCartDirty = true;
    }

    public calculateDistribution(ctx: Context): void {
        let sectionObj= this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        if (sectionObj.getSkipShelfCalculateDistribution()) { return; }
        this.Fixture.Capacity = 0;
        this.Children.forEach((position) => {
            if (position.isPosition) {
                position.calculateDistribution(ctx,this);
            }
        });
    }

    //Undo flag is required to skip the cahnging facings while undo is in progress
    public movePosition(ctx: Context, fromIndex: number, toFixture: PositionParentList, toIndex: number, dropCoord, undoflag?) {
        if (this.Children.length > 0) {
            let position = this.Children[fromIndex];
            let oldDropCoord;
            //@Narendra If toFixture is standard shelf, it is required to change the facings to 1
            //it is needed to avoid the ctrl + Z issue. When item placed on ss it's facings Y will be calculated auto
            //When reverting it won't get it's previous facings Y viz it's facing change is not recorded
            if ((Utils.checkIfCrossbar(toFixture) || Utils.checkIfSlotwall(toFixture) || Utils.checkIfPegboard(toFixture)) && undoflag == undefined) {
                const original = ((position) => {
                    return () => {
                        position.Position.FacingsY = 1;
                    };
                })(position);
                const revert = ((position, originalFacings) => {
                    return () => {
                        position.Position.FacingsY = originalFacings;
                    };
                })(position, position.Position.FacingsY);
                this.historyService.captureActionExec({
                    funoriginal: original,
                    funRevert: revert,
                    funName: 'ChangeFacings',
                }, this.$sectionID);
                position.Position.FacingsY = 1;
            }
            this.removePosition(ctx, fromIndex);
            toFixture.addPosition(ctx, position, toIndex, dropCoord, undefined, undefined, undefined);
            if(toFixture.$id !== this.$id) { // updating shoppingcart items once the position added to the pog
                  this.render2d.isCartDirty = true;
            }
            position.calculateDistribution(ctx, toFixture);
            if (Utils.checkIfPegType(toFixture) && toFixture instanceof PegBoard) {
                toFixture.Children = toFixture.pegPositionSort(toFixture) as any; // TODO remove any once pegboard type is addressed.
                toIndex = toFixture.Children.indexOf(position);
            }
            //assort check for must not stock on undo
            if (this.sharedService.mode == 'iAssortNICI' && this.sharedService.triggeredFromAssort != true) {
                if (undoflag != undefined && position.Position.attributeObject.RecMustNotStock) {
                    this.notifyService.warn('Cannot restore must not stock item', 'required');
                    window.setTimeout(function () {
                        this.historyService.redo();
                    });
                } else {
                    if (toFixture.ObjectDerivedType == 'ShoppingCart' as any)
                        window.parent.postMessage(`invokePaceFunc:deleteProduct:["${position.Position.IDProduct}"]`, '*');
                    else {
                        if (position.Position.attributeObject.RecADRI == 'A') {
                            window.parent.postMessage(`invokePaceFunc:itemDropped:"${JSON.stringify(Utils.formatAssortMessage(toIndex, toFixture, position.Position.IDProduct),)}"`, '*');
                        } else
                            window.parent.postMessage(`invokePaceFunc:addProduct:["${position.Position.IDProduct}"]`, '*');
                    }
                    window.footerStatusItemID = null;
                }
            }

            //update key
            if (this.parentApp.isAllocateApp) {
               this.allocateUtils.updatePaPositionKey(position);
            }

            let clonedDropCord;
            if (dropCoord !== undefined) {
                clonedDropCord = cloneDeep(dropCoord);
            }

            //feature undo-redo: by AM
            //dt. 11th, Aug, 2014
            const original = (( fromIndex, toFixture, toIndex, dropCoord) => {
                return () => {
                    this.movePosition(ctx, fromIndex, toFixture, toIndex, dropCoord);
                };
            })(fromIndex, toFixture, toIndex, clonedDropCord);
            const revert = ((toFixture, toIndex, fromIndex, oldDropCoord) => {
                return () => {
                  this.movePosition.call(toFixture , ctx, toIndex, this, fromIndex, oldDropCoord);
                };
            })(toFixture, toIndex, fromIndex, oldDropCoord);
            this.historyService.captureActionExec({
                funoriginal: original,
                funRevert: revert,
                funName: 'MoveItems',
            }, this.$sectionID);
            /* ends here*/
        }
    }

    public removePositionWithHistory(ctx: Context, positions: Position[]): void {
        const isSettingEnabled = this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data.find(set => set.KeyName === 'REMOVE_POSITION_FROM_CART')?.KeyValue;
        if (!isSettingEnabled) {
            return;
        }
        let positionRemoved: boolean = false;
        positions.forEach(item => {
            if (item.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT && this.checkProductPresentInCart(item)) {
                const index = this.Children.findIndex(pos => pos.Position.IDProduct == item.Position.IDProduct && pos.Position.IDPackage === item.Position.IDPackage);
                const pos = this.Children[index];
                this.removePosition(ctx, index);
                const original = ((ctx, index) => {
                    return () => {
                        this.removePosition(ctx, index);
                    };
                })(ctx, index);
                const revert = ((index, pos) => {
                    return () => {
                        this.addPosition(ctx, pos, index, undefined);
                    };
                })(index, pos);
                this.historyService.captureActionExec({
                    funoriginal: original,
                    funRevert: revert,
                    funName: 'removePositionFromShoppingCart',
                }, this.$sectionID);
                positionRemoved = true;
            }
        });
        if (positionRemoved) {
            this.notifyService.warn('PRODUCT_REMOVED_FROM_SHOPPING_CART');
        }
    }

    public linearWidthPosition(pos: Position): number {
        // view will need to change based on the POV of this POG for now it is just from the Front
        const orientation = pos.getOrientation();
        const dimensions = this.OrientNS.GetDimensions(orientation, false, this.OrientNS.View.Front, pos.Position.ProductPackage.Width, pos.Position.ProductPackage.Height, pos.Position.ProductPackage.Depth);
        const width = dimensions.Width + pos.getSKUGap(true, dimensions.Width);
        let nesting = this.OrientNS.GetDimensions(orientation, false, this.OrientNS.View.Front, pos.Position.ProductPackage.NestingX, pos.Position.ProductPackage.NestingY, pos.Position.ProductPackage.NestingZ);
        // Nesting should not be greater than the product dimension
        nesting.Width = (nesting.Width > dimensions.Width) ? 0 : nesting.Width;
        nesting.Height = (nesting.Height > dimensions.Height) ? 0 : nesting.Height;
        nesting.Depth = (nesting.Depth > dimensions.Depth) ? 0 : nesting.Depth;

        let lw: number = 0;
        if (pos.Position.FacingsX > 0) {
            lw = (width * pos.Position.FacingsX) + ((pos.Position.FacingsX - 1) * (pos.Position.GapX - nesting.Width));
        }
        return lw;
    }

    public linearHeightPosition(pos: Position): number {
        // view will need to change based on the POV of this POG for now it is just from the Front
        const orientation = pos.getOrientation();
        const dimensions = this.OrientNS.GetDimensions(orientation, false, this.OrientNS.View.Front, pos.Position.ProductPackage.Width, pos.Position.ProductPackage.Height, pos.Position.ProductPackage.Depth);
        let height: number = dimensions.Height;
        let depth: number = dimensions.Depth;
        let nesting = this.OrientNS.GetDimensions(orientation, false, this.OrientNS.View.Front, pos.Position.ProductPackage.NestingX, pos.Position.ProductPackage.NestingY, pos.Position.ProductPackage.NestingZ);
        // Nesting should not be greater than the product dimension
        nesting.Width = (nesting.Width > dimensions.Width) ? 0 : nesting.Width;
        nesting.Height = (nesting.Height > dimensions.Height) ? 0 : nesting.Height;
        nesting.Depth = (nesting.Depth > dimensions.Depth) ? 0 : nesting.Depth;

        if (!pos.Position.LayundersY) {
            pos.Position.LayundersY = 0;
        }

        if (!pos.Position.FacingsY || pos.Position.FacingsY == 0) {
            pos.Position.FacingsY = 1;
        }

        let lh: number = (height * pos.Position.FacingsY) + (depth * pos.Position.LayoversY) + (depth * pos.Position.LayundersY);
        if ((pos.Position.FacingsY + pos.Position.LayoversY + pos.Position.LayundersY) > 0) {
            lh += (pos.Position.FacingsY + pos.Position.LayoversY + pos.Position.LayundersY - 1) * (pos.Position.GapY - nesting.Height);
        }
        return lh;
    }

    public linearDepthPosition(pos: Position): number {
        // view will need to change based on the POV of this POG for now it is just from the Front
        const orientation = pos.getOrientation();
        const dimensions = this.OrientNS.GetDimensions(orientation, false, this.OrientNS.View.Front, pos.Position.ProductPackage.Width, pos.Position.ProductPackage.Height, pos.Position.ProductPackage.Depth);
        const height: number = dimensions.Height;
        const depth: number = dimensions.Depth;
        let nesting = this.OrientNS.GetDimensions(orientation, false, this.OrientNS.View.Front, pos.Position.ProductPackage.NestingX, pos.Position.ProductPackage.NestingY, pos.Position.ProductPackage.NestingZ);
        // Nesting should not be greater than the product dimension
        nesting.Width = (nesting.Width > dimensions.Width) ? 0 : nesting.Width;
        nesting.Height = (nesting.Height > dimensions.Height) ? 0 : nesting.Height;
        nesting.Depth = (nesting.Depth > dimensions.Depth) ? 0 : nesting.Depth;
        let FrontDepth: number = 0;
        if (pos.Position.FacingsZ > 0) {
            FrontDepth = (depth * pos.Position.FacingsZ) + ((pos.Position.FacingsZ - 1) * (pos.Position.GapZ - nesting.Depth));
        }
        let LayunderDepth: number = 0;
        if (pos.Position.LayundersZ > 0) {
            LayunderDepth = height * pos.Position.LayundersZ + ((pos.Position.LayundersZ - 1) * (pos.Position.GapZ - nesting.Height));
        }
        let LayoverDepth: number = 0;
        if (pos.Position.LayoversZ > 0) {
            LayoverDepth = height * pos.Position.LayoversZ + ((pos.Position.LayoversZ - 1) * (pos.Position.GapZ - nesting.Height));
        }
        return Math.max(FrontDepth, Math.max(LayunderDepth, LayoverDepth));
    }

    //if fromProductLib is true pos will not be type Position
    //TODO @Keerthi add interface type for pos
    public checkProductPresentInCart(pos, fromProductLib:boolean = false): boolean {
        for (let i = 0; i < this.Children.length; i++) {
            if(fromProductLib) {
                if (this.Children[i].Position.IDProduct ===  (pos?.IDProduct || pos?.Product?.IDProduct) && this.Children[i].Position.IDPackage === (pos?.IDPackage || pos?.ProductPackage?.IDPackage)) {
                    return true;
                }
            } else {
                if (this.Children[i].Position.IDProduct == pos.Position.IDProduct && this.Children[i].Position.IDPackage ===pos.Position.IDPackage ) {
                    return true;
                }
            }

        }
        return false
    }


    public getXPosToPog(): number {
        return 0;
    }

    public getAllPosition(): Position[] {
        return this.Children;
    }

    public computePositionsAfterChange(ctx): void {
        this.Children.forEach(element => {
            this.calculatePositionDistribution(ctx, element);
        })
    }

    public calculatePositionDistribution(ctx: Context, position: Position): void {
        const rootObj = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        if (position.$packageBlocks.length) {
            position.$packageBlocks = new Array();
        }
        position.getShrinkWidth();
        const packageBlock = {
            type: 'product',
            x: 0,
            y: 0,
            z: 0,
            wide: position.Position.FacingsX,
            high: position.Position.FacingsY,
            deep: position.Position.FacingsZ,
            gapX: 0,
            gapY: 0,
            gapZ: 0,
            orientation: position.getOrientation(),
            itemHeight: position.Position.ProductPackage.Height,
            itemWidth: position.Position.ProductPackage.Width + position.Position.ShrinkWidth + position.getSKUGap(true, position.Position.ProductPackage.Width + position.Position.ShrinkWidth),
            itemDepth: position.Position.ProductPackage.Depth,
            isFingerSpaceIgnored: rootObj.SuppressFingerSpace,
            isShrinkDirty: position.Position.ShrinkWidth
        }
        position.$packageBlocks.push(packageBlock);
    }

    public getMinPropertyValue(prop: string, fieldPath: string): string {
        let mini = 999;
        const thisContext = this;

        const getMinPropertyValueInnerFn = () => {
            const innerContext = this;

            innerContext.Children.forEach((child, key) => {
                if (child.isPosition) {
                    var value = Utils.findPropertyValue(child, prop, undefined, fieldPath);
                    if (value < mini) mini = value;
                } else {
                    getMinPropertyValueInnerFn.call(child);
                }
            });
            return mini;
        }
        return getMinPropertyValueInnerFn.call(thisContext);
    };

    public getMaxPropertyValue(prop: string, fieldPath: string): string {
        let maxi = 0;
        const thisContext = this;

        const getMaxPropertyValueInnerFn = () => {
            const innerContext = this;

            innerContext.Children.forEach((child, key) => {
                if (child.isPosition) {
                    var value = Utils.findPropertyValue(child, prop, undefined, fieldPath);
                    if (value > maxi) maxi = value;
                } else {
                    getMaxPropertyValueInnerFn.call(child);
                }
            });
            return maxi;
        }
        return getMaxPropertyValueInnerFn.call(thisContext);
    };

    public asShoppingCart(): ShoppingCart {
      return this;
    }
}
