import { Fixture } from './fixture';
import { TranslateService } from '@ngx-translate/core';
import {
    PlanogramStoreService,
    HistoryService,
    SharedService,
    PlanogramService,
    NotifyService,
    CollisionService,
} from '../services';
import { IDragDropSettings } from '../drag-drop.module';
import { StandardShelf } from './standard-shelf';
import { DividerResponse } from '../models';


// TODO @og doesn't have children , can be a child of standard shelf or coffincase/basket or ?
export class Divider extends Fixture {

    /** used only by coffincase, set as true when .addPosition is called, can be removed if coffincase children are all Positions */
    public justmod?:boolean;

    ObjectDerivedType: 'Divider';
    public uiProperties: string[] = ['ObjectDerivedType', 'justmod'];
    constructor(
        data: DividerResponse,
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
        this.dragDropSettings.drop = true;
    }

    public getZIndex(): number {
        return 1;
    }

    public get parent(): StandardShelf {
        return super.parent as StandardShelf;
    }
}
