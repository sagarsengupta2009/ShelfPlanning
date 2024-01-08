import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import * as pako from 'pako';
import { Observable, of } from 'rxjs';
import { Section } from 'src/app/shared/classes';
import { AppConstantSpace } from 'src/app/shared/constants';
import { PAPSavePogDetails, Planograms } from 'src/app/shared/models';
import { AllocateAPIService, PlanogramLibraryService, PlanogramRendererService } from '../..';
import { NotifyService, PlanogramService, PlanogramStoreService, SharedService } from '../../common';

@Injectable({
  providedIn: 'root'
})
export class AllocateSaveService {

  constructor(private readonly planogramService: PlanogramService,
    private readonly sharedService: SharedService,
    private readonly planogramRender: PlanogramRendererService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly planogramLibraryService: PlanogramLibraryService,
    private readonly allocateAPIService: AllocateAPIService,
    private readonly notify: NotifyService,
    private readonly translate: TranslateService
  ) { }

  public saveAllocatePlanogram(dataSource: Section): Observable<boolean> {

    const sectionID = dataSource.$sectionID;
    const pogObject: Section & { Blocks?: {}[] } = this.sharedService.getObjectAs<Section>(sectionID, sectionID);
    const pog = this.planogramLibraryService.mapper.find(it => it.IDPOG == pogObject.IDPOG);
    this.planogramService.removeAllSelection(sectionID);


    const replacer = (key: string, value: string): string =>
      ['AllLimitingSortedShelves',
        'notchIntervels',
        '$idParent',
        '$$hashKey',
        'attributeObject',
        'annotations',
        '_parent',
        '$sectionID'].includes(key) ? undefined : value;

    const details: PAPSavePogDetails = {
      pogID: pog.displayVersion || pog.IDPOG,
      ruleSetId: pogObject.RuleSetId || 0,
      scenarioID: this.planogramStore.scenarioId,
      azureBlobToken: pog.azureBlobToken,
      pogType: pog.pogType,
      dateRefreshed: pogObject.DateRefreshed,
    };
    this.prepareBlockSaveData(pogObject);
    this.processAnnotation(pogObject);
    let posData = this.preparePositionData(sectionID);
    let res = this.getBlob(JSON.stringify(pogObject, replacer), details.pogID);
    this.planogramRender.SVG(dataSource, 1, { annotationFlag: true });
    let SVGData = this.getBlob(this.planogramRender.SVG(dataSource, 1, { annotationFlag: true }), details.pogID);
    
    if (!posData) {
      return of(false);
    }
    let posLite = JSON.stringify(posData);
    let FixtureData = this.prepareFixtureData(pogObject, sectionID);
    if (!FixtureData) {
      return of(false);
    }
    let fixture = JSON.stringify(FixtureData);
    const planogramData = {
      block: JSON.stringify(pogObject.Blocks),
      posLite,
      fixture,
      pogLite: JSON.stringify(this.preparePogData(pogObject, pog)),
      Bays: JSON.stringify(this.prepareModularData(pogObject)),
    };

    return this.allocateAPIService.savePlanogramToCloud(details, res, SVGData, planogramData);
  }

  //TODO @karthik type safety
  private prepareBlockSaveData(pogObj: Section): void {
    let blocksArr = [];
    let sectionID = pogObj.$sectionID;
    let NewblocksArr = [];
    let recursive = (obj) => {
      if (obj.hasOwnProperty('Children') && obj.ObjectDerivedType != AppConstantSpace.SHOPPINGCARTOBJ) {
        obj.Children.forEach((child) => {
          if (
            child.ObjectDerivedType === AppConstantSpace.BLOCKOBJECT &&
            child.Order === AppConstantSpace.BLOCKORDERPARENT
          ) {
            blocksArr.push(child);
            let data: any = {};
            data.parentBlockKey = null;
            data.type = child.blockType;
            data.color = child.BlockColor;
            let existingItem;
            // block by fixture or non-std fix
            if (
              (child.attribute == 'Fixture' && child.blockType != 'Manual') ||
              this.sharedService.getObject(child.$idParent, sectionID).ObjectDerivedType !=
              AppConstantSpace.STANDARDSHELFOBJ
            ) {
              data.blockKey = child.attributeValueFixture;
              existingItem = NewblocksArr.find((k) => {
                return k.blockKey.toLowerCase() == child.attributeValueFixture.toLowerCase();
              });
            }
            //auto blocks
            else {
              data.blockKey = child.attributeValue;
              existingItem = NewblocksArr.find((k) => {
                return k.blockKey.toLowerCase().trim() == child.attributeValue.toLowerCase().trim();
              });
            }
            data.FixtureType = child.parentShelfType;

            if (NewblocksArr.length > 0 && existingItem != undefined) {
              existingItem.productKeys += '|' + child.noItemIDs.join('|');
            } else {
              data.productKeys = child.noItemIDs.join('|');
              NewblocksArr.push(data);
            }
          }
          recursive(child);
        });
      }
    };
    recursive(pogObj);
    pogObj.Blocks = NewblocksArr;
  }

