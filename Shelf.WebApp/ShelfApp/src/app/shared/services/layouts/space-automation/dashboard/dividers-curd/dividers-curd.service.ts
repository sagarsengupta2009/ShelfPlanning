import { Injectable } from '@angular/core';
import { filter, cloneDeep, find } from 'lodash-es';
import { Basket, Coffincase, Divider, PlanogramObject, Section, StandardShelf } from 'src/app/shared/classes';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import { DividerGap, DividerResponse, FixtureObjectResponse } from 'src/app/shared/models';
import {
  HistoryService, SharedService, PlanogramService,
  PlanogramStoreService,
} from 'src/app/shared/services';
import { UprightDirection } from '../../../upright/upright.service';


@Injectable({
  providedIn: 'root'
})
export class DividersCurdService {

  private get dividerTemplate(): FixtureObjectResponse {
    return this.planogramStore.dividerTemplate;
  };

  constructor(
    private readonly historyService: HistoryService,
    private readonly sharedService: SharedService,
    private readonly planogramService: PlanogramService,
    private readonly planogramStore: PlanogramStoreService,
  ) { }

  public addDividerToShelf(data: StandardShelf | Basket, selectedDividerPlacement: { LKDividerType: number, HasDividers?: boolean }, override?: boolean): void {
    //This should be divider skeleton from DB
    if (!data.Fixture.HasDividers || override) {
      let original = ((data, selectedDividerPlacement) => {
        return () => {
          this.addDividerToShelf(data, selectedDividerPlacement);
        }
      })(data, selectedDividerPlacement);
      let revert = ((data) => {
        return () => {
          this.removeDividerFromShelf(data);
        }
      })(data);
      this.historyService.captureActionExec({
        'funoriginal': original,
        'funRevert': revert,
        'funName': 'addDividersToShelf'
      });
      let newDivider = cloneDeep(this.dividerTemplate);
      newDivider.ObjectType = AppConstantSpace.FIXTUREOBJ;
      newDivider.Fixture.HasDividers = selectedDividerPlacement.HasDividers || false;;
      newDivider.Fixture.HasGrills = false;
      newDivider.Fixture.FixtureDesc = 'Section1_Divider';
      newDivider.Fixture._DividerSlotSpacing.Key = '_DividerSlotSpacing';
      newDivider.Fixture._DividerSlotSpacing.IDDictionary = 3666;
      newDivider.Fixture._DividerSlotSpacing.IDPOGObject = null;
      newDivider.Fixture._DividerSlotSpacing.ValData = data.Fixture._DividerSlotSpacing.ValData;
      newDivider.Fixture._DividerSlotStart.Key = '_DividerSlotStart';
      newDivider.Fixture._DividerSlotStart.IDDictionary = 3665;
      newDivider.Fixture._DividerSlotStart.IDPOGObject = null,
      newDivider.Fixture._DividerSlotStart.ValData = data.Fixture._DividerSlotStart.ValData;
      newDivider.Fixture.IDFixtureType = 7;
      newDivider.Fixture.Height = data.ChildDimension.Height;
      newDivider.Fixture.Width = 2;
      newDivider.Fixture.Depth = data.ChildDimension.Depth;
      newDivider.Fixture.LKDividerType = selectedDividerPlacement.LKDividerType;
      newDivider.Fixture.Color = '#808080';
      newDivider.IDPOGObjectParent = data.IDPOGObject;
      newDivider.Fixture.IDPOGObject = newDivider.IDPOGObject = null;
      newDivider.ObjectType = AppConstantSpace.FIXTUREOBJ;
      newDivider.Fixture.FixtureType = AppConstantSpace.DIVIDERS;
      this.planogramService.prepareModelFixture(newDivider, data as PlanogramObject)
      data.planogramCommonService.extend(newDivider, true, data.$sectionID);
      data.planogramCommonService.setParent(newDivider, data);
      data.Children.push(newDivider);
    }
  }

  //Remove divider from shelf
  public removeDividerFromShelf(data: StandardShelf | Basket): void {
    let original = ((data) => {
      return () => {
        this.removeDividerFromShelf(data);
      }
    })(data);
    let revert = ((data, LKDividerType) => {
      return () => {
        this.addDividerToShelf(data, LKDividerType);
      }
    })(data, data.Fixture.LKDividerType);
    this.historyService.captureActionExec({
      'funoriginal': original,
      'funRevert': revert,
      'funName': 'removeDividersfromShelf'
    });
    const dividerItemData = filter(data.Children, { ObjectDerivedType: AppConstantSpace.DIVIDERS })[0];
    if (dividerItemData) {
      const currIndex = data.Children.indexOf(dividerItemData);
      data.Children.splice(currIndex, 1);
    }
  }

