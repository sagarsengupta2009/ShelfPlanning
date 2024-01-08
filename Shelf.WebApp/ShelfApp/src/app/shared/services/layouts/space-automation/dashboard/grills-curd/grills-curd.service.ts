import { Injectable } from '@angular/core';
import { filter, cloneDeep } from 'lodash-es';
import { Section, StandardShelf } from 'src/app/shared/classes';
import { AppConstantSpace } from 'src/app/shared/constants';
import { FixtureObjectResponse, Grill } from 'src/app/shared/models';
import {
    HistoryService, PlanogramService, SharedService,
    PlanogramCommonService, PlanogramStoreService
} from 'src/app/shared/services';

const hierarchyList : string[] = [
    'Fixture.HasGrills',
    'Fixture.Grills.0.Fixture.Thickness',
    'Fixture.Grills.0.Fixture.Height',
    'Fixture.Grills.0.Fixture._GrillSpacing.ValData',
    'Fixture.Grills.0.Fixture._GrillPlacement.ValData'
]
@Injectable({
    providedIn: 'root'
})
export class GrillsCurdService {

    private get grillsTemplate(): FixtureObjectResponse {
        return this.planogramStore.grillsTemplate;
    }

    constructor(
        private readonly sharedService: SharedService,
        private readonly planogramCommonService: PlanogramCommonService,
        private readonly planogramService: PlanogramService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly historyService: HistoryService
    ) { }

    //Adding divider to shelf
    public addGrillsToShelf(selectedFixtures: StandardShelf[], override?: boolean): void {
        selectedFixtures.forEach(data => {
            if ((!data.Fixture.HasGrills && !data.Fixture.Grills) || override) {
                data.Fixture.Grills = [];
                const newGrill = cloneDeep(this.grillsTemplate);
                newGrill.Fixture.Height = 0;
                newGrill.Fixture.Width = 0;
                newGrill.Fixture.Depth = 0;
                newGrill.IDPOGObjectParent = data.IDPOGObject;
                newGrill.Fixture.IDPOGObject = newGrill.IDPOGObject = null;
                newGrill.ObjectType = AppConstantSpace.FIXTUREOBJ;
                newGrill.Fixture._GrillPlacement.ValData = 1;
                newGrill.ObjectDerivedType = newGrill.Fixture.FixtureDerivedType = AppConstantSpace.GRILLOBJ;
                this.planogramService.prepareModelFixture(newGrill, data)
                this.planogramCommonService.extend(newGrill, true, data.$sectionID);
                this.planogramCommonService.setParent(newGrill, data);
                !override ? data.Fixture.HasGrills = false : '';
                data.Fixture.Grills = [];
                data.Fixture.Grills.push(newGrill);
                data.Children = data.Children.filter(item => item.Fixture?.FixtureType != AppConstantSpace.GRILLOBJ);
                data.Children.push(newGrill);
            }
        });
    }

    //Applying Dividers to shelfs
    public applyGrills(selectedFixtures: StandardShelf[], grillData: Grill): void {
        for (let i = 0; i < selectedFixtures.length; i++) {
            const data = selectedFixtures[i];
            let oldThickness: number = 0;
            let oldHeight: number = 0;
            let oldGrillSpacing: number = 0;
            let oldGrillPlacement: number = 0;
            let oldHasGrills: boolean = data.Fixture.HasGrills;
            let oldPartNumber: string = null;
            grillData.GrillSpacing = grillData.GrillSpacing ? grillData.GrillSpacing : 0;
            let grillItemData = filter(data.Children, { ObjectDerivedType: AppConstantSpace.GRILLOBJ })[0];
            if (grillData.selectedGrillPlacement === 1) {
              grillItemData.Fixture.HasGrills = data.Fixture.Grills[0].Fixture.HasGrills = data.Fixture.HasGrills = false;
            } else {
              grillItemData.Fixture.HasGrills = data.Fixture.Grills[0].Fixture.HasGrills = data.Fixture.HasGrills = true;
            }
            if (!grillItemData) {
                continue;
            }
            grillItemData.Fixture.LKFitCheckStatustext = this.planogramStore.lookUpHolder.FixtureFitCheckStatus.options[0].text;
            if (grillItemData) {
                oldThickness = grillItemData.Fixture.Thickness;
                oldHeight = grillItemData.Fixture.Height;
                oldGrillSpacing = grillItemData.Fixture._GrillSpacing.ValData;
                oldGrillPlacement = grillItemData.Fixture._GrillPlacement.ValData;
                oldPartNumber = grillItemData.Fixture.PartNumber;
            }
            if (oldHasGrills !== grillData.HasGrills || oldThickness !== grillData.GrillThickness || oldHeight !== grillData.GrillHeight || oldGrillSpacing !== grillData.GrillSpacing || oldGrillPlacement !== grillData.selectedGrillPlacement || oldPartNumber !== grillData.PartNumber) {
              grillItemData.Fixture.HasGrills = data.Fixture.Grills[0].Fixture.HasGrills = data.Fixture.HasGrills = grillData.HasGrills;
                if (grillItemData) {
                    grillItemData.Fixture.Thickness = grillData.GrillThickness;
                    grillItemData.Fixture.Height = grillData.GrillHeight;
                    grillItemData.Fixture._GrillSpacing.ValData = grillData.GrillSpacing;
                    grillItemData.Fixture._GrillPlacement.ValData = grillData.selectedGrillPlacement;
                    grillItemData.Fixture.PartNumber = grillData.PartNumber;
                }
                //undo redo logic starts here
                const fieldHierarchyArr = hierarchyList;
                const newFieldValueArr = new Array<boolean | number | string>(grillData.HasGrills, grillData.GrillThickness, grillData.GrillHeight, grillData.GrillSpacing, grillData.selectedGrillPlacement, grillData.PartNumber);
                const oldFieldValueArr = new Array<boolean | number | string>(oldHasGrills, oldThickness, oldHeight, oldGrillSpacing, oldGrillPlacement, oldPartNumber);
                const original = (($id, fieldHierarchyArr, newFieldValueArr, sectionId) => {
                    return () => {
                        for (let i = 0; i < 5; i++) {
                            this.sharedService.setObjectField($id, fieldHierarchyArr[i], newFieldValueArr[i], sectionId);
                        }
                        this.sharedService.updateGrillOnFieldChange.next(true);
                    }
                })(data.$id, fieldHierarchyArr, newFieldValueArr, data.$sectionID);
                const revert = (($id, fieldHierarchyArr, oldFieldValueArr, sectionId) => {
                    return () => {
                        for (let i = 0; i < 5; i++) {
                            this.sharedService.setObjectField($id, fieldHierarchyArr[i], oldFieldValueArr[i], sectionId);
                        }
                        this.sharedService.updateGrillOnFieldChange.next(true);
                    }
                })(data.$id, fieldHierarchyArr, oldFieldValueArr, data.$sectionID);
                this.historyService.captureActionExec({
                    'funoriginal': original,
                    'funRevert': revert,
                    'funName': 'GrillChange'
                });
            }
        }
        // TODO: What does below code do?
        selectedFixtures.length ? (this.sharedService.getObject(selectedFixtures[0].$sectionID, selectedFixtures[0].$sectionID) as  Section).applyRenumberingShelfs() : '';
    }
}