  private preparePositionData(sectionID: string): { [key: string]: number | string | boolean }[] | boolean {
    let positionData = [];
    let positionHash = {};
    /**
     * Skip any duplicate deleted items.
     */
    const pogObject = <Section>this.sharedService.getObject(sectionID, sectionID);
    let allPositions = pogObject.getAllPositions();
    allPositions = allPositions.concat(pogObject.getAllShoppingCartItems());
    for (let position of allPositions) {
      const posData = {
        FixtureKey: undefined as string,
        BayId: undefined as null,
        ProductKey: position.Position.Product.ProductKey,
        YCoordinate: position.Location.Y || 0,
        XCoordinate: position.Location.X || 0,
        Orientation: position.Position.IDOrientation,
        FacingsX: position.Position.FacingsX,
        FacingsY: position.Position.FacingsY,
        FacingsZ: position.Position.FacingsZ,
        LayoverY: position.Position.LayoversY,
        LayoverZ: position.Position.LayoversZ,
        FacingGapX: position.Position.GapX,
        FacingGapY: position.Position.GapY,
        PositionGapX: position.Position.SKUGapX,
        MinFacingsX: position.Position.MinFacingsX,
        MaxFacingsX: position.Position.MaxFacingsX,
        MaxFacingsZ: position.Position.MaxFacingsZ,
        MaxVLimits: position.Position.MaxFacingsY,
        MaxlayoverY: position.Position.MaxLayoversY,
        MaxlayoverZ: position.Position.MaxLayoversZ,
        CasesMax: position.Position.InventoryModel.CasesMax,
        CasesMin: position.Position.InventoryModel.CasesMin,
        MinDos: position.Position.inventoryObject.DOSMin,
        MinCapacity: position.Position.inventoryObject.UnitsMin,
        UnitMovement: position.Position.attributeObject.CurrMovt || 0,
        Casepack: position.Position.attributeObject.Casepack || 0,
        ForceFit: position.Position.attributeObject.ForceFit,
        WhiteSpacePosition: position.Position.attributeObject.WhiteSpacePosition,
        WhiteSpaceWidth: position.Position.attributeObject.WhiteSpaceWidth,
        WhiteSpaceText: position.Position.attributeObject.WhiteSpaceText,
        PackName: position.Position.ProductPackage.Name,
        AsstRec: position.Position.attributeObject.RecADRI,
        PositionNo: position.Position.PositionNo,
        AdjustmentFactor: position.Position.attributeObject.AdjustmentFactor,
        IDMerchStyle : position.Position.IDMerchStyle
      };
      const parent = this.sharedService.getParentObject(position, sectionID);
      if (parent.Fixture.FixtureType === 'ShoppingCart') {
        posData.FixtureKey = parent.Key;
        posData.BayId = null;
      } else {
        let grandParent = this.sharedService.getParentObject(parent, sectionID);
        // fixture key is appened with bay id when data is processed in backend, hence not taking posToPog.
        posData.FixtureKey = `${parent.Location.X.toFixed(2)}_${parent.Location.Y.toFixed(2)}`;
        posData.BayId = grandParent.Location.X;
        let loc = `${position.getXPosToPog().toFixed(2)}_${position.getYPosToPog().toFixed(2)}`;
        if (positionHash[loc]) {
          return this.dataValidationFailure(positionHash[loc], position.Position.Product.UPC);
        } else {
          positionHash[loc] = position.Position.Product.UPC;
        }
      }

      // updating block name in PackageAttributes in pog json.
      pogObject.Blocks.forEach((blocks) => {
        if (blocks.productKeys.includes(position.Position.Product.ProductKey)) {
          let packageattribute = Object.keys(pogObject.PackageAttributes)
            .map((key) => pogObject.PackageAttributes[key])
            .find((item) => (item.ProductKey === position.Position.Product.ProductKey));
          pogObject.PackageAttributes[packageattribute.UniqueProdPkg]['_BlockName']['DescData'] = blocks.blockKey;
        }
      })
      positionData.push(posData);
    }

    return positionData;
  }