  //Applying Dividers to shelfs
  public applyDividers(selectedFixtures: Array<StandardShelf | Basket>, dividerData: DividerResponse): void {
    for (let i = 0; i < selectedFixtures.length; i++) {
      let data = selectedFixtures[i];
      const dividerItemData = filter(data.Children, { ObjectDerivedType: AppConstantSpace.DIVIDERS })[0];
      if (!dividerItemData) {
        continue;
      }
      const oldData = cloneDeep(dividerItemData);
      oldData.HasDividers = dividerItemData.Fixture.HasDividers;
      oldData.Fixture.LKDividerType = dividerItemData.Fixture.LKDividerType;

      let original = ((data, selectedDividerPlacement) => {
        return () => {
          this.applyDividers(data, selectedDividerPlacement);
        }
      })([data], dividerData);
      let revert = ((data, oldData) => {
        return () => {
          this.applyDividers(data, oldData);
        }
      })([data], oldData);
      this.historyService.captureActionExec({
        funoriginal: original,
        funRevert: revert,
        funName: 'applyDividersToShelf'
      });
      let dividerParentShelf;
      if (dividerData.ObjectDerivedType) {
        dividerParentShelf = this.sharedService.getParentObject(dividerData, data.$sectionID);
      }
      if (data?.Fixture.HasDividers !== dividerData.HasDividers || dividerItemData?.Fixture.Height !== dividerData.Fixture.Height || dividerItemData?.Fixture.Width !== dividerData.Fixture.Width || dividerItemData?.Fixture.Depth !== dividerData.Fixture.Depth
        || data?.Fixture.LKDividerType !== dividerData.selectedDividerPlacement || dividerItemData?.Fixture.LKDividerType !== dividerData.selectedDividerPlacement || dividerItemData?.Fixture._DividerSlotStart.ValData !== dividerData.Fixture._DividerSlotStart.ValData || dividerItemData?.Fixture._DividerSlotSpacing.ValData !== dividerData.Fixture._DividerSlotSpacing.ValData || dividerItemData?.Fixture.PartNumber !== dividerData.Fixture.PartNumber) {
        dividerItemData.Fixture.HasDividers = data.Fixture.HasDividers = (dividerData.HasDividers != undefined) ? dividerData.HasDividers : dividerParentShelf.Fixture.HasDividers;
        data.Fixture.LKDividerType = dividerItemData.Fixture.LKDividerType = (dividerData.selectedDividerPlacement!=undefined) ? dividerData.selectedDividerPlacement : dividerData.Fixture.LKDividerType;
        const LkLookUp = this.planogramStore.lookUpHolder.DividerType.options;
        dividerItemData.Fixture.LKDividerTypetext = data.Fixture.LKDividerTypetext = find(LkLookUp, { 'value': data.Fixture.LKDividerType }).text;
        if (dividerItemData) {
          dividerItemData.Fixture.Width = dividerData.Fixture.Width;
          dividerItemData.Fixture.Height = dividerData.Fixture.Height;
          dividerItemData.Fixture.Depth = dividerData.Fixture.Depth;
          dividerItemData.Fixture._DividerSlotStart.ValData = dividerData.Fixture._DividerSlotStart.ValData;
          dividerItemData.Fixture._DividerSlotSpacing.ValData = dividerData.Fixture._DividerSlotSpacing.ValData;
          dividerItemData.Fixture.PartNumber = dividerData.Fixture.PartNumber;
        }
      }
      this.planogramService.insertPogIDs(data.Children.filter(item => Utils.checkIfPosition(item)), false);
    }
    selectedFixtures.length ? (this.sharedService.getObject(selectedFixtures[0].$sectionID, selectedFixtures[0].$sectionID) as Section).applyRenumberingShelfs() : '';
    this.sharedService.callRenderDividersAgainEvent = true;
  }

