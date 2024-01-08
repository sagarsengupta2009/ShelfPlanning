import { Fixture } from './fixture';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import { IDragDropSettings } from '../drag-drop.module';
import {
    PlanogramStoreService,
    HistoryService,
    SharedService,
    PlanogramService,
    NotifyService,
    CollisionService,
} from '../services';
import { StandardShelf } from './standard-shelf';
import { GrillResponse, StyleGrill } from '../models';

// TODO @og doesn't have children
export class Grill extends Fixture {
    public ObjectDerivedType: 'Grill';
    dragDropSettings: IDragDropSettings = {
        drag: false,
        drop: true,
    };
    public Type: string;
    public uiProperties: string[] = ['Type', 'dragDropSettings'];
    constructor(
        data: GrillResponse,
        public notifyService: NotifyService,
        public translateService: TranslateService,
        public sharedService: SharedService,
        public planogramservice: PlanogramService,
        public historyService: HistoryService,
        public planogramStore: PlanogramStoreService,
        collision: CollisionService,
    ) {
        super(
            data,
            notifyService,
            translateService,
            sharedService,
            planogramservice,
            historyService,
            planogramStore,
            collision,
        );
    }

    public getFixtureDirective(): null {
        return null;
    }

    public getZIndex(): number {
        return 1;
    }

    public get parent(): StandardShelf {
        return super.parent as StandardShelf;
    }

    public getGrillEdgeInfo(edge: string) {
        return this.parent.getGrillEdgeInfo(edge);
    }
}
