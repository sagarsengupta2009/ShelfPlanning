import { ElementRef } from '@angular/core';
import { Fixture } from './fixture';
import { TranslateService } from '@ngx-translate/core';
import { cloneDeep, isUndefined, filter, isNull } from 'lodash-es';
import { Position, Section, Modular, ShoppingCart, Crossbar } from '../classes';
import { NextLocXDirection, PegAlign, PositionXYCords, RectangleCoordinates2d, RefreshParams } from '../models';
import { PegboardResponse } from '../models/planogram-transaction-api/pegboard-object-response';
import { AppConstantSpace } from '../constants/appConstantSpace';
import { Orientation } from './orientation';
import { Utils } from '../constants/utils';
import { IDragDropSettings } from '../drag-drop.module';
import { PlanogramObject } from './planogram-object';
import { NwdropCord, PegDropCord, PegHoleInfo, PegInputJson, PosXY, StylePeg } from '../models/planogram';
import {
    SharedService,
    PlanogramService,
    HistoryService,
    PlanogramStoreService,
    QuadtreeUtilsService,
    NotifyService,
    PlanogramCommonService,
    DragDropUtilsService,
    CollisionService,
    MoveFixtureService,
    ParentApplicationService, Render2dService
} from '../services';
import { FromPropertyGrid } from '../models';
import { FixtureList, MerchandisableList, ObjectListItem, PegTypes } from '../services/common/shared/shared.service';
import { Context } from './context';
import { AllocateUtilitiesService } from '../services/layouts/allocate/utilities/allocate-utilities.service';
import { BeyondEdgeFitCheckInput, BeyondEdgeFitCheckOutput, GetDropCordInputData, UpdatedDropCordData, pegFitCheckObject } from '../models/planogram/pegboard';
import { Slotwall } from '../models/planogram/slotwall';

export class PegBoard extends Fixture {
    public ObjectDerivedType: 'Pegboard' | 'Slotwall' | 'Crossbar';
    public Children: Position[];
    public isMerchandisable: boolean = true;
    public _elementRef: ElementRef;
    public unUsedLinear: number = 0;
    public unUsedCubic: number = 0;
    public allowOverflow: boolean = true;
    public maxItemHeight: number = 0;
    public spreadSpanProperties = {
        bottom: 0,
        left: 0,
        width: 0,
        height: 0,
        isLeftMostShelf: false,
        isSpreadSpan: false,
        isRightMostShelf: false,
        childOffsetX: 0,
    };
    public orientNS = new Orientation();
    public unUsedSquare: number;
    public uiProperties: string[] = ['unUsedSquare', 'orientNS', 'spreadSpanProperties', 'maxItemHeight', 'allowOverflow',
  'unUsedCubic', 'unUsedLinear', '_elementRef', 'ObjectDerivedType'];