  public addSeparatorToShelf(data: Coffincase, dividerObj?: { length: number, y?: number, x?: number }, thickness?: number): void {
    let newDivider = cloneDeep(this.dividerTemplate)
    newDivider.ObjectType = AppConstantSpace.FIXTUREOBJ;
    newDivider.Fixture.HasDividers = newDivider.Fixture.HasGrills = false;
    newDivider.Fixture.FixtureDesc = 'Section1_Divider';
    newDivider.Fixture._DividerSlotSpacing.Key = '';
    newDivider.Fixture._DividerSlotSpacing.IDDictionary = 3666;
    newDivider.Fixture._DividerSlotSpacing.IDPOGObject = null,
      newDivider.Fixture._DividerSlotSpacing.ValData = null;
    newDivider.Fixture._DividerSlotStart.Key = '_DividerSlotStart';
    newDivider.Fixture._DividerSlotStart.IDDictionary = 3665;
    newDivider.Fixture._DividerSlotStart.IDPOGObject = null,
      newDivider.Fixture._DividerSlotStart.ValData = null;
    newDivider.Fixture.IDFixtureType = 7;
    newDivider.Fixture.Height = data.ChildDimension.Height;
    newDivider.Fixture.Width = thickness;
    newDivider.Fixture.Depth = data.ChildDimension.Depth;
    newDivider.Fixture.Thickness = thickness;
    newDivider.Fixture.Color = '#808080';
    newDivider.IDPOGObjectParent = data.IDPOGObject;
    newDivider.Fixture.IDPOGObject = newDivider.IDPOGObject = null;
    newDivider.Location.X = dividerObj.x ? dividerObj.x : 0;
    newDivider.Location.Y = dividerObj.y ? dividerObj.y : 0;
    newDivider.Children = [];
    newDivider.ObjectType = AppConstantSpace.FIXTUREOBJ;
    newDivider.ObjectDerivedType = newDivider.Fixture.FixtureDerivedType = AppConstantSpace.DIVIDERS;
    newDivider.Fixture.FixtureType = AppConstantSpace.DIVIDERS;
    data.planogramCommonService.extend(newDivider, true, data.$sectionID);
    data.planogramCommonService.setParent(newDivider, data);
    data.Children.push(newDivider);
  }

  public removeSeparatorsFromShelf(data: Coffincase): void {
    const dividerItemData = filter(data.Children, { ObjectDerivedType: AppConstantSpace.DIVIDERS });
    dividerItemData.forEach(element => {
      const currIndex = data.Children.indexOf(element);
      data.Children.splice(currIndex, 1);
    })
  }

  public applySeparators(data: Coffincase, dividerData: DividerResponse, separatorsData: DividerGap): void {
    const oldData: DividerResponse = <DividerResponse>{
      HasDividers: data.Fixture.HasDividers,
      selectedDividerPlacement: data.Fixture.LKDividerType,
      Fixture: dividerData.Fixture
    }
    let oldSeparatorsData = data.Fixture.SeparatorsData;
    let original = ((data, selectedDividerPlacement, separatorsData) => {
      return () => {
        this.applySeparators(data, selectedDividerPlacement, separatorsData);
        this.sharedService.renderSeparatorAgainEvent.next(true);
      }
    })(data, dividerData, separatorsData);
    let revert = ((data, oldData, oldSeparatorsData) => {
      return () => {
        this.applySeparators(data, oldData, oldSeparatorsData);
        this.sharedService.renderSeparatorAgainEvent.next(true);
      }
    })(data, oldData, oldSeparatorsData);
    this.historyService.captureActionExec({
      'funoriginal': original,
      'funRevert': revert,
      'funName': 'applySeparatorsToShelf'
    });

    // remove all divider objects
    this.removeSeparatorsFromShelf(data);
    // add divider objects with correct location x and y, thickness, width
    if (separatorsData) {
      data.Fixture.SeparatorsData = (typeof separatorsData === 'string') ? separatorsData : JSON.stringify(separatorsData);
    } else {
      data.Fixture.SeparatorsData = separatorsData;
    }
    if (data.Fixture.SeparatorsData) {
      data.Fixture.HasDividers = true;
    } else {
      data.Fixture.HasDividers = false;
    }
    let dividerGap = JSON.parse(data.Fixture.SeparatorsData);
    if (dividerGap) {
      dividerGap.vertical.forEach(element => {
        this.addSeparatorToShelf(data, element, dividerData.Fixture.Thickness);
      });
      dividerGap.horizontal.forEach(element => {
        this.addSeparatorToShelf(data, element, dividerData.Fixture.Thickness);
      });
    }
    data.Fixture.LKDividerType = dividerData.selectedDividerPlacement;
  }

