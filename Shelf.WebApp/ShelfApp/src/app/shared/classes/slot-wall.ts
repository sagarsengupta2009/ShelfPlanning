import { TranslateService } from '@ngx-translate/core';

import {
    PlanogramCommonService,
    PlanogramService,
    SharedService,
    HistoryService,
    QuadtreeUtilsService,
    PlanogramStoreService,
    NotifyService,
    DragDropUtilsService,
    CollisionService,
    MoveFixtureService,
    ParentApplicationService, Render2dService
} from '../services';
import { NextLocXDirection, SlotwallResponse } from '../models';
import { PegBoard } from './peg-board';
import { Position } from './position';
import { AllocateUtilitiesService } from '../services/layouts/allocate/utilities/allocate-utilities.service';
import { AppConstantSpace } from '../constants';
;

export class SlotWall extends PegBoard {


    ObjectDerivedType: 'Slotwall';
    readonly ObjectType: 'Slotwall';


    constructor(
        data: SlotwallResponse,
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
        return AppConstantSpace.SLOTWALLOBJ as string;
    }

    public getPegHoleInfo() {
        const info = super.getPegHoleInfo();
        info.PegIncrementX = 0.01;
        return info;
    }

    public getZIndex(): number {
        // @og changed from '9' : '3' to 9 : 3
        return this.Children.some(it => it.Location.Y < 0) ? 9 : 3;
    }

    public getNextLocX(position: Position, dir?: NextLocXDirection): number {
        const pegHole = position.getPegInfo();
        let lockX = position.Location.X + pegHole.OffsetX;
        if (!dir.isUpDown) {
            lockX += dir.left ? -0.5 : 0.5;
        }
        return lockX;
    }
}