    constructor(
        data: PegboardResponse,
        public notifyService: NotifyService,
        public translateService: TranslateService,
        public sharedService: SharedService,
        public planogramService: PlanogramService,
        public historyService: HistoryService,
        public dragDropUtilsService: DragDropUtilsService,
        public planogramCommonService: PlanogramCommonService,
        public quadtreeUtilsService: QuadtreeUtilsService,
        public planogramStore: PlanogramStoreService,
        public readonly collision: CollisionService,
        public readonly moveFixtureService: MoveFixtureService,
        public readonly parentApp: ParentApplicationService,
        public readonly render2d: Render2dService,
        public readonly allocateUtils: AllocateUtilitiesService
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

    public getType(): string {
        return AppConstantSpace.PEGBOARDOBJ;
    }

    public fixtureFlip(): void {
        //feature undo-redo: by Abhishek
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

        if (this.hasOwnProperty('Children')) {
            if (this.ObjectDerivedType === this.getType()) {
                this.Children.reverse();

                //snap left to snap right and vice versa
                const tempSnapLeft = this.Fixture.SnapToLeft;
                this.Fixture.SnapToLeft = this.Fixture.SnapToRight;
                this.Fixture.SnapToRight = tempSnapLeft;
                this.Children.forEach((position, key) => {
                    if (this.Children[key].isPosition) {
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

    public checkIfLastPosition(position: Position): boolean {
        const pegHole = position.getPegInfo();
        const pegHoleX = position.Location.X + pegHole.OffsetX;
        const PHI = this.getPegHoleInfo();
        return pegHoleX == this.Dimension.Width - PHI.PegOffsetRight;
    }

    public checkIfFirstPosition(position: Position): boolean {
        const pegHole = position.getPegInfo();
        const pegHoleX = position.Location.X + pegHole.OffsetX;
        const PHI = this.getPegHoleInfo();
        return pegHoleX == (PHI.PegOffsetLeft || 0);
    }

    //This can be used to check if item is top most item
    public checkIfTopPosition(position: Position): boolean {
        const PHI = this.getPegHoleInfo();
        const pegHoleY = this.getNextLocY(position, { leftRight: true });
        return pegHoleY == this.Dimension.Height - PHI.PegOffsetTop;
    }

    //This can be used to check if item is bottom most item
    public checkIfBottomPosition(position: Position): boolean {
        const PHI = this.getPegHoleInfo();
        const pegHoleY = this.getNextLocY(position, { leftRight: true });
        return pegHoleY == (PHI.PegOffsetBottom || 0);
    }

    public getNextLocX(position: Position, flag?: NextLocXDirection): number {
        //Need to check if it can go beyond the edge or not
        const pegHole = position.getPegInfo();
        if (flag.isUpDown) {
            return position.Location.X + pegHole.OffsetXMedian;
        } else {
            const PHI = this.getPegHoleInfo();
            let X = position.Location.X;

            const PegHoleX = Utils.preciseRound(X - PHI.PegOffsetLeft, 5);
            const PegHoleY = position.getPegholeYLoc();
            if ((PegHoleX + pegHole.OffsetXMedian) % PHI.PegIncrementX === 0 && !flag.left) {
                X = PegHoleX + pegHole.OffsetXMedian + PHI.PegIncrementX + PHI.PegOffsetLeft;
            } else if (!flag.left) {
                const nextPeg = Math.round(PegHoleX / PHI.PegIncrementX) * PHI.PegIncrementX;
                X = nextPeg + pegHole.OffsetXMedian + PHI.PegIncrementX + PHI.PegOffsetLeft
            }

            if ((PegHoleX + pegHole.OffsetXMedian) % PHI.PegIncrementX == 0 && flag.left) {
                X = PegHoleX + pegHole.OffsetXMedian - PHI.PegIncrementX + PHI.PegOffsetLeft;
            } else if (flag.left) {
                const nextPeg = Math.round(PegHoleX / PHI.PegIncrementX) * PHI.PegIncrementX;
                X = nextPeg + pegHole.OffsetXMedian - PHI.PegIncrementX + PHI.PegOffsetLeft;
            }
            const positionXYCords = this.findXYofPosition(position, { left: X, top: PegHoleY });

            if (!this.checkIfItemBeyondEdge(position, positionXYCords, { left: X, top: PegHoleY })) {
                return X;
            }
        }
        return;
    }

    public getNextLocY(position: Position, flag?): number {
        const pegHole = position.getPegInfo();
        if (flag.leftRight) {
            return position.Location.Y + position.linearHeight() - (position.computeHeight() - pegHole.OffsetY);
        } else {
            const PHI = this.getPegHoleInfo();
            let X = position.Location.X;
            let Y = position.Location.Y;
            const PegHoleX = X + pegHole.OffsetXMedian;
            const PegHoleY = position.getPegholeYLocConsideringPegYOffset() - PHI.PegOffsetBottom;
            if (PegHoleY % PHI.PegIncrementY == 0 && flag.up) {
                Y = PegHoleY + PHI.PegIncrementY + PHI.PegOffsetBottom;
            } else if (flag.up) {
                const nextPeg = Math.round(PegHoleY / PHI.PegIncrementY) * PHI.PegIncrementY;
                Y =
                    PegHoleY + 0.1 > nextPeg
                        ? nextPeg + PHI.PegIncrementY + PHI.PegOffsetBottom
                        : nextPeg + PHI.PegOffsetBottom;
            }
            if (PegHoleY % PHI.PegIncrementY == 0 && !flag.up) {
                Y = PegHoleY - PHI.PegIncrementY + PHI.PegOffsetBottom;
            } else if (!flag.up) {
                const nextPeg = Math.round(PegHoleY / PHI.PegIncrementY) * PHI.PegIncrementY;
                Y =
                    PegHoleY - 0.1 > nextPeg
                        ? nextPeg + PHI.PegOffsetBottom
                        : nextPeg - PHI.PegIncrementY + PHI.PegOffsetBottom;
            }
            const positionXYCords = this.findXYofPosition(position, { left: PegHoleX, top: Y });
            if (!this.checkIfItemBeyondEdge(position, positionXYCords, { left: PegHoleX, top: Y })) {
                return Y + position.pegOffsetY;
            }
        }
        return;
    }
    setXYBasedOnPegLoc(position: Position){
      let pegHole = position.getPegInfo();
      let PHI = this.getPegHoleInfo();

        let pegOffsetX = 0;
        let pegOffsetY = 0;
        let backXOffset = 0;
      if(pegHole.BackHooks > 1 && pegHole.BackSpacing > 0){
        let backHookLen = (pegHole.BackHooks - 1) * pegHole.BackSpacing,
        frontBarLen = (pegHole.FrontBars - 1) * pegHole.FrontSpacing;
        //Check if frontbar length is less than or equal to back hook length
        //Otherwise we need to change it to single hoook
        if(frontBarLen <= backHookLen){
          pegOffsetX = (backHookLen - frontBarLen)/2;
        } else {
          position.Position.BackHooks = position.Position.FrontBars = 1;
          position.Position.BackSpacing = position.Position.FrontSpacing = 0;
        }
      }
      if(!Utils.isNullOrEmpty(pegHole.HeightSlope) && pegHole.HeightSlope != 0){
        pegOffsetY = pegHole.Length * Math.sin(pegHole.HeightSlope);
        //pegHole.HeightSlope > 0 ? pegOffsetY = -pegOffsetY:'';
      }
      position.Location.X = position.Position._X05_XPEGHOLEPOS.ValData + pegOffsetX - position.Position.ProductPegHole1X;
      position.Location.Y = (this.Dimension.Height - position.Position._X05_YPEGHOLEPOS.ValData) + (pegOffsetY - pegHole.OffsetY);

    }
    getPosXY(position: Position, X: number, Y: number, pegOffsetX : number = 0, pegOffsetY: number = 0, undo?: boolean): PosXY {
        let pegHole = position.getPegInfo();
        let PHI = this.getPegHoleInfo();
        const view = this.orientNS.View.Front;
        let backHookOffsetX = pegHole.OffsetX;
        let backXOffset = 0;
        switch (pegHole.Type) {
            default:
             if(pegHole.Type == 2){
              if(Utils.isNullOrEmpty(position.Position.BackSpacing)){
                position.Position.BackSpacing = PHI.PegIncrementX;
              }
             }
              backXOffset = 0;
              //backHookOffsetX is the distance between the positionX to the first hook on pegboard
              if (pegHole.BackHooks > 1 && pegHole.BackSpacing > 0 && !undo) {
                let backHookLen = (pegHole.BackHooks - 1) * pegHole.BackSpacing;
                let frontBarLen = (pegHole.FrontBars - 1) * (pegHole.FrontSpacing || 0);
                if (frontBarLen <= backHookLen) {
                  pegOffsetX = (backHookLen - frontBarLen) / 2;
                } else {
                  backHookOffsetX = (pegHole.OffsetX + pegHole.Offset2X - backHookLen) / 2;
                }
              }
              if (pegHole.BackHooks == 1 && !Utils.isNullOrEmpty(pegHole.FrontSpacing) && !undo) {
                backHookOffsetX = (pegHole.OffsetX + pegHole.Offset2X) / 2;
              }
              if (!Utils.isNullOrEmpty(pegHole.HeightSlope) && pegHole.HeightSlope != 0 && !undo) {
                pegOffsetY = pegHole.Length * Math.round(Math.sin(Utils.degToRad(pegHole.HeightSlope)) * 100) / 100;
              }

              break;
        }
        //Peghole X, to calculate estimated Loaction X and Y of positions while dropping of the items
        if (X == undefined || Y == undefined) {
            X = position.Location.X;
            Y = position.Location.Y;
        }
        position.pegOffsetX = pegOffsetX;

        let PegHoleX = X + backHookOffsetX - pegOffsetX;
        if (PegHoleX < PHI.PegOffsetLeft) {
            PegHoleX = PHI.PegOffsetLeft;
        } else if (PegHoleX > this.Dimension.Width - PHI.PegOffsetRight) {
            PegHoleX = this.Dimension.Width - PHI.PegOffsetRight;
        } else {
            if (PHI.PegIncrementX < 0.01) PHI.PegIncrementX = 0.01;
            let holeX = Math.round((PegHoleX - PHI.PegOffsetLeft) / PHI.PegIncrementX);
            PegHoleX = holeX * PHI.PegIncrementX + PHI.PegOffsetLeft;
        }
        position.Position._X05_XPEGHOLEPOS.ValData = PegHoleX;
        //PegholeY
        let PegHoleY = Y + pegHole.OffsetY - ((position.pegOffsetY ?? pegOffsetY) || 0);
        if (PegHoleY < PHI.PegOffsetBottom) {
            PegHoleY = PHI.PegOffsetBottom;
        } else if (PegHoleY > this.Dimension.Height - PHI.PegOffsetTop) {
            PegHoleY = this.Dimension.Height - PHI.PegOffsetTop;
        } else {
            if (PHI.PegIncrementY < 0.01) PHI.PegIncrementY = 0.01;
            let holeY = Math.round((PegHoleY - PHI.PegOffsetBottom) / PHI.PegIncrementY);
            PegHoleY = holeY * PHI.PegIncrementY + PHI.PegOffsetBottom;
        }
        position.pegOffsetY = pegOffsetY;
        position.Position._X05_YPEGHOLEPOS.ValData = this.Dimension.Height - PegHoleY;
        position.Position.PegLocation = `X${position.Position._X05_XPEGHOLEPOS.ValData}:Y${position.Position._X05_YPEGHOLEPOS.ValData}`;
        position.Position.SlotNo =
            (this.Dimension.Height - (position.Location.Y + pegHole.OffsetY) - PHI.PegOffsetTop) / PHI.PegIncrementY +
            1;
        return {
            X: PegHoleX - backHookOffsetX + pegOffsetX,
            Y: PegHoleY - pegHole.OffsetY + pegOffsetY,
            PegHoleX: backHookOffsetX,
            PegHoleY: pegHole.OffsetY,
        };
    }

    public snapToPeg(position: Position): void {
      const oldOffsetXY = { pegOffsetX: position.pegOffsetX, pegOffsetY: position.pegOffsetY};
        // might need undo-redo
        const posXY = this.getPosXY(position, null, null);
        if (position.Location.X != posXY.X || position.Location.Y != posXY.Y) {
            const original = ((obj, Loc) => {
                return () => {
                  const loc = obj.getPosXY(position, undefined, undefined, Loc.pegOffsetX, Loc.pegOffsetY, true);
                  obj.setPositionLocationX(position, loc.X);
                  obj.setPositionLocationY(position, loc.Y);
                };
            })(this, {pegOffsetX: position.pegOffsetX, pegOffsetY: position.pegOffsetY});
            const revert = ((obj, Loc) => {
                return () => {
                    const loc = obj.getPosXY(position, undefined, undefined, Loc.pegOffsetX, Loc.pegOffsetY, true);
                    obj.setPositionLocationX(position, loc.X);
                    obj.setPositionLocationY(position, loc.Y);
                };
            })(this, oldOffsetXY);
            this.historyService.captureActionExec({
                funoriginal: original,
                funRevert: revert,
                funName: 'pegPosChange',
            }, this.$sectionID);
        }
        this.setPositionLocationX(position, posXY.X);
        this.setPositionLocationY(position, posXY.Y);
    }

    public addCopiedPositions(ctx: Context, copiedItemsToInsert: Array<number>, index: number): void {
        Array.prototype.splice.apply(this.Children, [index, 0].concat(copiedItemsToInsert));
        this.computePositionsAfterChange(ctx);
    }

    // This method is used to paste copied positions
    public addPosition(ctx: Context, position: Position, index: number, dropCoord: PegDropCord, movePosition?: string): void {
        position.IDPOGObjectParent = this.IDPOGObject; // Kuldip changes for IDPOGObject
        const oldParent = this.sharedService.getObject(position.$idParent, this.$sectionID);
        if (oldParent && oldParent.ObjectDerivedType != this.getType() && !Utils.checkIfShoppingCart(oldParent)) {
            position.Position.FacingsY = 1;
        }
        position.setParentId(this.$id);
        this.Children.splice(index, 0, position);
        let positionHeight = position.linearHeight() - (position.computeHeight() - position.getPegInfo().OffsetY);
        let positionWidth = position.getPegInfo().OffsetXMedian;

        if (!positionHeight) {
            positionHeight = position.computeHeight();
        }

        if (!positionWidth) {
            positionWidth = position.computeWidth();
        }

        position.Location.X = dropCoord.left - positionWidth;
        position.Location.Y = dropCoord.top - positionHeight;
        if (this.parentApp.isAllocateApp) {
          this.allocateUtils.updatePaPositionKey(position);
        }
        movePosition || this.computePositionsAfterChange(ctx);
    }

    public removePosition(ctx: Context, index: number, movePosition?: string | boolean): void {
        let rootObj = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        this.Children.splice(index, 1);
        if (movePosition) {
            this.calculateDistribution(ctx);
            rootObj.computeSectionUsedLinear();
            rootObj.ComputeSectionUsedSquare();
            rootObj.calculateDistribution(ctx);
        } else this.computePositionsAfterChange(ctx);
    }

    public movePosition(
        ctx: Context,
        fromIndex: number,
        toFixture,
        toIndex: number,
        dropCoord: PegDropCord,
        isRecording?: boolean,
    ): void {
        if (this.Children.length > 0) {
            const position = this.Children[fromIndex];
            let originalFacingsY;
            const oldDropCoord = cloneDeep({
                left: position.Location.X + position.getPegInfo().OffsetX,
                top:
                    position.Location.Y +
                    position.linearHeight() -
                    (position.computeHeight() - position.getPegInfo().OffsetY),
            });
            //@Narendra If toFixture is standard shelf, it is required to change the facings to 1
            //it is needed to avoid the ctrl + Z issue. When item placed on ss it's facings Y will be calculated auto
            //When reverting it won't get it's previous facings Y viz it's facing change is not recorded
            if (toFixture.ObjectDerivedType != this.getType()) {
                if (!Utils.checkIfPegType(toFixture) && toFixture.Fixture.AutoComputeFronts) {
                    originalFacingsY = position.Position.FacingsY;
                    position.Position.FacingsY = 1;
                } else if (Utils.checkIfPegType(toFixture)) {
                    originalFacingsY = position.Position.FacingsY;
                    position.Position.FacingsY = 1;
                }
            }

            //Need to check if this sort is required or not @Narendra 23rd Nov 16
            //this.Children = this.pegPositionSort();
            //exception handled : AM dt. 3rd April, 2014
            //make sure when droped to last position, index doesn't cross total index.
            //Note: toIndex cannot be at any cost > the total Children of the toFixture
            //if toIndex is greater then splice() by default put it in last position but it causes trouble in undo,
            //since invalid toIndex is stored in History where we dont have any items actually
            if (toIndex > toFixture.Children.length) {
                toIndex = toFixture.Children.length;
            }
            const clonedDroCord = cloneDeep(dropCoord);
            this.removePosition(ctx, fromIndex, 'movePosition');
            toFixture.addPosition(ctx, position, toIndex, dropCoord, 'movePosition');

            if (Utils.checkIfPegType(toFixture)) {
                if(toFixture.ObjectDerivedType==AppConstantSpace.CROSSBAROBJ)
                    toFixture.Children = toFixture.crossBarPositionSort();
                else
                    toFixture.Children= toFixture.pegPositionSort(toFixture);
                toIndex = toFixture.Children.indexOf(position);
            } else {
                position.Position._X05_PEGLENGTH.ValData = position.Position.ProductPegHoleY = position.Position.ProductPegHole1X = position.Position.ProductPegHole2X = null;
            }

            // assort nici
            if (this.sharedService.mode == 'iAssortNICI') {
                // undo on add
                if (toFixture.ObjectDerivedType == 'ShoppingCart')
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
                //window.footerStatusItemID = null;
            }

            //update key
            if (this.parentApp.isAllocateApp) {
              this.allocateUtils.updatePaPositionKey(position);
            }
            //feature undo-redo: by abhishek
            //dt. 11th, Aug, 2014
            if (isUndefined(isRecording)) {
                const original = ((fromIndex, toFixture, toIndex, clonedDroCord) => {
                    return () => {
                        this.movePosition(ctx, fromIndex, toFixture, toIndex, clonedDroCord);
                    };
                })(fromIndex, toFixture, toIndex, clonedDroCord);
                const revert = ((toIndex, fromFixture: MerchandisableList, fromIndex, dropCoord) => {
                    return () => {
                        fromFixture.movePosition(ctx, fromIndex, this, toIndex, dropCoord);
                    };
                })(fromIndex, toFixture, toIndex, oldDropCoord);
                this.historyService.captureActionExec({
                    funoriginal: original,
                    funRevert: revert,
                    funName: 'MoveItems',
                }, this.$sectionID);
            }
            //This will record the snaptoPeg action after recording moveItems so undo will revert to the previous Location
            this.computePositionsAfterChange(ctx);
            position.calculateDistribution(ctx, toFixture);
            if (toFixture.ObjectDerivedType != this.getType() && toFixture.Fixture.AutoComputeFronts) {
                const original = ((position) => {
                    return () => {
                        position.Position.FacingsY = 1;
                    };
                })(position);
                const revert = ((position, originalFacingsY) => {
                    return () => {
                        position.Position.FacingsY = originalFacingsY;
                    };
                })(position, originalFacingsY);
                this.historyService.captureActionExec({
                    funoriginal: original,
                    funRevert: revert,
                    funName: 'ChangeFacings',
                }, this.$sectionID);
            }
        }
    }

    public findIntersectBayAtXpos(XposToPog: number, bayList?: Modular[]): Modular {
        const rootObject = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        let bayObj = null;
        if (isUndefined(bayList) || bayList == null) {
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
        return bayObj;
    }

    public findIntersectShelfAtYpos(yposToPog: number, bayList: FixtureList[]): FixtureList {
        let shelf: FixtureList = null;
        const sortedShelfs = Utils.sortByYPos(bayList);
        for (const sortedShelf of sortedShelfs) {
            if (sortedShelf.asPegType() || sortedShelf.asStandardShelf()) {
                const y1Cord = sortedShelf.Location.Y;
                const y2Cord = y1Cord + sortedShelf.Dimension.Height;
                if (yposToPog >= y1Cord && yposToPog <= y2Cord) {
                    return sortedShelf;
                }
            }
        }
        return shelf;
    }
    public moveFixture(
        proposedX1PosToPog: number,
        proposedYPosToPog: number,
        proposedWidth: number,
        propertygrid?: FromPropertyGrid,
    ): boolean {
        return this.moveFixtureService.moveFixtureType(proposedX1PosToPog, proposedYPosToPog, this, proposedWidth, propertygrid);
    }

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

    public getUsedLinear(): number {
        return Utils.preciseRound(this.Fixture.UsedLinear, 3);
    }

    public getUsedSquare(): number {
        return Utils.preciseRound(this.Fixture.UsedSquare, 3);
    }

    public getUnUsedLinear(): number {
        return Utils.preciseRound(this.unUsedLinear, 3);
    }

    public getXPosToPog(): number {
        let xPos = 0;
        const parentObj = this.sharedService.getParentObject(this, this.$sectionID);
        if (parentObj.ObjectType != 'POG') {
            xPos = parentObj.Location.X;
        }
        return xPos + this.Location.X;
    }

    public getYPosToPog(): number {
        let yPos = 0;
        const parentObj = this.sharedService.getParentObject(this, this.$sectionID);
        if (parentObj.ObjectType != 'POG') {
            yPos = parentObj.Location.Y;
        }
        return yPos + this.Location.Y;
    }

    public getBottomThickness(): number {
        //By defalut to get the bottom thickness of any fixture.
        return 0;
    }

    public getZPosToPog(): number {
        let zPos = 0;
        const parentObj = this.sharedService.getParentObject(this, this.$sectionID);
        if (!isUndefined(parentObj) && parentObj.ObjectType != 'POG') {
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

    public addFixtureFromGallery(
        ctx: Context,
        parentData: PlanogramObject,
        proposedXPosToPog: number,
        proposedYPosToPog: number,
        proposedWidth: number,
    ): boolean {
        const rootObj = this.sharedService.getObject(parentData.$sectionID, parentData.$sectionID) as Section;
        const isFitCheckRequired = rootObj.fitCheck;
        //shelf drag drop varies when within bays and accross bays so we need this flag
        const isBayPresents = rootObj.isBayPresents;

        const sectionWidth = rootObj.Dimension.Width;
        const sectionHeight = rootObj.Dimension.Height;
        const pegboardStartYCoord = proposedYPosToPog;
        const pegboardEndYCoord = proposedYPosToPog + this.Fixture.Height;
        const pegboardStartXCoord = proposedXPosToPog;
        const pegboardEndXCoord = proposedXPosToPog + proposedWidth;

        const addFixture = (parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth) => {
            const me: any = this;
            //undo redo
            const original = ((obj, methodName, parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth) => {
                return () => {
                    methodName.call(obj, parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth);
                };
            })(me, addFixture, parentData, proposedXPosToPog, proposedYPosToPog, proposedWidth);
            const revert = ((obj) => {
                return () => {
                    obj.removeFixtureFromSection();
                };
            })(me);
            this.historyService.captureActionExec({
                funoriginal: original,
                funRevert: revert,
                funName: 'addFixture',
            }, this.$sectionID);

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
            this.IDPOGObject = null
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

        const revertBack = (msg, obj) => {
            this.dragDropUtilsService.revertBackFixtureGallery();
            //  this.footerNotification.setFooterMessage(msg);
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
            revertBack(this.getType() + ' doesnot fit well in the section', this);
            return false;
        }

        if (isFitCheckRequired) {
            const xPosRelative = this.getXPosRelative(proposedXPosToPog);
            const isValidFitcheck = this.doeShelfValidateFitCheck(
                ctx,
                xPosRelative,
                proposedYPosToPog,
                proposedXPosToPog,
                null,
            );

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

    public removeFixtureFromSection(): void {
        const parentItemData = this.sharedService.getParentObject(this, null);
        let currentShelfIndex = parentItemData.Children.indexOf(this);
        // added for SAve functionality as suggested by Vamsi

        this.IDPOGObjectParent = null;
        this.IDPOGObject = null;
        this.Fixture.IDPOGObject = null;
        this.TempId = Utils.generateUID();
        const deletedShelf = parentItemData.Children.splice(currentShelfIndex, 1);
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
        let flag = false;
        const oldYpos = this.Location.Y;
        const oldXpos = this.Location.X;
        this.Location.Y = YCord1;
        withFix = Utils.isNullOrEmpty(withFix) ? this : withFix;
        const rootObj = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        const isBayPresents = rootObj.isBayPresents;
        const oldIdParent = this.$idParent;
        if (isBayPresents) {
            let dropBay = withFix.findIntersectBayAtXpos(XCord1ToPog);
            if (!isUndefined(dropBay) && dropBay != null && oldIdParent !== dropBay.$id) {
            }
        }
        this.Location.X = XCord1;

        const intersectingShelfYPos = withFix.getIntersectingShelfAboveInfo(ctx).Y;
        const currentMerchHt = intersectingShelfYPos - (YCord1 + this.minHeightRequired());
        if (currentMerchHt >= 0) {
            const intersectingFixtures = this.getBottomIntersectingFixture(ctx, XCord1ToPog, YCord1);
            if (intersectingFixtures.length > 0) {
                for (const intFix of intersectingFixtures) {
                    const merchHt = intFix.Location.Y + intFix.minHeightRequired();
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
                flag = true;
            }
        }
        this.Location.X = oldXpos;
        this.Location.Y = oldYpos;
        return flag;
    }

    public getBottomIntersectingFixture(ctx: Context, XCord1: number, YCord1: number): PegBoard[] {
        const currentShelfItemData: any = this;
        let fixtures = [];
        let belowFixturesList = [];
        const XCord2 = XCord1 + currentShelfItemData.Dimension.Width;
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
                    ordLimShelf.Dimension.Width === currentShelfItemData.Dimension.Width &&
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

    public getBottomCrossingFixture(ctx: Context, XCord1: number, XCord2: number, YCord1: number): any[] {
        let fixtures = [];
        let belowFixturesList = [];
        const orderedLimitingShelves = ctx.allLimitingShelvesYPosDesc.filter(it => it !== this);

        for (const ordLimShelf of orderedLimitingShelves) {
            const shelfCompleteWidth = ordLimShelf.getXPosToPog() + ordLimShelf.Dimension.Width;
            const shelfCompleteHeight = ordLimShelf.Location.Y + ordLimShelf.Dimension.Height;
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

    public getIntersectingShelfAboveInfo(ctx: Context, position?: Position): {
        Y: number;
        Slope: number;
        Depth: number;
        Thickness: number;
    } {
        let intersectTo: any = this;

        //default init to the fixture object it called
        let XCord1 = this.getXPosToPog(),
            XCord2 = this.getXPosToPog() + intersectTo.Dimension.Width,
            YCord = intersectTo.Location.Y;

        if (position) {
            XCord1 = position.getXPosToPog();
            XCord2 = position.getXPosToPog() + position.Dimension.Width;
            YCord = position.getYPosToPog();
            intersectTo = position;
        }

        const orderedLimitingShelves = ctx.allLimitingShelvesYPosAsc.filter(it=> it !==this);

        const getImmediateTopShelf = (YCord: number, orderedPegboard: FixtureList[]) => {
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
        };
        const IsIntersecting = (STop, XCord1, XCord2) => {
            if (STop.getXPosToPog() > XCord1 && STop.getXPosToPog() < XCord2) {
                return true;
            }
            if (
                STop.getXPosToPog() + STop.Dimension.Width > XCord1 &&
                STop.getXPosToPog() + STop.Dimension.Width < XCord2
            ) {
                return true;
            }

            if (STop.Dimension.Width > intersectTo.Dimension.Width) {
                if (XCord1 > STop.getXPosToPog() && XCord1 < STop.getXPosToPog() + STop.Dimension.Width) {
                    return true;
                }
                if (XCord2 > STop.getXPosToPog() && XCord2 < STop.getXPosToPog() + STop.Dimension.Width) {
                    return true;
                }
            }

            if (STop.Dimension.Width == intersectTo.Dimension.Width) {
                const STopCenterXCood = (STop.getXPosToPog() + (STop.getXPosToPog() + STop.Dimension.Width)) / 2;
                const thisCenterXCood = (XCord1 + XCord2) / 2;
                if (STopCenterXCood == thisCenterXCood) {
                    return true;
                }
            }
            return false;
        };

        let responsibleY = 0;
        let responsibleSlope = 0;
        let responsibleDepth = 0;
        let responsibleThickness = 0;
        let flag = true;
        while (flag) {
            const shelfList = getImmediateTopShelf(YCord, orderedLimitingShelves);
            if (shelfList.length == 0) {
                flag = false;
                responsibleY = ctx.section.Dimension.Height;
                responsibleDepth = ctx.section.Dimension.Depth;
                responsibleSlope = 0;
                responsibleThickness = 0;
            }
            for (const shelf of shelfList) {
                if (IsIntersecting.call(intersectTo, shelf, XCord1, XCord2)) {
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

    public computeMerchHeight(ctx: Context, refresh?: RefreshParams): void {
      const rootObj: Section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
      rootObj.hasFixtureType[this.getType()] = true;
        this.Dimension.Width = this.Fixture.Width;
        this.Dimension.Height = this.Fixture.Height;
        this.Dimension.Depth = this.Fixture.Depth;

        // Calculate child area dimensions and offsets
        this.ChildDimension.Width = this.Dimension.Width;
        this.ChildDimension.Height = this.Dimension.Height;
        this.ChildDimension.Depth = this.Dimension.Depth;

        this.ChildOffset.X = 0;
        this.ChildOffset.Y = 0;
        this.ChildOffset.Z = 0;

        this.computePositionsAfterChange(ctx, refresh);
    }

    public getPegHoleInfo(): PegHoleInfo {
        return {
            PegIncrementX: this.Fixture._X04_XINC.ValData,
            PegIncrementY: this.Fixture._X04_YINC.ValData,
            PegOffsetLeft: this.Fixture._X04_XPEGSTART.ValData,
            PegOffsetRight: this.Fixture._X04_XPEGEND.ValData,
            PegOffsetTop: this.Fixture._X04_YPEGEND.ValData,
            PegOffsetBottom: this.Fixture._X04_YPEGSTART.ValData,
        };
    }

    public setPositionLocationX(position: Position, X: number): void {
        position.Location.X = X;
    }

    public setPositionLocationY(position, Y: number): void {
        position.Location.Y = Y;
    }

    public linearWidthPosition(pos: Position, toValue: number, toField?: string): number {
        const view = this.orientNS.View.Front;
        let orientation = pos.getOrientation();
        let posFacingsX = pos.Position.FacingsX;
        if (!isUndefined(toValue)) {
            if (toField == 'Position.IDOrientation') {
                orientation = toValue & 0x1f;
            } else if (toField == 'Position.FacingsX') {
                posFacingsX = toValue;
            }
        }

        const dimensions = this.orientNS.GetDimensions(
            orientation,
            false,
            view,
            pos.Position.ProductPackage.Width,
            pos.Position.ProductPackage.Height,
            pos.Position.ProductPackage.Depth,
        );
        const width = dimensions.Width;
        const nesting = this.orientNS.GetDimensions(
            orientation,
            false,
            view,
            pos.Position.ProductPackage.NestingX,
            pos.Position.ProductPackage.NestingY,
            pos.Position.ProductPackage.NestingZ,
        );
        // Nesting should not be greater than the product dimension
        nesting.Width = nesting.Width > dimensions.Width ? 0 : nesting.Width;
        nesting.Height = nesting.Height > dimensions.Height ? 0 : nesting.Height;
        nesting.Depth = nesting.Depth > dimensions.Depth ? 0 : nesting.Depth;
        const PHI = this.getPegHoleInfo();

        if (PHI.PegIncrementX < 0.01) PHI.PegIncrementX = 0.01;
        let gapX = Math.ceil((width + pos.Position.GapX + pos.pegOffsetX) / PHI.PegIncrementX) * PHI.PegIncrementX - (width-pos.pegOffsetX); // do we have nesting ?- nesting.Width
        let lw = width * posFacingsX + (posFacingsX - 1) * gapX;
        return lw;
    }

    public linearHeightPosition(pos: Position, toValue?: number, toField?: string): number {
        const view = this.orientNS.View.Front;
        let orientation = pos.getOrientation();
        let posFacingsY = pos.Position.FacingsY;
        if (!isUndefined(toValue)) {
            if (toField == 'Position.IDOrientation ') {
                orientation = toValue & 0x1f;
            } else if (toField == 'Position.FacingsY') {
                posFacingsY = toValue;
            }
        }

        const dimensions = this.orientNS.GetDimensions(
            orientation,
            false,
            view,
            pos.Position.ProductPackage.Width,
            pos.Position.ProductPackage.Height,
            pos.Position.ProductPackage.Depth,
        );
        const height = dimensions.Height;
        const nesting = this.orientNS.GetDimensions(
            orientation,
            false,
            view,
            pos.Position.ProductPackage.NestingX,
            pos.Position.ProductPackage.NestingY,
            pos.Position.ProductPackage.NestingZ,
        );
        // Nesting should not be greater than the product dimension
        nesting.Width = nesting.Width > dimensions.Width ? 0 : nesting.Width;
        nesting.Height = nesting.Height > dimensions.Height ? 0 : nesting.Height;
        nesting.Depth = nesting.Depth > dimensions.Depth ? 0 : nesting.Depth;
        const PHI = this.getPegHoleInfo();

        if (PHI.PegIncrementY < 0.01) PHI.PegIncrementY = 0.01;
        //calulates the gap from where the next facing can start vertically
        const gapY = Math.ceil((height + pos.Position.GapY) / PHI.PegIncrementY) * PHI.PegIncrementY - height; // do we have nesting ?- nesting.Height

        //calculates total height of the item with facingsY
        const lh = height * posFacingsY + (posFacingsY - 1) * gapY;
        return lh;
    }

    public linearDepthPosition(pos: Position, toValue?: number, toField?: string): number {
        // view will need to change based on the POV of this POG for now it is just from the Front
        const view = this.orientNS.View.Front;
        let orientation = pos.getOrientation();
        if (!isUndefined(toValue)) {
            if (toField == 'Position.IDOrientation ') {
                orientation = toValue & 0x1f;
            }
        }
        const dimensions = this.orientNS.GetDimensions(
            orientation,
            false,
            view,
            pos.Position.ProductPackage.Width,
            pos.Position.ProductPackage.Height,
            pos.Position.ProductPackage.Depth,
        );
        const depth = dimensions.Depth;
        const nesting = this.orientNS.GetDimensions(
            orientation,
            false,
            view,
            pos.Position.ProductPackage.NestingX,
            pos.Position.ProductPackage.NestingY,
            pos.Position.ProductPackage.NestingZ,
        );
        // Nesting should not be greater than the product dimension
        nesting.Width = nesting.Width > dimensions.Width ? 0 : nesting.Width;
        nesting.Height = nesting.Height > dimensions.Height ? 0 : nesting.Height;
        nesting.Depth = nesting.Depth > dimensions.Depth ? 0 : nesting.Depth;

        let FrontDepth = 0;
        if (pos.Position.FacingsZ > 0) {
            FrontDepth =
                depth * pos.Position.FacingsZ + (pos.Position.FacingsZ - 1) * (pos.Position.GapZ - nesting.Depth);
        }
        return FrontDepth;
    }

    //ToDo @Amit Type of Position
    public calculatePositionDistribution(ctx: Context, position: Position ): void {
        const fixture: any = this;
        const PHI = this.getPegHoleInfo();

        const rootObj = this.sharedService.getObject(this.$sectionID, fixture.$sectionID) as Section;
        const height = position.computeHeight();
        const width = position.computeWidth();
        const depth = position.computeDepth();
        // view will need to change based on the POV of this POG for now it is just from the Front
        const view = this.orientNS.View.Front;
        const orientation = position.getOrientation();
        const nesting = this.orientNS.GetDimensions(
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

        const merchHeight = Math.max(0, fixture.ChildDimension.Height);
        let merchDepth = Math.max(0, fixture.ChildDimension.Depth);

        if (!Utils.isNullOrEmpty(fixture.Fixture.MaxMerchDepth) && fixture.Fixture.MaxMerchDepth > 0) {
            merchDepth = fixture.Fixture.MaxMerchDepth;
        }
        // If Peg length is less than Merch depth use that for auto compute calculation.
        const pegHole = position.getPegInfo();
        if (pegHole.Length > 0 /*&& pegHole.Length > merchDepth && (!fixture.Fixture.AutoComputeDepth)*/) {
          merchDepth = Math.min(pegHole.Length + position.Position.BackYOffset, merchDepth);
        }
        merchDepth -= position.Position.BackYOffset;
        merchDepth = Math.round(merchDepth * 100) / 100;
        /*fix: check if facingY is 0 then turn it to atleast 1*/
        position.Position.FacingsY = position.Position.FacingsY == 0 ? 1 : position.Position.FacingsY;
        position.Position.FacingsX = position.Position.FacingsX == 0 ? 1 : position.Position.FacingsX;
        position.Position.FacingsZ = position.Position.FacingsZ == 0 ? 1 : position.Position.FacingsZ;
        position.Position.PegSpanCount = (position.Position.BackSpacing / PHI.PegIncrementX) + 1;


        let frontsDeep;

        if (fixture.Fixture.AutoComputeDepth) {
          frontsDeep = Math.floor(
            ((position.Position.PegOverhang || 0) + merchDepth * (Math.cos(Utils.degToRad(pegHole?.HeightSlope ?? 0))) + position.Position.GapZ - nesting.Depth) /
            (depth + position.Position.GapZ - nesting.Depth),
          );
          position.Position.FacingsZ = frontsDeep;
        } else {
          frontsDeep = position.Position.FacingsZ;
        }
        frontsDeep = Math.min(frontsDeep, position.Position.MaxFacingsZ);

        position.Position.FacingsZ = frontsDeep;
        position.Position.LayoversY = 0;
        position.Position.LayoversZ = 0;
        position.Position.LayundersY = 0;
        position.Position.LayundersZ = 0;

        if (position.$packageBlocks.length > 0) {
            position.$packageBlocks = new Array();
        }
        if (fixture.Rotation.X != 0) {
            position.$packageBlocks.FrontScale = Math.cos(Utils.degToRad(fixture.Rotation.X));
        } else {
            position.$packageBlocks.FrontScale = 1;
        }

        let positionY = 0;
        let positionX = 0;

        if (PHI.PegIncrementX < 0.01) PHI.PegIncrementX = 0.01;
        const gapX = Math.ceil((width + position.Position.GapX + position.pegOffsetX) / PHI.PegIncrementX) * PHI.PegIncrementX - (width-position.pegOffsetX); // do we have nesting ?- nesting.Width
        if (PHI.PegIncrementY < 0.01) PHI.PegIncrementY = 0.01;
        const gapY = Math.ceil((height + position.Position.GapY) / PHI.PegIncrementY) * PHI.PegIncrementY - height; // do we have nesting ?- nesting.Height

        if (position.Position.FacingsY == 0) {
            //Uncomment this once you are receiving the MinFacingsY from ProductPackage data
            // if (position.Position.ProductPackage.MinFacingsY && position.Position.ProductPackage.MinFacingsY > 0) {
            //     position.Position.FacingsY = position.Position.ProductPackage.MinFacingsY;
            // } else {
                position.Position.FacingsY = 1;
            //}
        }

        if (position.Position.FacingsX == 0) {
            if (position.Position.ProductPackage.MinFacingsX && position.Position.ProductPackage.MinFacingsX > 0) {
                position.Position.FacingsX = position.Position.ProductPackage.MinFacingsX;
            } else {
                position.Position.FacingsX = 1;
            }
        }
        //making sure atleast one Fronts Deep
        if (position.Position.FacingsZ == 0) {
            //Uncomment this once you are receiving the MinFacingsY from ProductPackage data
            // if (position.Position.ProductPackage.MinFacingsZ && position.Position.ProductPackage.MinFacingsZ > 0) {
            //     position.Position.FacingsZ = position.Position.ProductPackage.MinFacingsZ;
            // } else {
                position.Position.FacingsZ = 1;
            // }
        }
        if (position.Position.FacingsY > 0) {
            const packageBlock = {
                type: 'product',
                x: positionX,
                y: positionY,
                z: 0,
                wide: position.Position.FacingsX,
                high: position.Position.FacingsY,
                deep: position.Position.FacingsZ,
                gapX: gapX,
                gapY: gapY,
                gapZ: position.Position.GapZ - nesting.Depth,
                orientation: orientation,
            };
            position.$packageBlocks.push(packageBlock);
        }
        if (position.Position.FacingsY > 0) {
            positionY += position.Position.FacingsY * (height + position.Position.GapY - nesting.Height);
        }

        position.Dimension.Width = position.linearWidth();
        position.Dimension.Height = position.linearHeight();
        position.Dimension.Depth = position.linearDepth();

        position.Position.Capacity = 0;
        position.$packageBlocks.forEach((packageBlock) => {
            if (packageBlock.type == 'product') {
                position.Position.Capacity += packageBlock.wide * packageBlock.high * packageBlock.deep;
            }
        });
        if(position.Position.ProductPackage.Weight){
          position.Position.PegWeightCapacity = position.Position.Capacity * position.Position.ProductPackage.Weight;
        }
        /*including casepack in capcity calculation*/
        if (
            position.Position.ProductPackage.CasePack == undefined ||
            position.Position.ProductPackage.CasePack == 0 ||
            position.Position.ProductPackage.CasePack == null
        ) {
            position.Position.ProductPackage.CasePack = 1;
        }


        if (
          isNull(position.Position._X05_PEGLENGTH.ValData) ||
          isUndefined(position.Position._X05_PEGLENGTH.ValData) ||
          !position.Position._X05_PEGLENGTH.ValData) {
          if (fixture.Fixture.MaxMerchDepth) {
            position.Position._X05_PEGLENGTH.ValData = fixture.Fixture.MaxMerchDepth - (position.Position.BackYOffset || 0);
          } else {
            position.Position._X05_PEGLENGTH.ValData = fixture.Dimension.Depth - (position.Position.BackYOffset || 0);
          }
        }
        //considering pegboard does not support merch_behind
        if (position.Position._X05_PEGLENGTH.ValData > position.linearDepth()) {
          position.Location.Z = position.Position._X05_PEGLENGTH.ValData - position.linearDepth();
        } else {
          position.Location.Z = 0;
        }
        position.Location.Z += position.Position.BackYOffset;
        if (
            !rootObj.fitCheck &&
            fixture.Fixture.AutoComputeDepth &&
            fixture.minMerchHeight > fixture.ChildDimension.Height &&
            fixture.ChildDimension.Height < height
        ) {
            const itemHeight = fixture.Location.Y + height;
            if (rootObj.Dimension.Height < itemHeight) {
                fixture.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_OK);
            }
        } else {
            position.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_OK);
        }
    }

    public calculateDistribution(ctx: Context): void {
        let sectionObj = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        if (sectionObj.getSkipShelfCalculateDistribution()) {
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
        this.Children.forEach((position) => {
            if (position.isPosition) {
                position.calculateDistribution(ctx, this);

                if (Utils.isNullOrEmpty(position.Fixture)) {
                    // This adds fixture number to all the positions in standard shelf
                    position.Fixture = {} as any;
                    position.Fixture.FixtureNumber = this.Fixture.FixtureNumber;
                    position.Fixture.FixtureFullPath = 'F' + this.Fixture.FixtureNumber;
                    position.Fixture.FixtureDesc = this.Fixture.FixtureDesc;
                } else {
                    position.Fixture.FixtureNumber = this.Fixture.FixtureNumber;
                    position.Fixture.FixtureFullPath = 'F' + this.Fixture.FixtureNumber;
                    position.Fixture.FixtureDesc = this.Fixture.FixtureDesc;
                }
                if (isModular) {
                    position.Fixture.ModularNumber = this.Fixture.ModularNumber;
                    position.Fixture.FixtureFullPath =
                        'M' + this.Fixture.ModularNumber + 'F' + this.Fixture.FixtureNumber;
                }
                if (position.ObjectType == (AppConstantSpace.FIXTUREOBJ as any)) {
                    this.Fixture.Capacity += (position.Fixture as any).Capacity;
                } else {
                    this.Fixture.Capacity += position.Position.Capacity;
                }
                position.Position.UsedCubic = position.Dimension.Height * position.Dimension.Width * position.Dimension.Depth;
                position.Position.UsedLinear = position.Dimension.Width;
                position.Position.UsedSquare = position.Dimension.Height * position.Dimension.Width;

                // This is the total weight of a single position. In Peg fixtures, this will include peg weight + products weight.
                position.calculateWeightCapacity();
                const PegWeight = position.Position.PegWeight ? position.Position.PegWeight : 0;
                position.Position.PositionWeightCapacity += PegWeight;

                //This will be the total weight of all positions in that fixture.
                this.Fixture.FixtureWeightCapacity += position.Position.PositionWeightCapacity;
            }
        });
    }

    public checkItemBeyondMerchSpace(position: Position) {
        const pegHoleInfo = this.getPegHoleInfo();
        const offsetLeft = pegHoleInfo.PegOffsetLeft;
        const offsetRight = pegHoleInfo.PegOffsetRight;
        const offsetTop = pegHoleInfo.PegOffsetTop;
        const offsetBottom = pegHoleInfo.PegOffsetBottom;

        const shelfHeight = this.Dimension.Height;
        const shelfWidth = this.Dimension.Width;

        const X1 = position.Location.X;
        const X2 = X1 + position.linearWidth();
        const Y1 = position.Location.Y;
        const Y2 = Y1 + position.linearHeight();

        if (X1 < offsetLeft || X2 > shelfWidth - offsetRight || Y1 < offsetBottom || Y2 > shelfHeight - offsetTop) {
            return true;
        }
    }

    public computeSpaceDetails(): void {
        const pegHoleInfo = this.getPegHoleInfo();
        const offsetLeft = pegHoleInfo.PegOffsetLeft;
        const offsetRight = pegHoleInfo.PegOffsetRight;
        const offsetTop = pegHoleInfo.PegOffsetTop;
        const offsetBottom = pegHoleInfo.PegOffsetBottom;
        const fixtureWidth = this.Dimension.Width;
        const fixtureHeight = this.Dimension.Height;
        const positions = this.Children;
        const rootObj = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        const opticalResemblance : boolean = rootObj.OverrideSectionPosNumbering ? this.getType() == AppConstantSpace.PEGBOARDOBJ ? rootObj._PegBoardOpticalResemblance.FlagData : this.getType() == AppConstantSpace.SLOTWALLOBJ ? rootObj._SlotwallOpticalResemblance.FlagData : false : false;
        let perUsedCubic = 0;
        let perUsedSquare = 0;
        this.Fixture.UsedLinear = null;
        this.Fixture.UsedSquare = 0;
        let usedSquare = 0;
        let usedCubic = 0;
        this.unUsedCubic = 0;
        if (true) {
            let clonedPositions = this.getAllPosition().filter(e => e.ObjectDerivedType !== AppConstantSpace.BLOCKOBJECT);

            clonedPositions.forEach((item, i) => {
                item = filter(positions, { $id: item.$id })[0];
                const squareOccupied =
                    (Math.max(Math.min(item.Location.X + item.linearWidth(), fixtureWidth - offsetRight), 0) -
                        Math.max(0, offsetLeft, item.Location.X)) *
                    (Math.max(0, Math.min(item.Location.Y + item.linearHeight(), fixtureHeight - offsetTop)) -
                        Math.max(0, offsetBottom, item.Location.Y));
                usedSquare += squareOccupied;
                usedCubic += squareOccupied * item.linearDepth();
                if (item.ObjectType == 'Position' && !opticalResemblance) {
                    rootObj.IDPOGStatus < 4 || this.sharedService.isLivePogEditable
                        ? (item.Position.PositionNo = i + 1)
                        : ''; //Update position numbers on delete
                    item.Position["CongruentPosition"]= item.Position.PositionNo;
                }
                if (clonedPositions[i].ObjectType == 'Position' && opticalResemblance) {
                    if(i==0){
                        rootObj.IDPOGStatus < 4 || this.sharedService.isLivePogEditable
                        ? (clonedPositions[i].Position["Congruent"]) ? (clonedPositions[i].Position.PositionNo = i+1) : (clonedPositions[i].Position.PositionNo = i+1)
                        : ''; //Update position numbers on delete
                        clonedPositions[i].Position["CongruentPosition"]= clonedPositions[i].Position.PositionNo
                    }
                    else{
                        rootObj.IDPOGStatus < 4 || this.sharedService.isLivePogEditable
                        ? (clonedPositions[i].Position["Congruent"]) ? (clonedPositions[i].Position.PositionNo = clonedPositions[i-1].Position.PositionNo) : (clonedPositions[i].Position.PositionNo = clonedPositions[i-1].Position.PositionNo+1)
                        : ''; //Update position numbers on delete
                        clonedPositions[i].Position["CongruentPosition"]= i+1;
                    }
                }
            });
        }
        this.Fixture.UsedSquare = usedSquare;
        this.Fixture.UsedCubic = usedCubic;
        this.unUsedLinear = null;
        let totalSquare =
            (this.Dimension.Width - (offsetLeft + offsetRight)) * (this.Dimension.Height - (offsetTop + offsetBottom));
        let totalCubic = totalSquare * this.Dimension.Depth;
        this.unUsedSquare = totalSquare - this.Fixture.UsedSquare;
        this.unUsedCubic = totalCubic - this.Fixture.UsedCubic;
        let unUsedSquare = this.unUsedSquare;
        let unUsedCubic = this.unUsedCubic;
        if (this.Fixture.UsedSquare + this.unUsedSquare != 0) {
            perUsedSquare = (this.Fixture.UsedSquare / (this.Fixture.UsedSquare + this.unUsedSquare)) * 100;
            perUsedCubic = (this.Fixture.UsedCubic / (this.Fixture.UsedCubic + this.unUsedCubic)) * 100;
        } else {
            this.Fixture.UsedSquare = 0;
            this.Fixture.UsedCubic = 0;
            unUsedSquare = this.unUsedSquare;
            unUsedCubic = this.unUsedCubic;
        }

        this.Fixture.AvailableLinear = null;
        this.Fixture.UsedLinear = null;
        this.Fixture.UsedSquare = Utils.preciseRound(this.Fixture.UsedSquare, 2);
        this.Fixture.UsedCubic = Utils.preciseRound(this.Fixture.UsedCubic, 2);
        perUsedSquare = Utils.preciseRound(perUsedSquare, 2);
        perUsedCubic = Utils.preciseRound(perUsedCubic, 2);
        this.Fixture.PercentageUsedSquare = Number(perUsedSquare).toFixed(2) + '%';
        this.Fixture.PercentageUsedCubic = Number(perUsedCubic).toFixed(2) + '%';
        this.Fixture.AvailableSquare = Utils.preciseRound(unUsedSquare, 2);
        this.Fixture.AvailableCubic = Utils.preciseRound(unUsedCubic, 2);
    }

    public sortByYXZPegHoleXAscendingConsideringPegYOffset(obj: Position[]): Position[] {
        if (obj == undefined) {
            return obj;
        }
        return Utils.sortPositions(
            obj,
            [{ fun: 'getPegholeYLocConsideringPegYOffset' }, { fun: 'getPegholeXLoc' }, { fun: 'getLocationZ' }],
            [Utils.descendingOrder, Utils.ascendingOrder, Utils.descendingOrder],
            0.25,
        );
    }

    // peghole sorting starts
    private sortByYXZPegHoleXAscending(obj: Position[]): Position[] {
        if (obj == undefined) {
            return obj;
        }
        return Utils.sortPositions(
            obj,
            [ { fun: 'getPegholeYLoc' }, { fun: 'getPegholeXLoc' }, { fun: 'getLocationZ' }],
            [Utils.ascendingOrder, Utils.ascendingOrder, Utils.descendingOrder],
            0.25,
        );
    }

    private sortByYXZPegHoleXDecending(obj: Position[]): Position[] {
        return Utils.sortPositions(
            obj,
            [{ fun: 'getPegholeYLoc' }, { fun: 'getPegholeXLoc' }, { fun: 'getLocationZ' }],
            [Utils.ascendingOrder, Utils.descendingOrder, Utils.descendingOrder],
            0.25,
        );
    }

    private sortByXYZPegHoleXAscending(obj: Position[]): Position[] {
        return Utils.sortPositions(
            obj,
            [{ fun: 'getPegholeYLoc' }, { fun: 'getPegholeXLoc' }, { fun: 'getLocationZ' }],
            [Utils.descendingOrder, Utils.ascendingOrder, Utils.descendingOrder],
            0.25,
        );
    }

    private sortByXYZPegHoleXDecending(obj: Position[]): Position[] {
        return Utils.sortPositions(
            obj,
            [{ fun: 'getPegholeYLoc' }, { fun: 'getPegholeXLoc' }, { fun: 'getLocationZ' }],
            [Utils.descendingOrder, Utils.descendingOrder, Utils.descendingOrder],
            0.25,
        );
    }

    public pegSortType(): (items: Position[]) => Position[] {
        const rootObject = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        const trafficFlow : number = rootObject.OverrideSectionPosNumbering ? this.getType() == AppConstantSpace.PEGBOARDOBJ ? rootObject._PegboardLKTraffic.ValData : this.getType() == AppConstantSpace.SLOTWALLOBJ ? rootObject._SlotwallLKTraffic.ValData : rootObject._CorssbarLKTraffic.ValData  : rootObject.LKTraffic;
        const verticalFlow : number = rootObject.OverrideSectionPosNumbering ? this.getType() == AppConstantSpace.PEGBOARDOBJ ? rootObject._PegboardStackOrder.ValData : this.getType() == AppConstantSpace.SLOTWALLOBJ ? rootObject._SlotwallStackOrder.ValData : rootObject.shelfStackOrder : rootObject.shelfStackOrder;
        //Bottom to top position number calculation
        if (verticalFlow == 0) {
            if (trafficFlow == 1) {
                //left to right
                return this.sortByYXZPegHoleXAscending;
            } else {
                //right to left
                return this.sortByYXZPegHoleXDecending;
            }
        } else if (verticalFlow == 1) {
            //vertical arrangement //Top to bottom
            //check for the traffic flow
            if (trafficFlow == 1) {
                //left to right
                return this.sortByXYZPegHoleXAscending;
            } else {
                //right to left
                return this.sortByXYZPegHoleXDecending;
            }
        }
    }

    public pegPositionSort(fixture): Position[] {
        //Check the direction of flow
        //if direction is right
        //1.	Item�s YPEGHOLEPOS � Descending
        //2.	Item�s XPEGHOLEPOS � Ascending (if trafficflow is left to right) or 2.	Item�s XPEGHOLEPOS � Descending (if trafficflow is right to left)
        //3.	Item�s ZPOS � Descending
        //If direction is down
        //1.	Item�s XPEGHOLEPOS � Ascending (if trafficflow is left to right) or 2.	Item�s XPEGHOLEPOS � Descending (if trafficflow is right to left)
        //2.	Item�s YPEGHOLEPOS � Descending
        //3.	Item�s ZPOS � Descending
        let positions = this.getAllPosition().filter(e => e.ObjectDerivedType !== AppConstantSpace.BLOCKOBJECT);
        const rootObject = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        const opticalResemblance : boolean = rootObject.OverrideSectionPosNumbering ? this.getType() == AppConstantSpace.PEGBOARDOBJ ? rootObject._PegBoardOpticalResemblance.FlagData : this.getType() == AppConstantSpace.SLOTWALLOBJ ? rootObject._SlotwallOpticalResemblance.FlagData : false : false;
        if (positions.length == 0) {
            return positions;
        }
        if(opticalResemblance){
            return this.planogramService.posOpticalSort(this.$sectionID,positions,this.getType(),fixture,fixture.Dimension.Width,fixture.Dimension.Height)
        }
        else{
            let sortFn = this.pegSortType();
            positions = sortFn(positions);
            for (const element of this.Children) {
                if (element.ObjectDerivedType !== AppConstantSpace.BLOCKOBJECT && !Utils.checkIfPosition(element)) {
                    positions.push(element);
                }
            }
            return positions;
        }
    }
    public crossBarPositionSort(){
        let positions = this.getAllPosition().filter(e => e.ObjectDerivedType !== AppConstantSpace.BLOCKOBJECT);
        const rootObject = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        const trafficFlow : number = rootObject.OverrideSectionPosNumbering ? rootObject._CorssbarLKTraffic.ValData  : rootObject.LKTraffic;
        positions.sort((a,b)=>{
            let pegHoleA= a.getPegInfo();
            let pegHoleB = b.getPegInfo();
            let locA= a.Location.X + pegHoleA.OffsetX;
            let locB = b.Location.X + pegHoleB.OffsetX;
            if(trafficFlow ==1){
                if(locA>locB)
                    return 1;
                else if(locA<locB)
                    return -1;
                else
                    return 0
            }
            else{
                if(locA<locB)
                    return 1;
                else if(locA>locB)
                    return -1;
                else
                    return 0
            }             
        });        
        return positions;
    }
    public computePositionsAfterChange(ctx: Context, refresh?: RefreshParams): void {
        if (this.section.getSkipComputePositions()) {
            return;
        }
        let positions = !(this.hasOwnProperty('Children') === true) ? undefined : this.Children;
        const rootObj = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        if (rootObj.addToComputePositionsFixtureList(this)) {
            return;
        }
        this.maxItemHeight = this.minMerchHeight = this.ChildDimension.Height;

        if (!this.Fixture.AutoComputeFronts) {
            this.minMerchHeight = this.maxItemHeight;
        }
        //filter blocks from children
        positions = positions.filter(e => e.ObjectDerivedType !== AppConstantSpace.BLOCKOBJECT);
        if (positions) {
            this.computeSpaceDetails();
            positions.forEach((item, i) => {
                this.snapToPeg(item);
            });
        }
        this.calculateDistribution(ctx);
        if (!refresh) {
            rootObj.computeSectionUsedLinear();
            rootObj.ComputeSectionUsedSquare();
            rootObj.calculateDistribution(ctx);
        }
    }

    public getAllPosition(): Position[] {
        let allPositions = [];
        this.Children.forEach((item, key) => {
            if (Utils.checkIfPosition(item)) {
                allPositions.push(item);
            }
        });
        return allPositions;
    }

    public getMinPropertyValue(prop: number): number {
        let mini = 999;
        function getMinPropertyValueInnerFn() {
            const innerContext = this;
            innerContext.Children.forEach((child, key) => {
                if (child.isPosition && child.isLikePosition) {
                    if (child[prop] < mini) {
                        mini = child[prop];
                    }
                } else {
                    getMinPropertyValueInnerFn.call(child);
                }
            });
            return mini;
        }
        return getMinPropertyValueInnerFn.call(this);
    }

    public getMaxPropertyValue(prop: number): number {
        let maxi = 0;
        function getMaxPropertyValueInnerFn() {
            const innerContext = this;
            innerContext.Children.forEach((child, key) => {
                if (child.isPosition && child.isLikePosition) {
                    if (child[prop] > maxi) maxi = child[prop];
                } else {
                    getMaxPropertyValueInnerFn.call(child);
                }
            });
            return maxi;
        }
        return getMaxPropertyValueInnerFn.call(this);
    }

    public moveSelectedToCart(ctx: Context, shoppingCart: ShoppingCart): void {
        let currentParentObj = this.sharedService.getParentObject(this, this.$sectionID);
        let currentShelfIndex = currentParentObj.Children.indexOf(this);

        this.IDPOGObjectParent = null;
        this.IDPOGObject = null;
        this.Fixture.IDPOGObject = null;
        this.TempId = Utils.generateUID();

        const len = this.Children != undefined ? this.Children.length : 0;
        for (let i = len - 1; i >= 0; i--) {
            const child = this.Children[i];
            if (typeof child == 'object' && typeof child.moveSelectedToCart === 'function') {
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

    public orientationRoll(ctx: Context, direction: number, scopeObj: Section): void {
        scopeObj.Children.forEach((child, key) => {
            let effected = false;
            if (child.isPosition) {
                if (child.selected && child.selected === true) {
                    if (direction === 0) {
                        child.incrementOrientation();
                    } else {
                        child.decrementOrientation();
                    }
                    child.calculateDistribution(ctx, scopeObj);
                    effected = true;
                }
            } else {
                this.orientationRoll(ctx, direction, child);
            }
            if (effected) scopeObj.computePositionsAfterChange(ctx);
        });
    }

    public getZIndex(): number {
        for (const child of this.Children) {
            if (child.Location.Y < 0) return 9;
        }
        return 4;
    }

    public initiateAdd(locationX: number, locationY: number, parentObj: Fixture): boolean {
        const rootObj = this.sharedService.getObject(parentObj.$sectionID, parentObj.$sectionID);
        const copiedFixture: any = this;
        if (locationY > rootObj.Dimension.Height || locationY < 0) {
            this.notifyService.error('FIX_HEIGHT_EXCEEDING_SECTION');
            return false;
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
        if (this.parentApp.isAllocateApp) {
           this.allocateUtils.updatePAFixtureKey(copiedFixture, parentObj as Modular);
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

    public addCopiedFixtureToTopORBottom(ctx: Context, fixtureObj: FixtureList): boolean {
        const locationX = this.Location.X;
        const locationYTop = this.Location.Y + this.Fixture.Thickness + this.minMerchHeight;
        const locationYBottom = this.Location.Y - fixtureObj.Fixture.Thickness - fixtureObj.minMerchHeight;
        const parentObj = this.sharedService.getParentObject(this, this.$sectionID);
        const rootObj = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        const sectionWidth = rootObj.Dimension.Width;
        const isFitCheckRequired = rootObj.fitCheck;

        const isExceedsSectionWidth = fixtureObj.Dimension.Width + this.getXPosToPog() > sectionWidth ? true : false;
        if (isExceedsSectionWidth) {
            this.notifyService.warn('FIX_WIDTH_EXCEEDING_SECTION');
            return false;
        }
        const proposedYPosToPog = rootObj.getNearestYCoordinate(locationYTop);
        if (isFitCheckRequired) {
            let isValidFitcheck = fixtureObj.doeShelfValidateFitCheck(ctx, locationX, proposedYPosToPog, this.getXPosToPog());
            if (!isValidFitcheck) {
                const proposedYPosToPog_Bottom = rootObj.getNearestYCoordinate(locationYBottom);
                isValidFitcheck = fixtureObj.doeShelfValidateFitCheck(ctx, locationX, proposedYPosToPog_Bottom, this.getXPosToPog());
                if (!isValidFitcheck) {
                    this.notifyService.error('FITCHECH_ERR');
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

    public addCopiedFixtureToLocation(
        ctx: Context,
        proposedXPosToPOG: number,
        proposedYPosToPOG: number,
        selectedObj: PegTypes,
    ): boolean {
        const pastingFixture: any = this;
        const rootObj = this.sharedService.getObject(pastingFixture.$sectionID, pastingFixture.$sectionID) as Section;
        const isFitCheckRequired = rootObj.fitCheck;
        const isBayPresents = rootObj.isBayPresents;
        const sectionWidth = rootObj.Dimension.Width;
        let pasteOverObj;

        if (isBayPresents) {
            const dropBay = this.findIntersectBayAtXpos(proposedXPosToPOG, null);
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
        if (isFitCheckRequired) {
            let isValidFitcheck = this.doeShelfValidateFitCheck(
                ctx,
                xPosRelative,
                proposedYPosToPOG,
                proposedXPosToPOG,
                selectedObj,
            );

            if (!isValidFitcheck) {
                this.notifyService.error('FIT_CHECK_ERROR');
                return false;
            }
            pastingFixture.initiateAdd(xPosRelative, proposedYPosToPOG, pasteOverObj);
        } else {
            pastingFixture.initiateAdd(xPosRelative, proposedYPosToPOG, pasteOverObj);
        }
    }

    public checkIfOffsetArea(dropCord: PegDropCord): boolean {
        const pegHoleInfo = this.getPegHoleInfo();
        const offsetLeft = pegHoleInfo.PegOffsetLeft;
        const offsetRight = pegHoleInfo.PegOffsetRight;
        const offsetTop = pegHoleInfo.PegOffsetTop;
        const offsetBottom = pegHoleInfo.PegOffsetBottom;

        const shelfHeight = this.Dimension.Height;
        const shelfWidth = this.Dimension.Width;
        if (Utils.checkIfCrossbar(this)) {
            if (shelfWidth - offsetRight < dropCord.left || offsetLeft > dropCord.left) {
                return false;
            }
        } else {
            if (shelfWidth - offsetRight < dropCord.left) {
                return false;
            } else if (shelfHeight - offsetTop < dropCord.top) {
                return false;
            }
        }
        return true;
    }

    public fixtureDropPoint(dropClientX: number, dropClientY: number, pogId: number, scaleFactor: number): PegDropCord {
        const shelfRootObject = this.sharedService.getObject(this.$sectionID, this.$sectionID);
        // const pogOffSetPX = $('#innerWebPOG_' + pogId).offset();
        const pogOffSetPX = document.querySelector('#innerWebPOG_' + pogId).getBoundingClientRect();
        const dropShelfXPosToPog = this.getXPosToPog();
        const dropShelfYPosToPog = this.getYPosToPog();
        const itemXPosToPog = this.planogramService.convertToUnit(
            (dropClientX - pogOffSetPX.left) / scaleFactor,
            this.$sectionID,
        );
        const itemYPosToPog = this.planogramService.convertToUnit(
            (dropClientY - pogOffSetPX.top) / scaleFactor,
            this.$sectionID,
        );
        //Above variables mainly to get real xPOS of the item relative to the shelf dropped.
        const itemXPosToParent = itemXPosToPog - dropShelfXPosToPog - this.ChildOffset.Y;
        const itemYPosToParent =
            shelfRootObject.Dimension.Height - itemYPosToPog - dropShelfYPosToPog - this.ChildOffset.Y;
        const dropPoint = {
            left: itemXPosToParent,
            top: itemYPosToParent,
        };
        return dropPoint;
    }

    public checkIfItemFitsAtDropCordAutoForPaste(
        position: Position,
        dropCord: PegDropCord,
        exculdedContainerItems: Position[],
    ): pegFitCheckObject {
        let flag = true;
        let intersectingPos;
        const pegHoleInfo = this.getPegHoleInfo();
        const offsetLeft = pegHoleInfo.PegOffsetLeft;
        const offsetRight = pegHoleInfo.PegOffsetRight;
        const pegIncrementX = pegHoleInfo.PegIncrementX;
        const shelfWidth = this.Dimension.Width;
        const pegboardXposToPog = this.getXPosToPog();

        let positionXYCords = this.findXYConsideringPegType(position, dropCord);

        if (
            this.checkIfItemBeyondEdge(position, positionXYCords, dropCord) ||
            dropCord.left < offsetLeft ||
            dropCord.left > shelfWidth - offsetRight
        ) {
            let nextLeft = position.getPegInfo().OffsetX + offsetLeft;
            positionXYCords = this.findXYConsideringPegType(position, {
                left: nextLeft,
                top: dropCord.top,
            });
            let isItemExceedingSectionOnLeftSide = this.checkIfItemExceedSection(this, positionXYCords) && (this.getXPosToPog() + positionXYCords.X1 < 0);
            if (isItemExceedingSectionOnLeftSide) {
                nextLeft = nextLeft + pegIncrementX;
                positionXYCords = this.findXYConsideringPegType(position, {
                    left: nextLeft,
                    top: dropCord.top,
                });
            }
            if (isUndefined(dropCord.nextY) || dropCord.nextY == 0) {
                let positions = exculdedContainerItems;
                let isIntersect = false;
                positionXYCords = this.findXYConsideringPegType(position, {
                    left: nextLeft,
                    top: dropCord.top,
                });
                //remove the children if they are present in the dragging elements
                for (const pos of positions) {
                    if (this.collision.isPositionIntersectingWithXYCoordsForPaste(pos, positionXYCords, this)) {
                        isIntersect = true;
                        intersectingPos = pos;
                        //If it crossing the Width skip to the next line with verticalspace distance
                        dropCord.nextY =
                            pos.Location.Y -
                            (pos.linearHeight() - pos.getPegInfo().OffsetY) -
                            this.planogramStore.appSettings.vertical_spacing;
                        if (position.getPegInfo().Type && position.pegOffsetY != 0) {
                            dropCord.nextY = dropCord.nextY + position.pegOffsetY;
                        }
                        break;
                    }
                }
                if (!isIntersect) {
                    dropCord.nextY = dropCord.top;
                }
            }
            const nextDropCord = {
                top: dropCord.nextY,
                left: nextLeft,
            };
            const nextXY = this.findXYConsideringPegType(position, {
                left: nextDropCord.left,
                top: nextDropCord.top,
            });
            //If it crossing the Width skip to the next line with verticalspace distance
            dropCord.nextY =
                nextXY.Y1 -
                (position.linearHeight() - position.getPegInfo().OffsetY) -
                this.planogramStore.appSettings.vertical_spacing;
            if (position.getPegInfo().Type && position.pegOffsetY != 0) {
                dropCord.nextY = dropCord.nextY - position.Position.ProductPegHoleY + position.pegOffsetY;
            }
            dropCord.nextX = nextDropCord.left;
            dropCord.left = nextDropCord.left;
            dropCord.top = nextDropCord.top;
            flag = false;
        } else {
            let beyondEdgeFitCheckInput = {
                position: position,
                positionXYCords: positionXYCords,
                dropCord: dropCord,
                pegHoleInfo: pegHoleInfo,
                pegboardXposToPog: pegboardXposToPog,
                isPaste:true
            };
            let fitCheckObj: BeyondEdgeFitCheckOutput = this.checkIfItemCanFitBeyondEdgeAndUpdateDropCord(beyondEdgeFitCheckInput);
            dropCord = fitCheckObj.dropCord
            flag = fitCheckObj.flag;
            positionXYCords = fitCheckObj.positionXYCords;
        }
        if (flag) {
            let getDropCordInputData = {
                position: position,
                positionXYCords: positionXYCords,
                dropCord: dropCord,
                intersectingPos: intersectingPos,
                exculdedContainerItems: exculdedContainerItems,
                pegHoleInfo: pegHoleInfo,
                pegDirection: 0,
                isPaste: true
            };
            let fitCheckObj: UpdatedDropCordData = this.getDropCordConsideringOtherPegItems(getDropCordInputData);
            dropCord.left = fitCheckObj.left;
            dropCord.top = fitCheckObj.top;
            intersectingPos = fitCheckObj.intersectPosObj;
            flag = fitCheckObj.flag;
            if (flag) {
                dropCord.top = positionXYCords.Y2;
                if (position.getPegInfo().Type && position.pegOffsetY != 0) {
                    dropCord.top = dropCord.top - position.Position.ProductPegHoleY + position.pegOffsetY + position.linearHeight();
                }
            }
        }
        return {
            flag: flag,
            left: dropCord.left,
            top: dropCord.top
        };
    }

    public checkIfItemFitsAtDropCordAuto(
        position: Position,
        dropCord: PegDropCord,
        exculdedContainerItems: Position[],
    ) {
        let flag = true;
        let nextY = 0;
        let nextX = 0;
        let intersectingPos;
        const pegHoleInfo = this.getPegHoleInfo();
        const offsetLeft = pegHoleInfo.PegOffsetLeft;
        const offsetRight = pegHoleInfo.PegOffsetRight;
        const offsetTop = pegHoleInfo.PegOffsetTop;
        const offsetBottom = pegHoleInfo.PegOffsetBottom;
        const pegIncrementY = pegHoleInfo.PegIncrementY;
        const pegIncrementX = pegHoleInfo.PegIncrementX;
        const shelfHeight = this.Dimension.Height;
        const shelfWidth = this.Dimension.Width;
        const pegboardXposToPog = this.getXPosToPog();
        const pegYposToPog = this.getYPosToPog();

        let positionXYCords = this.findXYofPosition(position, dropCord);

        //Check wethere if it is going beyond fixture width
        if (this.planogramStore.appSettings.peg_direction == 1) {
            if (
                this.checkIfItemBeyondEdge(position, positionXYCords, dropCord) ||
                dropCord.top < offsetBottom ||
                dropCord.top > shelfHeight - offsetTop
            ) {
                const nextTop = this.Dimension.Height - offsetTop;
                let nextLeft = dropCord.nextX;
                if (isUndefined(dropCord.nextX) || dropCord.nextX == 0) {
                    let positions = exculdedContainerItems;
                    let isIntersect = false;
                    //remove the children if they are present in the dragging elements
                    for (const pos of positions) {
                        if (this.collision.isPositionIntersectingWithXYCoords(pos, positionXYCords)) {
                            isIntersect = true;
                            intersectingPos = pos;
                            nextLeft = dropCord.nextX =
                                pos.Location.X +
                                pos.linearWidth() +
                                this.planogramStore.appSettings.horizontal_spacing / 2;
                            break;
                        }
                    }
                    if (!isIntersect) {
                        nextLeft = dropCord.nextX = dropCord.left;
                    }
                }
                const nextDropCord = {
                    top: nextTop,
                    left: nextLeft,
                };
                let nextXY = this.findXYofPosition(position, { left: nextDropCord.left, top: nextDropCord.top });
                dropCord.nextY = nextDropCord.top;
                dropCord.nextX =
                    nextXY.X1 + position.linearWidth() + this.planogramStore.appSettings.horizontal_spacing / 2;
                dropCord.left = nextDropCord.left;
                dropCord.top = nextDropCord.top;
                flag = false;
            } else {
                const intersectingCheck = this.checkIfItemCanFitBeyondEdge(positionXYCords, position);
                if (!intersectingCheck.flag) {
                    //Need to decide which side it is intersecting
                    //If it is more than shelf width
                    let nextTop = this.Dimension.Height - offsetTop;
                    let intersectingObj = intersectingCheck.intersectingObj;
                    let intersectObjYposToPog = intersectingObj.getYPosToPog();
                    let nextLeft = 0;
                    if (pegYposToPog < intersectObjYposToPog) {
                        nextTop =
                            intersectingObj.Location.Y - (position.computeHeight() - position.getPegInfo().OffsetX);
                        nextLeft = dropCord.left;
                        //Check if this top is intersecting with same fixture
                        //If it is add pegincrement Y
                        let intersectFlag = true;
                        while (intersectFlag) {
                            positionXYCords = this.findXYofPosition(position, {
                                top: nextTop,
                                left: nextLeft,
                            });
                            if (this.planogramStore.appSettings.peg_direction == 1) {
                                if (pegYposToPog + positionXYCords.Y2 > intersectObjYposToPog) {
                                    nextTop -= pegIncrementY;
                                } else {
                                    intersectFlag = false;
                                }
                                if (
                                    dropCord.top - (position.linearHeight() - position.getPegInfo().OffsetY) <
                                    offsetBottom
                                ) {
                                    intersectFlag = false;
                                }
                            }
                        }
                    } else {
                        if (isUndefined(dropCord.nextX)) {
                            dropCord.nextX = dropCord.left;
                        }
                        nextLeft =
                            dropCord.nextX +
                            position.linearWidth() / 2 +
                            this.planogramStore.appSettings.horizontal_spacing / 2;
                    }

                    const nextDropCord = {
                        top: nextTop,
                        left: nextLeft,
                    };
                    //that.findNextDropCord(position, dropCord);
                    const nextXY = this.findXYofPosition(position, {
                        left: nextDropCord.left,
                        top: nextDropCord.top,
                    });
                    dropCord.nextY = nextDropCord.top;
                    dropCord.nextX =
                        nextXY.X1 + position.linearWidth() + this.planogramStore.appSettings.horizontal_spacing / 2;
                    dropCord.left = nextDropCord.left;
                    dropCord.top = nextDropCord.top;
                    flag = false;
                }
            }
        } else if (this.planogramStore.appSettings.peg_direction == 0) {
            if (
                this.checkIfItemBeyondEdge(position, positionXYCords, dropCord) ||
                dropCord.left < offsetLeft ||
                dropCord.left > shelfWidth - offsetRight
            ) {
                const nextLeft = position.getPegInfo().OffsetX + offsetLeft;
                if (isUndefined(dropCord.nextY) || dropCord.nextY == 0) {
                    let positions = exculdedContainerItems;
                    let isIntersect = false;
                    //remove the children if they are present in the dragging elements
                    for (const pos of positions) {
                        if (this.collision.isPositionIntersectingWithXYCoords(pos, positionXYCords)) {
                            isIntersect = true;
                            intersectingPos = pos;
                            //If it crossing the Width skip to the next line with verticalspace distance
                            dropCord.nextY =
                                pos.Location.Y -
                                (pos.linearHeight() - pos.getPegInfo().OffsetY) -
                                this.planogramStore.appSettings.vertical_spacing;
                            break;
                        }
                    }
                    if (!isIntersect) {
                        dropCord.nextY = dropCord.top;
                    }
                }
                const nextDropCord = {
                    top: dropCord.nextY,
                    left: nextLeft,
                };
                const nextXY = this.findXYofPosition(position, {
                    left: nextDropCord.left,
                    top: nextDropCord.top,
                });
                //If it crossing the Width skip to the next line with verticalspace distance
                dropCord.nextY =
                    nextXY.Y1 -
                    (position.linearHeight() - position.getPegInfo().OffsetY) -
                    this.planogramStore.appSettings.vertical_spacing;
                dropCord.nextX = nextDropCord.left;
                dropCord.left = nextDropCord.left;
                dropCord.top = nextDropCord.top;
                flag = false;
            } else {
                let beyondEdgeFitCheckInput = {
                    position: position,
                    positionXYCords: positionXYCords,
                    dropCord: dropCord,
                    pegHoleInfo: pegHoleInfo,
                    pegboardXposToPog: pegboardXposToPog
                };
                let fitCheckObj = this.checkIfItemCanFitBeyondEdgeAndUpdateDropCord(beyondEdgeFitCheckInput);
                dropCord = fitCheckObj.dropCord
                flag = fitCheckObj.flag;
                positionXYCords = fitCheckObj.positionXYCords;
            }
        }
        if (flag) {
            let getDropCordInputData = {
                position: position,
                positionXYCords: positionXYCords,
                dropCord: dropCord,
                intersectingPos: intersectingPos,
                exculdedContainerItems: exculdedContainerItems,
                pegHoleInfo: pegHoleInfo,
                pegDirection: this.planogramStore.appSettings.peg_direction
            };
            let fitCheckObj = this.getDropCordConsideringOtherPegItems(getDropCordInputData);
            dropCord.left = fitCheckObj.left;
            dropCord.top = fitCheckObj.top;
            intersectingPos = fitCheckObj.intersectPosObj;
            flag = fitCheckObj.flag;
            if (flag) {
                dropCord.top = positionXYCords.Y2;
                dropCord.left = positionXYCords.X1;
            }
        }
        return {
            flag: flag,
            nextY: nextY,
            nextX: nextX,
            left: dropCord.left,
            top: dropCord.top,
            intersectPosObj: intersectingPos,
        };
    }

    private getDropCordConsideringOtherPegItems(input: GetDropCordInputData): UpdatedDropCordData {
        const offsetBottom = input.pegHoleInfo.PegOffsetBottom;
        const pegIncrementY = input.pegHoleInfo.PegIncrementY;
        const pegIncrementX = input.pegHoleInfo.PegIncrementX;
        let flag = true;
        const positions = input.exculdedContainerItems;
        //remove the children if they are present in the dragging elements
        for (const pos of positions) {
            let collision = input.isPaste ? this.collision.isPositionIntersectingWithXYCoordsForPaste(pos, input.positionXYCords, this)
                : this.collision.isPositionIntersectingWithXYCoords(pos, input.positionXYCords);
            if (collision) {
                let posWidth = pos.linearWidth();
                if (pos.getPegInfo().Type && pos.pegOffsetX) {
                    let posXY = this.findXYConsideringPegType(pos, { left: pos.Location.X, top: pos.Location.Y + pos.Dimension.Height });
                    posWidth = posXY.X2 - posXY.X1;
                }
                flag = false;
                input.intersectingPos = pos;
                let intersectingPosPegInfo = pos.getPegInfo();
                let positionPegInfo = input.position.getPegInfo();
                if (input.pegDirection == 0) {
                    let offset = input.isPaste ? input.position.pegOffsetX ? input.position.pegOffsetX : positionPegInfo.OffsetX : input.position.linearWidth() / 2;
                    input.dropCord.left =
                        pos.Location.X +
                        posWidth +
                        this.planogramStore.appSettings.horizontal_spacing +
                        offset;
                } else if (input.pegDirection == 1) {
                    input.dropCord.top =
                        pos.Location.Y -
                        (pos.linearHeight() - intersectingPosPegInfo.OffsetY) -
                        this.planogramStore.appSettings.vertical_spacing;
                }
                let intersectFlag = true;
                while (intersectFlag) {
                    input.positionXYCords = input.isPaste ? this.findXYConsideringPegType(input.position, input.dropCord) : this.findXYofPosition(input.position, input.dropCord);
                    if (input.pegDirection == 0) {
                        if (input.positionXYCords.X1 < pos.Location.X + posWidth) {
                            let intersectingPosPegOffset = input.isPaste && intersectingPosPegInfo.Type ? input.intersectingPos.pegOffsetX ?? 0 : 0;
                            input.dropCord.left += (pegIncrementX + intersectingPosPegOffset);
                        } else {
                            intersectFlag = false;
                        }
                        if (input.dropCord.left + positionPegInfo.OffsetX > this.Dimension.Width) {
                            intersectFlag = false;
                        }
                    } else if (input.pegDirection == 1) {
                        if (input.positionXYCords.Y2 > pos.Location.Y) {
                            input.dropCord.top -= pegIncrementY;
                        } else {
                            intersectFlag = false;
                        }
                        if (
                            input.dropCord.top - (input.position.linearHeight() - positionPegInfo.OffsetY) <
                            offsetBottom
                        ) {
                            intersectFlag = false;
                        }
                    }
                }
                break;
            }
        }
        let output: UpdatedDropCordData = {
            flag: flag,
            left: input.dropCord.left,
            top: input.dropCord.top,
            intersectPosObj: input.intersectingPos
        };
        return output;
    }

    private checkIfItemCanFitBeyondEdgeAndUpdateDropCord(input: BeyondEdgeFitCheckInput): BeyondEdgeFitCheckOutput {
        let flag = true;
        const intersectingCheck = this.checkIfItemCanFitBeyondEdge(input.positionXYCords, input.position);
        let nextLeft = input.position.getPegInfo().OffsetX + input.pegHoleInfo.PegOffsetLeft;
        if (!intersectingCheck.flag) {
            //Need to decide which side it is intersecting
            //If it is more than shelf width
            let intersectingObj = intersectingCheck.intersectingObj;
            let intersectObjXposToPog = intersectingObj.getXPosToPog();
            let intersectingObjWidth = intersectingObj.asPosition() ? intersectingObj.linearWidth() : intersectingObj.Dimension.Width;
            if (
                input.pegboardXposToPog + this.Dimension.Width - this.getPegHoleInfo().PegOffsetRight >
                intersectObjXposToPog + intersectingObjWidth
            ) {
                input.dropCord.nextY = input.dropCord.top;
                nextLeft =
                    intersectObjXposToPog -
                    input.pegboardXposToPog +
                    intersectingObj.Dimension.Width +
                    input.position.getPegInfo().OffsetX;
                //Check if this top is intersecting with same fixture
                //If it is add pegincrement X
                let intersectFlag = true;
                while (intersectFlag) {
                    if (input.isPaste) {
                        input.positionXYCords = this.findXYConsideringPegType(input.position, {
                            top: input.dropCord.nextY,
                            left: nextLeft,
                        });
                    } else {
                        input.positionXYCords = this.findXYofPosition(input.position, {
                            top: input.dropCord.nextY,
                            left: nextLeft,
                        });
                    }
                    if (
                        input.positionXYCords.X1 <
                        intersectObjXposToPog - input.pegboardXposToPog + intersectingObjWidth
                    ) {
                        nextLeft += input.pegHoleInfo.PegIncrementX;
                    } else {
                        intersectFlag = false;
                    }
                    if (nextLeft + input.position.getPegInfo().OffsetX > this.Dimension.Width) {
                        intersectFlag = false;
                    }
                }
            } else {
                if (isUndefined(input.dropCord.nextY)) {
                    input.dropCord.nextY = input.dropCord.top;
                }
            }
            const nextDropCord = {
                top: input.dropCord.nextY,
                left: nextLeft,
            };
            const nextXY = input.isPaste ? this.findXYConsideringPegType(input.position, { left: nextDropCord.left, top: nextDropCord.top })
                                    : this.findXYofPosition(input.position, { left: nextDropCord.left, top: nextDropCord.top });
            //If it crossing the Width skip to the next line with verticalspace distance
            input.dropCord.nextY = nextXY.Y1 - (input.position.linearHeight() - input.position.getPegInfo().OffsetY) - this.planogramStore.appSettings.vertical_spacing;
            input.dropCord.nextX = nextDropCord.left;
            input.dropCord.left = nextDropCord.left;
            input.dropCord.top = nextDropCord.top;
            flag = false;
        }
        let output: BeyondEdgeFitCheckOutput = {
            flag: flag,
            dropCord: input.dropCord,
            positionXYCords: input.positionXYCords
        }
        return output;
    }

    public checkIfItemBeyondEdge(position: Position, positionXYCords: PositionXYCords, dropCord: PegDropCord): boolean {
        //check whether items is crossing the edge or not
        //if it crosses the edge check if it can cross the edge or not
        //return true if it is beyond edge, return false if it is not beyond the edge
        const type = this.getType();
        const pegHoleInfo = this.getPegHoleInfo();
        const offsetLeft = pegHoleInfo.PegOffsetLeft;
        const offsetRight = pegHoleInfo.PegOffsetRight;
        const offsetTop = pegHoleInfo.PegOffsetTop;
        const offsetBottom = pegHoleInfo.PegOffsetBottom;
        const posPegInfo = position.getPegInfo();
        if (type === AppConstantSpace.CROSSBAROBJ) {
            if (this.checkIfItemExceedSection(this, positionXYCords)) {
                return true;
            }
            return false;
        } else {
            //First check the dropcordinates are in offset area
            //then throw false
            if (
                dropCord.left < offsetLeft ||
                positionXYCords.X2 - position.computeWidth() + posPegInfo.OffsetX >
                this.Dimension.Width - offsetRight ||
                dropCord.top < offsetBottom ||
                positionXYCords.Y2 - position.computeHeight() + posPegInfo.OffsetY > this.Dimension.Height - offsetTop
            ) {
                return true;
            } else if (this.planogramStore.appSettings.overhanging_items_beyond_edge) {
                //Items can hang over the edge of the fixture
                if (
                    positionXYCords.X1 > 0 &&
                    positionXYCords.X2 < this.Dimension.Width &&
                    positionXYCords.Y1 > 0 &&
                    positionXYCords.Y2 < this.Dimension.Height
                ) {
                    return false;
                } else if (
                    posPegInfo.Type &&
                    positionXYCords.X1 + posPegInfo.OffsetX >= offsetLeft &&
                    positionXYCords.X2 - (position.computeWidth() - posPegInfo.OffsetX) <=
                    this.Dimension.Width - offsetRight &&
                    positionXYCords.Y1 + posPegInfo.OffsetY >= offsetBottom &&
                    position.pegOffsetY != 0 &&
                    Number(positionXYCords.Y1.toFixed(10)) <= this.Dimension.Height - offsetTop &&
                    !this.checkIfItemExceedSection(this, positionXYCords)
                ) {
                    return false;
                } else if (
                    positionXYCords.X1 + posPegInfo.OffsetX >= offsetLeft &&
                    positionXYCords.X2 - (position.computeWidth() - posPegInfo.OffsetX) <=
                    this.Dimension.Width - offsetRight &&
                    positionXYCords.Y1 + posPegInfo.OffsetY >= offsetBottom &&
                    positionXYCords.Y1 + posPegInfo.OffsetY <= this.Dimension.Height - offsetTop &&
                    !this.checkIfItemExceedSection(this, positionXYCords)
                ) {
                    return false;
                } else return true;
            } else {
                return this.isItemBeyondEdge(positionXYCords) || this.checkIfItemExceedSection(this, positionXYCords);
            }
        }
    }

    public isItemBeyondEdge(positionXYCords: PositionXYCords): boolean {
        if (
            positionXYCords.X1 < 0 ||
            positionXYCords.X2 > this.Dimension.Width ||
            positionXYCords.Y1 < 0 ||
            positionXYCords.Y2 > this.Dimension.Height
        ) {
            return true;
        } else {
            return false;
        }
    }

    public checkIfItemExceedSection(pegboard: PegBoard, positionXYCords: PositionXYCords): boolean {
        const sectionID = pegboard.$sectionID;
        const rootObj = this.sharedService.getObject(sectionID, sectionID);

        const x1ToPog = pegboard.getXPosToPog() + positionXYCords.X1,
            x2ToPog = pegboard.getXPosToPog() + positionXYCords.X2,
            y1ToPog = pegboard.getYPosToPog() + positionXYCords.Y1,
            y2ToPog = pegboard.getYPosToPog() + positionXYCords.Y2;
        if (x1ToPog < 0 || x2ToPog > rootObj.Dimension.Width || y1ToPog < 0 || y2ToPog > rootObj.Dimension.Height) {
            return true;
        }
        return false;
    }

    public doesOverhangItemsExist(): boolean {
        let flag = false;
        for (const child of this.Children) {
            if (Utils.checkIfPosition(child)) {
                const X1 = child.Location.X;
                const X2 = X1 + child.linearWidth();
                const Y1 = child.Location.Y;
                const Y2 = Y1 + child.linearHeight();
                if (this.isItemBeyondEdge({ X1: X1, X2: X2, Y1: Y1, Y2: Y2 })) {
                    flag = true;
                    break;
                }
            }
        }
        return flag;
    }

    public checkIfItemFitsAtDropCord(
        ctx: Context,
        position: Position,
        dropCord: PegDropCord,
        exculdedContainerItems: Position[],
        checkFlag: boolean,
    ): { flag: boolean; intersectPosObj: Position } {
        let flag = true;
        let intersectingPos;
        const pegHoleInfo = this.getPegHoleInfo();
        const itemLinearHeight = this.linearHeightPosition(position, null, null);
        const positionXYCords = this.findXYofPosition(position, dropCord);

        //Check wethere if it is going beyond fixture width
        const posHt = checkFlag ? itemLinearHeight : position.computeHeight();
        flag = !this.checkIfItemBeyondEdge(position, positionXYCords, dropCord);

        if (flag) {
            const positions = exculdedContainerItems;
            //remove the children if they are present in the dragging elements
            for (const pos of positions) {
                if (this.collision.isPositionIntersectingWithXYCoords(pos, positionXYCords)) {
                    this.findPositionsToRight(ctx, position, positionXYCords, exculdedContainerItems);
                }
            }
        }
        //Check if item is intersecting with below shelfs or fixture items
        if (flag) {
            if (!this.checkIfItemCanFitBeyondEdge(positionXYCords, position).flag) {
                flag = false;
            }
        }
        return { flag: flag, intersectPosObj: intersectingPos };
    }

    public checkIfItemCanFitBeyondEdge(
        positionXYCords: PositionXYCords,
        position: Position,
    ): { flag: boolean; intersectingObj: Position } {
        let flag = true;
        let intersectingObj: any = {};
        const shelfHeight = this.Dimension.Height;
        const shelfWidth = this.Dimension.Width;
        const scaleFactor = this.planogramService.rootFlags[this.$sectionID].scaleFactor;
        if (this.planogramStore.appSettings.overhanging_items_beyond_edge && this.isItemBeyondEdge(positionXYCords)) {
            //get the estimated dropped item cordinates WRT screen i.e ClinetX
            const itemSelector = this.getQuadBounds();

            let x =
                itemSelector.left +
                this.planogramService.convertToPixel(positionXYCords.X1, this.$sectionID) * scaleFactor;
            let y =
                itemSelector.top +
                this.planogramService.convertToPixel(shelfHeight - positionXYCords.Y2, this.$sectionID) * scaleFactor;
            let draggedItemHt =
                this.planogramService.convertToPixel(positionXYCords.Y2 - positionXYCords.Y1, this.$sectionID) *
                scaleFactor;
            let draggedItemWt =
                this.planogramService.convertToPixel(positionXYCords.X2 - positionXYCords.X1, this.$sectionID) *
                scaleFactor;
            x = itemSelector.left + positionXYCords.X1;
            y = itemSelector.top + (shelfHeight - positionXYCords.Y2);
            draggedItemHt = positionXYCords.Y2 - positionXYCords.Y1;
            draggedItemWt = positionXYCords.X2 - positionXYCords.X1;
            const bounds = { x: x, y: y, width: draggedItemWt, height: draggedItemHt };
            const retrievedQuads = this.quadtreeUtilsService.retrieve(this.$sectionID, bounds);

            const xstart = this.getXPosToPog() + positionXYCords.X1;
            const xend = xstart + position.linearWidth();
            const ystart = this.getYPosToPog() + positionXYCords.Y1;
            const yend = ystart + position.linearHeight();
            let rect1: RectangleCoordinates2d = { xstart, xend, ystart, yend };

            for (const rQuad of retrievedQuads) {
                //Check if the position is intersecting with SS return false
                //Check if it is intersecting with position in below shelf if it can fit at that positoin or not and auto compute fronts is on or off
                //Check if it is intersecting with position in side shelf if it is return false
                const intersectingItem = this.sharedService.getObject(rQuad.id, this.$sectionID) as Position;

                const xstart = intersectingItem.getXPosToPog();
                const xend = xstart + intersectingItem.Dimension.Width;
                const ystart = intersectingItem.getYPosToPog();
                const yend = ystart + intersectingItem.getRectDimension().height;
                let rect2: RectangleCoordinates2d = { xstart, xend, ystart, yend };

                //If the intersecting item is fixture(SS/ BlockFixture) return false
                if (Utils.checkIfPosition(intersectingItem)) {
                    const parentFixture = this.sharedService.getObject(
                        intersectingItem.$idParent,
                        intersectingItem.$sectionID,
                    );
                    if (Utils.checkIfstandardShelf(parentFixture)) {
                        //Check if it is below shelf and if it is below shelf check if it can fit or not
                        //if it is side shelf return false
                        //if it is above shelf also return false
                        const bottomFixFitCheck = (parentFixture: ObjectListItem, intersectingItem: Position) => {
                            //Check if the fixture is below it
                            if (
                                !(
                                    this.Location.Y <= parentFixture.Location.Y ||
                                    parentFixture.Location.X > this.Location.X + shelfWidth ||
                                    parentFixture.Location.X + parentFixture.Dimension.Width < this.Location.X
                                )
                            ) {
                                //It is below fixture
                                //If it is intersecting with min height of that product return false and auto compute fronts should be true
                                if (parentFixture.Fixture.AutoComputeFronts) {
                                    rect2.yend = rect2.ystart + intersectingItem.Position.ProductPackage.Height;
                                }
                            }
                        };
                        bottomFixFitCheck(parentFixture, intersectingItem);
                        //if it is side fixture throw fit check, or if it is bottom fixture change the height of the rect2
                        if (this.collision.isIntersecting2D(rect1, rect2, 0)) {
                            intersectingObj = intersectingItem;
                            flag = false;
                            break;
                        }
                    } else if (Utils.checkIfPegType(parentFixture) && parentFixture != this) {
                        //if intersecting with position of other pegboard item return false
                        if (this.collision.isIntersecting2D(rect1, rect2, 0)) {
                            intersectingObj = intersectingItem;
                            flag = false;
                            break;
                        }
                    }
                } else {
                    if (this.collision.isIntersecting2D(rect1, rect2, 0) && !Utils.checkIfPegType(intersectingItem)) {
                        intersectingObj = intersectingItem;
                        flag = false;
                        break;
                    }
                }
            }
        }
        return { flag: flag, intersectingObj: intersectingObj };
    }

    public findNextDropCord(position: Position, dropCord: PegDropCord, pegDirection: Number): PegDropCord {
        const type = this.getType();
        let dropCordLeft = dropCord.left;
        let dropCordTop = dropCord.top;
        if (pegDirection == 1 && type != AppConstantSpace.CROSSBAROBJ) {
            dropCordTop = position.Location.Y - this.planogramStore.appSettings.vertical_spacing / 2;
        } else if (pegDirection == 0 || type == AppConstantSpace.CROSSBAROBJ) {
            dropCordLeft =
                position.Location.X + position.linearWidth() + this.planogramStore.appSettings.horizontal_spacing / 2;
        }
        dropCord.left = dropCordLeft;
        dropCord.top = dropCordTop;
        return dropCord;
    }

    public findXYConsideringPegType(position: Position, dropCord: PegDropCord) {
        let positionXYCords = this.findXYofPosition(position, dropCord);

        let pegInfo = position.getPegInfo();
        let isPegTypeAvailable = pegInfo?.Type;
        positionXYCords.X1 = isPegTypeAvailable && position.pegOffsetX ? positionXYCords.X1 + position.Position.ProductPegHole1X - position.pegOffsetX : positionXYCords.X1;
        positionXYCords.X2 = isPegTypeAvailable && position.pegOffsetX ? positionXYCords.X1 + position.Position.BackSpacing * (position.Position.BackHooks - 1): positionXYCords.X2;
        positionXYCords.Y1 = isPegTypeAvailable && position.pegOffsetY != 0 ? positionXYCords.Y1 + position.Position.ProductPegHoleY - position.pegOffsetY : positionXYCords.Y1;
        positionXYCords.Y2 = isPegTypeAvailable && position.pegOffsetY != 0 ? positionXYCords.Y1 : positionXYCords.Y2;

        return positionXYCords;
    }

    public findXYofPosition(position: Position, dropCoord: PegDropCord): PositionXYCords {
        let positionHeight;
        let positionWidth;
        //@Narendra pegholeinfo
        //LinearwidthPosition method has been used to get the expected item width if it is placed on this fixture
        let itemLinearHeight = this.linearHeightPosition(position, null, null);
        let itemlinearWidth = this.linearWidthPosition(position, null, null);
        //If the dragged item is from pegboard we should maintain the linear height
        if (!positionHeight) {
            if (Utils.checkIfPegboard(this.sharedService.getObject(position.$idParent, position.$sectionID))) {
                positionHeight = Number(itemLinearHeight);
            } else positionHeight = Number(position.computeHeight());
        }
        if (!positionWidth) {
            if (position.$idParent == null || isUndefined(position.$idParent)) {
                positionWidth = Number(position.computeWidth());
            } else {
                positionWidth = Number(itemlinearWidth);
            }
        }
        const X = dropCoord.left - position.getPegInfo().OffsetX;
        const Y = dropCoord.top - positionHeight;
        const posXY = this.getPosXY(position, X, Y);
        return { X1: posXY.X, X2: posXY.X + positionWidth, Y1: posXY.Y, Y2: posXY.Y + positionHeight };
    }

    public checkIfValidChange(
        position: Position,
        widthAfterChange: number,
        heightAfterChange: number,
        depthAfterChange: number,
        nwdropCord?: NwdropCord,
    ) {
        //Need to check if it is crossing the width of the shelf or height of shelf
        //Check if it is intersecting with other items in the pegboard
        let validFlag = true;
        let fixtureDepth =
            this.Fixture.MaxMerchDepth != 0 && this.Fixture.MaxMerchDepth != null
                ? this.Fixture.MaxMerchDepth
                : this.Dimension.Depth;
        fixtureDepth = Math.min(position.Position._X05_PEGLENGTH.ValData, fixtureDepth);
        if (isUndefined(widthAfterChange)) {
            widthAfterChange = position.linearWidth();
        }
        if (isUndefined(heightAfterChange)) {
            heightAfterChange = position.linearHeight();
        }
        if (isUndefined(depthAfterChange)) {
            depthAfterChange = position.linearDepth();
        }
        let positionXYCords: PositionXYCords = <PositionXYCords>{};
        let dropCord: PegDropCord;
        if (nwdropCord) {
            positionXYCords = nwdropCord.positionXYCords;
            dropCord = nwdropCord.dropCord;
        } else {
            const pegInfo = position.getPegInfo();
            positionXYCords.X1 = position.Location.X;
            positionXYCords.X2 = positionXYCords.X1 + widthAfterChange;
            positionXYCords.Y1 = position.Location.Y;
            positionXYCords.Y2 = positionXYCords.Y1 + heightAfterChange;
            dropCord = {
                left: positionXYCords.X1 + pegInfo.OffsetX,
                top: positionXYCords.Y2 - position.computeHeight() + pegInfo.OffsetY,
            };
        }
        if (this.checkIfItemBeyondEdge(position, positionXYCords, dropCord)) {
            return false;
        }
        if (fixtureDepth + (position.Position.PegOverhang || 0 ) < depthAfterChange) {
            return false;
        }
        return validFlag;
    }

    public findPositionsToRight(
        ctx: Context,
        position: Position,
        positionXYCords: PositionXYCords,
        exculdedContainerItems: Position[],
    ) {
        let intersections = [];
        let furthestLeftX = this.ChildDimension.Width;
        this.Children.forEach((testPosition) => {
            if (
                position.IDPOGObject != testPosition.IDPOGObject &&
                exculdedContainerItems.indexOf(testPosition) != -1
            ) {
                if (this.collision.isPositionIntersectingWithXYCoords(testPosition, positionXYCords)) {
                    furthestLeftX = Math.min(furthestLeftX, testPosition.Location.X);
                    intersections.push(testPosition);
                }
            }
        });
        const PHI = this.getPegHoleInfo();
        const moveIncrement = Math.ceil((positionXYCords.X2 - furthestLeftX) / PHI.PegIncrementX) * PHI.PegIncrementX;

        let rect1: PositionXYCords = {
            X1: positionXYCords.X1,
            X2: this.ChildDimension.Width,
            Y1: positionXYCords.Y1,
            Y2: positionXYCords.Y2,
        };

        let positionsToRight = [];
        const findPTR = (posToRight, rect: PositionXYCords, pos) => {
            let PTR = [];
            this.Children.forEach((testPosition) => {
                if (
                    position.IDPOGObject != testPosition.IDPOGObject &&
                    exculdedContainerItems.indexOf(testPosition) != -1
                ) {
                    if (this.collision.isPositionIntersectingWithXYCoords(testPosition, rect)) {
                        if (posToRight.indexOf(testPosition) == -1) {
                            PTR.push(testPosition);
                            const dropCoord = {
                                left: testPosition.Location.X + testPosition.getPegInfo().OffsetX + moveIncrement,
                                top:
                                    testPosition.Location.Y +
                                    testPosition.linearHeight() -
                                    (testPosition.computeHeight() - testPosition.getPegInfo().OffsetY),
                            };
                            this.movePosition(ctx, this.Children.indexOf(testPosition), this, 0, dropCoord);
                        }
                    }
                }
            });
            posToRight = posToRight.concat(PTR);
            PTR.forEach((testPosition) => {
                let rct: any = {};
                rct.X1 = testPosition.Location.X;
                rct.X2 = rct.X1 + this.ChildDimension.Width;
                rct.Y1 = testPosition.Location.Y;
                rct.Y2 = rct.Y1 + testPosition.linearHeight();
                posToRight = findPTR(posToRight, rct, testPosition);
            });
            return posToRight;
        };
        positionsToRight = findPTR(positionsToRight, rect1, position);
        return positionsToRight;
    }

    public alignPegs(positionList: Position[], action: string): void {
        const data = this.prepareFunctionData(positionList);
        this.planogramService.doPegboardAlign(data, action).subscribe(
            (res) => {
                this.applyFunctionData(res);
                let section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
                const ctx = new Context(section);
                section.computeMerchHeight(ctx, { reassignFlag: true, recFlag: true });
                this.planogramService.updateNestedStyleDirty = true;
            },
            (err) => {
                this.notifyService.error('Peg Align Error');
                console.error(this.translate.instant('Peg Align Error'));
            },
        );
    }

    public prepareFunctionData(positionList: Position[]): PegInputJson {
        if (positionList.length < 0) {
            return;
        }
        let inputJson: PegInputJson = <PegInputJson>{};
        const pegHoleInfo = this.getPegHoleInfo();
        inputJson.PegXIncrement = pegHoleInfo.PegIncrementX;
        inputJson.PegYIncrement = pegHoleInfo.PegIncrementY;
        inputJson.ShelfLength = this.Dimension.Width;
        inputJson.ShelfHeight = this.Dimension.Height;
        inputJson.PegXStart = pegHoleInfo.PegOffsetLeft;
        inputJson.PegYStart = pegHoleInfo.PegOffsetBottom;
        inputJson.PegXEnd = inputJson.ShelfLength - pegHoleInfo.PegOffsetRight;
        inputJson.PegYEnd = inputJson.ShelfHeight - pegHoleInfo.PegOffsetTop;
        inputJson.Positions = [];
        positionList.forEach((pos) => {
            if (pos.ObjectType == 'Position') {
                const pegHole = pos.getPegInfo();
                if (pegHole.Type == null) pegHole.Type = 0;
                inputJson.Positions.push({
                    ID: pos.$id,
                    PosNo: pos.Position.PositionNo,
                    X: pos.Location.X,
                    Y: pos.Location.Y,
                    GapX: pos.Position.GapX,
                    GapY: pos.Position.GapY,
                    FacingsX: pos.Position.FacingsX,
                    FacingsY: pos.Position.FacingsY,
                    ProductWidth: pos.computeWidth(),
                    ProductHeight: pos.computeHeight(),
                    SKUWidth: pos.linearWidth(),
                    SKUHeight: pos.linearHeight(),
                    PegHoleX: pegHole.OffsetX,
                    PegHoleY: pegHole.OffsetY,
                    PegType: pegHole.Type,
                });
            }
        });
        return inputJson;
    }

    public applyFunctionData(orderedPos: PegAlign): void {
        if (orderedPos.OutPositions.length < 0) {
            return;
        }
        const historyId = this.historyService.startRecording();
        const oldValues = { OutPositions: [] };
        orderedPos.OutPositions.forEach((inPos) => {
            const pos = this.sharedService.getObject(inPos.ID.toString(), this.$sectionID);
            oldValues.OutPositions.push({ ID: inPos.ID, XPosition: pos.Location.X, YPosition: pos.Location.Y });
            pos.Location.X = inPos.XPosition;
            pos.Location.Y = inPos.YPosition;
        });
        const original = ((obj, orderedPos) => {
            return () => {
                obj.applyFunctionData(orderedPos);
            };
        })(this, orderedPos);
        const revert = ((obj, orderedPos) => {
            return () => {
                obj.applyFunctionData(orderedPos);
            };
        })(this, cloneDeep(oldValues)); //TODO @Amit eliminate the clonedeep , using other alternatives
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'pegAlign',
        }, this.$sectionID);
        this.planogramService.insertPogIDs(this.Children, true);
        this.historyService.stopRecording(undefined, undefined, historyId);
        const ctx = new Context(this.section);
        this.computePositionsAfterChange(ctx);
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

    public asPegBoard(): PegBoard | undefined{
        return Utils.checkIfPegboard(this) ? this : undefined;
    }

    public asPegType(): PegBoard | Slotwall | Crossbar | undefined {
        return (this.Fixture.FixtureType === AppConstantSpace.PEGBOARDOBJ ||
            this.Fixture.FixtureType === AppConstantSpace.SLOTWALLOBJ ||
            this.Fixture.FixtureType === AppConstantSpace.CROSSBAROBJ) ? this : undefined;
    }

    public allPositionsFlip(): void {
        const fixture = this;
        const positions = fixture.Children;
        const selectRange = {
            startIndex: -1,
            endIndex: -1
        };

        /* Commented dt 14th Aug, 2014 - Abhishek
         Do we need to find the selected position again here? this does not allow me to
         add my undo redo code at atomic level mixin method for position flip */
        const selectedArray = [];
        if (positions != undefined) {
            if (positions.length > 0) {
                positions.sort(function (a, b) {
                    if ((a.Location.Y === b.Location.Y) || (Math.abs(a.Location.Y - b.Location.Y) < a.Dimension.Height)) {
                        return a.Location.X - b.Location.X;   // Ascending order of Y.
                    } else {
                        return a.Location.Y - b.Location.Y;  // Descending order of X - however right end;
                    }
                });
                for (let i = 0; i < positions.length; i++) {
                    if ((i == positions.length - 1) && (positions[i].selected == true)) {
                        selectRange.endIndex = i;
                        const temp = cloneDeep(selectRange);
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
                            const temp = cloneDeep(selectRange);
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
                const itemsToFlip = [];
                var gapToPrev = 0;
                for (let j = start, k = 0; j <= end; j++, k++) {
                    const curPos = positions[j];
                    itemsToFlip.push({ "ref": positions[end - k], "gapToPrev": gapToPrev, "oldPos": end - k, "newPos": j, "positionY": curPos.Location.Y });
                    gapToPrev = (j != end) ? positions[j + 1].Location.X - (curPos.Location.X + curPos.linearWidth()) : 0;
                }

                var positionX = positions[start].Location.X;  // First selcted items Original position.
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
    }//All positions Flip ends here

    public getColor():string{
        const rootObj: Section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
        if (rootObj.fitCheck && this.planogramStore.appSettings.isWeightCapacityValidationEnable){
            if(this.Fixture.MaxFixtureWeight > 0 && this.Fixture.FixtureWeightCapacity > this.Fixture.MaxFixtureWeight) {
                return 'red';
            }
        }
        return this.Fixture.Color;
    }
}
