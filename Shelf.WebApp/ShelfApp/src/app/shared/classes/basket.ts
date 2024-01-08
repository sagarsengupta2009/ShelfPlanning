import { TranslateService } from '@ngx-translate/core';
import {
    PlanogramCommonService,
    HistoryService,
    PlanogramService,
    SharedService,
    PlanogramStoreService,
    NotifyService,
    CollisionService,
    CrunchModeService,
    MoveFixtureService,
    ParentApplicationService, Render2dService, ShelfbumpService
} from '../services';
import { BasketResponse } from '../models/planogram-transaction-api';
import { Coffincase } from './coffincase';
import { AllocateUtilitiesService } from '../services/layouts/allocate/utilities/allocate-utilities.service';
import { AppConstantSpace } from '../constants';
import { ShrinkService } from '../services/layouts/shrink/shrink.service';

export class Basket extends Coffincase {

    ObjectDerivedType:'Basket';

    constructor(
        data:BasketResponse,
        notifyService: NotifyService,
        translateService: TranslateService,
        sharedService: SharedService,
        planogramService: PlanogramService,
        historyService: HistoryService,
       public planogramCommonService: PlanogramCommonService,
        planogramStore: PlanogramStoreService,
        collision: CollisionService,
        crunchMode: CrunchModeService,
        moveFixtureService: MoveFixtureService,
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
            planogramCommonService,
            planogramStore,
            collision,
            crunchMode,
            moveFixtureService,
            parentApp, render2d,
            allocateUtils,
            shelfBumpService,
            shrinkService
        );
        Object.assign(this, data);
    }

    getType() {
        return AppConstantSpace.BASKETOBJ as string;
    }
    getZIndex(): any {
        return 7;
    }

    getOffsetValueX() {
        return 0;
    }

    getOffsetValueY() {
        return 0;
    }
}