  private dataValidationFailure(item1: string, item2: string): boolean {

    this.notify.error(`${this.translate.instant('PA_TWO_ITEMS_HAVE_SAME_LOCATION')} ${item1}, ${item2}`);
    return false;
  }

  private prepareModularData(section: Section): { StartX: number, BayId: number, Width: number }[] {
    return this.sharedService.getAllModulars(section).map(it => ({
      StartX: it.Location.X,
      BayId: it.Location.X,
      Width: it.Dimension.Width,
    }));
  }

  private prepareFixtureData(section: Section, sectionID: string): PAFixtureData[] | boolean {
    let fixtures = section.getAllFixChildren();
    let paFixtureData: PAFixtureData[] = [];
    let fixtureHash = {};
    for (let fixture of fixtures) {
      if (fixture.ObjectDerivedType != AppConstantSpace.DIVIDERS && fixture.ObjectDerivedType != AppConstantSpace.GRILLOBJ) {
        const parent = this.sharedService.getParentObject(fixture, sectionID);
        let loc = `${fixture.getXPosToPog().toFixed(2)}_${fixture.getYPosToPog().toFixed(2)}`;
        if (fixtureHash[loc]) {
          return this.dataValidationFailure(fixtureHash[loc], fixture.Fixture.FixtureFullPath);
        } else {
          fixtureHash[loc] = fixture.Fixture.FixtureFullPath;
        }
        // can be any data types
        let dividerLite: { [key: string]: any } = {};
        let grillLite: { [key: string]: any } = {};
        let hasDividers = false;
        let hasGrills = false;
        let dividerData = null;
        let grillData = null;
        //divider
        if (fixture.Fixture.HasDividers) {
          let divider = fixture.Children.filter((child) => {
            // The problem is with overlap of different types of fixtures children and no overlap b/w them, need to check how that can be handled.
            // @ts-ignore
            return child.ObjectDerivedType == AppConstantSpace.DIVIDERS;
          })[0];
          if (divider) {
            dividerLite = _.pick(divider.Fixture, ['Width', 'Depth', 'LKDividerType', 'Height',]);
            dividerLite['Placement'] = dividerLite.LKDividerType;
            dividerLite['HasDivider'] = true;
            dividerLite['SlotSpacing'] = divider.Fixture._DividerSlotSpacing.ValData;
            dividerLite['SlotStart'] = divider.Fixture._DividerSlotStart.ValData;
            dividerData = JSON.stringify(dividerLite);
            hasDividers = true;
          }
        }
        //grill
        if (fixture.Fixture.HasGrills) {
          let grill = fixture.Children.filter((child) => {
            // @ts-ignore
            return child.ObjectDerivedType == AppConstantSpace.GRILLOBJ;
          })[0];
          // allow the data issue of hasgrills but grill child does not exists.
          if (grill) {
            grillLite = _.pick(grill.Fixture, ['Width', 'Depth', 'Height', 'Thickness']);
            grillLite['Placement'] = grill.Fixture._GrillPlacement.ValData;
            grillLite['Spacing'] = grill.Fixture._GrillSpacing.ValData;
            grillLite['HasGrill'] = true;
            grillData = JSON.stringify(grillLite);
            hasGrills = true;
          }
        }

        paFixtureData.push({
          BayId: parent.Location.X,
          FixtureId: fixture.Key,
          Depth: fixture.Dimension.Depth,
          Height: fixture.Dimension.Height,
          Width: fixture.Dimension.Width,
          Thickness: fixture.Fixture.Thickness,
          StartXCoordinate: fixture.Location.X,
          YCoordinate: fixture.Location.Y,
          Type: fixture.ObjectDerivedType,
          CanJoin: fixture.Fixture.CanJoin,
          FixtureNumber: fixture.Fixture.FixtureNumber,
          OverHangLeft: fixture.Fixture.OverhangXLeft,
          OverHangRight: fixture.Fixture.OverhangXRight,
          OverHangFront: fixture.Fixture.OverhangZFront,
          OverHangBack: fixture.Fixture.OverhangZBack,
          MaxMerchHeight: fixture.Fixture.MaxMerchHeight,
          MaxMerchWidth: fixture.Fixture.MaxMerchWidth,
          MaxMerchDepth: fixture.Fixture.MaxMerchDepth,
          HasGrills: hasGrills,
          HasDividers: hasDividers,
          GrillData: grillData,
          DividerData: dividerData,
          IgnoreMerchHeight: fixture.Fixture.IgnoreMerchHeight,
          IgnoreFingerSpace: fixture.Fixture.IgnoreFingerSpace,
        });
      }
    }

    return paFixtureData;
  };

