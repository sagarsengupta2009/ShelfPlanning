import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import { Utils } from '../constants/utils';
import { HistoryService } from '../services/common/history/history.service';
import { FixtureList } from '../services/common/shared/shared.service';
import { BlockDisplayType, ModularResponse } from '../models';
import { AppConstantSpace } from '../constants/appConstantSpace';
import { ErrorObj, UprightType } from '../models/planogram';
import { Position } from './position';
import { Fixture } from './fixture';
import { ShoppingCart } from './shopping-cart';
import {
    NotifyService,
    PlanogramStoreService,
    PlanogramService,
    SharedService,
    PlanogramCommonService,
    CollisionService,
    UprightService,
} from '../services';
import { FromPropertyGrid } from '../models';
import { Section } from './section';
import { Context } from './context';

export class Modular extends Fixture {

    public ObjectDerivedType: 'Modular';

    usedWidth: number;
    overflowLength: number;
    unUsedSquare: number;
    unUsedLinear: number;
    AvailableLinear: number;
    AvailableSquare: number;
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
    public uiProperties: string[] = ['usedWidth', 'overflowLength', 'unUsedSquare', 'unUsedLinear', ];
    constructor(
        data: ModularResponse,
        public readonly notifyService: NotifyService,
        public readonly translate: TranslateService,
        public readonly sharedService: SharedService,
        public readonly planogramService: PlanogramService,
        public readonly historyService: HistoryService,
        public readonly planogramStore: PlanogramStoreService,
        public readonly planogramCommonService: PlanogramCommonService,
        collision: CollisionService,
        private readonly uprightService: UprightService,
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

    public getType(): string {
        return AppConstantSpace.MODULAR;
    }

    public calculateDistribution(ctx: Context, refresh: { reassignFlag: boolean; recFlag: boolean } | null): void {
        const me = this.Fixture;
        me.Capacity = 0;
        const self: Modular = this;
        self.Children.forEach((child: FixtureList) => {
            if ('calculateDistribution' in child) {
                child.calculateDistribution(ctx, refresh);
                if (child.ObjectType === AppConstantSpace.FIXTUREOBJ) {
                    me.Capacity += child.Fixture.Capacity;
                } else {
                    me.Capacity += child.Position.Capacity;
                }
            }
        });
    }

    public moveBetweenBays(
        proposedX1PosToPog: number,
        proposedYPosToPog: number,
        proposedWidth: number,
        propertygrid?: FromPropertyGrid,
    ): void { }
    public findIntersectBayAtXpos(XposToPog, bayList) {
        const bayObj = null;
        for (const bay of bayList) {
            if (Utils.checkIfBay(bay)) {
                const x1Cord = bay.Location.X;
                const x2Cord = x1Cord + bay.Dimension.Width;
                if (XposToPog >= x1Cord && XposToPog <= x2Cord) {
                    return bay;
                }
            }
        }
        return null;
    }

    public move(xPosToPog: number): void {
        const rootObject = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        const bayTo = this.findIntersectBayAtXpos(xPosToPog, rootObject.Children);
        const fromIndex = rootObject.Children.indexOf(this);
        const toIndex = rootObject.Children.indexOf(bayTo);

        if (fromIndex !== toIndex && rootObject.Children.length > 0) {
            // feature undo-redo: Sagar
            const original = ((that, rootObject, fromIndex, toIndex) => {
                return () => {
                    const removedUprights = rootObject.removeModular(fromIndex);
                    //adding bays
                    rootObject.addModular(toIndex, that, removedUprights);
                    rootObject.applyRenumberingShelfs();
                    rootObject.computeMerchHeight(ctx);
                };
            })(this, rootObject, fromIndex, toIndex);
            const revert = ((that, rootObject, fromIndex, toIndex) => {
                return () => {
                    //removing bays
                    const removedUprights = rootObject.removeModular(fromIndex);
                    //adding bays
                    rootObject.addModular(toIndex, that, removedUprights);
                    rootObject.applyRenumberingShelfs();
                    rootObject.computeMerchHeight(ctx);
                };
            })(this, rootObject, toIndex, fromIndex);
            this.historyService.captureActionExec({
                funoriginal: original,
                funRevert: revert,
                funName: 'BayMovement',
            }, this.$sectionID);
            /*undo-redo ends here*/

            //removing bays
            const removedUprights = rootObject.removeModular(fromIndex);
            //adding bays
            rootObject.addModular(toIndex, this, removedUprights);
            rootObject.applyRenumberingShelfs();
            const ctx = new Context(this.section);
            rootObject.computeMerchHeight(ctx);
        }
    }

    public computePositionsAfterChange(previousModular?: Modular): void {
        let usedLinear = 0,
            unUsedLinear = 0,
            usedSquare = 0,
            unUsedSquare = 0,
            perUsedSquare = 0;
        if (previousModular !== null) {
            this.Location.X = Utils.preciseRound(previousModular.Location.X + previousModular.Dimension.Width, 2);
        } else {
            this.Location.X = 0;
        }
        for (const child of this.Children) {
            if (Utils.checkIfstandardShelf(child)) {
                usedLinear += child.Fixture.UsedLinear;
                unUsedLinear += child.unUsedLinear;
            } else if (Utils.checkIfPegboard(child) || Utils.checkIfSlotwall(child)) {
                usedSquare += child.Fixture.UsedSquare;
                unUsedSquare += child.unUsedSquare;
            }
        }
        this.Fixture.UsedLinear = usedLinear;
        this.AvailableLinear = unUsedLinear;
        this.Fixture.UsedSquare = usedSquare;
        this.AvailableSquare = unUsedSquare;
        this.Fixture.AvailableLinear = unUsedLinear;
        if (usedSquare + unUsedSquare != 0) {
            perUsedSquare = (usedSquare / (usedSquare + unUsedSquare)) * 100;
        } else {
            usedSquare = 0;
        }

        this.Fixture.UsedSquare = Utils.preciseRound(usedSquare, 2);
        perUsedSquare = Utils.preciseRound(perUsedSquare, 2);
        this.Fixture.PercentageUsedSquare = Number(perUsedSquare).toFixed(2) + '%';
        this.Fixture.AvailableSquare = unUsedSquare;
    }

    public validate(): boolean {
        return true;
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

    public getZIndex(): number {
        if (
            (this.planogramService.isReviewMode || this.planogramService.ruleSets) &&
            (this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].blockview === BlockDisplayType.POSITIONS_WITHOUT_BLOCKS ||
                this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].blockview === BlockDisplayType.DEFAULT)
        ) {
            return 5;
        }
        const sectionObj = this.sharedService.getObject(this.$sectionID,this.$sectionID) as Section;
        const index = sectionObj.Children.indexOf(this);
        return sectionObj.Children.length - index;
    }