  public createCoffincaseDivider(separatorDetails: SeparatorDetails): DividerGap {
    const coffincaseObj = separatorDetails.coffincaseObj;
    const separatorThickness = separatorDetails.separatorThickness;
    const type = separatorDetails.type;
    let fixedUprightX = separatorDetails.fixedUprightX;
    let fixedUprightY = separatorDetails.fixedUprightY;
    const separatorDir = separatorDetails.separatorDir;
    const uprightsPositionsArrX = separatorDetails.uprightsPositionsArrX;
    const uprightsPositionsArrY = separatorDetails.uprightsPositionsArrY;

    // Generation
    fixedUprightX = Math.round(Number(fixedUprightX) * 100) / 100;
    fixedUprightY = Math.round(Number(fixedUprightY) * 100) / 100;
    const dimension = coffincaseObj.getRenderingChildDimensionFor2D();
    let dividerGap: DividerGap = { horizontal: [], vertical: [], type: type };
    if (separatorDir > 0 && separatorThickness > 0 && separatorThickness < 10) {
      if (type == 'fixed') {
        // fixed dividers
        let ycord = fixedUprightY;
        let xcord = fixedUprightX;
        let horizontalDividerCount = Math.floor(coffincaseObj.ChildDimension.Depth / fixedUprightY);
        horizontalDividerCount = isFinite(horizontalDividerCount) ? horizontalDividerCount : 0;
        let verticalDividerCount = Math.floor(coffincaseObj.ChildDimension.Width / fixedUprightX);
        verticalDividerCount = isFinite(verticalDividerCount) ? verticalDividerCount : 0;
        if (separatorDir == UprightDirection.Horizontal) {
          // horizontal
          if (!ycord) return null;
          for (let i = 0; i < horizontalDividerCount; i++) {
            const length = coffincaseObj.ChildDimension.Width;
            if (ycord <= coffincaseObj.ChildDimension.Depth) {
              const horizontalObj = { y: ycord, length: length };
              dividerGap.horizontal.push(horizontalObj);
              ycord = ycord + separatorThickness + fixedUprightY;
              ycord = Math.round(ycord * 100) / 100;
            }
          }
        } else if (separatorDir == UprightDirection.Vertical) {
          // vertical
          if (!xcord) return null;
          for (let i = 0; i < verticalDividerCount; i++) {
            const length = dimension.Height;
            if (xcord <= coffincaseObj.ChildDimension.Width) {
              const verticalObj = { x: xcord, length: length };
              dividerGap.vertical.push(verticalObj);
              xcord = xcord + separatorThickness + fixedUprightX;
              xcord = Math.round(xcord * 100) / 100;
            }
          }
        } else {
          //both
          if (!xcord && !ycord) {
            return null;
          }
          for (let i = 0; i < horizontalDividerCount; i++) {
            const length = coffincaseObj.ChildDimension.Width;
            if (ycord <= coffincaseObj.ChildDimension.Depth) {
              const horizontalObj = { y: ycord, length: length };
              dividerGap.horizontal.push(horizontalObj);
              ycord = ycord + separatorThickness + fixedUprightY;
              ycord = Math.round(ycord * 100) / 100;
            }
          }
          for (let i = 0; i < verticalDividerCount; i++) {
            const length = dimension.Height;
            if (xcord <= coffincaseObj.ChildDimension.Width) {
              const verticalObj = { x: xcord, length: length };
              dividerGap.vertical.push(verticalObj);
              xcord = xcord + separatorThickness + fixedUprightX;
              xcord = Math.round(xcord * 100) / 100;
            }
          }
        }
      } else {
        //variable dividers
        if (separatorDir == UprightDirection.Horizontal) {
          // horizontal
          if (!uprightsPositionsArrY.length) return null;
          uprightsPositionsArrY.forEach((element, index) => {
            const length = coffincaseObj.ChildDimension.Width;
            let ycord = index > 0 ? element + separatorThickness : element;
            ycord = Math.round(ycord * 100) / 100;
            const horizontalObj = { y: ycord, length: length };
            dividerGap.horizontal.push(horizontalObj);
          });
        } else if (separatorDir == UprightDirection.Vertical) {
          // vertical
          if (!uprightsPositionsArrX.length) return null;
          uprightsPositionsArrX.forEach((element, index) => {
            const length = dimension.Height;
            let xcord = index > 0 ? element + separatorThickness : element;
            xcord = Math.round(xcord * 100) / 100;
            const verticalObj = { x: xcord, length: length };
            dividerGap.vertical.push(verticalObj);
          });
        } else {
          //both
          if (!uprightsPositionsArrX.length && !uprightsPositionsArrY.length) {
            return null;
          }
          uprightsPositionsArrY.forEach((element, index) => {
            const length = coffincaseObj.ChildDimension.Width;
            let ycord = index > 0 ? element + separatorThickness : element;
            ycord = Math.round(ycord * 100) / 100;
            const horizontalObj = { y: ycord, length: length };
            dividerGap.horizontal.push(horizontalObj);
          });

          uprightsPositionsArrX.forEach((element, index) => {
            const length = dimension.Height;
            let xcord = index > 0 ? element + separatorThickness : element;
            xcord = Math.round(xcord * 100) / 100;
            const verticalObj = { x: xcord, length: length };
            dividerGap.vertical.push(verticalObj);
          });
        }
      }
    }
    return dividerGap;
  }
}

interface SeparatorDetails {
  coffincaseObj: Coffincase
  separatorThickness: number;
  type: string;
  fixedUprightX: number;
  fixedUprightY: number;
  separatorDir: number;
  uprightsPositionsArrX: number[];
  uprightsPositionsArrY: number[];
}