  private preparePogData(section: Section, pogDetails: Planograms): { [key: string]: number | string | boolean } {
    const pogData = {
      TotalLinear: section.AvailableLinear + section.UsedLinear,
      SpaceUtilized: section.UsedLinear,
      TotalSquare: section.AvailableSquare + section.UsedSquare,
      UsedSquare: section.UsedSquare,
      IsVariableHeightShelf: section.IsVariableHeightShelf,
      pogName: pogDetails.Name,
      DaysInWeek: section.DaysInWeek,
      LKTraffic: section.LKTraffic,
      Width: section.Dimension.Width,
      Height: section.Dimension.Height,
      Depth: section.Dimension.Depth,

    };
    //L1 - L10
    for (let i = 1; i <= 10; i++) pogData['L' + i] = section['L' + i];
    return pogData;
  };

  private getBlob(data: string, name: number | string) {
    const utf8Data = data;
    const geoJsonGz = pako.gzip(utf8Data);
    const gzippedBlob: any = new Blob([geoJsonGz]);
    gzippedBlob.name = '' + this.planogramStore.scenarioId + '/' + name;
    return gzippedBlob;
  };

  private processAnnotation(pogObject: Section): void {
    let count = 1;
    pogObject.PogObjectExtension = pogObject.annotations.map((annotation) => {
      // annotation deleted or item linked to annotation deleted.
      if (annotation.status == 'deleted' || (annotation.IDPOGObject && annotation.$belongsToID == annotation.$sectionID)) {
        return;
      }
      if (!annotation.IDPOGObject) {
        let parent = this.sharedService.getObject(annotation.$belongsToID, annotation.$sectionID);
        if (annotation.$belongsToID !== annotation.$sectionID) {
          annotation.IDPOGObject = parent.IDPOGObject = -Date.now() - count++;
        }
      }
      return {
        'IdPogObjectExtn': annotation.IdPogObjectExtn,
        'IDPOGObject': annotation.IDPOGObject,
        'IdDecoration': annotation.IdDecoration,
        'IDPOG': annotation.IDPOG,
        'LkExtensionType': annotation.LkExtensionType,
        'Content': annotation.Content,
        'Attribute': JSON.stringify(annotation.Attribute),
        'TempId': annotation.TempId,
        'Planogram': annotation.Planogram
      }
    }).filter(Boolean);
  }
}

interface PAFixtureData {
  BayId: number,
  FixtureId: string,
  Depth: number,
  Height: number,
  Width: number,
  Thickness: number,
  StartXCoordinate: number,
  YCoordinate: number,
  Type: string,
  CanJoin: boolean,
  FixtureNumber: number,
  OverHangLeft: number,
  OverHangRight: number,
  OverHangFront: number,
  OverHangBack: number,
  HasGrills: boolean,
  HasDividers: boolean,
  DividerData: string,
  GrillData: string;
  MaxMerchHeight: number;
  MaxMerchWidth: number;
  MaxMerchDepth: number;
  IgnoreMerchHeight: boolean;
  IgnoreFingerSpace?: boolean;
}