    public checkAvailableWidthByParent(value: number): boolean {
        const sectionObj = this.sharedService.getObject(this.$sectionID,this.$sectionID)as Section;
        const bays = sectionObj.getAllBays();
        let totalOccupiedByBays = 0;
        bays.forEach((bay: Modular) => {
            totalOccupiedByBays += bay.Dimension.Width;
        });
        let spaceAvailable = sectionObj.Dimension.Width - totalOccupiedByBays + this.Dimension.Width;
        if (spaceAvailable >= value) {
            return true;
        }
        return false;
    }

    public getOpacity(): number {
        return this.planogramService.rootFlags[this.$sectionID].isModularView ? 0.6 : 1;
    }

    public validateField(field: string, value: number): ErrorObj {
        let errorObj = {
            msg: '',
            error: false,
            info: '',
            warning: '',
        };

        //validation for ObjectType POG/Section
        if (field === `Fixture.Width`) {
            const isvalid = this.checkMinWidthTemp(value + this.Location.X);
            if (!isvalid.flag) {
                errorObj.msg = `${this.translate.instant('REDUCING_MODULAR_WIDTH_FAILED')} ${this.translate.instant(
                    'Fixture',
                )} [${isvalid.minObjFix.fixNo}] ${this.translate.instant(
                    'WIDTH_REDUCING_BEYOND_THE_FIXTURE_LIMIT_VALUE',
                )}`;
                errorObj.error = true;
                return errorObj;
            } else {
                const rootObj = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
                const ctx = new Context(rootObj);
                this.computeMerchHeight(ctx);
                rootObj.reassignLocationXofBays();
            }
        }

        return errorObj;
    }

