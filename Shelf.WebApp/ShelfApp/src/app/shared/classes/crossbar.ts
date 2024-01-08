import { TranslateService } from '@ngx-translate/core';
import { PegBoard } from './peg-board';
import * as _ from 'lodash';
import {
    PlanogramStoreService,
    QuadtreeUtilsService,
    NotifyService,
    PlanogramCommonService,
    DragDropUtilsService,
    HistoryService,
    SharedService,
    PlanogramService,
    CollisionService,
    MoveFixtureService,
    ParentApplicationService, Render2dService
} from '../services';
import { AppConstantSpace, Utils } from '../constants';
import { CrossbarResponse } from '../models/planogram-transaction-api/crossbar-object-response';
import { Position } from './position';
import { CrossbarInputItems, CrossbarInputJson, CrossbarSpreadPack, PegInputJson, XYCords } from '../models/planogram';
import { Context } from './context';
import { AllocateUtilitiesService } from '../services/layouts/allocate/utilities/allocate-utilities.service';

export class Crossbar extends PegBoard {

    ObjectDerivedType: 'Crossbar';
    readonly ObjectType: 'Fixture';

    constructor(
        data :  CrossbarResponse,
        public notifyService: NotifyService,
        public translateService: TranslateService,
        public sharedService: SharedService,
        public planogramService: PlanogramService,
        public historyService: HistoryService,
        public dragDropUtilsService: DragDropUtilsService,
        public planogramCommonService: PlanogramCommonService,
        public quadtreeUtilsService: QuadtreeUtilsService,
        public planogramStore: PlanogramStoreService,
        collision: CollisionService,
        public moveFixtureService: MoveFixtureService,
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
            dragDropUtilsService,
            planogramCommonService,
            quadtreeUtilsService,
            planogramStore,
            collision,
            moveFixtureService,
            parentApp,
            render2d,
            allocateUtils
        );
        this.dragDropSettings = { drag: data.Fixture.IsMovable, drop: true };

    }

    public getType() {
        return AppConstantSpace.CROSSBAROBJ as string;
    }

    public getPegHoleInfo() {
        var that: any = this;
        var PegOffsetBottom = that.Dimension.Height / 2;
        var PegOffsetTop = (that.Dimension.Height - 0.128) / 2;
        var PegIncrementX = that.Fixture._X04_XINC.ValData == null ? 0.01 : that.Fixture._X04_XINC.ValData;
        return {
            PegIncrementX: this.Fixture._X04_XINC.ValData ?? 0.01,
            PegIncrementY: 0.01,
            PegOffsetLeft: this.Fixture._X04_XPEGSTART.ValData,
            PegOffsetRight: this.Fixture._X04_XPEGEND.ValData,
            PegOffsetTop: (this.Dimension.Height - 0.128) / 2,
            PegOffsetBottom: this.Dimension.Height / 2,
        };
    }

    public computeSpaceDetails(): void {
        const pegHole = this.getPegHoleInfo();
        this.Fixture.UsedLinear = 0;
        this.Fixture.UsedSquare = null;
        this.crossBarPositionSort()
            .map(item => this.Children.find(it => it.$id == item.$id))
            .forEach((child, i) => {
                const Yintersecting = Math.max(
                    0,
                    Math.min(
                        child.Location.Y + child.linearHeight(),
                        this.Dimension.Height - pegHole.PegOffsetTop,
                    ) - Math.max(0, pegHole.PegOffsetBottom, child.Location.Y),
                );
                if (Yintersecting != 0) {
                    this.Fixture.UsedLinear +=
                        Math.max(0, Math.min(
                            child.Location.X + child.linearWidth(),
                            this.Dimension.Width - pegHole.PegOffsetRight,
                        )) - Math.max(0, pegHole.PegOffsetLeft, child.Location.X);
                }

                if (this.section.IDPOGStatus < 4 || this.sharedService.isLivePogEditable) {
                    child.Position.PositionNo = i + 1; //Update position numbers on delete
                }
            });
        const totalMerchWidth = this.Dimension.Width - pegHole.PegOffsetRight - pegHole.PegOffsetLeft;
        this.unUsedLinear = totalMerchWidth - this.Fixture.UsedLinear;
        this.unUsedSquare = null;
        this.Fixture.AvailableLinear = this.unUsedLinear;
        this.Fixture.UsedSquare = null;
        this.Fixture.PercentageUsedSquare = null;
        this.Fixture.AvailableSquare = null;
        this.Fixture.UsedCubic = null;
        this.Fixture.PercentageUsedCubic = null;
        this.Fixture.AvailableCubic = null;
    }

    checkIfItemFitsAtDropCordAuto(position: Position, dropCord: { left: number; top: number; }, exculdedContainerItems: Position[]) {
        let flag = true,
            nextY = 0,
            nextX = 0;
        let intersectPosObj: Position;
        const pegHole = this.getPegHoleInfo();

        let positionXYCords = this.findXYofPosition(position, dropCord);

        if (dropCord.left < pegHole.PegOffsetLeft || dropCord.left > this.Dimension.Width - pegHole.PegOffsetRight) {
            dropCord.left = pegHole.PegOffsetLeft;
            dropCord.top = pegHole.PegOffsetBottom;
            positionXYCords = this.findXYofPosition(position, dropCord);
            flag = true;
        }

        if (this.checkIfItemBeyondEdge(position, positionXYCords)) {
            dropCord.left = dropCord.left + pegHole.PegIncrementX + position.linearWidth();
            flag = false;
        }

        if (flag) {
            //remove the children if they are present in the dragging elements
            for (const pos of exculdedContainerItems) {
                if (this.collision.isPositionIntersectingWithXYCoords(pos, positionXYCords)) {
                    flag = false;
                    intersectPosObj = pos;
                    dropCord.left =
                        intersectPosObj.Location.X +
                        intersectPosObj.linearWidth() +
                        this.planogramStore.appSettings.horizontal_spacing / 2 +
                        position.getPegInfo().OffsetX;

                    while (true) {
                        const positionXYCords = this.findXYofPosition(position, dropCord);
                        if (positionXYCords.X1 < intersectPosObj.Location.X + intersectPosObj.linearWidth()) {
                            dropCord.left += pegHole.PegIncrementX;
                        } else {
                            break;
                        }
                        if (dropCord.left + position.getPegInfo().OffsetX > this.Dimension.Width) {
                            break;
                        }
                    }
                    break;
                }
            }
        }
        return {
            flag,
            nextY,
            nextX,
            left: dropCord.left,
            top: dropCord.top,
            intersectPosObj,
        };
    }

    public checkIfItemBeyondEdge(position: Position, positionXYCords: XYCords): boolean {
        //check whether items is crossing the edge or not
        //if it crosses the edge check if it can cross the edge or not
        //return true if it is beyond edge, return false if it is not beyond the edge
        const pegHole = this.getPegHoleInfo();
        const posPegInfo = position.getPegInfo();
        if (this.checkIfItemExceedSection(this, positionXYCords)) {
            return true;
        }
        if (pegHole.PegOffsetLeft > positionXYCords.X1 + posPegInfo.OffsetX) {
            return true;
        }
        if (this.Dimension.Width - pegHole.PegOffsetRight < positionXYCords.X2 - (position.computeWidth() - posPegInfo.OffsetX)) {
            return true;
        }
        return false;
    }

    public checkIfItemExceedSection(pegboard: PegBoard, positionXYCords: XYCords): boolean {
        const rootObj = pegboard.section;
        const xposToPog = pegboard.getXPosToPog();
        const yposToPog = pegboard.getYPosToPog();
        const x1ToPog = xposToPog + positionXYCords.X1,
            x2ToPog = xposToPog + positionXYCords.X2,
            y1ToPog = yposToPog + positionXYCords.Y1,
            y2ToPog = yposToPog + positionXYCords.Y2;
        return x1ToPog < 0 || x2ToPog > rootObj.Dimension.Width || y1ToPog < 0 || y2ToPog > rootObj.Dimension.Height;
    }

    public getZIndex(): number {
        //Already present in pegboard so its bcz of super() need to find out solution
        if (this.Location.Z > 0) return 9;
        for (const child of this.Children) {
            if (child.Location.Y < 0) return 9;
        }
        return 5;
    }

    public doesOverhangItemsExist(): boolean {
        return false;
    }

    public prepareSpreadNPackData(): CrossbarInputJson {
        const pegHole = this.getPegHoleInfo();
        const crossbarInputPositions: CrossbarInputItems[] = [];
        this.Children
        .filter(it => it.asPosition())
        .sort((a, b) => a.getXPosToPog() - b.getXPosToPog())
        .map((pos) => {
            const pegHole = pos.getPegInfo();
            pegHole.Type = pegHole.Type || 0;
            crossbarInputPositions.push({
                ID: pos.IDPOGObject,
                PosNo: pos.Position.PositionNo,
                FacingsX: pos.Position.FacingsX,
                ProductWidth: pos.computeWidth(),
                PegHoleX: pegHole.OffsetX,
                PegType: pegHole.Type,
            });
        })
        return {
            PegXIncrement: pegHole.PegIncrementX,
            ShelfLength: this.Dimension.Width,
            PegXStart: pegHole.PegOffsetLeft,
            PegXEnd: this.Dimension.Width - pegHole.PegOffsetRight,
            Positions: crossbarInputPositions,
        };
    }

    public applySpreadNPackData(orderedPos: CrossbarSpreadPack): void {
        if (orderedPos.OutPositions.length < 0) {
            return;
        }
        const historyId = this.historyService.startRecording();
        const oldValues: any = {
            OutPositions: this.Children
            .sort((a, b) => a.getXPosToPog() - b.getXPosToPog())
            .map((child, i) => {
                const orderPos = orderedPos.OutPositions[i];
                const tempObj = { XPosition: child.Location.X, XFacingGap: child.Position.GapX };
                child.Location.X = orderPos.XPosition;
                child.Position.GapX = Utils.isNullOrEmpty(orderedPos.XFacingGap) ? orderPos.XFacingGap : orderedPos.XFacingGap;
                return tempObj;
            }),
        }
        const funoriginal = ((orderedPos) => {
            return () => {
                this.applySpreadNPackData(orderedPos);
            };
        })(orderedPos);
        const funRevert = ((orderedPos) => {
            return () => {
                this.applySpreadNPackData(orderedPos);
            };
        })(JSON.parse(JSON.stringify(oldValues)));
        this.historyService.captureActionExec({
            funoriginal,
            funRevert,
            funName: 'crossbarSpread',
        });
        this.planogramService.insertPogIDs(this.Children, true);
        this.historyService.stopRecording(undefined, undefined, historyId);

        const ctx = new Context(this.section);
        this.computePositionsAfterChange(ctx);
    }

    public getNotchThicknes(): number {
        return this.planogramStore.appSettings.notchThicknessCalculation.includeCrossbarHeight ? this.Dimension.Height : 0;
    }
}
