import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import {
  Planogram, IApiResponse, apiEndPoints,
  LookUpRecords, Dictionary, DictRecordsCache,
  PrefLabelField, SvgToolTip, PogCheckinCheckout,
  PogTemplate, PogSettings,
  PogDecorations, CheckinCheckout, CrossbarSpreadPack,
  PegAlign, LookUpChildOptions, InterSectionMessage,
  SvgTooltip, Tooltip, Worksheets, AnnotationResponse,
  POGLibraryListItem, PositionObjectResponse,
  GrillResponse, PerfData, CrossbarInputJson,
  FixtureResponse, PegInputJson, DictionaryFieldDataType, ProductPackageResponse, PogSideNaveView, LabelType, OrientationsObject, BlockDisplayType,
  Dimension, RectangleCoordinates2d, FixtureLocation
} from '../../../models';
import { ConsoleLogService } from 'src/app/framework.module';
import {
  DictConfigService, PlanogramLibraryService, SharedService,
  UserService, PlanogramStoreService, ParentApplicationService,
  PogSideNavStateService,
  AppSettingsService,
  ToolTipService,
  PegLibraryService
} from 'src/app/shared/services';
import { Utils, AppConstantSpace } from 'src/app/shared/constants';
import { SyncAuthCodeWithVM } from 'src/app/shared/classes/sync-auth-code-with-vm';
import { IntersectionmsgDialogComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/childcomponents';
import { Position } from 'src/app/shared/classes/position';
import { FixtureList, ObjectListItem,PositionParentList, SelectableList } from '../shared/shared.service';
import { BlockFixture, PegBoard, Section, StandardShelf, Annotation, Coffincase, Orientation, Fixture } from 'src/app/shared/classes';

import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';
import { CommonSVG } from '../../svg-render/svg-render-common/svg-common';
import { utils } from 'xlsx';
declare const window: any;

@Injectable({
  providedIn: 'root'
})
export class PlanogramService {
  public updateDropCount = new Subject<boolean>();
  public pogChangesInLibrary = new BehaviorSubject<any>(null);
  public unloadPlanograms =  new BehaviorSubject(null);
  public updatePOGInfo = new BehaviorSubject<any>(null);
  public UpdatedSectionObject = new Subject<any>();
  public refreshModularView: Subject<boolean> = new Subject<boolean>();
  public selectionEmit = new BehaviorSubject<boolean>(false);
  public updateNestedStyle = new Subject<boolean>();
  public toggleForwardBetweenTemplate = new Subject<void>();
  public toggleBackwardBetweenTemplate = new Subject<void>();
  public updateNestedStyleDirty: boolean = false;
  public highlightPositionEmit = new BehaviorSubject<boolean>(false);
  public AddpogFromHierarchy = new BehaviorSubject<any>(null);
  public logObjectList: [] = [];
  public PAPogsUpdate = new BehaviorSubject<any>(null);
  public saveDirtyFlag = new BehaviorSubject<object>(null);
  public updateSectionFromTool = new BehaviorSubject<object>(null);
  public savePog = new BehaviorSubject<boolean>(false);
  public updateAnnotationSelection = new Subject<boolean>();
  public updateAnnotationDialog = new Subject<{refObj:  Position | Fixture | Section, hierarchy: string, annotationID?: string}>();
  public triggerAnnotationSelection = new Subject<Annotation>();
  public callUnloadPlanograms =  new BehaviorSubject(null);
  public unloadPlanogramFromWorkspace =  new BehaviorSubject(null);
  public syncAuthCodeWithVM: SyncAuthCodeWithVM;
  private lookUpData: LookUpRecords;
  private packageAttributesDictionaries: Array<Dictionary> = null;
  private nonPackageAttributeDictionaries: Array<Dictionary> = null;
  public updateInInactivePOG: {flag: boolean, sectionID: string} = {flag: false, sectionID: ''};
  public worksheets: Array<Worksheets> = [{
    name: 'Position', value: 'position', componentID: 2
  },
  {
    name: 'Item', value: 'item', componentID: 5
  },
  {
    name: 'Fixture', value: 'fixture', componentID: 3
  },
  {
    name: 'Inventory', value: 'inventory-data', componentID: 6
  }];
  public activeSectionID: string = '';
  public selectedPogPanelID: string = 'panelOne';
  public rootFlags: { [key: string]: PogSettings } = {};
  private dictRecordsCache: DictRecordsCache = {};
  public effectedPogObjIds: number[] = [];
  public pogIntersectionsCheck: boolean = false;
  public historyUniqueID?: string = null;
  public dialogOpened: boolean = false;
  public effectedAction: string;
  private initHighlightSetting: boolean = false;
  public rangeValues: any = {};
  public templateRangeModel: any = {};
  public fieldOption: any = {};
  public lookupHL: Array<any> = [];
  public TopBottomAnalysisData: { [key: number]: string };
  public labelItem: [] = [];
  public labelExpression: string = '';
  public labelField: any = [];
  public labelExpression1: string = '';
  public labelField1: any = [];
  public labelExpression2: string = '';
  public labelField2: any = [];
  public labelFeild1isEnabled = false;
  public labelFeild2isEnabled = false;
  public isPegboardLabelEnabled1 = false;
  public isPegboardLabelEnabled2 = false;
  public imageReportLabelField: PrefLabelField[] = [];
  public labelOn: boolean = false;
  public labelFixtItem: {} = {};
  public labelFixtExpression: [string, string] = ['', ''];
  public labelFixtAllFields: Dictionary[] = [];
  public labelFixtEnabled: [boolean, boolean] = [true, true];
  public labelFixtField: [Array<string>, Array<string>] = [[], []];
  public annotationON: boolean = true;
  public ruleSets: boolean = false;
  public isReviewMode: boolean = false;
  public blockSearchStatus: boolean = false;
  public heighlightData: any[] = [];
  public localSearchStatus: boolean = false;
  public deleteItemFromShoppingcart = new BehaviorSubject<any>(null);
  public setAutoSave = new BehaviorSubject<boolean>(false);
  public modularUpdated = new Subject<boolean>();
  private toolTipData: any[] = [];
  public data: SvgToolTip[] = [];
  public inProcessPOGId: number[] = [];
  public hasCacheShrinkFactors: boolean = false;
  private orientation = new Orientation();
  constructor(
    private readonly httpClient: HttpClient,
    private readonly sharedService: SharedService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly dictConfigService: DictConfigService,
    private readonly translate: TranslateService,
    private readonly matDialog: MatDialog,
    private readonly planogramlibraryService: PlanogramLibraryService,
    private readonly parentApp: ParentApplicationService,
    private readonly appSettingsService: AppSettingsService,
    private readonly user: UserService,
    private readonly log: ConsoleLogService,
    private readonly envConfig: ConfigService,
    private readonly PogSideNavStateService: PogSideNavStateService,
    private readonly toolTipService: ToolTipService,
    private readonly userService: UserService,
    private readonly pegLibraryService: PegLibraryService,
  ) { }

  private get allocateAppUrl(): string {
    return this.parentApp.allocateAzure.url;
  }
  private get allocateAuthCode(): string {
    return this.parentApp.allocateAzure.code;
  }

  public deleteFromInvModel(sectionId: string, delObj: Position): void {
    const getAllPositions = (rootObj) => {
      let positions = [];
      if (rootObj.ObjectDerivedType === AppConstantSpace.SHOPPINGCARTOBJ) {
        return;
      }
      const recursiv = (obj) => {
        if (obj.hasOwnProperty('Children')) {
          obj.Children.forEach((child) => {
            if (child.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
              positions.push(child);
            }
            if (child.ObjectDerivedType != AppConstantSpace.SHOPPINGCARTOBJ) {
              recursiv(child);
            }
          });
        }
        return positions;
      }
      return recursiv(rootObj);
    }
    let posList = getAllPositions(this.sharedService.getObject(sectionId, sectionId) as Section);
    let counter = 0, packId;
    posList.forEach((obj, key) => {
      if (delObj.Position.IDPackage === obj.Position.IDPackage && delObj.Position.IDProduct === obj.Position.IDProduct) {
        counter++
      }
    });
    if (counter <= 0) {
      let packId = delObj.Position.IDProduct.toString() + "@" + delObj.Position.IDPackage.toString();
      let pogObj = this.sharedService.getObject(sectionId, sectionId) as Section;
      if (pogObj.PackageInventoryModel[packId]) {
        delete pogObj.PackageInventoryModel[packId];
        delete pogObj.PackageAttributes[packId];
      }
    }
  }

  public callCalcFields(): void {
    const eachRecursive = (dataSource) => {
      if (dataSource.hasOwnProperty('Children')) {
        dataSource.Children.forEach((child) => {
          this.readCalculatedFieldFromData(child)
          eachRecursive(child);
        })
      }

    }
    eachRecursive(this);
    this.readCalculatedFieldFromData(this)
  };
    public getCurrentTrafficFlowForPosition(rootObj,objType): any{
      let trafficFlow: number = AppConstantSpace.TRAFFICFLOW.LEFT_TO_RIGHT;
      let verticalFlow : number = AppConstantSpace.VERTICALFLOW.TOP_TO_BOTTOM;

      //let verticalFlow: number = AppConstantSpace.
      switch (objType) {
        case AppConstantSpace.STANDARDSHELFOBJ:
          trafficFlow = rootObj.OverrideSectionPosNumbering ? rootObj._StandardShelfLKTraffic.ValData : rootObj.LKTraffic;
          verticalFlow = rootObj.OverrideSectionPosNumbering ? rootObj._StandardShelfStackOrder.ValData : rootObj.shelfStackOrder;
          break;
        case AppConstantSpace.COFFINCASEOBJ:
          trafficFlow = rootObj.OverrideSectionPosNumbering ? rootObj._CoffinCaseLKTraffic.ValData : rootObj.LKTraffic;
          verticalFlow = rootObj.OverrideSectionPosNumbering ? rootObj._CoffinCaseStackOrder.ValData : rootObj.shelfStackOrder;
          break;
        case AppConstantSpace.BASKETOBJ:
          trafficFlow = rootObj.OverrideSectionPosNumbering ? rootObj._BasketLKTraffic.ValData : rootObj.LKTraffic;
          verticalFlow = rootObj.OverrideSectionPosNumbering ? rootObj._BasketStackOrder.ValData : rootObj.shelfStackOrder;
          break;
        case AppConstantSpace.PEGBOARDOBJ:
          trafficFlow = rootObj.OverrideSectionPosNumbering ? rootObj._PegboardLKTraffic.ValData : rootObj.LKTraffic;
          verticalFlow = rootObj.OverrideSectionPosNumbering ? rootObj._PegboardStackOrder.ValData : rootObj.shelfStackOrder;
          break;
        case AppConstantSpace.SLOTWALLOBJ:
          trafficFlow = rootObj.OverrideSectionPosNumbering ? rootObj._SlotwallLKTraffic.ValData : rootObj.LKTraffic;
          verticalFlow = rootObj.OverrideSectionPosNumbering ? rootObj._SlotwallStackOrder.ValData : rootObj.shelfStackOrder;
          break;
        case AppConstantSpace.CROSSBAR:
          trafficFlow = rootObj.OverrideSectionPosNumbering ? rootObj._CorssbarLKTraffic.ValData : rootObj.LKTraffic;
          break;
      }
      return [trafficFlow,verticalFlow];
    }
    public posOpticalSort(sectionId: string ,positions: Position[], objType:string,fixture,fixWidth,fixHeight): Position[] {
      //create a function to take all the positions of pegboard and get the first position by calculating
      //the distance from the top left corner of the each item to the bottom left corner of the fixture
      //and then sort the positions based on the distance
      //if the distance is same then keep the same order only
      //if the distance is different then sort the positions based on the distance
      //check the length of the positions array if it is less than or equal to 1 then return the position array
      let value_high =0.9;
      let value_low = 1.1;
      let minimum_overlap= 0.25;
      let tolerance= 1;
      if (positions.length <= 1) {
        return positions;
      }
      const rootObject = this.sharedService.getObject(sectionId, sectionId) as Section;
      const trafficFlow : number = this.getCurrentTrafficFlowForPosition(rootObject,objType)[0];
      const verticalFlow : number = this.getCurrentTrafficFlowForPosition(rootObject,objType)[1];
      let listOfChains=[];
      //Using Distance formula - sqrt((x2-x1)^2 + (y2-y1)^2)
      const GetDistance=(Coordinate1, Coordinate2)=>
      {
        return Math.sqrt(Math.pow(Coordinate1.x - Coordinate2.x, 2) + Math.pow(Coordinate1.y - Coordinate2.y, 2));
      }
      //sorts the first item for pegboards and slotwalls
      const ItemTopLeftToShelfDistanceComparator= (referencePoint,item1,item2) =>{
        let Coordinate_Item1:FixtureLocation ={x:0,y:0}; let Coordinate_Item2:FixtureLocation ={x:0,y:0};
        Coordinate_Item1.x = item1.Location.X;
        Coordinate_Item1.y = item1.Location.Y + item1.Dimension.Height;
        Coordinate_Item2.x = item2.Location.X;
        Coordinate_Item2.y = item2.Location.Y + item2.Dimension.Height;
        if (GetDistance(Coordinate_Item1, referencePoint) > GetDistance(Coordinate_Item2, referencePoint))
            return true;
        else
            return false;
        }
      //sorts the first item for pegboards and slotwalls (Mirrored)
      const MirroredItemTopLeftToShelfDistanceComparator= (referencePoint,item1,item2) =>{
        let Coordinate_Item1:FixtureLocation ={x:0,y:0}; let Coordinate_Item2:FixtureLocation ={x:0,y:0};
        Coordinate_Item1.x = item1.Location.X+ item1.Dimension.Width;
        Coordinate_Item1.y = item1.Location.Y + item1.Dimension.Height;
        Coordinate_Item2.x = item2.Location.X + item2.Dimension.Width;
        Coordinate_Item2.y = item2.Location.Y + item2.Dimension.Height;
        if (GetDistance(Coordinate_Item1, referencePoint) > GetDistance(Coordinate_Item2, referencePoint))
            return true;
        else
            return false;
      }
      //sorts the first item for coffin cases
      const ItemTopLeftToShelfZDistanceComparator= (referencePoint,item1,item2) =>{
        let Coordinate_Item1:FixtureLocation ={x:0,y:0}; let Coordinate_Item2:FixtureLocation ={x:0,y:0};
        Coordinate_Item1.x = item1.Location.X;
        Coordinate_Item1.y = item1.Location.Z;
        Coordinate_Item2.x = item2.Location.X ;
        Coordinate_Item2.y = item2.Location.Z;
        if (GetDistance(Coordinate_Item1, referencePoint) > GetDistance(Coordinate_Item2, referencePoint))
            return true;
        else
            return false;
      }
      //sorts the first item for coffin cases (Mirrored)
      const MirroredItemTopLeftToShelfZDistanceComparator= (referencePoint,item1,item2) =>{
        let Coordinate_Item1:FixtureLocation ={x:0,y:0}; let Coordinate_Item2:FixtureLocation ={x:0,y:0};
        Coordinate_Item1.x = item1.Location.X + item1.Dimension.Width;
        Coordinate_Item1.y = item1.Location.Z;
        Coordinate_Item2.x = item2.Location.X + item2.Dimension.Width;
        Coordinate_Item2.y = item2.Location.Z;
        if (GetDistance(Coordinate_Item1, referencePoint) > GetDistance(Coordinate_Item2, referencePoint))
            return true;
        else
            return false;
      }
    //sorts the first item for coffin cases in top view
      const ItemTopLeftToShelfTopViewDistanceComparator= (referencePoint,item1,item2) =>{
        let Coordinate_Item1:FixtureLocation ={x:0,y:0}; let Coordinate_Item2:FixtureLocation ={x:0,y:0};
        Coordinate_Item1.x = item1.Location.X ;
        Coordinate_Item1.y = item1.Location.Y + item1.Dimension.Height;
        Coordinate_Item2.x = item2.Location.X;
        Coordinate_Item2.y = item2.Location.Y + item2.Dimension.Height;
        if (GetDistance(Coordinate_Item1, referencePoint) > GetDistance(Coordinate_Item2, referencePoint))
            return true;
        else
            return false;
      }      
      //sorts the first item for coffin cases in top view (Mirrored)
      const MirroredItemTopLeftToShelfTopViewDistanceComparator= (referencePoint,item1,item2) =>{
        let Coordinate_Item1:FixtureLocation ={x:0,y:0}; let Coordinate_Item2:FixtureLocation ={x:0,y:0};
        Coordinate_Item1.x = item1.Location.X + item1.Dimension.Width;
        Coordinate_Item1.y = item1.Location.Y + item1.Dimension.Height;
        Coordinate_Item2.x = item2.Location.X+ item2.Dimension.Width;
        Coordinate_Item2.y = item2.Location.Y + item2.Dimension.Height;
        if (GetDistance(Coordinate_Item1, referencePoint) > GetDistance(Coordinate_Item2, referencePoint))
            return true;
        else
            return false;
      }      
      //sorts both first and next items for other fixtures(Default)
      const ItemXposComparator= (shelfType,item1,item2) =>{
        let firstXPos: number = 0;
        let secondXPos: number = 0;
        firstXPos = item1.Location.X;
        secondXPos = item2.Location.X;

        if (firstXPos < secondXPos) {
            return true;
        } else {
            return false;
        }
      }
      //sorts both first and next items for other fixtures(Default) (Mirrored)
      const MirroredItemXposComparator= (shelfType,item1,item2) =>{
        let firstXPos: number = 0;
        let secondXPos: number = 0;
        firstXPos = item1.Location.X;
        secondXPos = item2.Location.X;

        if (firstXPos > secondXPos) {
            return true;
        } else {
            return false;
        }
      }
      //Sorts the chains along X or Y based on type of shelf       
      const ItemChainComparator= (shelfType,pFirstChain,pSecondChain,verticalFlow) =>{
        switch(shelfType)
        {
        case AppConstantSpace.PEGBOARDOBJ:
          if(verticalFlow==1){
            if((pFirstChain.at(0).Location.Y + pFirstChain.at(0).Dimension.Height) > (pSecondChain.at(0).Location.Y + pSecondChain.at(0).Dimension.Height))
              return true;
            else
              return false;
          }
          else if(verticalFlow==0){
            if((pFirstChain.at(0).Location.Y + pFirstChain.at(0).Dimension.Height) < (pSecondChain.at(0).Location.Y + pSecondChain.at(0).Dimension.Height))
              return true;
            else
              return false;
          }
          break;            
        case AppConstantSpace.COFFINCASEOBJ:
        case AppConstantSpace.BASKETOBJ:
        case AppConstantSpace.SLOTWALLOBJ:
          if((pFirstChain.at(0).Location.X + pFirstChain.at(0).Dimension.Width) < (pSecondChain.at(0).Location.X + pSecondChain.at(0).Dimension.Width))
            return true;
          else
            return false;

        default:
          return false;
        }      
      }
      //Sorts the chains along X or Y based on type of shelf (Mirrored)
      const MirroredItemChainComparator= (shelfType,pFirstChain,pSecondChain,verticalFlow) =>{
        switch(shelfType)
        {
        case AppConstantSpace.PEGBOARDOBJ:
          if(verticalFlow==1){
            if((pFirstChain.at(0).Location.Y + pFirstChain.at(0).Dimension.Height) > (pSecondChain.at(0).Location.Y + pSecondChain.at(0).Dimension.Height))
              return true;
            else
              return false;
          }
          else if(verticalFlow==0){
              if((pFirstChain.at(0).Location.Y + pFirstChain.at(0).Dimension.Height) < (pSecondChain.at(0).Location.Y + pSecondChain.at(0).Dimension.Height))
              return true;
            else
              return false;
          }
          break;
        case AppConstantSpace.COFFINCASEOBJ:
        case AppConstantSpace.BASKETOBJ:
        case AppConstantSpace.SLOTWALLOBJ:
          if((pFirstChain.at(0).Location.X + pFirstChain.at(0).Dimension.Width) > (pSecondChain.at(0).Location.X + pSecondChain.at(0).Dimension.Width))
            return true;
          else
            return false;

        default:
          return false;
        }      
      }
      //Sorts the items closest to the head item for slot walls
      const ItemBottomDistanceComparator= (referencePoint,item1,item2) =>{
        let Coordinate_Item1:FixtureLocation ={x:0,y:0};
        let Coordinate_Item2:FixtureLocation ={x:0,y:0};
        const item1PegInfo  = item1.getPegInfo();
        const item2PegInfo  = item2.getPegInfo();
        let DistanceFromItem1 = 0, DistanceFromItem2 = 0, AdjustedDistanceFromItem1 = 0, AdjustedDistanceFromItem2 = 0;
        Coordinate_Item1.x = item1.Location.X;
        Coordinate_Item1.y = item1.Location.Y + item1.Dimension.Height;
        Coordinate_Item2.x = item2.Location.X;
        Coordinate_Item2.y = item2.Location.Y + item2.Dimension.Height;
          
        DistanceFromItem1 = GetDistance(Coordinate_Item1, referencePoint);
        DistanceFromItem2 = GetDistance(Coordinate_Item2, referencePoint);
        if(referencePoint.x <= item1PegInfo.OffsetX)
        {
          AdjustedDistanceFromItem1 = DistanceFromItem1 * value_low;
        }
        else
        {
          AdjustedDistanceFromItem1 = DistanceFromItem1 * value_high; 
        }
        if(referencePoint.x <= item2PegInfo.OffsetX)
        {
          AdjustedDistanceFromItem2 = DistanceFromItem2 * value_low;
        }
        else
        {
          AdjustedDistanceFromItem2 = DistanceFromItem2 * value_high; 
        }
        if(AdjustedDistanceFromItem1 < AdjustedDistanceFromItem2)
          return true;
        else
          return false;        
      }
      //Sorts the items closest to the head item for slot walls (Mirrored)
      const MirroredItemBottomDistanceComparator= (referencePoint,item1,item2) =>{
        let Coordinate_Item1:FixtureLocation ={x:0,y:0}; let Coordinate_Item2:FixtureLocation ={x:0,y:0};
        const item1PegInfo  = item1.getPegInfo();
        const item2PegInfo  = item2.getPegInfo();
        let DistanceFromItem1 = 0, DistanceFromItem2 = 0, AdjustedDistanceFromItem1 = 0, AdjustedDistanceFromItem2 = 0;

        Coordinate_Item1.x = item1.Location.X+ item1.Dimension.Width;
        Coordinate_Item1.y = item1.Location.Y + item1.Dimension.Height;
        Coordinate_Item2.x = item2.Location.X+ item2.Dimension.Width;
        Coordinate_Item2.y = item2.Location.Y + item2.Dimension.Height;
        DistanceFromItem1 = GetDistance(Coordinate_Item1, referencePoint);
        DistanceFromItem2 = GetDistance(Coordinate_Item2, referencePoint);

        if(referencePoint.x >= item1.Location.X + item1PegInfo.OffsetX)
        {
          AdjustedDistanceFromItem1 = DistanceFromItem1 * value_low;
        }
        else
        {
          AdjustedDistanceFromItem1 = DistanceFromItem1 * value_high;	
        }

        if(referencePoint.x >= item2.Location.X + item2PegInfo.OffsetX)
        {
          AdjustedDistanceFromItem2 = DistanceFromItem2 * value_low;
        }
        else
        {
          AdjustedDistanceFromItem2 = DistanceFromItem2 * value_high;	
        }

        if(AdjustedDistanceFromItem1 < AdjustedDistanceFromItem2)
          return true;
        else
          return false;  
      }
      //Sorts the items closest to the head item for coffin cases
      const ItemBottomZDistanceComparator= (referencePoint,item1,item2) =>{
        let Coordinate_Item1:FixtureLocation ={x:0,y:0};
        let Coordinate_Item2:FixtureLocation ={x:0,y:0};
        Coordinate_Item1.x = item1.Location.X;
        Coordinate_Item1.y = item1.Location.Z;
        Coordinate_Item2.x = item2.Location.X;
        Coordinate_Item2.y = item2.Location.Z;  
         
        if(GetDistance(Coordinate_Item1, referencePoint) < GetDistance(Coordinate_Item2, referencePoint))
          return true;
        else 
          return false;        
      }
      //Sorts the items closest to the head item for coffin cases (Mirrored)
      const MirroredItemBottomZDistanceComparator= (referencePoint,item1,item2) =>{
        let Coordinate_Item1:FixtureLocation ={x:0,y:0};
        let Coordinate_Item2:FixtureLocation ={x:0,y:0};        
        Coordinate_Item1.x = item1.Location.X + item1.Dimension.Width;
        Coordinate_Item1.y = item1.Location.Y + item1.Dimension.Height;
        Coordinate_Item2.x = item2.Location.X + item2.Dimension.Width;
        Coordinate_Item2.y = item2.Location.Y + item2.Dimension.Height;           
        if(GetDistance(Coordinate_Item1, referencePoint) < GetDistance(Coordinate_Item2, referencePoint))
          return true;
        else 
          return false;        
      }
      //Sorts the items closest to the head item for coffin cases in top view 
      const ItemBottomTopViewYDistanceComparator= (referencePoint,item1,item2) =>{
        let Coordinate_Item1:FixtureLocation ={x:0,y:0};
        let Coordinate_Item2:FixtureLocation ={x:0,y:0};
        Coordinate_Item1.x = item1.Location.X;
        Coordinate_Item1.y = item1.Location.Y + item1.Dimension.Height;
        Coordinate_Item2.x = item2.Location.X;
        Coordinate_Item2.y = item2.Location.Y + item2.Dimension.Height;   

        if(GetDistance(Coordinate_Item1, referencePoint) < GetDistance(Coordinate_Item2, referencePoint))
          return true;
        else 
          return false;        
      }
      //Sorts the items closest to the head item for coffin cases in top view (Mirrored)
      const MirroredItemBottomTopViewYDistanceComparator= (referencePoint,item1,item2) =>{
        let Coordinate_Item1:FixtureLocation ={x:0,y:0};
        let Coordinate_Item2:FixtureLocation ={x:0,y:0};
        Coordinate_Item1.x = item1.Location.X + item1.Dimension.Width;
        Coordinate_Item1.y = item1.Location.Y + item1.Dimension.Height;
        Coordinate_Item2.x = item2.Location.X + item2.Dimension.Width;
        Coordinate_Item2.y = item2.Location.Y + item2.Dimension.Height;   

        if(GetDistance(Coordinate_Item1, referencePoint) < GetDistance(Coordinate_Item2, referencePoint))
          return true;
        else 
          return false;        
      }
      //Sorts the items closest to the head item for pegboards
      const ItemSideDistanceComparator= (referencePoint,item1,item2) =>{
        let Coordinate_Item1:FixtureLocation ={x:0,y:0}; let Coordinate_Item2:FixtureLocation ={x:0,y:0};
        const item1PegInfo  = item1.getPegInfo();
        const item2PegInfo  = item2.getPegInfo();
        let DistanceFromItem1 = 0, DistanceFromItem2 = 0, AdjustedDistanceFromItem1 = 0, AdjustedDistanceFromItem2 = 0;

        Coordinate_Item1.x = item1.Location.X + item1PegInfo.OffsetX;
        Coordinate_Item1.y = item1.Location.Y + item1PegInfo.OffsetY;
        Coordinate_Item2.x = item2.Location.X + item2PegInfo.OffsetX;
        Coordinate_Item2.y = item2.Location.Y + item2PegInfo.OffsetY;
        DistanceFromItem1 = GetDistance(Coordinate_Item1, referencePoint);
        DistanceFromItem2 = GetDistance(Coordinate_Item2, referencePoint);

        if(referencePoint.x <= item1.Location.X + item1PegInfo.OffsetX)
        {
          AdjustedDistanceFromItem1 = DistanceFromItem1 * value_low;
        }
        else
        {
          AdjustedDistanceFromItem1 = DistanceFromItem1 * value_high;	
        }

        if(referencePoint.x <= item2.Location.X + item2PegInfo.OffsetX)
        {
          AdjustedDistanceFromItem2 = DistanceFromItem2 * value_low;
        }
        else
        {
          AdjustedDistanceFromItem2 = DistanceFromItem2 * value_high;	
        }

        if(AdjustedDistanceFromItem1 < AdjustedDistanceFromItem2)
          return true;
        else
          return false;  
      }
      const getCongruentWidth = (firstItem, nextItem): number => {
        let congruentWidth = 0;
        const firstLeft = firstItem.Location.X ;
        const firstRight = firstItem.Location.X + firstItem.Dimension.Width;
        const nextLeft = nextItem.Location.X ;
        const nextRight = nextItem.Location.X + nextItem.Dimension.Width;

        ///Check if two Lines have common X Width
            if(((firstLeft > nextLeft && firstLeft < nextRight)
            || (firstRight >= nextLeft && firstRight <= nextRight))
            || ((nextLeft >= firstLeft && nextLeft <= firstRight)
            || (nextRight >= firstLeft && nextRight <= firstRight)))
        {
            congruentWidth = Math.min(firstRight, nextRight) - Math.max(firstLeft, nextLeft);
        }
        return congruentWidth;

      }
      //Returns the congruent(Common) Height of two parallel lines
      const getCongruentHeight = (firstItem, nextItem): number => {
        let congruentHeight = 0;
        const firstBottom = firstItem.Location.Y;
        const firstTop = firstItem.Location.Y + firstItem.Dimension.Height;
        const nextBottom = nextItem.Location.Y;
        const nextTop = nextItem.Location.Y + nextItem.Dimension.Height;
        ///Check if two Lines have common Y Height
            if(((firstBottom >= nextBottom && firstBottom <= nextTop)
            || (firstTop >= nextBottom && firstTop <= nextTop)) 
            || ((nextBottom >= firstBottom && nextBottom <= firstTop)
            || (nextTop >= firstBottom && nextTop <= firstTop)))
        {
            congruentHeight = Math.min(firstTop, nextTop) - Math.max(firstBottom, nextBottom);
        }
        return congruentHeight;

      }
      //Returns TRUE if the two items overlap atleast 95%
      const isCongruentItem = (firstItem, nextItem ): boolean => {
        let congruentHeight = 0,
        congruentWidth = 0, intersectionArea = 0, 
        item1Width = 0, item2Width = 0, item1Height = 0, item2Height = 0
        congruentWidth = getCongruentWidth(firstItem, nextItem);
        if(congruentWidth == 0)
            return false;
        congruentHeight = getCongruentHeight(firstItem, nextItem);
        if(congruentHeight == 0)
            return false;

        item1Width = firstItem.Dimension.Width;
        item1Height = firstItem.Dimension.Height;
        item2Width = nextItem.Dimension.Width;
        item2Height = nextItem.Dimension.Height;

        intersectionArea = congruentWidth * congruentHeight;

        if(((item1Width * item1Height * 0.95) <= intersectionArea) && ((item2Width * item2Height * 0.95) <= intersectionArea))
            return true;
        else
            return false;

      }
      //Updates the position numbers and stamps it into the configured field
      const updatePositionNumbers = (sortedPositions) =>{
        let LastItem;
        let ItemStack = [];
        let CongruentPositionIndex = 0;
        for (let itItem = 0; itItem < sortedPositions.length; itItem++) {
            let bItemIsInStack = false;
            for (let itStr = 0; itStr < ItemStack.length; itStr++) {
                if (ItemStack[itStr] === sortedPositions[itItem].Position.Product.UPC) {
                    bItemIsInStack = true;
                    break;
                }
            }
            if (!LastItem || bItemIsInStack || !isCongruentItem(sortedPositions[itItem], LastItem)) {
                CongruentPositionIndex += 1;
                sortedPositions[itItem].Position["Congruent"]=false;
                ItemStack = [];
            }
            else{
              sortedPositions[itItem].Position["Congruent"]=true;
            }
            ItemStack.push(sortedPositions[itItem].Position.Product.UPC);
            LastItem = sortedPositions[itItem];
        }
        return sortedPositions;
      }
      const createChains = (remainingItemsOnShelf,shelfType) =>{
        let currentChain = [];
        let referencePoint:FixtureLocation ={x:0,y:0};
        remainingItemsOnShelf.sort((a,b)=>{
          let result;
          switch(shelfType){
            //For Coffin case the farthest item is the item with highest distance from top left corner of item to the bottom right of shelf
            case AppConstantSpace.COFFINCASEOBJ:
            case AppConstantSpace.BASKETOBJ:              
              if(fixture?.Fixture?.DisplayViews == 0 || fixture?.DisplayViews ==0)//front view
              {
                if (trafficFlow == 1) {
                  //left to right
                  if(verticalFlow==1){
                    referencePoint.x = fixWidth;
                    referencePoint.y = 0;
                  }
                  else{
                    referencePoint.x = fixWidth;
                    referencePoint.y = fixHeight;
                  }
                  result= ItemTopLeftToShelfZDistanceComparator(referencePoint,a,b);
                }else {
                  //right to left
                  if(verticalFlow==1){                    
                    referencePoint.x = 0;
                    referencePoint.y = 0;
                  }
                  else{ //vertical arrangement bottom to top
                    referencePoint.x = 0;
                    referencePoint.y = fixHeight;
                  }
                  result= MirroredItemTopLeftToShelfZDistanceComparator(referencePoint,a,b);
                }   
              }
              else
              {
                if (trafficFlow == 1) {
                  //left to right
                  if(verticalFlow==1){
                    referencePoint.x = fixWidth;
                    referencePoint.y = 0;
                  }
                  else{
                    referencePoint.x = fixWidth;
                    referencePoint.y = fixHeight;
                  }
                  result= ItemTopLeftToShelfTopViewDistanceComparator(referencePoint,a,b);
                }else {
                  //right to left
                  if(verticalFlow==1){                    
                    referencePoint.x = 0;
                    referencePoint.y = 0;
                  }
                  else{ //vertical arrangement bottom to top
                    referencePoint.x = 0;
                    referencePoint.y = fixHeight;
                  }
                  result= MirroredItemTopLeftToShelfTopViewDistanceComparator(referencePoint,a,b);
                } 
              }
              break;
            //For Pegboard and Slotwall, the farthest item is the item with highest distance from top left corner of item to the bottom right of shelf	
            case AppConstantSpace.SLOTWALLOBJ:
            case AppConstantSpace.PEGBOARDOBJ:                
                  if(verticalFlow==1){
                    if (trafficFlow == 1) {
                      //left to right
                      referencePoint.x = fixWidth;
                      referencePoint.y = 0;                                            
                      result= ItemTopLeftToShelfDistanceComparator(referencePoint,a,b);
                    } else {
                      //right to left
                      referencePoint.x = 0;
                      referencePoint.y = 0;
                      result= MirroredItemTopLeftToShelfDistanceComparator(referencePoint,a,b);
                    } 
                  }   
                    //vertical arrangement bottom to top     
                  else if(verticalFlow==0){
                    if (trafficFlow == 1) {
                      //left to right
                      referencePoint.x = fixWidth;
                      referencePoint.y = fixHeight;
                      result=ItemTopLeftToShelfDistanceComparator(referencePoint,a,b);
                    } else {
                      //right to left
                      referencePoint.x = 0;
                      referencePoint.y = fixHeight;
                      result= MirroredItemTopLeftToShelfDistanceComparator(referencePoint,a,b);
                    } 
                  }
                break;
          }
          if(result)
            return -1;
          else 
              return 1;
      }); 
        //There are unsorted items on the shelf
        if(remainingItemsOnShelf.length){
        //Add next item to current chain
        let bNextItem = true;
        let nextItem = remainingItemsOnShelf[0];
        while(bNextItem)
        {
          currentChain.push(nextItem);
          //remove the item from the unsorted items list
          for (let index = 0; index < remainingItemsOnShelf.length; index++) {
            if (nextItem.$id === remainingItemsOnShelf[index].$id) {
                remainingItemsOnShelf.splice(index, 1);
                break;
            }
          }
          nextItem = getNextIteminChain(nextItem, remainingItemsOnShelf, shelfType);

          //End current chain if next item is null
          if(!nextItem)
            bNextItem = false;
        }
        listOfChains.push(currentChain);

        //Continue creating chains until all items are sorted
        if(remainingItemsOnShelf.length)
        {
          if(!createChains(remainingItemsOnShelf, shelfType))
              return false;
        }
        }
        return true;
      }
      const getNextIteminChain = (firstItem, remainingItemsOnShelf, shelfType) =>{
        let eligibleItems=[];
        let nextItem;
        const firstItemPegInfo  = firstItem.getPegInfo();
        for(const item of remainingItemsOnShelf){
          const itemPegInfo  = item.getPegInfo();
          switch(shelfType){
            //For Coffin case the farthest item is the item with highest distance from top left corner of item to the bottom right of shelf
            case AppConstantSpace.COFFINCASEOBJ:
            case AppConstantSpace.BASKETOBJ:              
              if(fixture?.Fixture?.DisplayViews == 0 || fixture?.DisplayViews ==0)//front view
              {             
                if((getCongruentWidth(firstItem, item) < (item.Dimension.Width * minimum_overlap))  && (getCongruentWidth(firstItem, item) < (firstItem.Dimension.Width * minimum_overlap)))
                  continue;
                if(verticalFlow==1){
                  if(item.Location.Z - tolerance > firstItem.Location.Z)
                  continue;
                }
                else{
                  if(item.Location.Z - tolerance < firstItem.Location.Z)
                  continue;
                } 
              }
              else
              {
                if((getCongruentWidth(firstItem, item) < (item.Dimension.Width * minimum_overlap))&& (getCongruentWidth(firstItem, item) < (firstItem.Dimension.Width * minimum_overlap)))
                  continue;
                if(verticalFlow==1){
                  if(item.Location.Y +item.Dimension.Height - tolerance > firstItem.Location.Y+ firstItem.Dimension.Height)
                  continue;
                }
                else{
                  if(item.Location.Y +item.Dimension.Height - tolerance < firstItem.Location.Y+ firstItem.Dimension.Height)
                  continue;
                }                
              }
              break;
            //For Pegboard and Slotwall, the farthest item is the item with highest distance from top left corner of item to the bottom right of shelf	
            case AppConstantSpace.SLOTWALLOBJ:
              if((getCongruentWidth(firstItem, item) < (item.Dimension.Width * minimum_overlap)) && (getCongruentWidth(firstItem,item) < (firstItem.Dimension.Width * minimum_overlap)))
                continue;
              if(verticalFlow==1){
                if(item.Location.Y + itemPegInfo.OffsetY - tolerance > firstItem.Location.Y + firstItemPegInfo.OffsetY)
                continue;
              }
              else{
                if(item.Location.Y + itemPegInfo.OffsetY - tolerance < firstItem.Location.Y + firstItemPegInfo.OffsetY)
                continue;
              }
              
            break;
            case AppConstantSpace.PEGBOARDOBJ:                
              if((getCongruentHeight(firstItem, item) < (item.Dimension.Height * minimum_overlap)) && (getCongruentHeight(firstItem, item) < firstItem.Dimension.Height * minimum_overlap))
                continue;
  
              if(trafficFlow==2){
                if((item.Location.X + itemPegInfo.OffsetX - tolerance) > firstItem.Location.X + firstItemPegInfo.OffsetX)
                continue;
              }
              else{
                if((item.Location.X + itemPegInfo.OffsetX + tolerance) < firstItem.Location.X + firstItemPegInfo.OffsetX)
                continue;
              }
              break;               
        }
        eligibleItems.push(item);
        };

        if(eligibleItems.length){
          let headItemPosition:FixtureLocation={x:0,y:0};
          eligibleItems.sort((a,b)=>{
            let result;
            switch (shelfType) 
            {
              //Distance is caluclated based on Head item's bottom left to next possible item's top left
            case AppConstantSpace.COFFINCASEOBJ:
            case AppConstantSpace.BASKETOBJ:
              if(fixture?.Fixture?.DisplayViews == 0 || fixture?.DisplayViews ==0)//front view
              {
                if(trafficFlow==2)
                {
                  headItemPosition.x = firstItem.Location.X + firstItem.Dimension.Width; 
                  headItemPosition.y = firstItem.Location.Z + firstItem.Dimension.Depth;
                  result=MirroredItemBottomZDistanceComparator(headItemPosition,a,b);
                }
                else
                {
                  headItemPosition.x = firstItem.Location.X ;
                  headItemPosition.y = firstItem.Location.Z + firstItem.Dimension.Depth;
                  result=ItemBottomZDistanceComparator(headItemPosition,a,b);
                }
              }
              else
              {
                if(trafficFlow==2)
                {
                  headItemPosition.x = firstItem.Location.X + firstItem.Dimension.Width;
                  headItemPosition.y = firstItem.Location.Y;
                  result=MirroredItemBottomTopViewYDistanceComparator(headItemPosition,a,b);
                }
                else
                {
                  headItemPosition.x = firstItem.Location.X; 
                  headItemPosition.y = firstItem.Location.Y;
                  result=ItemBottomTopViewYDistanceComparator(headItemPosition,a,b);
                }
              }
              break;        
              //Distance is caluclated based on Head item's bottom left to next possible item's top left
            case AppConstantSpace.SLOTWALLOBJ:
              if(trafficFlow==2)
              {
                headItemPosition.x = firstItem.Location.X+ firstItem.Dimension.Width; 
                headItemPosition.y = firstItem.Location.Y;
                result= MirroredItemBottomDistanceComparator(headItemPosition,a,b);
              }
              else
              {
                headItemPosition.x = firstItem.Location.X; 
                headItemPosition.y = firstItem.Location.Y;
                result= ItemBottomDistanceComparator(headItemPosition,a,b);
              }
              break;        
              //Distance is caluclated based on Head item's peghole to next possible item's peghole
            case AppConstantSpace.PEGBOARDOBJ:
              headItemPosition.x = firstItem.Location.X + firstItemPegInfo.OffsetX;
              headItemPosition.y = firstItem.Location.Y + firstItemPegInfo.OffsetY;
              result= ItemSideDistanceComparator(headItemPosition,a,b);
              break;        
              //Distance is caluclated based on Head item's Xpos to next possible item's Xpos
            default:
              if(trafficFlow==2)
              {
                result= MirroredItemXposComparator(shelfType,a, b);
              }
              else
              {
                result= ItemXposComparator(shelfType,a, b);
              }
              break;
            }
            if (result)
              return -1;
            else
              return 1; 
          });
          nextItem = eligibleItems[0];
        }
        return nextItem;
      }
      const sortedItemsOnShelf =(remainingItemsOnShelf,shelfType) =>{
        createChains(remainingItemsOnShelf, shelfType);
        let orderedItems=[];
        //Sort the list of chains based on the X or Y Position of the first item of the chain
        listOfChains.sort((pFirstChain,pSecondChain)=>{
          let result;
          if(trafficFlow==1){
            result= ItemChainComparator(shelfType,pFirstChain, pSecondChain,verticalFlow);
          } 
          else if(trafficFlow==2){
            result= MirroredItemChainComparator(shelfType,pFirstChain, pSecondChain,verticalFlow);
          } 
          if (result)
            return -1;
          else
            return 1;
        })        
        //Merge the sorted list of chains into a single chain
        {
          listOfChains.forEach(item=>{
            if(item.length>1){
              for(let i=0; i<item.length;i++)
              {
                orderedItems.push(item[i]);
              }
            }
            else if(item.length==1)
              orderedItems.push(item[0]);
            else
              orderedItems.push(item);
          })          
        }
        //Free the list of chains
        listOfChains=[];

        return orderedItems;
      }      
      const sortItemsbyOpticalResemblance =(positions) =>{
         let sortedItems=[];
          //Sort the items on the shelf by optical resemblance algorithm
          sortedItems = sortedItemsOnShelf(positions, objType);
          let sortedItemsPosition = updatePositionNumbers(sortedItems);
        return sortedItemsPosition;
      }
      let sortPositionsByPeghole = [];
      sortPositionsByPeghole = sortItemsbyOpticalResemblance(positions);

      return sortPositionsByPeghole;
  }
  //@Todo Karthik H, Please hadle the interface 'SvgToolTip'seems it is part of PA. Not sure of the data.
  public getsvgToolTipData(svgElement: any, svgTooltipData: SvgTooltip[]): SvgToolTip[] {
    let data: SvgToolTip[] = [];
    let tooltipData: any;
    let fixture = false, position = false;
    switch (svgElement.nativeElement.nodeName) {
      case "image":
        svgElement.nativeElement.parentElement.parentElement.classList.contains('svgPosition') ? position = true : fixture = true;
        break;

      case "g":
        svgElement.nativeElement.classList.contains('svgPosition') ? position = true : fixture = true;
        break;

      case "rect":
        svgElement.nativeElement.classList.contains('fixtureClass') ? fixture = true : position = true;
        break;

      default:
        break;
    }
    let obj = svgElement.nativeElement.getAttribute('data-idpog') != undefined && svgElement.nativeElement.getAttribute('data-idpog') != null ? svgElement.nativeElement.getAttribute('data-idpog') : svgElement.nativeElement.parentElement.parentElement.getAttribute('data-idpog');

    Object.entries(svgTooltipData).forEach((item) => {
      if (item[0] == obj) {
        tooltipData = item[1];
      }
    });

    if (!tooltipData) {
      return data;
    }

    const tooltipConfig = this.toolTipService.getToolTipConfig(true);

    if (position) {
      const imgsrc = svgElement.nativeElement.href != undefined ? svgElement.nativeElement.href.baseVal : AppConstantSpace.DEFAULT_PREVIEW_SMALL_IMAGE;

      this.getSVGTooltipData(tooltipData, tooltipConfig['productToolTip'])
      data = tooltipConfig['productToolTip'];
      data.push({ keyName: 'Image', value: imgsrc });
    }
    else {
      this.getSVGTooltipData(tooltipData, tooltipConfig['fixtureToolTip'])
      data = tooltipConfig['fixtureToolTip'];
      data.push({ keyName: 'Image', value: "" });
    }
    return data;
  }

  public getUnLoadCartToolTipData(idPogObject: string, svgTooltipData: SvgTooltip[]): SvgToolTip[] {
    let data: SvgToolTip[] = [];
    let tooltipData: any;
    Object.entries(svgTooltipData).forEach((item) => {
      if (item[0] == idPogObject) {
        tooltipData = item[1];
      }
    });
    if (!tooltipData) {
      return data;
    }
    const tooltipConfig = this.toolTipService.getToolTipConfig(true);
    this.getSVGTooltipData(tooltipData, tooltipConfig['productToolTip'])
    data = tooltipConfig['productToolTip'];
    data.push({ keyName: 'Image', value: tooltipData['Image'] });
    return data;
  }


  private getSVGTooltipData(tooltipData, tooltipConfig: SvgToolTip[]): void {
    for (const item of tooltipConfig) {

      item.keyName = item.keyName.replace(/{{(.*?)}}/g, (_, match) => {
        return this.translate.instant(match);
      });

      item.value = item.value.replace(/{{(.*?)}}/g, (_, match) => {
        const fields = match.trim().split('..');
        let value = tooltipData[fields[0]];
        // Evaluate functions like .toFixed()
        if (fields.length > 1 && match.includes('..') && !Utils.isNullOrEmpty(value)) {
          value = eval('value.' + fields[1]);
        }
        return !Utils.isNullOrEmpty(value) ? value as string : '';
      });
    }
  }

  public getPlanogramToolTipData(pogObjectData: Position | StandardShelf | PegBoard | BlockFixture | Coffincase): SvgToolTip[] {
    this.toolTipData = this.toolTipService.getToolTipConfig(false);
    this.data = [];
    let object: any = pogObjectData;
    if (object.ObjectDerivedType != AppConstantSpace.POSITIONOBJECT) { //object.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ || object.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ || object.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ || object.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ || object.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ || object.ObjectDerivedType == AppConstantSpace.BASKETOBJ) { // for Shelf
      this.getToolTipData(this.toolTipData['fixtureToolTip'],object);
    } else if (object.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
      let imgsrc = object.Position.ProductPackage.Images.front;
        if (!imgsrc) {
          imgsrc = AppConstantSpace.DEFAULT_PREVIEW_SMALL_IMAGE;
        }
      this.getToolTipData(this.toolTipData['productToolTip'],object);
      this.data.push({ keyName: 'Image', value: imgsrc });
    }
    return this.data;
  }

  private getToolTipData(toolTipData,object): void {
    for (let item of toolTipData) {
      // Note : Set key name based on value if its empty or null
      if (Utils.isNullOrEmpty(item.keyName)) {
        item.keyName = item.value.replace(/{{(.*?)}}/g, (_, match) => {
          const fields = match.trim().split('..');
          const dict = this.getDictValue(fields[0]);
          return !Utils.isNullOrEmpty(dict.ShortDescription) ? dict.ShortDescription as string : '';
        });
      } else {
        item.keyName = this.translate.instant(item.keyName);
      }

      item.value = item.value.replace(/{{(.*?)}}/g, (_, match) => {
        const fields = match.trim().split('..');
        const dict = this.getDictValue(fields[0]);
        const fieldPath = dict.LkUpGroupName ? dict.field + 'text' : dict.field;
        let value = this.sharedService.getObjectField(undefined, fieldPath, undefined, object);

        // Evaluate functions like .toFixed()
        if (fields.length > 1 && match.includes('..') && !Utils.isNullOrEmpty(value)) {
          value = eval('value.' + fields[1]);
        }

        return !Utils.isNullOrEmpty(value) ? value as string : '';
      });

      this.data.push({ keyName: item.keyName, value: item.value });
    }
  }

  private getDictValue(idDictionary: number): Dictionary {
    const dictionary = [{ IDDictionary: idDictionary }];
    return this.dictConfigService.dictionaryConfigCollection(dictionary as Dictionary[])[0];
  }

  /* ************* pure APIs ****************** */
  public getAnnotationImages(searchText: string): Observable<IApiResponse<PogDecorations[]>> {
    return this.httpClient.get<IApiResponse<PogDecorations[]>>(`${this.envConfig.shelfapi}${apiEndPoints.apiToGetAnnotationImages}`);
  }

  public getPackageTypeInfo(packageID: number): Observable<IApiResponse<ProductPackageResponse>> {
    return this.httpClient.get<IApiResponse<ProductPackageResponse>>(`${this.envConfig.shelfapi}${apiEndPoints.apiToGetPackageInfo}${packageID}`);
  }
  public getCurrentObject(guid?: string): POGLibraryListItem {
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.planogramlibraryService.mapper.length; i++) {
      const obj = this.planogramlibraryService.mapper[i];
      if (obj.globalUniqueID === guid) {
        return obj;
      }
    }
  }

  public convertToScale(sectionID: string): number {
    if (this.sharedService.measurementUnit == 'IMPERIAL') {	//imperial
      return Number((1 * (37.8 * 2.54) / (this.rootFlags[sectionID].sizeReductionFactor)));
    }
    if (this.sharedService.measurementUnit == 'METRIC') {  //metric
      return Number((1 * 37.8 / (this.rootFlags[sectionID].sizeReductionFactor)));
    }
  };


  public convertToUnit(v: string | number, sectionID: string): number {
    v = Number(v);
    if (this.sharedService.measurementUnit == 'IMPERIAL') {	//imperial
      return Number((this.rootFlags[sectionID].sizeReductionFactor * v / (37.8 * 2.54)).toFixed(2));
    }
    if (this.sharedService.measurementUnit == 'METRIC') {  //metric
      return Number((this.rootFlags[sectionID].sizeReductionFactor * v / (37.8)).toFixed(2));
    }
  }

  public convertToPixel(v: string | number, sectionID: string): number {
    v = Number(v);
    if (this.sharedService.measurementUnit == 'IMPERIAL') {	//imperial
      return Number((v * (37.8 * 2.54) / (this.rootFlags[sectionID]?.sizeReductionFactor)).toFixed(2));
    }
    if (this.sharedService.measurementUnit == 'METRIC') {  //metric
      return Number((v * 37.8 / (this.rootFlags[sectionID]?.sizeReductionFactor)).toFixed(2));
    }
  };

  public convertToPixelInOriginal(v: string | number): number {
    v = Number(v);
    if (this.sharedService.measurementUnit == 'IMPERIAL') {	//imperial
      return Number((v * (37.8 * 2.54) / (1)).toFixed(2));
    }
    if (this.sharedService.measurementUnit == 'METRIC') {  //metric
      return Number((v * 37.8 / (1)).toFixed(2));
    }
  }

  public getBorderWidth(scaleF: string | number): number {
    let borderW: number = 2;
    const n = Number(scaleF);
    if (n >= 0.1 && n < 0.2) {
      borderW = 8;
    }
    if (n >= 0.2 && n < 0.3) {
      borderW = 5;
    }
    if (n >= 0.3 && n < 0.4) {
      borderW = 5;
    }
    if (n >= 0.4 && n < 0.5) {
      borderW = 4;
    }
    if (n >= 0.5 && n < 0.6) {
      borderW = 3;
    }
    if (n >= 0.6 && n < 0.7) {
      borderW = 3;
    }
    if (n >= 0.7 && n < 0.8) {
      borderW = 2;
    }
    if (n >= 0.8 && n < 0.9) {
      borderW = 2;
    }
    if (n >= 0.9 && n < 1) {
      borderW = 2;
    }
    if (n >= 1 && n < 1.25) {
      borderW = 2;
    }
    if (n >= 1.25 && n < 1.5) {
      borderW = 2;
    }
    if (n >= 1.5) {
      borderW = 2;
    }
    return borderW;
  }

  public removeAllSelection(sectionID: string): void {
    if (!sectionID) {
      sectionID = this.activeSectionID;
    }
    if (!this.sharedService.selectedID[sectionID]) {
      this.sharedService.selectedID[sectionID] = [];
    }
    this.sharedService.selectedID[sectionID].forEach(element => {
      let object = this.sharedService.getObject(element, sectionID);
      if (object)
        object.selected = false;
      //this.prototype.makeItemDragDestroy(object);
    });
    /** updateNestedStyle is necessary for events triggerd outside panel-section. */
    this.updateNestedStyleDirty = true;;
    this.sharedService.selectedID[sectionID] = [];
    this.setLastSelectedObjectDerivedType('', sectionID);
    this.setLastSelectedObjectType('', sectionID);
    this.sharedService.lastSelectedObjCartStatus[sectionID] = false;
    this.rootFlags[sectionID].selectionCount = this.sharedService.selectedID[sectionID].length;
    // UpdateSectionObject needs to be triggered only when there is a change in the modulars.
  }
  public setLastSelectedObjectDerivedType(type: string, sectionID: string): void {
    if (!sectionID) {
      sectionID = this.activeSectionID;
    }
    this.sharedService.lastSelectedObjectDerivedType[sectionID] = type;
  }

  public setLastSelectedObjectType(type: string, sectionID: string): void {
    if (!sectionID) {
      sectionID = this.activeSectionID;
    }
    this.sharedService.lastSelectedObjectType[sectionID] = type;
  }

  public getLastSelectedObjectDerivedType(sectionID: string): string {

    if (!sectionID) {
      sectionID = this.activeSectionID;
    }

    if (!this.sharedService.lastSelectedObjectDerivedType[sectionID]) {
      this.sharedService.lastSelectedObjectDerivedType[sectionID] = '';
    }

    return this.sharedService.lastSelectedObjectDerivedType[sectionID];
  }

  public getLastSelectedObjectType(sectionID?: string): string {

    if (!sectionID) {
      sectionID = this.activeSectionID;
    }

    if (!this.sharedService.lastSelectedObjectType[sectionID]) {
      this.sharedService.lastSelectedObjectType[sectionID] = '';
    }

    return this.sharedService.lastSelectedObjectType[sectionID];
  }

  public prepareFixtureModel(child: any, obj: any): void {
    this.lookUpData = this.planogramStore.getLookupdata();
    if ((obj as Section)._IsSpanAcrossShelf != undefined) {
      if (obj._IsSpanAcrossShelf.FlagData == false || obj._IsSpanAcrossShelf.FlagData == null) {
        if (child.Fixture.LKCrunchMode == 8) {
          child.Fixture.LKCrunchMode = 2;
        }
        else if (child.Fixture.LKCrunchMode == 9) {
          child.Fixture.LKCrunchMode = 1;
        }
        else if (child.Fixture.LKCrunchMode == 6) {
          child.Fixture.LKCrunchMode = 4;
        }
      } else {
        if (child.Fixture.LKCrunchMode == 2) {
          child.Fixture.LKCrunchMode = 8;
        }
        else if (child.Fixture.LKCrunchMode == 1) {
          child.Fixture.LKCrunchMode = 9;
        }
        else if (child.Fixture.LKCrunchMode == 4) {
          child.Fixture.LKCrunchMode = 6;
        }
      }
    }

    if (child.Fixture.IsLikePosition) {
      child.ObjectDerivedType = AppConstantSpace.BAGSHELF;
    } else if (Utils.checkIfstandardShelf(child)) {
      this.formatGrills(child);
      child.ObjectDerivedType = AppConstantSpace.STANDARDSHELFOBJ;
      child.Fixture.FixtureDerivedType = AppConstantSpace.STANDARDSHELFOBJ;
      child.Dimension.Width = child.Fixture.Width;
      child.Dimension.Depth = child.Fixture.Depth;
      child.Dimension.Height = child.Fixture.Height;
      child.Fixture.LKFitCheckStatustext = "";
      if (child.Fixture.HasGrills) {
        child.Fixture.Grills = [];
        child.Fixture.Grills = child.Children.filter(function (val) {
          return val.ObjectType == AppConstantSpace.GRILLOBJ;
        }) as GrillResponse[];

      }
      //Incase of autosaved pog, need to clear the spanShelfs to empty so next time it will look for the fixtures which are not there
      child.spanShelfs = [];

      //sorting the children of standard shelf by xPos
      //to prevent xPos calc issues in traffic flow left->right OR right<- left
      const positionsArray = child.Children.filter(ele => ele.ObjectType == AppConstantSpace.POSITIONOBJECT);
      let positions = this.sortByXPos(positionsArray);
      for (let j = 0; j < child.Children.length; j++) {
        let notPos = child.Children[j];
        if (!Utils.checkIfPosition(notPos)) {
          positions.push(notPos);
        }
      }
      child.Children = positions;

    } else if (Utils.checkIfPegboard(child)) {
      child.ObjectDerivedType = AppConstantSpace.PEGBOARDOBJ;
      child.Fixture.FixtureDerivedType = AppConstantSpace.PEGBOARDOBJ;
      child.Dimension.Width = child.Fixture.Width;
      child.Dimension.Height = child.Fixture.Height;
      child.Dimension.Depth = child.Fixture.Depth;
      child.Fixture._X04_XINC?.ValData ? '' :
        this.insertDefaultValue(child.Fixture, { DictionaryName: '_X04_XINC', IDDictionary: 420 }, { key: 'ValData', value: 0.25 });
      child.Fixture._X04_YINC?.ValData ? '' :
        this.insertDefaultValue(child.Fixture, { DictionaryName: '_X04_YINC', IDDictionary: 421 }, { key: 'ValData', value: 0.25 });
    } if (Utils.checkIfSlotwall(child)) {

      child.ObjectDerivedType = AppConstantSpace.SLOTWALLOBJ;
      child.Fixture.FixtureDerivedType = AppConstantSpace.SLOTWALLOBJ;
      child.Dimension.Width = child.Fixture.Width;
      child.Dimension.Depth = child.Fixture.Depth;
      child.Dimension.Height = child.Fixture.Height;
      child.Fixture._X04_YINC?.ValData ? '' :
        this.insertDefaultValue(child.Fixture, { DictionaryName: '_X04_YINC', IDDictionary: 421 }, { key: 'ValData', value: 0.25 });

    } else if (Utils.checkIfCrossbar(child)) {
      child.ObjectDerivedType = AppConstantSpace.CROSSBAROBJ;
      child.Fixture.FixtureDerivedType = AppConstantSpace.CROSSBAROBJ;
      child.Dimension.Width = child.Fixture.Width;
      child.Dimension.Depth = child.Fixture.Depth;
      child.Dimension.Height = child.Fixture.Height;
      child.Fixture._X04_XINC?.ValData ? '' :
        this.insertDefaultValue(child.Fixture, { DictionaryName: '_X04_XINC', IDDictionary: 420 }, { key: 'ValData', value: 0.25 });
    } else if (Utils.checkIfCoffincase(child)) {
      child.ObjectDerivedType = AppConstantSpace.COFFINCASEOBJ;
      child.Fixture.FixtureDerivedType = AppConstantSpace.COFFINCASEOBJ;
      child.Dimension.Depth = child.Fixture.Depth;
      child.Dimension.Height = child.Fixture.Height;
      child.Dimension.Width = child.Fixture.Width;
      if (child.Fixture.LKCrunchMode == 8 || child.Fixture.LKCrunchMode == null) {
        child.Fixture.LKCrunchMode = 2;
      }
      const positionsArray = child.Children.filter(ele => ele.ObjectType == AppConstantSpace.POSITIONOBJECT);
      let positions = this.sortByXPos(positionsArray);
      for (let j = 0; j < child.Children.length; j++) {
        let notPos = child.Children[j];
        if (!Utils.checkIfPosition(notPos)) {
          positions.push(notPos);
        }
      }
      child.Children = positions;

    } else if (Utils.checkIfBasket(child)) {
      child.ObjectDerivedType = AppConstantSpace.BASKETOBJ;
      child.Fixture.FixtureDerivedType = AppConstantSpace.BASKETOBJ;
      child.Dimension.Width = child.Fixture.Width;
      child.Dimension.Depth = child.Fixture.Depth;
      child.Dimension.Height = child.Fixture.Height;
      if (child.Fixture.LKCrunchMode == 8 || child.Fixture.LKCrunchMode == null) {
        child.Fixture.LKCrunchMode = 2;
      }
      const positionsArray = child.Children.filter(ele => ele.ObjectType == AppConstantSpace.POSITIONOBJECT);
      let positions = this.sortByXPos(positionsArray);
      for (let j = 0; j < child.Children.length; j++) {
        let notPos = child.Children[j];
        if (!Utils.checkIfPosition(notPos)) {
          positions.push(notPos);
        }
      }
      child.Children = positions;
    } else if (Utils.checkIfShoppingCart(child)) {
      child.ObjectDerivedType = AppConstantSpace.SHOPPINGCARTOBJ;
      child.Fixture.FixtureDerivedType = AppConstantSpace.SHOPPINGCARTOBJ;
      Utils.shoppingCartFound = true;
      child.Children.forEach((item, key) => {
        item.Fixture = {} as any;
        item.Fixture.FixtureNumber = 0;
        item.Fixture.ModularNumber = null;
        item.Fixture.FixtureFullPath = null;
        (item.Fixture as any).AutoComputeFronts = false;
        item.Position.PositionNo = null;
        item.ObjectDerivedType = AppConstantSpace.POSITIONOBJECT;
      });
    } else if (Utils.checkIfBlock(child)) {
      child.ObjectDerivedType = AppConstantSpace.BLOCK_FIXTURE;
      child.Fixture.FixtureDerivedType = AppConstantSpace.BLOCK_FIXTURE;
      child.Dimension.Width = child.Fixture.Width;
      child.Dimension.Depth = child.Fixture.Depth;
      child.Dimension.Height = child.Fixture.Height;

    } else if (Utils.checkIfBay(child)) {

      child.ObjectDerivedType = AppConstantSpace.MODULAR;
      child.Fixture.FixtureDerivedType = AppConstantSpace.MODULAR;
      child.Dimension.Width = child.Fixture.Width;
      child.Dimension.Depth = child.Fixture.Depth;
      child.Dimension.Height = child.Fixture.Height;
      obj.isBayPresents = true;
    } else if (Utils.checkIfGrill(child)) {

      child.ObjectDerivedType = AppConstantSpace.GRILLOBJ;
      child.Dimension.Width = child.Fixture.Width;
      child.Dimension.Depth = child.Fixture.Depth;
      child.Dimension.Height = child.Fixture.Height;
    } else if (Utils.checkIfDivider(child)) {
      child.ObjectDerivedType = AppConstantSpace.DIVIDERS;
      child.Dimension.Width = child.Fixture.Width;
      child.Dimension.Depth = child.Fixture.Depth;
      child.Dimension.Height = child.Fixture.Height;
    }
    this.addLookupTextProperties(child.Fixture, child.ObjectDerivedType);
  }

  private addLookupTextProperties(fixture: FixtureResponse, objectDerivedType: string): void {
    Object.keys(fixture).forEach(key => {
      let val = fixture[key];
      if (key.startsWith("LK")) {
        // if LKCrunchMode doesn't have value, assign default value.
        if (key == 'LKCrunchMode' && !val) {
          fixture[key] = val = 2;
        }
        const dictObj = this.getFromDict(key);
        if (dictObj && dictObj.LkUpGroupName) {
          const configName = (objectDerivedType == AppConstantSpace.COFFINCASEOBJ && key == 'LKDividerType')
            ? 'FIXTURE_UPRIGHTS_DIRECTION' : dictObj.LkUpGroupName;
          const lkSelected = this.lookUpData[configName]?.options?.find(x => x.value == val) || { text: undefined };
          fixture[key + 'text'] = lkSelected.text;
        }
      }
    });
  }

  public preparePositionModel(child: any, data: any, originalItem: any, perfData: any): void {
    this.lookUpData = this.planogramStore.getLookupdata();
    child.Position.ProductPackage.IDPackageStyle = child.Position.ProductPackage.IdPackageStyle;
    child.Position.ProductPackage.IDPackageStyletext = Utils.findObjectKey(this.lookUpData.PACKAGESTYLE.options, child.Position.ProductPackage.IdPackageStyle);
    child.ObjectDerivedType = AppConstantSpace.POSITIONOBJECT;
    child.Position.SpreadFacingsFactor = 0;
    child.Position.IDOrientationtext = Utils.findObjectKey(this.lookUpData.Orientation.options, child.Position.IDOrientation);
    child.Position.Product.InternalStatustext = Utils.findObjectKey(this.lookUpData.ProductStatusCode.options, child.Position.Product.InternalStatus);
    child.Position.Product.LKInternalStatus = child.Position.Product.InternalStatus;
    child.Position.Product.LKInternalStatustext = Utils.findObjectKey(this.lookUpData.ProductStatusCode.options, child.Position.Product.LKInternalStatus);
    child.Position.LKFitCheckStatustext = "";
    child.Position.PositionDerivedType = AppConstantSpace.POSITIONOBJECT;
    child.Position.UsedCubic = child.Dimension.Height * child.Dimension.Width * child.Dimension.Depth;
    child.Position.UsedLinear = child.Dimension.Width;
    child.Position.UsedSquare = child.Dimension.Height * child.Dimension.Width;
    child.defaultOrinetation = {};
    child.defaultOrinetation.value = child.Position.IDOrientation;
    child.defaultOrinetation.XPegHole = child.Position.ProductPackage.XPegHole;
    child.defaultOrinetation.ProductPegHole2X = child.Position.ProductPackage.ProductPegHole2X;
    child.defaultOrinetation.YPegHole = child.Position.ProductPackage.YPegHole;
    child.Position.IsPeggable = !Utils.isNullOrEmpty(child.defaultOrinetation.XPegHole) && child.defaultOrinetation.XPegHole > 0
                                  && !Utils.isNullOrEmpty(child.defaultOrinetation.YPegHole) && child.defaultOrinetation.YPegHole > 0
    if(Utils.isNullOrEmpty(child.Position.ProductPegHole1X)) child.Position.ProductPegHole1X = child.Position.ProductPackage.XPegHole;
    if(Utils.isNullOrEmpty(child.Position.ProductPegHole2X)) child.Position.ProductPegHole2X = child.Position.ProductPackage.ProductPegHole2X;
    if(Utils.isNullOrEmpty(child.Position.ProductPegHoleY)) child.Position.ProductPegHoleY = child.Position.ProductPackage.YPegHole;
    if (Utils.isNullOrEmpty(child.Position.BackHooks)) {
      child.Position.BackHooks = 1;
    }
    if (Utils.isNullOrEmpty(child.Position.FrontBars)) {
      child.Position.FrontBars = 1;
    }
    if (Utils.isNullOrEmpty(child.Position.HeightSlope)) {
      child.Position.HeightSlope = 0;
    }
    if (Utils.isNullOrEmpty(child.Position.BackYOffset)) {
      child.Position.BackYOffset = 0;
    }
    if (Utils.isNullOrEmpty(child.Position.PegSpanCount)) {
      child.Position.PegSpanCount = 0;
    }
    if (Utils.isNullOrEmpty(child.Position.PegHole2X)) {
      child.Position.PegHole2X = 0;
    }
    let tempIdPegLibrary = child.Position.IDPegLibrary;
    if(!Utils.isNullOrEmpty(child.Position.PegType) && child.Position.IDPegLibrary!=child.Position.PegType){
      child.Position.IDPegLibrary = child.Position.PegType;
    }
    const pegExists = this.pegLibraryService.PegLibrary?.find((x) => {
      if (x.IDPegLibrary == child.Position.PegType) {
        return x;
      }
    });
    if (Utils.isNullOrEmpty(child.Position.PegType) || (!pegExists && this.pegLibraryService.PegLibrary?.length > 0)) {
      child.Position.IDPegLibrary = child.Position.PegType = 1;
    }
    if (!Utils.isNullOrEmpty(child.Position.PegType)) {
      const pegDetails = this.pegLibraryService.PegLibrary?.find((x) => {
        if (x.IDPegLibrary == child.Position.PegType && x.IsActive) {
          return x;
        }
      });
      if (pegDetails) {
        child.Position.MaxPegWeight = pegDetails.MaxPegWeight;
        child.Position.PegWeight = pegDetails.PegWeight;
        child.Position._PegLibraryPegType.DescData = pegDetails.PegType;
        child.Position.PegPartID = pegDetails.PegPartID;
        if(!tempIdPegLibrary){
          child.Position.BackHooks = pegDetails.BackHooks;
          child.Position.FrontBars = pegDetails.FrontBars;
          child.Position.BackSpacing = null;
        }
      }
    }
    this.addPosInvModel(child, data, originalItem);
    child.Position.Product = Object.assign(child.Position.Product, child.Position.Product.ExtendedFields);
    child.Position.Product.ExtendedFields = {};
    try {
      this.lookupText(child.Position);
      this.lookupText(child.Position.ProductPackage);
      this.lookupText(child.Position.Product);
    } catch (e) {
      this.log.error("Error while getting lookup text fro Positions: 893");
    }
  }


  public addPosInvModel(child: any, data: any, originalItem?: any): void {
    let clonedId;
    if (originalItem != undefined && originalItem != '') {
      clonedId = originalItem.Position.Product.IDProduct.toString() + "@" + originalItem.Position.ProductPackage.IDPackage.toString();
    }
    let id = child.Position.Product.IDProduct.toString() + "@" + child.Position.ProductPackage.IDPackage.toString();
    if (typeof data.PackageInventoryModel[id] == "undefined") { // If we dont find entry for product in PackageInventoryModel, Assign value from GlobalInvModel
      data.PackageInventoryModel[id] = Object.assign({}, data.InventoryModel);
      data.PackageInventoryModel[id].ProductName = child.Position.Product.Name;
      data.PackageInventoryModel[id].UPC = child.Position.Product.UPC;
      data.PackageInventoryModel[id].IDPackage = child.Position.ProductPackage.IDPackage;
      data.PackageInventoryModel[id].IDProduct = child.Position.Product.IDProduct;
      child.Position.inventoryObject = originalItem != undefined ? Object.assign({}, data.PackageInventoryModel[clonedId]) : data.PackageInventoryModel[id];
      child.Position.InventoryModel = data.InventoryModel;
      data.PackageInventoryModel[id].__proto__ = this.dictConfigService.packageInventoryModelCalcFields;
      // update for newly added products, add following fields manually for PA.
      if (this.parentApp.isAllocateApp) {
        child.Position.InventoryModel.UniqueProdPkg = data.PackageInventoryModel[id].UniqueProdPkg = id;
      }

    } else { // This
      data.PackageInventoryModel[id].ProductName = child.Position.Product.Name;
      data.PackageInventoryModel[id].UPC = child.Position.Product.UPC;
      child.Position.inventoryObject = data.PackageInventoryModel[id];
      child.Position.InventoryModel = data.InventoryModel;
      data.PackageInventoryModel[id].__proto__ = this.dictConfigService.packageInventoryModelCalcFields;

    }
    if (typeof data.PackageAttributes[id] == "undefined") { // If we dont find entry for product in PackageInventoryModel, Assign value from GlobalInvModel

      if (originalItem != undefined) {
        child.Position.attributeObject = data.PackageAttributes[id] = Object.assign({}, data.PackageAttributes[clonedId]);
        data.PackageAttributes[id].IdPackageAttribute = 0;
      } else {
        const packageAttr = child.Position.attributeObject || Object.assign({}, this.planogramStore.packageAttrDefaultTemplate);
        child.Position.attributeObject = data.PackageAttributes[id] = packageAttr;
        if (data.PackageAttributes[id].IdPog != data.IDPOG) {
          data.PackageAttributes[id].IdPackageAttribute = 0;
          child.Position.attributeObject.IdPackageAttribute = 0;
        }
      }
      data.PackageAttributes[id].IdPackage = child.Position.ProductPackage.IDPackage;
      data.PackageAttributes[id].IdProduct = child.Position.Product.IDProduct;
      data.PackageAttributes[id].IdPog = data.IDPOG;

      child.Position.attributeObject.IdPackage = child.Position.ProductPackage.IDPackage;
      child.Position.attributeObject.IdProduct = child.Position.Product.IDProduct;
      child.Position.attributeObject.IdPackageAttribute = originalItem != undefined ? 0 : child.Position.attributeObject.IdPackageAttribute;
      child.Position.attributeObject.Color_color = this.getStringColor(child);
      child.Position.attributeObject.Color = child.Position.attributeObject.Color ? child.Position.attributeObject.Color : '';
      if (child.Position.Product.IsNPI === true) {
        child.Position.attributeObject.RecADRI = 'A';
        data.PackageAttributes[id].RecADRI = 'A';
        // newly added attributes while creating NPI
        child.Position.attributeObject.RecCPI = data.PackageAttributes[id].RecCPI = child.Position.Product.RecCPI || data.PackageAttributes[id].RecCPI;
        child.Position.attributeObject.AdjustmentFactor = data.PackageAttributes[id].AdjustmentFactor = child.Position.Product.AdjustmentFactor || data.PackageAttributes[id].AdjustmentFactor;
        child.Position.attributeObject.RecMustStock = data.PackageAttributes[id].RecMustStock = child.Position.Product.RecMustStock || data.PackageAttributes[id].RecMustStock;
        child.Position.attributeObject.CurrMovt = data.PackageAttributes[id].CurrMovt = child.Position.Product.CurrMovt || data.PackageAttributes[id].CurrMovt;
        child.Position.attributeObject.CurrSales = data.PackageAttributes[id].CurrSales = child.Position.Product.CurrSales || data.PackageAttributes[id].CurrSales;

      }
      data.PackageAttributes[id].__proto__ = this.dictConfigService.packageAttributesCalcFields;
      // update for newly added products, update following fields manually for PA.
      if (this.parentApp.isAllocateApp) {
        child.Position.attributeObject.UniqueProdPkg = data.PackageAttributes[id].UniqueProdPkg = id;
        // idproduct can be different based on idcorp.
        child.Position.attributeObject.IDProduct = data.PackageAttributes[id].IDProduct = child.Position.Product.IDProduct;
      }

    } else {
      child.Position.attributeObject = data.PackageAttributes[id];
      child.Position.attributeObject.Color_color = this.getStringColor(child);
      child.Position.attributeObject.Color = child.Position.attributeObject.Color ? child.Position.attributeObject.Color : '';

      data.PackageAttributes[id].__proto__ = this.dictConfigService.packageAttributesCalcFields;

    }
    this.insertRemainingDictionary(child, { includeOnlyPackageAttr: true });
  }

  private isValidHEXColor(str: string): boolean {
    return str.match(/^#[a-f0-9]{6}$/i) !== null;
  }


  private getStringColor(position: Position): `#${string}` {
    const itemColor = position.Position.attributeObject.Color || position.Position.Product.Color;
    if (itemColor == null || itemColor == undefined || itemColor == '') {
      return '#FFFFFF';
    } else if (isNaN(Number(itemColor))) {
      if (this.isValidHEXColor(itemColor)) {
        return itemColor as any;
      } else {
        return '#FFFFFF';
      }
    } else {
      return `#${Number(itemColor).toString(16).padStart(6, '0')}`; // Fixes for color changes from apollo
    }
  }

  public lookupText(posParam: any): void {
    for (let [key, val] of Object.entries(posParam)) {
      let DictObj = this.getFromDict(key);
      if (DictObj != undefined && DictObj.LkUpGroupName != null && DictObj.LkUpGroupName != "") {
        let LkValues: LookUpChildOptions[] = this.lookUpData[DictObj.LkUpGroupName].options
        const LkSelected: LookUpChildOptions = LkValues.find(x => x.value == val);
        posParam[key + 'text'] = LkSelected ? LkSelected.text : "";
      }
      if (key.indexOf("LK") == 0) {
        if (key == 'LKCrunchMode') {
          val = val;
          if (val == 0 || val == null) {
            val = 2;
            posParam[key] = 2;
          }
        }
      }
    }
  }

  public getFromDict(key: string): Dictionary {
    if (!this.dictRecordsCache[key]) {
      let dictObj: Dictionary = this.dictConfigService.findByName(key);
      let dictObjHolder = { searched: true, actualData: dictObj };
      this.dictRecordsCache[key] = dictObjHolder;
    }
    return this.dictRecordsCache[key].actualData;
  }


  public prepareModelPosition(child: Position | PositionObjectResponse, data: Section | Planogram, originalItem?: Position, perfData?: PerfData): void {

    this.preparePositionModel(child, data, originalItem, perfData);

    this.insertRemainingDictionary(child);
  }

  public insertRemainingDictionary(data: any, filterOwners?: { includeOnlyPackageAttr: boolean }): any {
    let dictionaryList = [];
    if (filterOwners?.includeOnlyPackageAttr) {
      if (!this.packageAttributesDictionaries) {
        this.packageAttributesDictionaries = this.dictConfigService.getRecords()
          .filter(it => it.DictionaryName.startsWith("_") && it.Owner == 'PackageAttributes')
      }
      dictionaryList = this.packageAttributesDictionaries;
    } else {
      if (!this.nonPackageAttributeDictionaries) {
        this.nonPackageAttributeDictionaries = this.dictConfigService.getRecords()
          .filter(it => it.DictionaryName.startsWith("_") &&
            (filterOwners ? it.Owner != 'PackageAttributes' : true));
      }
      dictionaryList = this.nonPackageAttributeDictionaries;
    }
    dictionaryList.forEach(it => {
      if (['Position', 'Fixture', 'Product', 'ProductPackage', 'PackageAttributes'].includes(it.Owner)) {
        this.insertDictionary(it, data);
      } else if (it.Owner == 'Planogram') {
        this.insertSectionDictionary(it, data);
      }
    });
    return data;
  }

  public eachRecursivefun(obj: any): void {
    if (obj.hasOwnProperty('Children')) {
      obj.Children.forEach((child, key) => {
        if (Utils.checkIfPosition(child)) {
          this.syncAuthCodeWithVM.syncAuth(child);
        }
        this.eachRecursivefun(child);
      }, obj);
    }
  };

  public insertDictionary(dictData: any, data: any): void {
    const eachRecursiveDict = (obj, parent?) => {
      if (Utils.checkIfFixture(obj) && dictData.Owner === 'Fixture') {
        this.InsertFixtureProperties(obj, parent, dictData);
      }
      else if (Utils.checkIfPosition(obj)) {
        if (dictData.Owner === 'Position') {
          this.InsertPositionProperties(obj, dictData, "");
        } else if (dictData.Owner === 'Product') {
          this.InsertPositionProperties(obj, dictData, "Product");
        } else if (dictData.Owner === 'ProductPackage') {
          this.InsertPositionProperties(obj, dictData, "ProductPackage");
        } else if (dictData.Owner === 'PackageAttributes') {
          this.InsertPositionProperties(obj, dictData, "attributeObject");
        }
      }
      obj.Children?.forEach((child, key) => {
        eachRecursiveDict(child, obj);
      }, obj);
    };
    eachRecursiveDict(data);
  }
  public insertDefaultValue(obj, dictionary, defalutVal): void {
    obj[dictionary.DictionaryName] = {
      IDDictionary: dictionary.IDDictionary,
      [defalutVal.ID || 'IDPOGObject']: obj[defalutVal.ID || 'IDPOGObject'],
      Key: dictionary.DictionaryName,
      [defalutVal.key]: defalutVal.value
    }
  }
  public InsertFixtureProperties(child: any, obj: any, dictData: any): void {
    if (!child.Fixture.hasOwnProperty(dictData.DictionaryName)) {
      if (dictData.DictionaryName.startsWith('_')) {
        if (dictData.DataType == DictionaryFieldDataType.FLOAT || dictData.DataType == DictionaryFieldDataType.LONG || dictData.DataType == DictionaryFieldDataType.INT) {
          this.insertDefaultValue(child.Fixture, dictData, { key: 'ValData', value: Number(dictData.DefaultValue) ?? 0 });
        }
        else if (dictData.DataType === DictionaryFieldDataType.STRING) {
          this.insertDefaultValue(child.Fixture, dictData, { key: 'DescData', value: dictData.DefaultValue ?? null });
        }
        else if (dictData.DataType === DictionaryFieldDataType.DATE) {
          this.insertDefaultValue(child.Fixture, dictData, { key: 'DateData', value: dictData.DefaultValue ?? null });
        }
        else if (dictData.DataType === DictionaryFieldDataType.BOOL) {
          this.insertDefaultValue(child.Fixture, dictData, { key: 'FlagData', value: dictData.DefaultValue ?? false });
        }
        else if (dictData.DataType === DictionaryFieldDataType.BLOB) {
          this.insertDefaultValue(child.Fixture, dictData, { key: 'ImageData', value: dictData.DefaultValue ?? null });
        } else {
          this.insertDefaultValue(child.Fixture, dictData, { key: 'ValData', value: dictData.DefaultValue ?? null });
        }
      } else {
        child.Fixture[dictData.DictionaryName] = dictData.DefaultValue ?? null;
      }
    }
  }



  public InsertPositionProperties(child: any, dictData: any, prop: string): void {
    let positionObj = (prop == "") ? child.Position : child.Position[prop];
    const propID = { 'Product': 'IDProduct', 'ProductPackage': 'IDPackage', 'attributeObject': 'IdPackageAttribute' }[prop] || '';
    if (!positionObj?.hasOwnProperty(dictData.DictionaryName)) {
      if (dictData.DictionaryName.startsWith('_')) {
        if (dictData.DataType == DictionaryFieldDataType.FLOAT || dictData.DataType == DictionaryFieldDataType.LONG || dictData.DataType == DictionaryFieldDataType.INT) {
          this.insertDefaultValue(positionObj, dictData, { key: 'ValData', value: Number(dictData.DefaultValue) ?? 0, ID: propID });
        }
        else if (dictData.DataType === DictionaryFieldDataType.STRING) {
          this.insertDefaultValue(positionObj, dictData, { key: 'DescData', value: dictData.DefaultValue ?? null, ID: propID });
        }
        else if (dictData.DataType === DictionaryFieldDataType.DATE) {
          this.insertDefaultValue(positionObj, dictData, { key: 'DateData', value: dictData.DefaultValue ?? null, ID: propID });
        }
        else if (dictData.DataType === DictionaryFieldDataType.BOOL) {
          this.insertDefaultValue(positionObj, dictData, { key: 'FlagData', value: dictData.DefaultValue ?? false, ID: propID });
        }
        else if (dictData.DataType === DictionaryFieldDataType.BLOB) {
          this.insertDefaultValue(positionObj, dictData, { key: 'ImageData', value: dictData.DefaultValue ?? null, ID: propID });
        } else {
          this.insertDefaultValue(positionObj, dictData, { key: 'ValData', value: dictData.DefaultValue ?? null, ID: propID });
        }
      } else {
        positionObj[dictData.DictionaryName] = dictData.DefaultValue ?? null;
      }
    }
  }

  public insertSectionDictionary(dictData: any, obj: any): void {
    if (dictData.DictionaryName.indexOf(".") == -1) {
      if (!obj.hasOwnProperty(dictData.DictionaryName)) {
        if (dictData.DictionaryName.indexOf("_") == 0) {
          if (dictData.DataType == 4 || dictData.DataType == 6 || dictData.DataType == 7) {
            obj[dictData.DictionaryName] = {
              IDDictionary: dictData.IDDictionary,
              Key: dictData.DictionaryName,
              ValData: Number(dictData.DefaultValue) ?? 0

            }
          }
          else if (dictData.DataType === 1) {
            obj[dictData.DictionaryName] = {
              IDDictionary: dictData.IDDictionary,
              Key: dictData.DictionaryName,
              DescData: dictData.DefaultValue ?? null
            }
          }
          else if (dictData.DataType === 2) {
            obj[dictData.DictionaryName] = {
              IDDictionary: dictData.IDDictionary,
              Key: dictData.DictionaryName,
              DateData: dictData.DefaultValue ?? null
            }
          }
          else if (dictData.DataType === 3) {
            obj[dictData.DictionaryName] = {
              IDDictionary: dictData.IDDictionary,
              Key: dictData.DictionaryName,
              FlagData: dictData.DefaultValue ?? false
            }
          }
          else if (dictData.DataType === 5) {
            obj[dictData.DictionaryName] = {
              IDDictionary: dictData.IDDictionary,
              Key: dictData.DictionaryName,
              ImageData: dictData.DefaultValue ?? null
            }
          } else {
            obj[dictData.DictionaryName] = {
              IDDictionary: dictData.IDDictionary,
              Key: dictData.DictionaryName,
              ValData: dictData.DefaultValue ?? null
            }
          }
        } else {
          obj[dictData.DictionaryName] = dictData.DefaultValue ?? null;
        }
      }
    } else {
      let field = dictData.DictionaryName.split(".");
      if (!obj.hasOwnProperty(field[0])) {
        for (let i = 0; i < field.length; i++) {
          obj = obj[field[i]];
        }
        obj = dictData.DefaultValue ?? null;
      }
    }
  }

  public prepareModelFixture(child: any, data: any): void {
    this.insertRemainingDictionary(child);
    this.prepareFixtureModel(child, data);
  }

  // Intersection Utils
  public openIntersectionDialog(msg: InterSectionMessage): void {
    if (!this.dialogOpened) {
      this.dialogOpened = true;
      const dialogRef = this.matDialog.open(IntersectionmsgDialogComponent, {
        height: 'auto',
        width: '750px',
        data: msg
      });
      dialogRef.afterClosed().subscribe();
    }
  }

  public insertPogIDs(objArry: any, sweepArry: any, takeParentId?: any, actionName?: string): void {
    sweepArry ? this.effectedPogObjIds = [] : '';
    actionName ? this.effectedAction = actionName : '';
    //if null need to check all the pog objs for intersection
    if (objArry == null) {
      this.pogIntersectionsCheck = true;
    } else {
      this.pogIntersectionsCheck = false;
      for (let i = 0; i < objArry.length; i++) {
        let id = takeParentId ? objArry[i].$idParent : objArry[i].$id
        this.effectedPogObjIds.push(id);
      }
    }
  };


  public insertHistoryID(unqHistoryID: string): void {
    const sectionID = this.sharedService.getActiveSectionId();
    const rootObj = this.sharedService.getObject(sectionID, sectionID) as Section;
    if (this.historyUniqueID == null && rootObj.fitCheck) {
      this.historyUniqueID = unqHistoryID;
    } else if (Utils.isNullOrEmpty(unqHistoryID)) {
      this.historyUniqueID = null;
    }
  };

  public composeIntersectionMsg(intersectionArray: { [key: string]: string[]; }, sectionID: string): Array<string> {
    const fixturefitChekcObj = this.planogramStore.lookUpHolder.FixtureFitCheckStatus.options;
    const positionfitChekcObj = this.planogramStore.lookUpHolder.PositionFitCheckStatus.options;

    const formBayMessage = (fixture: FixtureList): string => {
      const bayObj = this.sharedService.getParentObject(fixture, sectionID);
      const bayMsg = bayObj.Fixture && bayObj.ObjectDerivedType == AppConstantSpace.MODULAR
        ? `${this.translate.instant("BAY_NO")}${bayObj.Fixture.FixtureNumber},`
        : ' ';
      return bayMsg;
    }
    const formStatusMessage = (fitCheckObj: LookUpChildOptions<any>[]): string => {
      var status = Utils.findFitCheckStatusText(fitCheckObj, AppConstantSpace.FITCHECK_COLLISION);
      if (status == AppConstantSpace.Collision) {
        status = `${status} ${this.translate.instant("DETECTED")}`;
      }
      return status;
    }

    var msgStringsArry: Array<string> = [];
    for (var key in intersectionArray) {
      var intersectingObj = this.sharedService.getObject(key, sectionID);
      if (intersectingObj.ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ
        || intersectingObj.ObjectDerivedType === AppConstantSpace.BLOCK_FIXTURE
        || intersectingObj.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ
        || intersectingObj.ObjectDerivedType == AppConstantSpace.BASKETOBJ
        || Utils.checkIfPegType(intersectingObj)
      ) {
        const bayMsg = formBayMessage(intersectingObj);
        const statusMsg = formStatusMessage(fixturefitChekcObj);

        const msgStr: string = this.translate.instant("SHELF") + ' ' + statusMsg + ','
          + bayMsg + intersectingObj.ObjectDerivedType + '#' + intersectingObj.Fixture.FixtureNumber;
        msgStringsArry.push(msgStr);
      } else if (intersectingObj.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
        const fixture = this.sharedService.getParentObject(intersectingObj, sectionID);
        const bayMsg = formBayMessage(fixture);
        const statusMsg = formStatusMessage(positionfitChekcObj);

        const msgStr: string = this.translate.instant("ITEM") + statusMsg + ','
          + bayMsg + fixture.ObjectDerivedType + '#' + fixture.Fixture.FixtureNumber + ','
          + this.translate.instant("FOOTER_POS_NO") + intersectingObj.Position.PositionNo + ','
          + this.translate.instant("FOOTER_UPC") + intersectingObj.Position.Product.UPC;
        msgStringsArry.push(msgStr);
      }
    }
    return msgStringsArry;
  };

  public getSelectedObject(sectionID: string): SelectableList[] {
    if (!sectionID) {
      sectionID = this.activeSectionID;
    }
    if (!this.sharedService.selectedID[sectionID]) {
      this.sharedService.selectedID[sectionID] = [];
    }


    const objList = this.sharedService.selectedID[sectionID].map((value) => {
      const object = this.sharedService.getObject(value, sectionID);

      return object;
    });
    return objList;
  }

  public getSelectedPosition(sectionID: string): Position[] {
    return this.getSelectedObject(sectionID).filter(obj => Utils.checkIfPosition(obj)) as Position[];
  }

  public getSelectionCount(sectionID: string): number {
    if (!sectionID) {
      sectionID = this.activeSectionID;
    }
    if (!this.rootFlags[sectionID]) {
      return 0;
    }
    return this.rootFlags[sectionID].selectionCount;
  }





  //----------------------------------API CAllS-----------------------//
  public saveAnnotationforReadonlyPlanogram(annotation: any): Observable<any> {
    let data = annotation;
    data.forEach((k, val) => {
      if (typeof val == "function") {
        delete data[k];
      }
    });
    //@todo Below API returns null always. Need to check with backend.
    return this.httpClient.post<IApiResponse<any>>(`${this.envConfig.shelfapi}${apiEndPoints.apiPathSaveAnnotationForReadOnlyPlanogram}`, JSON.stringify(data));
  }

  public getAnnotationsForPlanogram(pogID: number): Observable<IApiResponse<AnnotationResponse[]>> {
    return this.httpClient.get<IApiResponse<AnnotationResponse[]>>(`${this.envConfig.shelfapi}${apiEndPoints.apiPathAnnotationsForPlanogram}${pogID}`);
  }


  public doCrossbarPackNSpread(data: CrossbarInputJson, action: string): Observable<CrossbarSpreadPack> {
    let AppSettingsSvc = this.planogramStore.appSettings;
    var apiToSpreadNPack = AppSettingsSvc.pegHelperURL;
    apiToSpreadNPack = apiToSpreadNPack.replace("{{PegHelperAPI}}", apiEndPoints.apiCrossBarSpreadPack);
    apiToSpreadNPack = apiToSpreadNPack.replace("{{SpreadPackAction}}", action);
    let headers = new HttpHeaders();
    headers = headers.append('skipSuccessMsg', 'true');
    return this.httpClient.post<CrossbarSpreadPack>(apiToSpreadNPack, JSON.stringify(data), { headers });
  }

  public savePlanogramTemplate(pog: {Pog: Section, IncludeAnnotation: boolean}): Observable<IApiResponse<PogTemplate>> {
    this.removeSectionParent(pog.Pog);
    let headers = new HttpHeaders().append('Content-Type', 'application/json');
    return this.httpClient.post<IApiResponse<PogTemplate>>(`${this.envConfig.shelfapi}${apiEndPoints.apiToSavePlanogramTemplate}`, JSON.stringify(pog), { headers });
  }

  public getSystemTemplateList(): Observable<PogTemplate[]> {
    return this.httpClient.get<PogTemplate[]>(`${this.envConfig.shelfapi}${apiEndPoints.apiSystemSectionTemplates}`);
  }

  public doPegboardAlign(data: PegInputJson, action: string): Observable<PegAlign> {
    var apiToPegboardAlign = this.planogramStore.appSettings.pegHelperURL;
    apiToPegboardAlign = apiToPegboardAlign.replace("{{PegHelperAPI}}", apiEndPoints.apiPegBoardAlign);
    apiToPegboardAlign = apiToPegboardAlign.replace("{{PegAlignAction}}", action);
    let headers = new HttpHeaders();
    headers = headers.append('skipSuccessMsg', 'true');
    return this.httpClient.post<PegAlign>(apiToPegboardAlign, JSON.stringify(data), { headers });
  }

  //---------------------------------------------------------------------------------------------//

  public initBySectionIdMeasurment(sectionID: string): void {
    this.rootFlags[sectionID].unitFactor = 1;
    this.rootFlags[sectionID].sizeReductionFactor = 1;
    this.prepareForBestView(sectionID);
  }

  public prepareForBestView(sectionID: string): void {
    let sectionObj = this.sharedService.getObject(sectionID, sectionID) as Section;
    let widthInPixel = this.convertToPixelInOriginal(this.getWidth(sectionObj));
    let heightInPixel = this.convertToPixelInOriginal(this.getHeight(sectionObj));
    let optimalViewPixel = 2400; //by hit and trail, we tested and found this number
    this.rootFlags[sectionID].sizeReductionFactor = (widthInPixel + heightInPixel) / optimalViewPixel;
    if (this.sharedService.measurementUnit == 'IMPERIAL') {	//imperial
      this.rootFlags[sectionID].unitFactor = 96 / this.rootFlags[sectionID].sizeReductionFactor;
    }
    if (this.sharedService.measurementUnit == 'METRIC') {
      this.rootFlags[sectionID].unitFactor = 38 / this.rootFlags[sectionID].sizeReductionFactor;
    }
  };


  private getWidth(sectionObj: Section): number {
    if (sectionObj.showAnnotation) {
      return sectionObj.Dimension.Width + sectionObj.anDimension.left + sectionObj.anDimension.right;
    }
    return sectionObj.Dimension.Width;
  }

  public getHeight(sectionObj: Section): number {
    if (sectionObj.showAnnotation) {
      return sectionObj.Dimension.Height + sectionObj.anDimension.top + sectionObj.anDimension.bottom;
    }
    return sectionObj.Dimension.Height;
  }

  public initBySectionIdByPlanogramsetting(sectionID: string): void {
    this.rootFlags[sectionID].mode = this.planogramStore.appSettings.defaultViewMode;
    this.rootFlags[sectionID].blockview = BlockDisplayType.DEFAULT;
    this.rootFlags[sectionID].LogHistory = { enable: false, isApiCalled: false };
    this.rootFlags[sectionID].scaleFactor = 0;
    this.rootFlags[sectionID].isModularView = false;
    this.rootFlags[sectionID].isGrillView = true;
    this.rootFlags[sectionID].isAnnotationView = 1;
    this.rootFlags[sectionID].isActionPerformed = 0;
    this.rootFlags[sectionID].isDragging = false;
    this.rootFlags[sectionID].ctrlDragClonedPositions = [];
    this.rootFlags[sectionID].isItemCopied = false;
    this.rootFlags[sectionID].isFixtureCopied = false;
    this.rootFlags[sectionID].displayWorksheet = { Cart: false, Planogram: true };
    this.rootFlags[sectionID].isItemScanning = false;
    this.rootFlags[sectionID].allocateRetainVals = null;
    this.rootFlags[sectionID].marchingAntResize = function (panelId: string, sectionId: string, scaleF: number) { };
    this.rootFlags[sectionID].asyncSaveFlag = { isPOGSavingInProgress: false, isPOGChangedDuringSave: false, SVG: '', historySaveFlag: -1, temphistorySaveFlag: -1 };
    this.rootFlags[sectionID].isAnnotationCopied = false;
  }


  public initBySectionIdByHighlight(sectionID: string): void {
    this.rootFlags[sectionID].isEnabled = false;
    if (!this.initHighlightSetting) {
      this.initHighlightSetting = true;
      this.resetTemplateRangeModel();
    }
  }

  public resetTemplateRangeModel(): void {
    this.templateRangeModel.rangeModel = [];
    this.templateRangeModel.rangeModelCount = [];
    this.templateRangeModel.count = false;
    this.templateRangeModel.highlightType = '';
    this.templateRangeModel.fieldStr = '';
    this.templateRangeModel.defaultColor = '#8B8B8B';
    this.templateRangeModel.numericRangeAttr = {};
    this.templateRangeModel.stringMatchAttr = {};
    this.templateRangeModel.spectrumAttr = {};
    this.templateRangeModel.spectrumAttr.modelSP_legend = false;
    this.templateRangeModel.fieldObjectChosen = {};
    this.templateRangeModel.defaultLabel = 12345;
    this.templateRangeModel.excludeZeroVal = false;
  }

  public addToSelectionById($id: string, sectionID: string, isOpenPropertyGrid: boolean = true): void {
    if (!sectionID) {
      sectionID = this.activeSectionID;
    }
    if (!this.sharedService.selectedID[sectionID]) {
      this.sharedService.selectedID[sectionID] = [];
    }
    let index = this.sharedService.selectedID[sectionID].indexOf($id);
    if (index == -1) {
      this.removeSelectedAnnotation(sectionID, null)
      let object = this.sharedService.getObject($id, sectionID);
      object.selected = true;
      this.updateNestedStyleDirty = true;;
      this.setLastSelectedObjectDerivedType(object.ObjectDerivedType, sectionID);
      this.setLastSelectedObjectType(object.ObjectType, sectionID);
      this.sharedService.selectedID[sectionID].push($id);
      this.setLastSelectedObjCartStatus(object, sectionID)
      this.rootFlags[sectionID].selectionCount = this.sharedService.selectedID[sectionID].length;
      // annotation does not support property pane and footer messages
      if (object.ObjectDerivedType != AppConstantSpace.ANNOTATION) {
        this.sharedService.updateFooterNotification.next(true);
        if (isOpenPropertyGrid) {
          this.openPropertyGrid(object);
        }
        this.updateAnnotationDialog.next({refObj: object as ( Position | Fixture | Section), hierarchy: 'DUMMY_PLACEHOLDER'});
      }
    }

  }

  public addToSelectionByObject(obj: ObjectListItem, sectionID: string, isOpenPropertyGrid:boolean = true): void {
    if (!sectionID) {
      sectionID = this.activeSectionID;
    }
    if (!this.sharedService.selectedID[sectionID]) {
      this.sharedService.selectedID[sectionID] = [];
    }
    const index = this.sharedService.selectedID[sectionID].indexOf(obj.$id);
    if (index === -1) {
      this.removeSelectedAnnotation(sectionID, null);
      obj.selected = true;
      this.updateNestedStyleDirty = true;;
      this.setLastSelectedObjectDerivedType(obj.ObjectDerivedType, sectionID);
      this.setLastSelectedObjectType(obj.ObjectType, sectionID);
      this.sharedService.selectedID[sectionID].push(obj.$id);
      this.setLastSelectedObjCartStatus(obj, sectionID);
      this.rootFlags[sectionID].selectionCount = this.sharedService.selectedID[sectionID].length;
      // annotation does not support property pane and footer messages
      if (obj.ObjectDerivedType != AppConstantSpace.ANNOTATION) {
        this.sharedService.updateFooterNotification.next(true);
        if (isOpenPropertyGrid) {
          this.openPropertyGrid(obj);
        }
        this.updateAnnotationDialog.next({refObj: obj as ( Position | Fixture | Section), hierarchy: 'DUMMY_PLACEHOLDER'});
      }
    }
  }

  public checkSelectedByObject(obj: ObjectListItem, sectionID: string): number {
    if (!sectionID) {
      sectionID = this.activeSectionID;
    }
    return this.checkSelectedById(obj.$id, sectionID);
  }

  public checkSelectedById($id: string, sectionID: string): number {
    if (!sectionID) {
      sectionID = this.activeSectionID;
    }
    return this.sharedService.selectedID[sectionID].indexOf($id);
  }

  public getSelectedId(sectionID: string): any {

    if (!sectionID) {
      sectionID = this.activeSectionID;
    }

    if (!this.sharedService.selectedID[sectionID]) {
      this.sharedService.selectedID[sectionID] = [];
    }

    return this.sharedService.selectedID[sectionID];
  }

  public removeSelectedAnnotation(sectionID?: string, annotationObj?: Partial<Annotation>): void {
    if (!sectionID || !this.sharedService.selectedAnnotation[sectionID]) {
      sectionID = this.activeSectionID;
    }
    if (annotationObj) {
      this.sharedService.selectedAnnotation[sectionID] && (_.find(this.sharedService.selectedAnnotation[sectionID], { $id: annotationObj.$id }).selected = false)
    } else {
      this.sharedService.selectedAnnotation[sectionID] && this.sharedService.selectedAnnotation[sectionID].map(itm => {
        return itm.selected = false;
      });
      this.sharedService.selectedAnnotation[sectionID] = [];
    }
  }

  public setSelectedAnnotation(sectionID: string, annotationObj: Partial<Annotation>): void {
    if (!sectionID) {
      sectionID = this.activeSectionID;
    }
    annotationObj.selected = true;
    this.sharedService.selectedAnnotation[sectionID].push(annotationObj);
  }

  public getSelectedAnnotation(sectionID: string): Annotation[] {
    if (!sectionID) {
      sectionID = this.activeSectionID;
    }
    return this.sharedService.selectedAnnotation[sectionID];
  }

  public removeFromSelectionByObject(obj: any, sectionID: string): void {
    const currentFixtureObj = this.sharedService.getParentObject(obj, sectionID);
    if (currentFixtureObj.ObjectDerivedType === AppConstantSpace.SHOPPINGCARTOBJ) {
      return;
    }
    if (!sectionID) {
      sectionID = this.activeSectionID;
    }
    if (!this.sharedService.selectedID[sectionID]) {
      this.sharedService.selectedID[sectionID] = [];
    }
    const indexOf = this.sharedService.selectedID[sectionID].indexOf(obj.$id);
    if (indexOf !== -1) {
      obj.selected = false;
      this.updateNestedStyleDirty = true;;
      this.sharedService.selectedID[sectionID].splice(indexOf, 1);
      this.rootFlags[sectionID].selectionCount = this.sharedService.selectedID[sectionID].length;
      this.setLastSelectedObjCartStatus(this.sharedService.selectedID[sectionID][this.rootFlags[sectionID].selectionCount - 1], sectionID);
      // this.prototype.makeItemDragDestroy(obj);
      if((this.rootFlags[sectionID].selectionCount > 1 &&
        this.sharedService.lastSelectedObjectType[sectionID] === AppConstantSpace.FIXTUREOBJ) || this.sharedService.lastSelectedObjectType[sectionID] === AppConstantSpace.POSITIONOBJECT){
          this.openPropertyGrid(obj);
        }
      this.sharedService.updateFooterNotification.next(true);
    }
  }

  public openPropertyGrid(item: any): void {
    if (this.PogSideNavStateService.propertiesView.isPinned) {
      this.sharedService.propertyGridUpdateData.next(item);
    }
  }

  public setLastSelectedObjCartStatus(obj: any, sectionID: any): void {
    if (!sectionID) {
      sectionID = this.activeSectionID;
    }
    if (Utils.checkIfPosition(obj)) {
      this.sharedService.lastSelectedObjCartStatus[sectionID] = (obj.Position as any).IsCartItem;
    }
  }

  public initBySectionIdByCommunicator(sectionID: string): void {
    this.sharedService.selectedID[sectionID] = [];
    this.sharedService.lastSelectedObjectDerivedType[sectionID] = '';
    this.sharedService.lastSelectedObjectType[sectionID] = '';
    this.rootFlags[sectionID] = {} as PogSettings;
    this.rootFlags[sectionID].isSaveDirtyFlag = false;
    this.rootFlags[sectionID].isAutoSaveDirtyFlag = false;
    this.rootFlags[sectionID].selectionCount = 0;
    this.sharedService.lastSelectedObjCartStatus[sectionID] = false;
    this.sharedService.selectedAnnotation[sectionID] = [];
    this.updateSaveDirtyFlag(false);
  }

  public setSelectedIDPOGPanelID(panelId: any): void {
    this.selectedPogPanelID = panelId;
  }

  public getSettingsBySectionId(sectionID: string): any {
    if (!this.rootFlags[sectionID]) {
      return false;
    }
    return this.rootFlags[sectionID];
  }

  public modelHLField(field: string): void {
    for (var i = 0; i < this.lookupHL.length; i++) {
      if (this.lookupHL[i].value == field) {
        this.templateRangeModel.fieldObjectChosen = this.lookupHL[i];
        this.setFieldOption(this.lookupHL[i]);

      }
    }
  }

  public getFieldOption(): any {
    return this.fieldOption;
  }

  public setFieldOption(obj: any): any {
    this.fieldOption = obj;
  }



  public getShelfLabelObject(params: any, data: any, calcMechanism, label): any {
    let svgCommon = new CommonSVG();
    let tempObj = svgCommon.getShelfLabelObject(params, data, calcMechanism, label, this.labelFixtItem, this.labelFixtAllFields);
    return tempObj;
  }

  public getType(data: any): string {
    return data.ObjectDerivedType;
  }

  public selectNextFixture(data: FixtureList): void {
    let currentFixtureObj: FixtureList = this.sharedService.getParentObject(data, data.$sectionID);
    let nextFixture: FixtureList = null;
    if (data.selected && data.selected === true) {
      nextFixture = this.getNextFixtureObject(currentFixtureObj, data);
    }
    if (!_.isEmpty(nextFixture)) {
      this.addToSelectionByObject(nextFixture, data.$sectionID);
      this.removeFromSelectionByObject(data, data.$sectionID);
    }
  }


  public getNextFixtureObject(currentFixtureObj: FixtureList, currentObj: FixtureList): FixtureList {
    const rootObj: Section = this.sharedService.getObject(currentFixtureObj.$sectionID, currentObj.$sectionID) as Section;
    let fixtureFullPathCollection: FixtureList[] = rootObj.getFixtureFullPathCollection();
    let currentObjectIndex: number = fixtureFullPathCollection.indexOf(currentObj);
    if (currentObjectIndex == fixtureFullPathCollection.length - 1) {
      return;
    } else {
      return fixtureFullPathCollection[currentObjectIndex + 1];
    }

  }

  public selectPreviousFixture(data: FixtureList): void {
    let currentFixtureObj: FixtureList = this.sharedService.getParentObject(data, data.$sectionID);
    let nextFixture: FixtureList = null;
    if (data.selected && data.selected === true) {
      nextFixture = this.getPreviousFixtureObject(currentFixtureObj, data);
      if (!_.isEmpty(nextFixture)) {
        this.addToSelectionByObject(nextFixture, data.$sectionID);
        this.removeFromSelectionByObject(data, data.$sectionID);
      }
    }
  }


  public getPreviousFixtureObject(currentFixtureObj: FixtureList, currentObj: FixtureList): FixtureList {
    const rootObj: Section = this.sharedService.getObject(currentFixtureObj.$sectionID, currentObj.$sectionID) as Section;
    let fixtureFullPathCollection: FixtureList[] = rootObj.getFixtureFullPathCollection();
    let currentObjectIndex: number = fixtureFullPathCollection.indexOf(currentObj);
    if (currentObjectIndex == 0) {
      return;
    } else {
      return fixtureFullPathCollection[currentObjectIndex - 1];
    }
  }


  public addByID(sectionID: string, mixinID: string, obj: any): void {
    if (Utils.isNullOrEmpty(this.sharedService.objectList[sectionID][mixinID])) {
      this.sharedService.objectList[sectionID][mixinID] = obj;
      if (obj.IDPOGObject || obj.IDPOG)
        this.sharedService.objectListByIDPOGObject[sectionID][obj.IDPOGObject || obj.IDPOG] = obj;
    }
  }

  public cleanByID(sectionID: string, mixinID: string): void {
    let obj = this.sharedService.objectList[sectionID][mixinID] as any;
    if (obj.selected) {
      this.removeFromSelectionByObject(obj, sectionID);
    }
    delete this.sharedService.objectList[sectionID][mixinID];
    if (obj.IDPOGObject || obj.IDPOG)
      delete this.sharedService.objectListByIDPOGObject[sectionID][obj.IDPOGObject || obj.IDPOG];
  }

  public getModularObject(obj: any): any {
    var parent = obj;
    while (parent.ObjectDerivedType != AppConstantSpace.MODULAR && parent.ObjectDerivedType != AppConstantSpace.SECTIONOBJ) {
      parent = this.sharedService.getObject(parent.$idParent, parent.$sectionID);
    }
    return parent;
  }

  public getAllBlocks(pogObj: Planogram): Array<any> {
    let blocksArr: Array<any> = [];
    let recursive = function (obj) {
      if (obj.hasOwnProperty('Children') && obj.ObjectDerivedType != AppConstantSpace.SHOPPINGCARTOBJ) {
        obj.Children.forEach((child: any) => {
          if (child.ObjectDerivedType === AppConstantSpace.BLOCKOBJECT) {
            blocksArr.push(child);
          }
          recursive(child);
        });
      }
    }

    recursive(pogObj);
    return blocksArr;
  }

  public checkIfObjectDirty(planogram: POGLibraryListItem): boolean {
    if (!planogram?.sectionID) { return false; }

    if (!planogram.isLoaded) { return false; }

    if (typeof this.rootFlags[planogram.sectionID] == 'undefined') {
      return false;
    }
    planogram.isSaveDirtyFlag = this.rootFlags[planogram.sectionID].isSaveDirtyFlag
    // This will not work. when you have one dirty and other non dirty pogs, this method will constantly switch b/w true and false values.
    //this.sharedService.GridValueUpdated(o.isSaveDirtyFlag);
    return this.rootFlags[planogram.sectionID].isSaveDirtyFlag
  }


  public deepReadObject(obj: any): void {
    for (var val in obj) {
      try {
        typeof obj[val] == 'object' ? this.deepReadObject(obj[val]) : '';
      } catch (e) {
        console.error('Error while reading calculated fields.');
      }
    }

  }

  public readCalculatedFieldFromData(data: any): void {

    switch (data.ObjectType) {
      case "Position":
        this.deepReadObject(data._CalcField);
        this.deepReadObject(data.Position.inventoryObject);
        this.deepReadObject(data.Position.attributeObject);
        break;
      case "Fixture":
        this.deepReadObject(data._CalcField);
        break;
      case "POG":
        this.deepReadObject(data._CalcField);
        this.deepReadObject(data.InventoryModel);
        break;
    }
  }

  public markRequestToCheckout(requestCollection: Array<any>, action?: string): Observable<any> {
    let data;
    let start_TM = new Date();
    let requestToCheckoutSub;
    let subject = new Subject<string>();
    let preparePostObject = this.makePreparePostData(requestCollection, 'Checkout', '');
    requestToCheckoutSub = this.requestCheckInOut(preparePostObject);
    requestToCheckoutSub.subscribe((d: any) => {
      if (d.Data) {
        for (let i = 0; i < d.Data.length; i++) {
          if (d.Data[i].canEdit) {
            let obj = this.findObjFromCollection(requestCollection, d.Data[i].idPog);
            this.makeClientSideCheckedOut(obj, action);
            if (this.sharedService.link == 'allocate') {
              obj['azureBlobToken'] = d.Data[i]['azureBlobToken'];
            }
          } else {
            let errorList = [];
            errorList.push({
              "Message": d.Data[i].message,
              "Type": 1,
              "Code": "CheckOut",
              "SubType": "CheckOutInfo",
              "IsClientSide": true,
              "PlanogramID": d.Data[i].idPog,
              "Option": {
                '$id': null,
                '$sectionID': null,
                'Group': 'CheckOut'
              }
            });
          }
        }
      }
      subject.next(d);
      subject.complete();
    }, (error) => {
      let errorList = [];
      errorList.push({
        "Message": error,
        "Type": -1,
        "Code": "CheckOut",
        "SubType": "CheckOut",
        "IsClientSide": true,
        "PlanogramID": "G",
        "Option": {
          '$id': null,
          '$sectionID': null,
          'Group': 'CheckOut'
        }
      });
      console.log("Error while checkout planogram");
      subject.next(error);
      subject.complete();
    })

    return subject.asObservable();
  }

  public markRequestToCheckIn(requestCollection: Array<POGLibraryListItem>): void {
    let checkedOutPogs: POGLibraryListItem[];
    if (this.parentApp.isAllocateApp) {
      checkedOutPogs = requestCollection;
    } else {
      checkedOutPogs = requestCollection.filter(m => m.checkedoutManually);
    }
    let preparePostObject = this.makePreparePostData(checkedOutPogs, 'CheckIn', '');
    let requestToCheckInSub = this.requestCheckInOut(preparePostObject);
    requestToCheckInSub.subscribe((d: IApiResponse<CheckinCheckout>) => {
      if (d.Data) {
        for (let i = 0; i < checkedOutPogs.length; i++) {
          this.makeClientSideCheckedIn(checkedOutPogs[i]);
        }
      }
    }, (error) => {
      let errorList = [];
      errorList.push({
        "Message": error,
        "Type": -1,
        "Code": "CheckIn",
        "SubType": "CheckIn",
        "IsClientSide": true,
        "PlanogramID": "G",
        "Option": {
          '$id': null,
          '$sectionID': null,
          'Group': 'CheckIn'
        }
      });
      this.log.error("Error while checkin planogram");
    });
  }

  public makePreparePostData(collection?: Array<any>, requestTo?: string, comments?: string): PogCheckinCheckout {
    const preparePostObject: PogCheckinCheckout = {
      Comments: '',
      IsCheckedOut: false,
      data: []
    };
    const dynamicVar = (requestTo === 'Pin' || requestTo === 'Unpin') ? 'IsPinning' : 'IsCheckedOut';
    preparePostObject[dynamicVar] = (requestTo === 'Pin' || (requestTo === 'Checkout')) ? true : false;
    preparePostObject.Comments = comments;
    preparePostObject.data = [];

    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < collection.length; i++) {
      // filtering already stated then ignore
      let obj: any = {};
      if (!collection[i]) {
        continue;
      }
      if (collection[i].isPinned && requestTo === 'Pin') {
        continue;
      }
      if (!collection[i].isPinned && requestTo === 'Unpin') {
        continue;
      }

      obj.IDPOG = collection[i].IDPOG;
      if (dynamicVar !== 'IsCheckedOut') {
        obj.IDPOGStatus = '2';
        obj.IDProject = this.planogramStore.projectId;
        obj.IDPOGScenario = this.planogramStore.scenarioId;
      } else {
        obj.Version = collection[i].PogVersion || '';
        collection[i].PogVersion = undefined;
      }
      if (this.parentApp.isAllocateApp) {
        obj.displayVersion = collection[i].displayVersion;
      }
      preparePostObject.data.push(obj);
    }
    return preparePostObject;
  };



  public requestCheckInOut(requestCollection): Observable<IApiResponse<CheckinCheckout>> {
    if (this.sharedService.link == 'allocate') {
      return this.checkOutAllocatePog(requestCollection);
    }
    else {
      // Added 'skipSuccessMsg' as a header option to skip success message (toaster)
      let headers = new HttpHeaders();
      headers = headers.append('skipSuccessMsg', 'true');
      return this.httpClient.post<IApiResponse<CheckinCheckout>>(`${this.envConfig.shelfapi}${apiEndPoints.pogCheckinCheckout}`, requestCollection, {headers});
    }
  };

  public useFetchKeepAliveToCheckInPogs(data: PogCheckinCheckout): void {
    fetch(`${this.envConfig.shelfapi}${apiEndPoints.pogCheckinCheckout}`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
        'UserId': this.userService?.userId || '',
        'i2eTKey': this.userService?.tkey || '',
        'IDCorp': this.userService.iDCorp?.toString() || '',
        'skipSuccessMsg': 'true'
      },
      /* note: the `keepalive` option can be only used to allow the request to outlive the page,
      which is necessery here for pog checkin on page reload/browser close event*/
      keepalive: true,
    });
  }

  private checkOutAllocatePog(requestCollection): Observable<any> {
    let displayVersion = requestCollection.data[0].displayVersion ? requestCollection.data[0].displayVersion : requestCollection.data[0].IDPOG;
    let pogID = requestCollection.data[0].IDPOG;
    let pType = window.parent.mode == 'manual' ? 'Model' : 'SSPOG';
    pType = window.parent.optimizeMode ? 'Manual' : pType;
    const url = encodeURI(
      `${this.allocateAppUrl}/api/CheckInCheckOutpog`
      + `?code=${this.allocateAuthCode}&pogId=${displayVersion}`
      + `&userid=${this.user.emailId}&checkout=${requestCollection.IsCheckedOut}`
      + `&scenarioId=${this.planogramStore.scenarioId}&pogType=${pType}`
    );
    //@Todo Karthik H, will update this response type.
    return this.httpClient.get<IApiResponse<any>>(url).pipe(map(response => {

      let token = {};
      token['jsonAccessInfo'] = response['jsonAccessInfo'];
      token['svgAccessInfo'] = response['svgAccessInfo'];
      let mockResponse: any = {
        'canEdit': '', 'userId': response['checkedOutTo'],
        'idPog': pogID,
        message: this.translate.instant('THE_POG_IS_BEING_EDITED_BY') + ' ' + response['checkedOutTo'] + '',
        'azureBlobToken': token
      }
      let res = { 'Data': [] };

      if (response['checkedOutTo'] == this.user.emailId)
        mockResponse.canEdit = true;
      else
        mockResponse.canEdit = false;
      res.Data.push(mockResponse);
      //response = res;
      return res;
    }))
  }

  public markPogObjCheckedout(idpogs: Array<any>): Array<any> {
    idpogs.forEach((pog) => {
      pog.checkedoutManually = true;
    });
    return idpogs;
  };


  public makeClientSideCheckedOut(sendObj: any, action: string): void {
    sendObj.CheckoutOwner = this.user.emailId;
    sendObj.isCheckedOut = (sendObj.CheckoutOwner != null);
    sendObj.isCheckInOutEnable = (sendObj.CheckoutOwner == null) || (sendObj.CheckoutOwner == this.user.emailId);
    action == 'syncPog' || action == 'promote' ? '' : (sendObj.checkedoutManually = true);
  };


  public makeClientSideCheckedIn(sendObj: POGLibraryListItem): void {
    sendObj.CheckoutOwner = null;
    sendObj.isCheckedOut = (sendObj.CheckoutOwner != null);
    sendObj.isCheckInOutEnable = (sendObj.CheckoutOwner == null) || (sendObj.CheckoutOwner == this.user.emailId);
    sendObj.checkedoutManually = false;
  }

  public findObjFromCollection(collection: Array<any>, IDPOG: number): any {
    for (var i = 0; i < collection.length; i++) {
      if (collection[i].IDPOG == IDPOG) {
        return collection[i]
      }
    }
  }

  public getSelectedIDPOGPanelID(): string {
    return this.selectedPogPanelID;
  }

  public updateSaveDirtyFlag(flag: boolean, sectionID?: string): void {
    if (!sectionID) {
      sectionID = this.sharedService.getActiveSectionId();
    }
    if (this.rootFlags[sectionID] == undefined) {
      this.sharedService.OldIsSaveDirtyFlag[sectionID] = this.sharedService.NewIsSaveDirtyFlag[sectionID];
      this.sharedService.NewIsSaveDirtyFlag[sectionID] = false;
    } else {
      this.sharedService.OldIsSaveDirtyFlag[sectionID] = this.sharedService.NewIsSaveDirtyFlag[sectionID];
      this.sharedService.NewIsSaveDirtyFlag[sectionID] = this.rootFlags[sectionID].isSaveDirtyFlag;
    }
    if (this.sharedService.NewIsSaveDirtyFlag[sectionID] != this.sharedService.OldIsSaveDirtyFlag[sectionID]) {
      if (this.sharedService.NewIsSaveDirtyFlag[sectionID]) {
        this.saveDirtyFlag.next({ 'isSaveDirtyFlag': flag, 'sectionID': sectionID })
      }
    }
  }

  public updateSectionObjectIntoStore(IDPOG: number, sectionObject: any): void {
    const pog = this.planogramStore.downloadedPogs.find(it => it.IDPOG === IDPOG);
    if (pog) {
      pog.sectionObject = sectionObject;

    }
  }


  public getUpdatedView(panelData: any): string {

    switch (panelData.selectedViewKey) {

      case 'POGLIB_HEADERMENU_1_VIEW_STORE':
        return 'store'
      case 'POGLIB_HEADERMENU_1_VIEW_POSITION':
        return 'positionWS';
      case 'POGLIB_HEADERMENU_1_VIEW_ITEM':
        return 'itemWS';
      case 'POGLIB_HEADERMENU_1_VIEW_FIXTURE':
        return 'fixtureWS';
      case 'POGLIB_HEADERMENU_1_VIEW_INVENTORY':
        return 'inventoryWS';
      case 'POGLIB_HEADERMENU_1_VIEW_3D':
        return 'threeDPlanoViewer';
      case 'POGLIB_HEADERMENU_1_VIEW_PERFORMANCE':
        return 'performanceWS';
      default:
        return 'panelView';
    }
  }

  public setPinUnpinAppSetting(): Observable<void> {
    let appSettingsSvc = this.planogramStore.appSettings;

    appSettingsSvc.Anchor_settings['sappHighlightTool'].pinned = this.PogSideNavStateService.highlightView.isPinned
    appSettingsSvc.Anchor_settings['sappPropertyGridDialog'].pinned = this.PogSideNavStateService.propertiesView.isPinned;
    appSettingsSvc.Anchor_settings['sappShoppingCartDialog'].pinned = this.PogSideNavStateService.shoppingCartView.isPinned;
    appSettingsSvc.Anchor_settings['sappShoppingCartDialog'].pos = this.PogSideNavStateService.shoppingCartView.pos || 'right';
    appSettingsSvc.Anchor_settings['sappProductsSearchListDialog'].pinned = this.PogSideNavStateService.productLibView.isPinned;
    appSettingsSvc.Anchor_settings['sappCharts'] = {
      isActive: this.PogSideNavStateService.activeVeiw === PogSideNaveView.CHARTS ? true : false,
      pinned: this.PogSideNavStateService.chartsView.isPinned
    }
    this.PogSideNavStateService.updateActiveView(appSettingsSvc.Anchor_settings) //need to remove this once we change the object structure from backend too
    const keyvalue = JSON.stringify(appSettingsSvc.Anchor_settings);
    const updatedSettings = {
      KeyName: 'ANCHORING_FLAG',
      KeyValue: keyvalue,
      KeyType: 'string'
    }
    const AppSettings = {
      AppSettings: {
        User: null,
        KeyGroup: "POG",
        Values: [updatedSettings]
      }
    }

    return this.appSettingsService.saveSettings(AppSettings, true)
      .pipe(map((res) => {
        if (res) {
          this.PogSideNavStateService.setDefaultSideNavProperties(appSettingsSvc.Anchor_settings as any);
        }
      }));
  }
  //Modify the formatGrills method when new types of Grills are added (e.g., Top, Back, Side grills).
  private formatGrills(obj: StandardShelf): void {
    if (obj.Children.length
      && obj.Children.filter(item => item.Fixture?.FixtureType == AppConstantSpace.GRILLOBJ).length) {
      let grills = obj.Children.filter(item => item.Fixture?.FixtureType == AppConstantSpace.GRILLOBJ);
      obj.Children = obj.Children.filter(item => item.Fixture?.FixtureType != AppConstantSpace.GRILLOBJ);
      const grillPlacements = [...new Set(grills.map(item => item.Fixture._GrillPlacement.ValData))] as number[];
      //giving the preference to Front grills
      grills = grills.filter(item => item.Fixture._GrillPlacement.ValData == Math.max(...grillPlacements));
      if (!grills.filter(item => item.Location?.X == 0 && item.Location?.Y == 0 && item.Location?.Z == 0).length) {
        grills[0].Location.X = 0;
        grills[0].Location.Y = 0;
        grills[0].Location.Z = 0;
        grills = [grills[0]];
      }
      if (grills[0].Dimension.Depth != 0 || grills[0].Dimension.Width != 0) {
        grills[0].Dimension.Width = 0;
        grills[0].Dimension.Depth = 0;
        grills[0].Fixture.Width = 0;
        grills[0].Fixture.Depth = 0
      }
      obj.Children = [...obj.Children, grills[0]];
    }

  }

  public removeSectionParent(section: Section): void {
    const eachRecursive = (obj) => {
      (obj as any)._parent = undefined;
      if (obj.hasOwnProperty('Children')) {
        obj.Children.forEach((child, key) => {
          eachRecursive(child);
        }, obj);
      }
    }
    eachRecursive(section);
    this.removeCoffincaseShrinkCache(section);
  }

  // Note : Clear allPosInXDirection and allPosInYDirection var which is used only in shrink calculation in coffin case
  private removeCoffincaseShrinkCache(section: Section): void{
    let coffincases = [];
    // Note: To handle Add to planogram template case
    if (!section.getAllCoffinCases) {
      const secObj = this.sharedService.getObject(this.sharedService.getActiveSectionId(), this.sharedService.getActiveSectionId()) as Section;
      coffincases = secObj.getAllCoffinCases();
    } else {
      coffincases = section.getAllCoffinCases();
    }
    coffincases.forEach(cc => { 
      cc.allPosInXDirection = {};
      cc.allPosInYDirection = {};
    });
  }

  private sortByXPos(obj) {
    if (obj == undefined) { return obj };
    return obj.sort((a, b) => {
      let x1 = (a.Location.X == null) ? 0 : a.Location.X;
      let x2 = (b.Location.X == null) ? 0 : b.Location.X;
      if (x1 == x2) {
        x1 = (a.Location.Y == null) ? 0 : a.Location.Y;
        x2 = (b.Location.Y == null) ? 0 : b.Location.Y;
        if (x1 == x2) {
          x2 = (a.Location.Z == null) ? 0 : a.Location.Z;
          x1 = (b.Location.Z == null) ? 0 : b.Location.Z;
        }
      }
      return x1 - x2;
    });
  }

  public getAvailableOrientations(selectedPositions: Position[]): OrientationsObject {
    let orientationsGroups = [];
    let orientationsList = [];
    let allowedOrientationsCommmon = [];
    if (selectedPositions && selectedPositions[0].Position?.AvailablePackageType) {
      allowedOrientationsCommmon = selectedPositions[0].Position?.AvailablePackageType?.find(item => item.IdPackageStyle == selectedPositions[0].Position.ProductPackage.IdPackageStyle && item.IDPackage == selectedPositions[0].Position.IDPackage)?.AvailablePackageOrientations;
    }
    if (!allowedOrientationsCommmon?.length) {
      allowedOrientationsCommmon = Object.values(this.orientation.Orientation);
    }
    for (let index = 0; index < selectedPositions.length; index++) {
      let allowedOrientations = selectedPositions[index].Position?.AvailablePackageType && selectedPositions[index].Position?.AvailablePackageType?.find(item => item.IdPackageStyle == selectedPositions[index].Position.ProductPackage.IdPackageStyle && item.IDPackage == selectedPositions[index].Position.IDPackage)?.AvailablePackageOrientations;
      if (!allowedOrientations?.length) {
        allowedOrientations = Object.values(this.orientation.Orientation);
      }
      allowedOrientationsCommmon = allowedOrientationsCommmon.filter(item => allowedOrientations.includes(item));
    }
    this.planogramStore.allOrientationGroups.forEach(group=>{
      if (allowedOrientationsCommmon?.length) {
        group = group.filter(element => allowedOrientationsCommmon.includes(element.value));
      }
      if (group?.length) {
        orientationsGroups.push(group);
        orientationsList = orientationsList.concat([...group]);
      }
    })
    return { orientationsGroups: orientationsGroups, orientationsList: orientationsList };
  }


  public generateAllOrientations(){
    let orientationsGroups = [];
    const keyToCompare = Object.keys(AppConstantSpace.ORIENTATION_VIEW);
    keyToCompare.forEach(key => {
      let group = this.planogramStore.lookUpHolder.Orientation.options;
      group = group.filter(ele => {
        let index = Object.values(this.orientation.Orientation).indexOf(ele.value);
        return Object.keys(this.orientation.Orientation)[index].toLowerCase().indexOf(key.toLowerCase()) === 0;
      });
      if (group?.length) {
        orientationsGroups.push(group);
      }
    });
    this.planogramStore.allOrientationGroups = orientationsGroups;
  }

  public isSameProduct(selectedPositions: Position[]){
    let sameProduct = false;
    let duplicatePositions = (selectedPositions.filter(ele => {
      return ele.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT &&
        ele.Position.Product.UPC === selectedPositions[0].Position.Product.UPC &&
        ele.Position.IDPackage === selectedPositions[0].Position.IDPackage &&
        ele.Position.IDProduct === selectedPositions[0].Position.IDProduct
    })) as Position[];
    if (duplicatePositions?.length == selectedPositions?.length) {
      sameProduct = true;
    }
    return sameProduct;
  }

  public doCoffinAlign(data: PegInputJson, action: string): Observable<PegAlign> {
    let apiToCoffinAlign = this.planogramStore.appSettings.pegHelperURL;
    apiToCoffinAlign = apiToCoffinAlign.replace("{{CoffinHelperAPI}}", apiEndPoints.apiCoffinAlign);
    apiToCoffinAlign = apiToCoffinAlign.replace("{{CoffinAlignAction}}", action);
    let headers = new HttpHeaders();
    headers = headers.append('skipSuccessMsg', 'true');
    return this.httpClient.post<PegAlign>(apiToCoffinAlign, JSON.stringify(data), { headers });
  }
}