    public addCopiedFixtureToTop(ctx:Context,fixtureObj: FixtureList): boolean {
        //@Sagar: TODO, Need to check the type. Wasn't able to find right now.
        const allShelf = this.Children;
        const orderedShelf = Utils.sortByYPosDesendingOrder(allShelf);
        const rootObj = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        const isFitCheckRequired = rootObj.fitCheck;

        if (orderedShelf.length === 0) {
            this.initiateAdd(fixtureObj, 0, 0, this);
            return false;
        }

        let locationX = orderedShelf[0].Location.X;
        let locationY = orderedShelf[0].Location.Y + orderedShelf[0].Fixture.Thickness + orderedShelf[0].minMerchHeight;

        if (isFitCheckRequired) {
            let isValidFitcheck = fixtureObj.doeShelfValidateFitCheck(
                ctx,
                locationX,
                locationY,
                this.Location.X,
                orderedShelf[0],
            );
            if (!isValidFitcheck) {
                this.notifyService.error(`FITCHECH_ERR`);
                return false;
            }
            this.initiateAdd(fixtureObj, locationX, locationY, this);
        } else {
            this.initiateAdd(fixtureObj, locationX, locationY, this);
        }
    }

    public initiateAdd(copiedFixture: any, locationX: number, locationY: number, parentObj: Modular): boolean {
        // @Sagar: TODO, wasn't able to find the types of these params, need to debug and see
        if (locationY > parentObj.Dimension.Height || locationY < 0) {
            this.notifyService.error('FIX_HEIGHT_EXCEEDING_SECTION');
            return false;
        }
        copiedFixture.$$hashKey = null;
        copiedFixture.IDPOGObject = null;
        copiedFixture.Fixture.IDPOGObject = null;
        copiedFixture.IDPOGObjectParent = parentObj.IDPOGObject;
        this.planogramCommonService.extend(copiedFixture, true, parentObj.$sectionID);
        this.planogramCommonService.setParent(copiedFixture, parentObj);
        _.each(copiedFixture.Children, (obj) => {
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

        //undo redo
        const original = ((methodName, copiedFixture, locationX, locationY, parentObj) => {
            return () => {
                methodName(copiedFixture, locationX, locationY, parentObj);
            };
        })(this.initiateAdd, copiedFixture, locationX, locationY, parentObj);
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


    public moveSelectedToCart(ctx: Context, shoppingCart: ShoppingCart, callback?): void {
        // @Sagar: TODO, wasn't able to find the type of the callback param, need to debug and see
        const currentParentObj = this.sharedService.getParentObject(this, this.$sectionID) as Section;
        const currentBayIndex = currentParentObj.Children.indexOf(this);
        // added for SAve functionality as suggested by Vamsi
        this.IDPOGObjectParent = null;
        this.IDPOGObject = null;
        this.Fixture.IDPOGObject = null;
        this.TempId = Utils.generateUID();

        const len = this.Children !== undefined ? this.Children.length : 0;
        for (let i = len - 1; i >= 0; i--) {
            let child = this.Children[i];
            if (typeof child === `object` && typeof child.moveSelectedToCart === `function`) {
                child.moveSelectedToCart(ctx, shoppingCart);
            }
        }

      //UNDO:REDO
      //fixture object deleted is stored in closure scope.
      const deletedModular = currentParentObj.Children[currentBayIndex];
      const uprightObject = currentParentObj.removeModular(currentBayIndex)
      currentParentObj.uprightType === UprightType.Fixed && this.uprightService.updateUpright(currentParentObj, currentParentObj.Upright);
      const original = ((currentParentObj, idex) => {
        return () => {
          currentParentObj.removeModular(idex);
          currentParentObj.uprightType === UprightType.Fixed && this.uprightService.updateUpright(currentParentObj, currentParentObj.Upright);
        };
      })(currentParentObj, currentBayIndex);
      const revert = ((currentParentObj, idex, shelf, oldUprights) => {
        return () => {
          currentParentObj.addModularByIndex([{ index: idex, bay: shelf[0] }],  {...uprightObject});
          currentParentObj.uprightType === UprightType.Fixed && this.uprightService.updateUpright(currentParentObj, currentParentObj.Upright);
        };
      })(currentParentObj, currentBayIndex, [deletedModular], {...uprightObject});
      this.historyService.captureActionExec({
        funoriginal: original,
        funRevert: revert,
        funName: 'DeleteModular',
      }, this.$sectionID);
    }

    public getAllPosition(): Position[] {
        const allPositions: Position[] = [];
        let parentFixIsCart: boolean;

        let recurseObjects = (obj) => {
            if (obj !== undefined && obj.length > 0) {
                for (const item of obj) {
                    parentFixIsCart = Utils.checkIfShoppingCart(
                        this.sharedService.getParentObject(item, item.$sectionID),
                    );
                    if (item.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT && !parentFixIsCart) {
                        allPositions.push(item);
                    } else if (item.hasOwnProperty(`Children`)) {
                        recurseObjects(item.Children);
                    }
                }
            }
        };
        recurseObjects(this.Children);
        return allPositions;
    }

    public getXPosToPog(): number {
        let xPos = 0;
        const parentObj = this.sharedService.getParentObject(this, this.$sectionID);
        if (parentObj != undefined && parentObj.ObjectType !== AppConstantSpace.POG) {
            xPos = parentObj.Location.X;
        }
        return xPos + this.Location.X;
    }

    public getYPosToPog(): number {
        let yPos = 0;
        const parentObj = this.sharedService.getParentObject(this, this.$sectionID);
        if (parentObj.ObjectType !== AppConstantSpace.POG) {
            yPos = parentObj.Location.Y;
        }
        return yPos + this.Location.Y;
    }

    public asModular(): Modular {
        return this;
    }

    //@todo @naren Added deleted funcitons where we are using this method in other places. Comment to be removed in the next PR.
    public interchangeFixture(fromIndex, toIndex): void {
        let unqHistoryID = this.historyService.startRecording();
        /*feature undo-redo: Ravindra -
           dt. 16th Oct, 2014*/
        let original = (function (that, fromIndex, toIndex) {
            return function () {
                that.interchangeFixture(fromIndex, toIndex)
            }
        })(this, fromIndex, toIndex);
        let revert = (function (that, toIndex, fromIndex) {
            return function () {
                that.interchangeFixture(toIndex, fromIndex)
            }
        })(this, toIndex, fromIndex);
        this.historyService.captureActionExec({
            'funoriginal': original,
            'funRevert': revert,
            'funName': 'interchangeFixture'
        }, this.$sectionID);
        /*undo-redo ends here*/
        let rootObject = this.section;
        let removedUprights = rootObject.removeModular(fromIndex);
        rootObject.addModular(toIndex, this, removedUprights);
        const ctx = new Context(rootObject);
        rootObject.computeMerchHeight(ctx);
        if (rootObject._IsSpanAcrossShelf.FlagData) {
            rootObject.setSpreadSpanStandardshelfs(ctx);
        }
        this.planogramService.insertPogIDs(null, true);
        this.historyService.stopRecording(undefined, undefined, unqHistoryID);
    }
}
