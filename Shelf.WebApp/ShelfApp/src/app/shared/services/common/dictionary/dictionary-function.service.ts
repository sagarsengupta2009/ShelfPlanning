import { Injectable } from '@angular/core';
import { Position, Section } from 'src/app/shared/classes';
import { Utils } from 'src/app/shared/constants';
import { Dictionary } from 'src/app/shared/models';
import { SharedService } from '..';
import { PlanogramStoreService } from '../planogram-store.service';
import { AllFixtureList, ObjectListItem } from '../shared/shared.service';
declare const window: any;

/**
 * This service is to be used ONLY for proxy functions for the scripts that are dynamic as part of Dictionary expressions.
 * mainly used in dictionary fields and executed by the getter function.
 * These scripts are straight outta DB.
 *
 */
@Injectable({
    providedIn: 'root',
})
export class DictionaryFunctionService {
    /**
     * Marking this as private to prevent accessing this outside the service in scope,
     *  but it will be accessed by dynamic expressions.
     */
    private appSettingsSvc; //: StoreAppSettings; // TODO: @malu apply type
    private dictionaries: Dictionary[];

    constructor(
        private readonly sharedService: SharedService,
        private readonly planogramStoreService: PlanogramStoreService,
    ) {
        /**
         * Adding dictionary function service to the window for the functions in dictionary expression (dynamic scripts).
         */
        window.dictionaryFunctionService = this;
    }

    /******************************* Proxy functions********************************** */

    private get measurementUnit(): string {
        return this.sharedService.measurementUnit;
    }

    private get roundoff(): string {
        return this.appSettingsSvc.roundoff;
    }

    private expressionEvaluationCounter: number = 0;

    private get daysInMovement(): number {
        return this.appSettingsSvc.daysInMovement;
    }

    public setupInitData(records: Dictionary[]): void {
        this.dictionaries = records;
        this.appSettingsSvc = this.planogramStoreService.appSettings;
    }

    private positionLockField(): number {
        return this.appSettingsSvc.positionLockField;
    }

    private getAllPositionFromObjectList(sectionID: string): Position[] {
        return this.sharedService.getAllPositionFromObjectList(sectionID);
    }

    /* not sure what all the i/p can be as part of itemObject */
    private getObjectField($id: string, fieldHierarchyStr: string, sectionID: string, itemObject?: ObjectListItem) {
        return this.sharedService.getObjectField($id, fieldHierarchyStr, sectionID, itemObject);
    }

    private checkIfPosition(child: ObjectListItem): boolean {
        return Utils.checkIfPosition(child);
    }

    // can pass any value to check if null or empty
    private isNullOrEmpty(item: ObjectListItem): boolean {
        return Utils.isNullOrEmpty(item);
    }

    private getObject(id: string, sectionID: string): ObjectListItem {
        return this.sharedService.getObject(id, sectionID);
    }

    private getParentObject(item: ObjectListItem): ObjectListItem {
        return this.sharedService.getParentObject(item);
    }

    private getRootObject(item: ObjectListItem): Section {
      return <Section>this.sharedService.getObject(item.$sectionID, item.$sectionID);
    }

    private getActiveSectionId(): string {
        return this.sharedService.getActiveSectionId();
    }

    private checkIfShoppingCart(parent: ObjectListItem): boolean {
        return Utils.checkIfShoppingCart(parent);
    }

    private sortByXPos(items: unknown[]): unknown[] {
        return Utils.sortByXPos(items);
    }

    private sortByYDesXPos(fixtures: AllFixtureList[]): AllFixtureList[] {
        return Utils.sortByYDesXPos(fixtures);
    }

    private sortByXEndYPos(fixtures: AllFixtureList[]): AllFixtureList[] {
        return Utils.sortByXEndYPos(fixtures);
    }

    private sortByYDecXEndPos(fixtures: AllFixtureList[]): AllFixtureList[] {
        return Utils.sortByYDecXEndPos(fixtures);
    }

    private sortByXYPos(fixtures: AllFixtureList[]): AllFixtureList[] {
        return Utils.sortByXYPos(fixtures);
    }

    private isSaveInProgress(sectionID: string): boolean {
        return ((this.sharedService.isSaveAllInProgress && this.sharedService.allPogsToSaveInSaveAll.some(id => id === sectionID)) ||
        (this.sharedService.autoSaveTimerPromise[sectionID]));
    }
}
