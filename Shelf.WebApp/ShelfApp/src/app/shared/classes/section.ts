import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import {
  Basket, BlockFixture, Coffincase,
  Crossbar, Modular, PegBoard, SlotWall
} from '.';
import { AppConstantSpace, Utils } from '../constants';
import { IDragDropSettings } from '../drag-drop.module';
import {
  UprightEditPaylod,
  FixtureObjectResponse,
  PackageAttributes,
  PogSettings,
  SectionResponse, UprightType,
  RefreshParams,
  PackageInventoryModel,
  FlagData,
  PogExtendedProperty,
  POGLibraryListItem,
  PogProfile,
  LogsListItem,
  IApiResponse,
  NewProductInventory,
  CanJoin,
  QuadChildIntersections,
  UnitPackageItemInfos,
  LogDataType,
  SplitPreference
} from '../models';
import {
  UprightService,
  CrunchMode,
  CrunchModeService,
  InformationConsoleLogService,
  DividersCurdService,
  HistoryService,
  NewProductInventoryService,
  NotifyService,
  PanelService,
  PlanogramCommonService,
  PlanogramService,
  PlanogramStoreService,
  QuadtreeUtilsService,
  SharedService,
  ParentApplicationService,
  AllocateNpiService
} from '../services';
import {
  AllFixtureList,
  CoffinTypes,
  FixtureList,
  MerchandisableList,
  ObjectListItem,
  PegTypes,
  PositionParentList
} from '../services/common/shared/shared.service';
import { Context } from './context';
import { PlanogramObject } from './planogram-object';
import { Position } from './position';
import { StandardShelf } from './standard-shelf';
import { DividerTypes } from '../constants/fixtureCrunchModes';
import { AllocateUtilitiesService } from '../services/layouts/allocate/utilities/allocate-utilities.service';
import { LogsGroupName } from '../models/information-console/informationconsole';

export class Section extends PlanogramObject implements Partial<SectionResponse> {
  svg?: string;
  Automation?: boolean;
  ModifiedTs?: string;
  ModifiedBy?: string;
  RowVersion?: number;
  previousUrl?: string;
  newUrl?: string;
  FrontImage?: { Url: string, LkDisplayType: number };
  BackImage?: { Url: string, LkDisplayType: number };
  side?: string;
  IDPOGLiveOriginal: number;
  public Permissions: { id: number, value: string }[];
  public IDPerfPeriod: number;
  public IsSaveBlock: boolean;
  public SVG: { Value: string };
  public adjucentBlocks: string[];
  public ObjectDerivedType: 'Section';
  public UnitPackageItemInfos: UnitPackageItemInfos[];
  // TODO: @malu implements SectionResponse,

  // parent $sectionID is readonly. This override is needed only in section object.
  public override $sectionID: string;
  public PogProfile: PogProfile
  public POGQualifier: string;
  public globalUniqueID: string;
  public Name: string;
  public IDPOGStatus: number;
  public Version: string;
  public fitCheck: boolean;
  public Capacity: number;
  public PackageAttributes: { [key: string]: PackageAttributes };
  public PackageInventoryModel: { [key: string]: PackageInventoryModel };
  public RuleSetId: number;
  public AvailableLinear: number;
  public UsedLinear: number;
  public IsVariableHeightShelf: boolean;
  public L1: string;
  public L2: string;
  public L3: string;
  public L4: string;
  public L5: string;
  public L6: string;
  public L7: string;
  public L8: string;
  public L9: string;
  public L10: string;
  public _IsSpanAcrossShelf: FlagData;
  public _Reversenotch: FlagData;
  public LKTraffic: number;
  public InventoryModel: PackageInventoryModel;
  public selected: boolean = false;
  //PA Specific entity
  public DateRefreshed?: string;
  /** Upright is present in API response as a string
   * can be:
   *   empty or null (UprightType - None)
   *   single number as string (UprightType - Fixed)
   *   comma separated string (UprightType - Variable)
   */
  public Upright: string;

  public LKCrunchMode: CrunchMode;
  public SuppressFingerSpace: boolean;
  IDPOG: number;
  config: any;
  Blocks = [];
  overflowLength = 0;
  UsedSquare = 0;
  PercentageUsedSquare = 0;
  AvailableSquare = 0;

  SKUCount = {
    pog: 0,
    cart: 0,

  };
  isBayPresents = false;
  dragDropSettings: IDragDropSettings = {
    drag: false,
    drop: true,
  };
  AllLimitingSortedShelves: FixtureList[] = [];
  ChildOffset = {
    X: 0.0,
    Y: 0.0,
    Z: 0.0,
  };
  ChildDimension = {
    Height: 0.0,
    Width: 0.0,
    Depth: 0.0,
  };

  annotations = [];
  PogObjectExtension = this.annotations;
  showAnnotation = 0;
  public PogBlocks: [];
  annotationLoaded = false;
  anDimension = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  };
  computePositionsFixtureList = [];
  skipComputePositions = false;
  skipShelfCalculateDistribution = false;
  skipRePositionCoffinCaseOnCrunch = false;
  totalAddSales = 0;
  totalAddMovement = 0;
  totalAddProfit = 0;
  bayObj;
  modularTemplate;
  modularArr: any[];
  panelID;
  // This fields used in this.computeFinancials()
  public _DeltaSales: PogExtendedProperty | undefined;
  public _DeltaMovement: PogExtendedProperty | undefined;
  public _DeltaProfit: PogExtendedProperty | undefined;
  public _TotalSales: PogExtendedProperty | undefined;
  public _TotalMovement: PogExtendedProperty | undefined;
  public _TotalProfit: PogExtendedProperty | undefined;
  public _PerChangeSales: PogExtendedProperty | undefined;
  public _PerChangeMovement: PogExtendedProperty | undefined;
  public _PerChangeProfit: PogExtendedProperty | undefined;

  ModularCount?: number;
  // added by coffincase
  public LKFixtureMovement?: any;

  /** Calculated property based on Upright string value */
  public uprightType: UprightType = UprightType.None;
  public uprightIntervals: number[] = [];
  /** This field is passed from API */
  public IsCalculationRequired: boolean = false;
  shelfStackOrder: number
  public DaysInWeek: number;
  // TODO: @malu sharedService private readonly

  //notch fields
  public FirstNotch?: number;
  public Notch?: number;
  //override section level traffic flow to fixture level
  _StandardShelfLKTraffic : PogExtendedProperty;
  _StandardShelfStackOrder : PogExtendedProperty;
  _PegboardLKTraffic : PogExtendedProperty;
  _PegboardStackOrder : PogExtendedProperty;
  _CoffinCaseLKTraffic : PogExtendedProperty;
  _CoffinCaseStackOrder : PogExtendedProperty;
  _BasketLKTraffic : PogExtendedProperty;
  _BasketStackOrder : PogExtendedProperty;
  _SlotwallLKTraffic : PogExtendedProperty;
  _SlotwallStackOrder : PogExtendedProperty;
  _CorssbarLKTraffic : PogExtendedProperty;
  _PegBoardOpticalResemblance : FlagData;
  _SlotwallOpticalResemblance: FlagData;
  _CoffinCaseOpticalResemblance: FlagData;
  _BasketOpticalResemblance: FlagData;
  // //Boolean to override section level position numbering to fixture level
  OverrideSectionPosNumbering: boolean;
  public hasFixtureType: { [key: string]: boolean } = { [AppConstantSpace.STANDARDSHELFOBJ]: false, [AppConstantSpace.PEGBOARDOBJ]: false, [AppConstantSpace.SLOTWALLOBJ]: false, [AppConstantSpace.CROSSBAROBJ]: false, [AppConstantSpace.COFFINCASEOBJ]: false, [AppConstantSpace.BASKETOBJ]: false};
  constructor(
    data: SectionResponse,
    private readonly notifyService: NotifyService,
    private readonly translate: TranslateService,
    public readonly sharedService: SharedService,
    private readonly parentApp: ParentApplicationService,
    private readonly planogramService: PlanogramService,
    private readonly newProductInventoryService: NewProductInventoryService,
    private readonly quadtreeUtil: QuadtreeUtilsService,
    private readonly historyService: HistoryService,
    private readonly planogramCommonService: PlanogramCommonService,
    private readonly panelService: PanelService,
    private readonly informationConsoleLogService: InformationConsoleLogService,
    private readonly dividerCurdService: DividersCurdService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly uprightService: UprightService,
    private readonly crunchMode: CrunchModeService,
    private readonly allocateNpi: AllocateNpiService,
    private readonly allocateUtils: AllocateUtilitiesService
  ) {
    super(sharedService, data);

    this.$sectionID = this.$id;
    this.panelID = this.planogramService.selectedPogPanelID;
    // derived fields updates
    this.uprightService.updateUpright(this, data.Upright);
  }

  public getType(): string {
    return AppConstantSpace.SECTION;
  }

  public calculateDistribution(ctx: Context, refresh: { reassignFlag: boolean; recFlag: boolean } | null = null): void {
    let capacity = 0;
    for (const child of this.Children) {
      const modular: Modular = child.asModular();
      if (modular) {
        modular.calculateDistribution(ctx, refresh);
        capacity += modular.Fixture.Capacity;
      }
    }
    this.Capacity = capacity;

    this.computeModularPositionAfterChange();
  }

  private computeFinancials(): void {
    if (this._DeltaSales === undefined) { return; }

    //Some cases dynamic values are not calculating so added this condition
    this._DeltaSales.ValData = 0;
    this._DeltaMovement.ValData = 0;
    this._DeltaProfit.ValData = 0;
    this._TotalSales.ValData = 0;
    this._TotalMovement.ValData = 0;
    this._TotalProfit.ValData = 0;
    this._PerChangeSales.ValData = 0;
    this._PerChangeMovement.ValData = 0;
    this._PerChangeProfit.ValData = 0;

    const allPos = this.getAllPositions();

    let totalSales = 0;
    let totalMovement = 0;
    let totalProfit = 0;
    for (const pos of allPos) {
      let sales = pos.Position.attributeObject.RecROSSales || 0,
        units = pos.Position.attributeObject.RecROSUnits || 0,
        profit = pos.Position.attributeObject.RecProfitCash || 0;

      totalSales += sales;
      totalMovement += units;
      totalProfit += profit;
    }

    this._DeltaSales.ValData = Number((totalSales - this.totalAddSales).toFixed(2));
    this._DeltaMovement.ValData = Number((totalMovement - this.totalAddMovement).toFixed(2));
    this._DeltaProfit.ValData = Number((totalProfit - this.totalAddProfit).toFixed(2));
    this._TotalSales.ValData = Number(totalSales.toFixed(2));
    this._TotalMovement.ValData = Number(totalMovement.toFixed(2));
    this._TotalProfit.ValData = Number(totalProfit.toFixed(2));

    const getChangePercentage = (newValue: number, original: number): number => {
      const changePercentage = ((newValue - original) / original) * 100
      return Number(changePercentage.toFixed(2));
    }

    // totalSales - sum of all pos on pog
    // totalAddSales - sum of all pos of adds and retains
    if (this.totalAddSales) {
      this._PerChangeSales.ValData = getChangePercentage(totalSales, this.totalAddSales);
    }

    if (this.totalAddMovement) {
      this._PerChangeMovement.ValData = getChangePercentage(totalMovement, this.totalAddMovement);
    }

    if (this.totalAddProfit) {
      this._PerChangeProfit.ValData = getChangePercentage(totalProfit, this.totalAddProfit);
    }
  }

  private computeMerchHeightRecursive(ctx: Context, obj: any, refresh: RefreshParams): void {
    if (obj.hasOwnProperty('Children')) {
      const arry = obj.Children;
      const len = arry.length;
      //if it is crunch mode right left we need to reassign from left always.
      for (let i = 0; i < len; i++) {
        this.sectioncomputeMerchHeight(ctx, arry[i], refresh);
      }
    }
  }

  public sectioncomputeMerchHeight(ctx: Context, child: any, refresh: RefreshParams): void {
    // Fixtures should be able to calculate their own dimensions
    // If they can't we will use defaults
    child.cachedShrinkWidth = undefined;
    if ('computeMerchHeight' in child) {
      if (child.Fixture.FixtureType !== AppConstantSpace.GRILLOBJ) {
        //Bug fix to not calculate MerchHieght if the FixtureType is Grill
        child.computeMerchHeight(ctx, refresh);
      }
    } else {
      child.ChildDimension.Width = child.Dimension.Width;
      child.ChildDimension.Height = child.Dimension.Height;
      child.ChildDimension.Depth = child.Dimension.Depth;
      child.ChildOffset.X = 0;
      child.ChildOffset.Y = 0;
      child.ChildOffset.Z = 0;
    }
    this.computeMerchHeightRecursive(ctx, child, refresh);
  };

  public computeMerchHeight(ctx: Context, refresh: RefreshParams = null) {
    // helps avoid issues when fixtures.y is changed (fixture moved for example) as that invalidates the cache hold in context
    ctx = new Context(ctx.section);
    this.ChildDimension = {
      Width: this.Dimension.Width,
      Height: this.Dimension.Height,
      Depth: this.Dimension.Depth,
    };
    this.hasFixtureType = { standardshelf: false, pegboard: false, slotwall: false, crossbar: false, coffincase: false, basket: false};
    this.ChildOffset = { X: 0, Y: 0, Z: 0, };
    if (this._IsSpanAcrossShelf.FlagData) {
      //commented due to it gives error need to resolve
      this.setSpreadSpanStandardshelfs(ctx, refresh);
      if (refresh && this.sharedService.callRenderDividersAgainEvent) {
        this.sharedService.renderSeparatorAgainEvent.next(true);
        this.sharedService.renderDividersAgainEvent.next(true);
        this.sharedService.callRenderDividersAgainEvent = false;
      }
    }

    if (this.planogramService.hasCacheShrinkFactors) {
      this.getAllStandardShelfs().forEach((shelf: StandardShelf) => {
        if (!Context.cacheShrinkFactors[shelf.$id]) {
          shelf.calculateCacheShrinkFactors();
        }
      });
    }

    this.computeMerchHeightRecursive(ctx, this, refresh);

    this.computeSectionUsedLinear();
    this.ComputeSectionUsedSquare();
    this.computeSKUCount(ctx);

    this.setSkipShelfCalculateDistribution();
    this.calculateDistribution(ctx);
    this.clearSkipShelfCalculateDistribution();
    this.computeFinancials();

    if (this.fitCheck
      && (this.planogramService.effectedPogObjIds.length > 0
        || this.planogramService.pogIntersectionsCheck)
    ) {
      this.checkFitCheckErrorOccurred(
        this.planogramService.pogIntersectionsCheck ? undefined : this.planogramService.effectedPogObjIds,
        undefined,
      );
      this.planogramService.effectedPogObjIds.length = 0;
      this.planogramService.pogIntersectionsCheck = false;
    } else if (!this.fitCheck) {
      let npiPosition = this.newProductInventoryService.getChangedPositionValues(this.IDPOG);
      //  indicator have some errors so as of now we have commented
      if (npiPosition != null) {
        if (!(Utils.isNullOrEmpty(npiPosition) && npiPosition == '')) {
          this.newProductInventoryService.insertNewTempProduct([npiPosition]).subscribe(
            (response) => {
              this.tempProductSaveHandler(response, this.IDPOG);
            },
            (d) => {
              this.newProductInventoryService.setChangedPositionValues(null, this.IDPOG);
              this.notifyService.error('NPI_EDITNPIFAILED_MESSAGE');
            },
          );
        }
      }
    }
    this.SetFitCheckErrors(null, []);
    this.SetOrientationErrors();
    this.setOverflowLength();
    if (this.sharedService.isStartedRecording && refresh.recFlag) {
      this.historyService.stopRecording();
    }
  }

  public setSkipShelfCalculateDistribution() {
    this.skipShelfCalculateDistribution = true;
  }
  public clearSkipShelfCalculateDistribution() {
    this.skipShelfCalculateDistribution = false;
  }
  public getSkipShelfCalculateDistribution() {
    return this.skipShelfCalculateDistribution;
  }

  public setSkipCalculation() {
    this.skipShelfCalculateDistribution = true;
    this.skipComputePositions = true;
    this.skipRePositionCoffinCaseOnCrunch = true;
  }
  public clearSkipCalculation() {
    this.skipShelfCalculateDistribution = false;
    this.skipComputePositions = false;
    this.skipRePositionCoffinCaseOnCrunch = false;
  }

  public addToComputePositionsFixtureList(fixture) {
    if (this.skipComputePositions) {
      if (
        this.computePositionsFixtureList.findIndex(function (a) {
          return this === a;
        }, fixture) < 0
      ) {
        this.computePositionsFixtureList.push(fixture);
      }
    }
    return this.skipComputePositions;
  }
  public setSkipComputePositions() {
    this.skipComputePositions = true;
  }
  public getSkipComputePositions() {
    return this.skipComputePositions;
  }
  public clearSkipComputePositions() {
    this.skipComputePositions = false;
  }
  public computePositionsAfterChange(ctx: Context) {
    this.skipComputePositions = false;
    while (this.computePositionsFixtureList.length > 0) {
      this.computePositionsFixtureList.shift().computePositionsAfterChange(ctx);
    }
  }

  public computeModularPositionAfterChange(): void {
    let prevModular = null;

    for (const child of this.Children) {
      if (Utils.checkIfBay(child)) { // is modular
        child.computePositionsAfterChange(prevModular);
        prevModular = child;
      }
    }
  }

  private findUniqueChildPositionCount(objs: PlanogramObject[]): number {
    //Find unique positions in the section  and return the count of unique positions
    //Need to find unique positions in the each modular and add it to the count
    //Need to find unique positions in the each fixture and add it to the count
    const uniqueItems = new Set();
    let uniqueModularItems = new Set();
    const recurseObjects = (obj: PlanogramObject): void => {
      if (!obj.Children) { return; } // no child
      obj.Fixture.SKUCount = 0;
      const uniqueFixtureItems = new Set();
      obj.Children.forEach((child: PlanogramObject) => {
        if (child.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
          const tempId = child.Position.IDProduct?.toString() + child.Position.IDPackage?.toString();
          uniqueItems.add(tempId);
          uniqueFixtureItems.add(tempId);
          uniqueModularItems.add(tempId);
        } else {
          recurseObjects(child);
        }
      });
      obj.Fixture.SKUCount = uniqueFixtureItems.size;
    }

    objs.forEach(obj => {
      recurseObjects(obj);
      obj.Fixture.SKUCount = uniqueModularItems.size;
      uniqueModularItems = new Set();
    });

    return uniqueItems.size;
  }


  public computeSKUCount(ctx: Context): void {
    if (ctx.skuCount) {
      this.SKUCount = ctx.skuCount;
      return;
    }
   // shoppingCart will be only one.
    const shoppingCart = (this.Children as ObjectListItem[]).find(x => x.ObjectDerivedType == AppConstantSpace.SHOPPINGCARTOBJ);
    const modulars = (this.Children as ObjectListItem[]).filter(x => x.ObjectDerivedType != AppConstantSpace.SHOPPINGCARTOBJ);

    ctx.skuCount = this.SKUCount = {
      pog: this.findUniqueChildPositionCount(modulars),
      cart: this.findUniqueChildPositionCount([shoppingCart]),
    };
  }
  public computeSectionUsedLinear = function () {
    let me = this;
    me.UsedLinear = 0;
    me.AvailableLinear = 0;
    me.PerCentageLinearUsed = 0;
    this.getAllStandardShelfs().forEach((item, key) => {
      me.UsedLinear += item.Fixture.UsedLinear;
      me.AvailableLinear += item.Fixture.AvailableLinear;
    });

    me.PerCentageLinearUsed = (me.UsedLinear / (me.UsedLinear + me.AvailableLinear)) * 100;
    me.perCentageLinearUsed = Utils.preciseRound(me.PerCentageLinearUsed, 2);
    me.AvailableLinear = Utils.preciseRound(me.AvailableLinear, 2);
    me.PerCentageLinearUsed = Number(me.PerCentageLinearUsed).toFixed(2) + '%';
  };
  //ComputeSectionUsedSquare
  public ComputeSectionUsedSquare() {
    let me: any = this;
    let UsedSquare = 0,
      perUsedSquare = 0;
    let AvailableSquare = 0;
    this.getAllPegboards().forEach((item, key) => {
      UsedSquare += item.Fixture.UsedSquare;
      AvailableSquare += item.unUsedSquare;
    });
    this.getAllSlotwalls().forEach((item, key) => {
      UsedSquare += item.Fixture.UsedSquare;
      AvailableSquare += item.unUsedSquare;
    });
    if (UsedSquare + AvailableSquare != 0) {
      perUsedSquare = (UsedSquare / (UsedSquare + AvailableSquare)) * 100;
    } else {
      UsedSquare = 0;
    }

    UsedSquare = Utils.preciseRound(UsedSquare, 2);
    perUsedSquare = Utils.preciseRound(perUsedSquare, 2);
    me.PercentageUsedSquare = Number(perUsedSquare).toFixed(2) + '%';
    this.UsedSquare = UsedSquare;
    this.AvailableSquare = AvailableSquare;
  }

  public ComputeSectionUsedCubic() {
    let sectionObj: any = this;
    let UsedCubic = 0,
      perUsedCubic = 0;
    let AvailableCubic = 0;
    this.getAllCoffinCases().forEach((item, key) => {
      UsedCubic += item.UsedCubic;
      AvailableCubic += item.unUsedCubic;
    });

    if (UsedCubic + AvailableCubic != 0) {
      perUsedCubic = (UsedCubic / (UsedCubic + AvailableCubic)) * 100;
    } else {
      UsedCubic = 0;
    }

    UsedCubic = Utils.preciseRound(UsedCubic, 2);
    perUsedCubic = Utils.preciseRound(perUsedCubic, 2);
    sectionObj.PercentageUsedCubic = Number(perUsedCubic).toFixed(2) + '%';
    sectionObj.UsedCubic = UsedCubic;
    sectionObj.AvailableCubic = AvailableCubic;
  }

  //it doesn't consider cart items
  public getMinPropertyValue(prop, fieldPath) {
    let mini = 999;
    return this.getMinPropertyValueInnerFn(this, mini, prop, fieldPath);
  }

  public getMinPropertyValueInnerFn(thisContext: any, mini: number, prop: string, fieldPath): number {
    let innerContext = thisContext;

    //bypass cart items
    if (Utils.checkIfShoppingCart(innerContext)) return mini;
    innerContext.Children.forEach((child, key) => {
      if (child.isPosition) {
        let value = Utils.findPropertyValue(child, prop, undefined, fieldPath);
        if (value < mini) { mini = value; }
      } else {
        mini = this.getMinPropertyValueInnerFn(child, mini, prop, fieldPath);
      }
    });
    return mini;
  }

  //it doesn't consider cart items
  public getMaxPropertyValue(prop, fieldPath): number {
    let maxi = 0;
    return this.getMaxPropertyValueInnerFn(this, maxi, prop, fieldPath);
  }

  public getMaxPropertyValueInnerFn(thisContext: Section, maxi, prop, fieldPath): number {
    let innerContext = thisContext;

    //bypass cart items
    if (Utils.checkIfShoppingCart(innerContext)) return maxi;

    innerContext.Children.forEach((child, key) => {
      if (child.isPosition) {
        let value = Utils.findPropertyValue(child, prop, undefined, fieldPath);
        if (value > maxi) { maxi = value; }
      } else {
        maxi = this.getMaxPropertyValueInnerFn(child, maxi, prop, fieldPath);
      }
    });
    return maxi;
  }

  /* Function gives the overflow length for a section */
  /* Method iterates through all fixtures and logs its respective unusedLinear
 in an array, amt of negative unusedLinear is amt of overflow is the assumption here */
  public setOverflowLength() {
    if (this.sharedService.considerOverflowItems) {
        let objLongestFixture = {},
        maxWidthRequired = 0;
        let thisContext = this;

        //recursively call
        maxWidthRequired = this.logHowMuchOverflow(thisContext, maxWidthRequired, objLongestFixture);

        if (maxWidthRequired > Number(this.Dimension.Width)) {
            this.overflowLength = maxWidthRequired - Number(this.Dimension.Width);
        } else {
          this.overflowLength = 0;
        }
    }
  }
  public logHowMuchOverflow(thisContext, maxWidthRequired, objLongestFixture) {
    // let innerContext = this;
    thisContext.Children.forEach((child, key) => {
      //dt. 8th July, 2014 - Abhishek
      //@todo see the comments
      //has to be done for bays after it has ability to calculate its width dynamically based on fixture inside it
      if (child != undefined && child.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ) {
        let tempWidth =
          Number(child.Dimension.Width) +
          Number(child.getXPosToPog()) +
          (child.unUsedLinear !== undefined && child.unUsedLinear < 0 ? -child.unUsedLinear : 0);
        if (tempWidth > maxWidthRequired) {
          maxWidthRequired = Number(tempWidth);
          objLongestFixture = child;
        }
      }
      maxWidthRequired = this.logHowMuchOverflow(child, maxWidthRequired, objLongestFixture)
    });
    return maxWidthRequired;
  }

  public getXPosToPog() {
    return 0;
  }
  /*@todo Later
 To be replaced by checkMinWidthTemp(), after bay calculates its height/width depending on children*/
  public checkMinWidth(val) {
    let minWidthNeed = 0;
    this.Children.forEach((child, key) => {
      //standard shelf
      if (child.ObjectType == 'Fixture' && child.Fixture.FixtureType == 'StandardShelf') {
        if (child.Dimension.Width + child.Location.X > minWidthNeed) {
          minWidthNeed = child.Dimension.Width + child.Location.X;
        }
      }

      //bay it is
      if (
        child.ObjectType == 'Fixture' &&
        child.Fixture.FixtureType == AppConstantSpace.MODULAR &&
        !child.Fixture.IsMerchandisable
      ) {
        minWidthNeed += child.Dimension.Width;
      }
    });

    if (val < minWidthNeed) return false;

    return true;
  }

  public checkSnapFixtures(): void {
    //Check any fixture is snapped to right and if there are any fixtures needs increase/decrease in width
    //to attach nearest upright or section width
    let allFixtures: FixtureList[] = this.getAllLimitingShelves();
    let intervals = this.getAllAvailableXAxisIntervals();
    let intervalLen = intervals.length;
    //Check any of the fixtures are snapped to right in the last bay
    for (const fix of allFixtures) {
      const dragShelfXPosToPog = fix.getXPosToPog();
      let proposedX2PosToPog = dragShelfXPosToPog + fix.Dimension.Width,
        proposedX1PosToPog = dragShelfXPosToPog,
        proposedWidth = fix.Dimension.Width,
        getSection = this.sharedService.getObject(fix.$idParent, this.$id) as Section;
      let proposedLocationX = getSection.getXPosToPog();
      for (let j = 0; j < intervalLen - 1;) {
        let intervalStart = intervals[j];
        let intervalEnd = intervals[++j];
        if (
          (proposedX2PosToPog > intervalStart && proposedX2PosToPog < intervalEnd) ||
          (proposedX2PosToPog > this.Dimension.Width && intervalStart >= proposedX1PosToPog)
        ) {
          //@narendra enable if we are reducing the width of the modular if width of the section is reduced
          if (fix.Fixture.SnapToLeft && !fix.Fixture.SnapToRight) {
            proposedX1PosToPog = dragShelfXPosToPog; // nearest xpos to the drop point
            proposedX2PosToPog = proposedX1PosToPog + fix.Fixture.Width;
            proposedWidth =
              proposedX2PosToPog > intervalEnd ? intervalEnd - proposedX1PosToPog : fix.Fixture.Width;
          } else if (fix.Fixture.SnapToLeft && fix.Fixture.SnapToRight) {
            proposedX1PosToPog = dragShelfXPosToPog; // nearest xpos to the drop point
            proposedX2PosToPog = this.getNearestXCoordinate(intervalEnd, 'rightmost');
            proposedWidth = proposedX2PosToPog - proposedX1PosToPog;
          } else if (!fix.Fixture.SnapToLeft && fix.Fixture.SnapToRight) {
            proposedX2PosToPog = this.getNearestXCoordinate(intervalEnd, 'rightmost'); // nearest right most xpos to the drop point

            proposedWidth = proposedX2PosToPog - proposedX1PosToPog;
          }
          //@narendra enable if we are reducing the width of the modular if width of the section is reduced
          else if (!fix.Fixture.SnapToLeft && !fix.Fixture.SnapToRight) {
            proposedX1PosToPog = dragShelfXPosToPog;
            proposedX2PosToPog = proposedX1PosToPog + fix.Fixture.Width;
            proposedWidth =
              proposedX2PosToPog > intervalEnd ? intervalEnd - proposedX1PosToPog : fix.Fixture.Width;
          }
          //if uprights are changing and location of the fixture should be changed
          proposedLocationX = proposedX1PosToPog - proposedLocationX;
          fix.changeFixWidth(proposedWidth, proposedLocationX);
        }
      }
    }
    const sortedModulars = this.sortModulars(this.sharedService.getAllModulars(this));
    let lastModular = sortedModulars[sortedModulars.length - 1],
      totalModularWidth = 0;
    for (const sortmodular of sortedModulars) {
      totalModularWidth += sortmodular.Dimension.Width;
    }
    if (lastModular) {
      lastModular.changeFixWidth(
        lastModular.Dimension.Width + this.Dimension.Width - totalModularWidth,
        lastModular.Location.X,
      );
    }
  }
  public getLastModular() {
    let sortedModulars = this.sortModulars(this.sharedService.getAllModulars(this));
    return sortedModulars[sortedModulars.length - 1];
  }
  /*@todo Later
 To be replaced by checkMinHeightTemp(), after bay calculates its height/width depending on children*/
 public checkMinHeight(val):{Flag:boolean;Message:string} {
    let minHeightNeed = 0;
    let maxLocationY = 0;
    let minMerModular = '',
      minMerHeightShelf = 0,
      id = '',
      sectionId = '';

    let eachRecursive = function (children) {
      for (const child of children) {
        if (child.ObjectType === 'Fixture' && child.Fixture.FixtureType === 'StandardShelf') {
          if (child.Location.Y > maxLocationY) {
            maxLocationY = child.Location.Y;
            minHeightNeed = child.minMerchHeight + child.Location.Y + child.Fixture.Thickness;
            minMerModular = child.Fixture.FixtureFullPath;
            minMerHeightShelf = child.minMerchHeight;
            id = child.$id;
          }
        } else if (
          child.ObjectType === 'Fixture' &&
          child.Fixture.FixtureType === 'Modular' &&
          !child.Fixture.IsMerchandisable
        ) {
          eachRecursive(child.Children);
        }
      }
    };
    eachRecursive(this.Children);
    const sectionObj: any = this;
    if (val < minHeightNeed) {
      let errorList = [];
      errorList.push({
        Message:
          'Section Height cannot be less than ' +
          minHeightNeed?.toFixed(2) +
          ', as Fixture ' +
          minMerModular +
          ' minimum shelf height is ' +
          minMerHeightShelf?.toFixed(2),
        Type: 0,
        Code: 'Sectionheigth',
        SubType: 'Sectionheigth',
        IsClientSide: true,
        PlanogramID: sectionObj.IDPOG,
        Option: {
          $id: id,
          $sectionID: this.$sectionID,
          Group: 'Sectionheigth',
        },
      });
      this.informationConsoleLogService.setClientLog(errorList, sectionObj.IDPOG);
      return {Flag : false,Message: this.translate.instant('HEIGHT_CANNOT_BE_REDUCED_FURTHER')+''+ ` ${minHeightNeed?.toFixed(2)}`};
    }
    return {Flag : true,Message:''};
  }

  //@todo :- to be removed after bays has capability to calculate its height
  //dt. 8th July, 2014 - Abhishek
  //its uses just ObjectType Fixture to get minHeight Required recursively
  public checkMinHeightTemp(val) {
    let thisContext = this;
    let minHeightRequired = 0;
    let maxLocationY = 0;

    this.logMinHeightAccross(thisContext, maxLocationY, minHeightRequired);

    if (val < minHeightRequired) return false;

    return true;
  }
  public logMinHeightAccross(thisContext, maxLocationY, minHeightRequired) {
    thisContext.Children.forEach((child, key) => {
      //Standard shelf
      if (
        child.ObjectType == 'Fixture' &&
        (child.Fixture.FixtureType == 'StandardShelf' || child.Fixture.FixtureType == 'Fixture')
      ) {
        if (child.Location.Y > maxLocationY) {
          maxLocationY = child.Location.Y;
          minHeightRequired = child.Dimension.Height + child.Location.Y;
        }
      }
      this.logMinHeightAccross(child, maxLocationY, minHeightRequired);
    });
  }
  //Checking sectoin height value
  public isFirstNotchValid(val): boolean {
    return val <= this.ChildDimension.Height;
  }

  public isCrunchUnique(allStandardShelfs, tmp, lKCrunchCount: number, isUnique: boolean): boolean {
    for (const standardShelf of allStandardShelfs) {
      if (!tmp[standardShelf.Fixture.LKCrunchMode]) {
        tmp[standardShelf.Fixture.LKCrunchMode] = true;
        lKCrunchCount++;
        if (lKCrunchCount === 2) {
          isUnique = false;
          break;
        }
      }
    }
    return isUnique;
  }

  public changeCrunchIsSpanAcrossShelf(ctx: Context): void {
    let dataSource: Section = this;
    // breaking other most of undo redo??? so commented this.History start
    //this is a casceding trigger methid. its not an independent standalone action
    //so we don't need start and stop here!
    const original = ((dataSource) => {
      return () => {
        dataSource.changeCrunchIsSpanAcrossShelf(ctx);
      };
    })(dataSource);
    const revert = ((dataSource) => {
      return () => {
        dataSource.changeCrunchIsSpanAcrossShelf(ctx);
      };
    })(dataSource);
    this.historyService.captureActionExec({
      funoriginal: original,
      funRevert: revert,
      funName: 'changeCrunchIsSpanAcrossShelf',
    });
    //If it is left crunch mode is Spanleft, if it is right crunch mode is SpanRight etc

    let tempLKCrunchMode = dataSource.LKCrunchMode,
      tempLKTraffic = dataSource.LKTraffic,
      isUnique = true;
    let allStandardShelfs = dataSource.getAllStandardShelfs();
    let tmp = {},
      lKCrunchCount = 0;

    if (dataSource._IsSpanAcrossShelf.FlagData) {
      let crunchUniqueness = this.isCrunchUnique(allStandardShelfs, tmp, lKCrunchCount, isUnique);
      if (crunchUniqueness) {
        switch (tempLKCrunchMode) {
          case 2:
            tempLKCrunchMode = 8;
            break;
          case 1:
            tempLKCrunchMode = 9;
            break;
          case 4:
            tempLKCrunchMode = 6;
            break;
        }
      } else {
        switch (tempLKTraffic) {
          case 2:
            tempLKCrunchMode = 8;
            break;
          case 1:
            tempLKCrunchMode = 9;
            break;
        }
      }
    } else {
      for (const standardShelf of allStandardShelfs) {
        standardShelf.isSpreadShelf = false;
        standardShelf.spreadSpanProperties.isSpreadSpan = false;
      }
      switch (tempLKCrunchMode) {
        case 8:
          tempLKCrunchMode = 2;
          break;
        case 9:
          tempLKCrunchMode = 1;
          break;
        case 6:
          tempLKCrunchMode = 4;
          break;
      }
    }
    //Creating option values for Crunch Based on IsSpanAcrossShelfs option

    this.crunchMode.changeSectionCrunchMode(ctx, dataSource, tempLKCrunchMode);
  }

  public validateField(field, value) {
    let errorObj = {
      msg: '',
      error: false,
      info: '',
      warning: '',
    };

    //validation for ObjectType POG/Section
    if (field == 'Dimension.Width') {
      let isvalid = this.checkMinWidthTemp(value);
      if (!isvalid.flag) {
        errorObj.msg = 'Reducing Section Width Failed.';
        errorObj.msg += isvalid.minObjFix.bayNo
          ? 'Fixture[' +
          isvalid.minObjFix.fixNo +
          '] width in ' +
          isvalid.minObjFix.bayNo +
          '  reducing beyond the fixture limit value '
          : 'Fixture[' + isvalid.minObjFix.fixNo + '] width reducing beyond the fixture limit value ';
        errorObj.error = true;

        return errorObj;
      }
    }

    if (field == 'Dimension.Height') {
      if (!this.checkMinHeight(value)?.Flag) {
        errorObj.msg = this.checkMinHeight(value)?.Message;
        errorObj.error = true;
        return errorObj;
      }
    }

    if (field == 'FirstNotch' || field == 'Notch') {
      if (!this.isFirstNotchValid(value)) {
        errorObj.msg = this.translate.instant('NOTCH_CANNOT_BE_MORE_THAN_SECTION_HEIGHT');
        errorObj.error = true;
        return errorObj;
      }
    }
    return errorObj;
  }
  public isGrillEnabled() {
    let allStandardShelf = this.getAllStandardShelfs();
    for (const standardShelf of allStandardShelf) {
      if (standardShelf.Fixture.HasGrills) return true;
    }
  }

  public getAllBays() {
    let bayList = [];
    for (const child of this.Children) {
      if (Utils.checkIfBay(child)) {
        bayList.push(child);
      }
    }

    return bayList;
  }

  public getAllStandardShelfs(): StandardShelf[] {
    return Utils.getAllTypeShelves([AppConstantSpace.STANDARDSHELFOBJ], this) as StandardShelf[];
  }
  public getAllPegboards(): PegBoard[] {
    return Utils.getAllTypeShelves([AppConstantSpace.PEGBOARDOBJ], this) as PegBoard[];
  };
  public getAllSlotwalls(): SlotWall[] {
    return Utils.getAllTypeShelves([AppConstantSpace.SLOTWALLOBJ], this) as SlotWall[];
  };
  public getAllCrobars(): Crossbar[] {
    return Utils.getAllTypeShelves([AppConstantSpace.CROSSBAROBJ], this) as Crossbar[];
  };
  public getAllPegFixtures(): PegTypes[] {
    return Utils.getAllTypeShelves([
      AppConstantSpace.CROSSBAROBJ,
      AppConstantSpace.SLOTWALLOBJ,
      AppConstantSpace.PEGBOARDOBJ,
    ], this) as PegTypes[];
  };
  public getAllLimitingShelves(): FixtureList[] {
    return Utils.getAllTypeShelves([
      AppConstantSpace.STANDARDSHELFOBJ,
      AppConstantSpace.PEGBOARDOBJ,
      AppConstantSpace.BLOCK_FIXTURE,
      AppConstantSpace.SLOTWALLOBJ,
      AppConstantSpace.CROSSBAROBJ,
      AppConstantSpace.COFFINCASEOBJ,
      AppConstantSpace.BASKETOBJ,
    ], this) as FixtureList[];
  };
  public getAllLimitingSortedShelves(): FixtureList[] {
    this.AllLimitingSortedShelves = Utils.sortByYPos(
      Utils.getAllTypeShelves<FixtureList>([
        AppConstantSpace.STANDARDSHELFOBJ,
        AppConstantSpace.PEGBOARDOBJ,
        AppConstantSpace.BLOCK_FIXTURE,
        AppConstantSpace.SLOTWALLOBJ,
        AppConstantSpace.CROSSBAROBJ,
        AppConstantSpace.COFFINCASEOBJ,
        AppConstantSpace.BASKETOBJ,
      ], this)
    );
    return this.AllLimitingSortedShelves;
  };
  public getAllFixChildren = function (): AllFixtureList[] {
    return Utils.getAllTypeShelves([
      AppConstantSpace.STANDARDSHELFOBJ,
      AppConstantSpace.PEGBOARDOBJ,
      AppConstantSpace.BLOCK_FIXTURE,
      AppConstantSpace.SLOTWALLOBJ,
      AppConstantSpace.CROSSBAROBJ,
      AppConstantSpace.COFFINCASEOBJ,
      AppConstantSpace.BASKETOBJ,
      AppConstantSpace.DIVIDERS,
      AppConstantSpace.GRILLOBJ,
    ], this);
  };
  public getAllCoffinCases = function (): CoffinTypes[] {
    return Utils.getAllTypeShelves([AppConstantSpace.COFFINCASEOBJ, AppConstantSpace.BASKETOBJ], this) as CoffinTypes[];
  };
  public getAllMerchandisableFixures = function (): MerchandisableList[] {
    return Utils.getAllTypeShelves([
      AppConstantSpace.STANDARDSHELFOBJ,
      AppConstantSpace.PEGBOARDOBJ,
      AppConstantSpace.SLOTWALLOBJ,
      AppConstantSpace.CROSSBAROBJ,
      AppConstantSpace.COFFINCASEOBJ,
      AppConstantSpace.BASKETOBJ,
    ], this) as MerchandisableList[];
  };

  public getAllPositions(): Position[] {
    let allPositions = [];
    let parentFixIsCart;

    const recurseObjects = (obj) => {
      if (obj !== undefined && obj.length > 0) {
        for (const item of obj) {
          parentFixIsCart = Utils.checkIfShoppingCart(
            this.sharedService.getObject(item.$idParent, item.$sectionID),
          );
          if (item.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT && !parentFixIsCart) {
            allPositions.push(item);
          } else if (item.hasOwnProperty('Children')) {
            recurseObjects(item.Children);
          }
        }
      }
    };
    recurseObjects(this.Children);
    return allPositions;
  }
  public getAllShoppingCartItems() {
    let allPositions = [];
    let parentFixIsCart;

    const recurseObjects = (obj) => {
      if (obj !== undefined && obj.length > 0) {
        for (const item of obj) {
          parentFixIsCart = Utils.checkIfShoppingCart(
            this.sharedService.getParentObject(item, item.$sectionID),
          );
          if (parentFixIsCart && item.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
            allPositions.push(item);
          } else if (item.hasOwnProperty('Children')) {
            recurseObjects(item.Children);
          }
        }
      }
    };
    recurseObjects(this.Children);
    return allPositions;
  }

  public getFitChekkErrorsList(errorList: LogsListItem[] = []) {
    if (_.isUndefined(this.planogramStore.lookUpHolder)) {
      return;
    }
    let fixturefitChekcObj = this.planogramStore.lookUpHolder.FixtureFitCheckStatus.options;
    let positionfitChekcObj = this.planogramStore.lookUpHolder.PositionFitCheckStatus.options;
    let eachRecursive = (obj, parent?) => {
      if (obj.hasOwnProperty('Children')) {
        obj.Children.forEach((child, key) => {
          if (
            child.ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ ||
            child.ObjectDerivedType === AppConstantSpace.BLOCK_FIXTURE ||
            child.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ ||
            child.ObjectDerivedType === AppConstantSpace.BASKETOBJ ||
            Utils.checkIfPegType(child)
          ) {
            if (child.Fixture.LKFitCheckStatus != AppConstantSpace.FITCHECK_OK) {
              const bayObj = this.sharedService.getParentObject(child, child.$sectionID);
              let bayMsg = ' ';
              if (bayObj.Fixture != undefined && bayObj.ObjectDerivedType == AppConstantSpace.MODULAR) {
                bayMsg = this.translate.instant('BAY_NO') + bayObj.Fixture.FixtureNumber + ',';
              }
              let status = Utils.findFitCheckStatusText(
                fixturefitChekcObj,
                child.Fixture.LKFitCheckStatus,
              );
              if (status == AppConstantSpace.Collision) {
                status = status + ' ' + this.translate.instant('DETECTED');
              }
              const msgStr =
                this.translate.instant('SHELF') + ' ' +
                status +
                ',' +
                bayMsg +
                child.ObjectDerivedType +
                '#' +
                child.Fixture.FixtureNumber;
              const errorObj = {
                Message: msgStr,
                Type: 0,
                Code: 'FitCheck',
                SubType: 'FitCheck',
                IsClientSide: true,
                PlanogramID: this.IDPOG,
                Option: {
                  $id: child.$id,
                  $sectionID: child.$sectionID,
                  Group: 'FitCheck',
                },
              };
              errorList.push(errorObj);
            } else if (child.minMerchIntersectFlag) {
              const errorObj = {
                Message:
                  'Fixture# ' +
                  child.Fixture.FixtureFullPath +
                  's min merch height is overlapping with another fixture',
                Type: 0,
                Code: 'FitCheck',
                SubType: 'FitCheck',
                IsClientSide: true,
                PlanogramID: this.IDPOG,
                Option: {
                  $id: child.$id,
                  $sectionID: child.$sectionID,
                  Group: 'FitCheck',
                },
              };
              errorList.push(errorObj);
            }
            else if (this.fitCheck && this.planogramStore.appSettings.isWeightCapacityValidationEnable)
            {
                if(child.Fixture.MaxFixtureWeight > 0 && child.Fixture.FixtureWeightCapacity > child.Fixture.MaxFixtureWeight) {
                  const errorObj = {
                    Message:
                      this.translate.instant('FIXTURE_WEIGHT_CAPACITY_EXCEED_MAX_FIXTURE_WEIGHT') +
                      ',Fixture# ' +
                      child.Fixture.FixtureFullPath,
                    Type: 0,
                    Code: 'FitCheck',
                    SubType: 'FitCheck',
                    IsClientSide: true,
                    PlanogramID: this.IDPOG,
                    Option: {
                      $id: child.$id,
                      $sectionID: child.$sectionID,
                      Group: 'FitCheck',
                    },
                  };
                  errorList.push(errorObj);
              }

        }
          } else if (child.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
            const fixture = this.sharedService.getParentObject(child, child.$sectionID);
            const bayObj = this.sharedService.getParentObject(fixture, child.$sectionID);
            let bayMsg = ' ';
            if (bayObj.Fixture != undefined && bayObj.ObjectDerivedType == AppConstantSpace.MODULAR) {
              bayMsg = this.translate.instant('BAY_NO') + bayObj.Fixture.FixtureNumber + ',';
            }
            // skip console message for the following cases
            if (
              child.Position.LKFitCheckStatus != AppConstantSpace.FITCHECK_OK &&
              child.Position.LKFitCheckStatus != AppConstantSpace.FITCHECK_TOO_TALL_OK &&
              child.Position.LKFitCheckStatus != AppConstantSpace.FITCHECK_COLLISION_OK &&
              child.Position.LKFitCheckStatus != AppConstantSpace.FITCHECK_OUTSIDE_OK &&
              child.Position.LKFitCheckStatus != AppConstantSpace.FITCHECK_TOO_DEEP_OK &&
              !Utils.checkIfShoppingCart(fixture)
            ) {

              let status = Utils.findFitCheckStatusText(
                positionfitChekcObj,
                child.Position.LKFitCheckStatus,
              );
              if (status == AppConstantSpace.Collision) {
                status = status + ' ' + this.translate.instant('DETECTED');
              }
              let msgStr =
                this.translate.instant('ITEM') +
                status +
                ',' +
                bayMsg +
                fixture.ObjectDerivedType +
                '#' +
                fixture.Fixture.FixtureNumber +
                ',' +
                this.translate.instant('FOOTER_POS_NO') +
                child.Position.PositionNo +
                ',' +
                this.translate.instant('FOOTER_UPC') +
                child.Position.Product.UPC;
              const errorObj = {
                Message: msgStr,
                Type: 0,
                Code: 'FitCheck',
                SubType: 'FitCheck',
                IsClientSide: true,
                PlanogramID: this.IDPOG,
                Option: {
                  $id: child.$id,
                  $sectionID: child.$sectionID,
                  Group: 'FitCheck',
                },
              };
              errorList.push(errorObj);
            }
            if (
              Number(child.Position.IDMerchStyle) == AppConstantSpace.MERCH_ADVANCED_TRAY &&
              child.Position.ProductPackage.IdPackageStyle == 1 &&
              fixture.Fixture.HasDividers &&
              child.getDividerInfo(fixture)?.Type == DividerTypes.DividerFacingsLeft
            ) {
              const infoObj = {
                Message: 'ADVANCED_TRAY_DOES_NOT_SUPPORT_DIVIDER_FACINGS_LEFT',
                Type: LogDataType.INFORMATION,
                Code: 'FitCheck',
                SubType: 'FitCheck',
                IsClientSide: true,
                PlanogramID: this.IDPOG,
                Option: {
                  $id: child.$id,
                  $sectionID: child.$sectionID,
                  Group: 'FitCheck',
                }
              }
              errorList.push(infoObj);
            }
            if (this.fitCheck && this.planogramStore.appSettings.isWeightCapacityValidationEnable && child.validationForPegRod()) {
              let msgStr =
                this.translate.instant('PEG_WEIGHT_CAPACITY_EXCEED_MAX_PEG_WEIGHT') +
                ',' +
                bayMsg +
                fixture.ObjectDerivedType +
                '#' +
                fixture.Fixture.FixtureNumber +
                ',' +
                this.translate.instant('FOOTER_POS_NO') +
                child.Position.PositionNo +
                ',' +
                this.translate.instant('FOOTER_UPC') +
                child.Position.Product.UPC;
              const errorObj = {
                Message: msgStr,
                Type: 0,
                Code: 'FitCheck',
                SubType: 'FitCheck',
                IsClientSide: true,
                PlanogramID: this.IDPOG,
                Option: {
                  $id: child.$id,
                  $sectionID: child.$sectionID,
                  Group: 'FitCheck',
                },
              };
              errorList.push(errorObj);
            }
          }
          eachRecursive(child, obj);
        }, obj);
      }
    };
    eachRecursive(this);
    const sectionObj: any = this;
    if (errorList.length > 0) {
      this.informationConsoleLogService.setClientLog(errorList, sectionObj.IDPOG);
    } else {
      let temppErrorObj = {
        Type: 0,
        Code: 'FitCheck',
        SubType: 'FitCheck',
        IsClientSide: true,
        PlanogramID: sectionObj.IDPOG,
        noLogs: true,
        Message: ''
      };
      errorList.push(temppErrorObj);
      this.informationConsoleLogService.setClientLog(errorList, sectionObj.IDPOG);
    }
  }

  public setFitCheckMessagetoPositions(sectionObj, currentPos, currentfixture) {
    var me = this;
    var currentPosDim = currentPos.itemDimensions();
    var currentLeft = currentPosDim.left;
    //Currentright is used to know the right of the position with respect to the current fixture.
    var currentRight = currentfixture.getXPosToPog() + currentPosDim.right;
    var totalFixLin = 0;
    currentfixture.spanShelfs && currentfixture.spanShelfs.length != 0
      ? currentfixture.spanShelfs.forEach((itm) => {
        totalFixLin += this.sharedService.getObject(itm, me.$sectionID).ChildDimension.Width;
      })
      : (totalFixLin = currentfixture.getXPosToPog() + ((Utils.checkIfCoffincase(currentfixture) || Utils.checkIfBasket(currentfixture)) ? currentfixture.ChildDimension.Width : currentfixture.Dimension.Width));
    // Exceeds Out of Section
    if (currentPosDim.top - this.planogramStore.appSettings.FITCHECKTOLERANCE > this.Dimension.Height && Utils.checkIfPegType(currentfixture)) {
        if (currentPos.Position.attributeObject.ForceFit == true)
        currentPos.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_TOO_TALL_OK);
      else if (currentPos.Position.attributeObject.ForceFit == false && currentPos._parent.ObjectDerivedType == 'Crossbar')
        currentPos.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_TOO_TALL_OK);
      else currentPos.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_TOO_TALL);
      return;
    } else if (
      currentPos.Position.ProductPackage.OverhangZ > 0 &&
      currentPos.linearDepth() - this.planogramStore.appSettings.FITCHECKTOLERANCE >
      currentfixture.ChildDimension.Depth + currentPos.Position.ProductPackage.OverhangZ
    ) {
      if (currentPos.Position.attributeObject.ForceFit == true)
        currentPos.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_TOO_DEEP_OK);
      else currentPos.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_TOO_DEEP);
      return;
    } else if (
      currentPos.linearDepth() - this.planogramStore.appSettings.FITCHECKTOLERANCE >
      currentfixture.ChildDimension.Depth &&
      currentPos.Position.ProductPackage.OverhangZ <= 0
    ) {
      //Items locationZ can't be less than zero when it is going out of depth of the shelf.
      //It's not the requirement, if needed we can enable this lines
      if (currentPos.Position.attributeObject.ForceFit == true)
        currentPos.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_TOO_DEEP_OK);
      else currentPos.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_TOO_DEEP);
      return;
    } else if (
      currentPosDim.top - currentPosDim.bottom - this.planogramStore.appSettings.FITCHECKTOLERANCE >
      currentfixture.ChildDimension.Height
    ) {
      // Exceeds Out of Fixture's max merch height
      if (currentPos.Position.attributeObject.ForceFit == true)
        currentPos.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_TOO_TALL_OK);
      else if (currentPos.Position.attributeObject.ForceFit == false && currentPos._parent.ObjectDerivedType == 'Crossbar')
        currentPos.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_TOO_TALL_OK);
      else if(!currentfixture.Fixture.IgnoreMerchHeight)
       currentPos.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_TOO_TALL);
      return;
    } else if (
      currentPosDim.bottom + this.planogramStore.appSettings.FITCHECKTOLERANCE < 0 ||
      currentRight - 0.09 > totalFixLin ||
      currentLeft + 0.09 < 0
    ) {
      //Comparing with the current fixture child dimension width which includes overhang values.
      if (currentPos.Position.attributeObject.ForceFit == true)
        currentPos.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_OUTSIDE_OK);
      else currentPos.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_OUTSIDE);
      return;
    }
    else if (currentPos._parent.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ && currentPos.Position.ProductPackage.FingerSpace > 0 && currentPos.linearHeight() > currentPos._parent.Dimension.Height) {
      currentPos.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_TOO_TALL);
      return;
    }
    currentPos.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_OK);
  }
  public setFitCheckMessagetoFixture(sectionObj, currentfixture) {
    if (
      currentfixture.getXPosToPog() * this.planogramStore.appSettings.FITCHECKTOLERANCE +
      currentfixture.Dimension.Width >
      sectionObj.Dimension.Width
    ) {
      currentfixture.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_TOO_TALL);
      return;
    }
    if (
      (currentfixture.getYPosToPog() + currentfixture.getRectDimension().height) *
      this.planogramStore.appSettings.FITCHECKTOLERANCE >
      sectionObj.Dimension.Height
    ) {
      currentfixture.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_OUTSIDE);
      return;
    }
    currentfixture.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_OK);
  }

  public SetOrientationErrors() {
    var allPositions = this.getAllPositions();
    this.informationConsoleLogService.setClientLog([], this.IDPOG);
    let errorList = [];
    for (const item of allPositions) {
      const orientation = this.planogramService.getAvailableOrientations([item]).orientationsList.find(x => x.value == item.Position.IDOrientation);
      if (!orientation) {
        const errorObj = {
          Message: item.Position.IDOrientationtext + ' ' + this.translate.instant('ORIENTATION_IS_RESTRICTED_FOR_POSITION')
            + this.sharedService.getPositionDetailMessage(item),
          Type: LogDataType.ERROR,
          Code: this.translate.instant('TOOLTIP_ORIENTATION'),
          SubType: 'Orientation',
          IsClientSide: true,
          PlanogramID: this.IDPOG,
          Option: {
            $id: item.$id,
            $sectionID: item.$sectionID,
            Group: LogsGroupName.Orientation,
          }
        }
        errorList.push(errorObj);
      }
    }
    if (errorList.length > 0) {
      this.informationConsoleLogService.setClientLog(errorList, this.IDPOG);
    } else {
      let temppErrorObj = {
        Type: 0,
        Code: this.translate.instant('TOOLTIP_ORIENTATION'),
        SubType: 'Orientation',
        IsClientSide: true,
        PlanogramID: this.IDPOG,
        noLogs: true,
        Message: ''
      };
      errorList.push(temppErrorObj);
      this.informationConsoleLogService.setClientLog(errorList, this.IDPOG);
    }
  }

  public SetFitCheckErrors(intersectionList: QuadChildIntersections = null, errorList: LogsListItem[] = []) {
    let intersectingPogObjects: any = [],
      minMerchIntersectShelf: any = [];
    this.informationConsoleLogService.setClientLog([], this.IDPOG);

    let allPogObjs: Array<Position | MerchandisableList> = this.getAllPositions();
    allPogObjs = allPogObjs.concat(
      (Utils.getAllTypeShelves([
        AppConstantSpace.STANDARDSHELFOBJ,
        AppConstantSpace.BLOCK_FIXTURE,
        AppConstantSpace.PEGBOARDOBJ,
        AppConstantSpace.COFFINCASEOBJ,
        AppConstantSpace.BASKETOBJ,
        AppConstantSpace.SLOTWALLOBJ,
        AppConstantSpace.CROSSBAROBJ,
      ], this) as MerchandisableList[]),
    );
    if (intersectionList) {
        intersectingPogObjects = intersectionList.intersectingFixtures;
        minMerchIntersectShelf = intersectionList.minMerchCheckFixtures;
    } else {
      this.quadtreeUtil.createQuadTree(this.$id);
      let intersectingShelfs = this.quadtreeUtil
        .findingIntersectionsOfChild(this.$id, undefined, true, 0);
      intersectingPogObjects = intersectingShelfs.intersectingFixtures;
      minMerchIntersectShelf = intersectingShelfs.minMerchCheckFixtures;
    }
    for (const pogObj of allPogObjs) {
      pogObj.minMerchIntersectFlag = false;
      const intersectingPogObjs = intersectingPogObjects[pogObj.$id];
      const minMerchIntersectShelfs = minMerchIntersectShelf[pogObj.$id];

      if (pogObj.asPosition()) {
        if (intersectingPogObjs) {
          if (pogObj.Position.attributeObject.ForceFit === true)
            pogObj.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_COLLISION_OK);
          else pogObj.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_COLLISION);
        } else {
          if (minMerchIntersectShelfs) {
            pogObj.minMerchIntersectFlag = true;
          }
          this.setFitCheckMessagetoPositions(
            this,
            pogObj,
            this.sharedService.getObject(pogObj.$idParent, this.$id),
          );
        }
      } else if (Utils.checkIfFixture(pogObj)) {
        if (intersectingPogObjs) {
          pogObj.setFitCheckErrorMessages(AppConstantSpace.FITCHECK_COLLISION);
        } else {
          if (minMerchIntersectShelfs) {
            pogObj.minMerchIntersectFlag = true;
          }
          this.setFitCheckMessagetoFixture(this, pogObj);
        }
      }
    }
    this.getFitChekkErrorsList(errorList);
  }
  public updateFitCheckStatusText(shelfsList) {
    for (const shelf of shelfsList) {
      if (shelf.ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ) {
        shelf.Fixture.LKFitCheckStatustext = Utils.findObjectKey(
          this.planogramStore.lookUpHolder.FixtureFitCheckStatus.options,
          shelf.Fixture.LKFitCheckStatus,
        );
        let childrenObj = _.filter(shelf.Children, {
          ObjectDerivedType: AppConstantSpace.POSITIONOBJECT,
        });
        for (const child of childrenObj) {
          child.Position.IDOrientationtext = Utils.findObjectKey(
            this.sharedService.Orientation.options as any,
            child.Position.IDOrientation,
          );
          child.Position.LKFitCheckStatustext = Utils.findObjectKey(
            this.planogramStore.lookUpHolder.PositionFitCheckStatus.options,
            child.Position.LKFitCheckStatus,
          );
        }
      }
    }
  }

  public getSortedListByModulars(obj) {
    return obj.sort(function (a, b) {
      return a.getXPosToPog() - b.getXPosToPog();
    });
  }

  public validateSpannedFixtures(
    sectionObj,
    list,
    spreadSpanFixtures,
    rootObject,
    spreadSpanCrunchMode,
    spanLeftCrunchMode,
    spanrightCrunchMode,
  ) {
    let spreadSpanArr = [];
    let orderedStandardShelf: StandardShelf[] = [];

    //If modular are there sorting should be done by modular x value
    if (rootObject.isBayPresents) {
      orderedStandardShelf = this.getSortedListByModulars(list);
    } else {
      orderedStandardShelf = Utils.sortByXPos(list);
    }

    let firstCrunchMode = orderedStandardShelf[0].Fixture.LKCrunchMode;
    let firstCanJoin =
      orderedStandardShelf[0].Fixture.CanJoin == null
        ? (orderedStandardShelf[0].Fixture.CanJoin = CanJoin.JOIN_LEFT_RIGHT)
        : orderedStandardShelf[0].Fixture.CanJoin;
    let firstRotationX = orderedStandardShelf[0].Rotation.X;
    let XCord2 = Number(
      (orderedStandardShelf[0].getXPosToPog() + Number(orderedStandardShelf[0].Dimension.Width.toFixed(2))),
    );
    const canJoinMap = { [CanJoin.JOIN_RIGHT]: [CanJoin.JOIN_LEFT_RIGHT,CanJoin.JOIN_LEFT], [CanJoin.JOIN_LEFT_RIGHT]: [CanJoin.JOIN_LEFT_RIGHT, CanJoin.JOIN_LEFT]}
    for (const [i, shelf] of orderedStandardShelf.entries()) {
      const currentCrunchMode = shelf.Fixture.LKCrunchMode;
      const currentCanJoin =
        shelf.Fixture.CanJoin == null ? (shelf.Fixture.CanJoin = CanJoin.JOIN_LEFT_RIGHT) : shelf.Fixture.CanJoin;
      const currentRotationX = shelf.Rotation.X;

      if (
        (firstCrunchMode === spreadSpanCrunchMode ||
          firstCrunchMode === spanLeftCrunchMode ||
          firstCrunchMode === spanrightCrunchMode) &&
        firstCrunchMode === currentCrunchMode &&
        Number(shelf.getXPosToPog().toFixed(2)) === XCord2 &&
        firstRotationX === currentRotationX &&
        firstCanJoin && currentCanJoin && !(currentCanJoin == CanJoin.JOIN_RIGHT || firstCanJoin == CanJoin.JOIN_LEFT) && (canJoinMap[firstCanJoin].indexOf(currentCanJoin) != -1)
      ) {
        spreadSpanArr.push(shelf);
        firstCanJoin = currentCanJoin;
        if (i === orderedStandardShelf.length - 1) {
          if (spreadSpanArr.length > 1) {
            spreadSpanFixtures.push(spreadSpanArr);
          }
        }
      } else {
        firstCrunchMode = currentCrunchMode;
        firstCanJoin = currentCanJoin;
        firstRotationX = currentRotationX;

        if (spreadSpanArr.length > 1) {
          spreadSpanFixtures.push(spreadSpanArr);
        }
        spreadSpanArr = [];
        spreadSpanArr.push(shelf);
      }
      XCord2 = Number((shelf.getXPosToPog() + Number(shelf.Dimension.Width)).toFixed(2));
    }
  }
  /*Get the Chunks of span shelfs which have same Y pos but not adjacent to each other*/
  public getSpanshelfCollection(
    sectionObj,
    sortedShelfsWithOutDivider,
    rootObject,
    spanLeftCrunchMode,
    spreadSpanCrunchMode,
    spanrightCrunchMode,
  ) {
    let validSpanShelfsWithDividers = [];
    if (sortedShelfsWithOutDivider.length != 0) {
      this.validateSpannedFixtures(
        sectionObj,
        sortedShelfsWithOutDivider,
        validSpanShelfsWithDividers,
        rootObject,
        spreadSpanCrunchMode,
        spanLeftCrunchMode,
        spanrightCrunchMode,
      );
    }

    return validSpanShelfsWithDividers;
  }
  /*Validate shelfs with dividers*/
  public validateShelfsWithDividers(
    sectionObj,
    list,
    rootObject,
    spanLeftCrunchMode,
    spreadSpanCrunchMode,
    spanrightCrunchMode,
  ) {
    //get the list of shelfs which has dividers
    let shelfsWithDividerList = [],
      shelfsWithOutDividerList = [],
      spanShelfList = [],
      leftMostShelf: any = {},
      rightMostShelf: any = {},
      sortedListByX = [];
    for (const item of list) {
      if (item.Fixture.HasDividers) {
        shelfsWithDividerList.push(item);
      } else {
        shelfsWithOutDividerList.push(item);
      }
    }
    if (shelfsWithDividerList.length === 0) {
      spanShelfList.push(list);
      return spanShelfList;
    }
    //from this list get left most, right most
    sortedListByX = Utils.sortByXPos(list);
    leftMostShelf = sortedListByX[0];
    rightMostShelf = sortedListByX[sortedListByX.length - 1];
    //Check with crunch mode
    if (

      (leftMostShelf.Fixture.LKCrunchMode == spanLeftCrunchMode ||
        (rootObject.LKTraffic == 1 && leftMostShelf.Fixture.LKCrunchMode == spreadSpanCrunchMode))
    ) {
      spanShelfList.push(list);
      return spanShelfList;
      //we can apply left most dividers info to all shelfs
      //we should check for the crunch mode
      //we can apply right most divider info to all shelfs
      //we should check for the traffic flow left to  right
    } else {
      if (

        (rightMostShelf.Fixture.LKCrunchMode == spanrightCrunchMode ||
          (rootObject.LKTraffic == 2 && rightMostShelf.Fixture.LKCrunchMode == spreadSpanCrunchMode))
      ) {
        spanShelfList.push(list);
        return spanShelfList;
        //we should check for the crunch mode
        //we can apply right most divider info to all shelfs
        //we should check for the traffic flow right to left
      } else {
        let sortedShelfsWithOutDivider = Utils.sortByXPos(shelfsWithOutDividerList);
        return this.getSpanshelfCollection(
          sectionObj,
          sortedShelfsWithOutDivider,
          rootObject,
          spanLeftCrunchMode,
          spreadSpanCrunchMode,
          spanrightCrunchMode,
        );
        //break the span shelfs into an array which are side by side
        //take the shelfs with dividers exclude from the list
        //take the chunks, if chunk size is more than one consider those shelfs as span across shelfs
      }
    }
  }

  public getSpreadSpanStandardshelfsList() {
    let spreadSpanFixtures = [];
    let currentYValue: any = -1, currentZValue: any = -1;
    let spreadSpanArr = [];
    let rootObject: Section = this;
    if (this.sharedService == undefined) {
      return;
    }
    let allStandardShelf = this.getAllStandardShelfs();
    //update StatusText

    const sortByYPosThickness = (obj) => {
      if (obj == undefined) {
        return obj;
      }
      return obj.sort(function (a, b) {
        if (a.Location.Y + a.Fixture.Thickness == b.Location.Y + b.Fixture.Thickness) {
          return a.getXPosToPog() - b.getXPosToPog();
        } else {
          return a.Location.Y + a.Fixture.Thickness - (b.Location.Y + b.Fixture.Thickness);
        }
      });
    };
    let orderedStandardShelf = sortByYPosThickness(allStandardShelf);
    /*
 Case 1 : Checking Both Fixtures Crunch mode should be Spreadspan
 Case 2 : Both should be aligned horizontal
 Case 3  : Ypos are 10,10,10,10,10 and crunch mode is 6,6,3,6,6,1
 */

    /* finding similar YPos fixtures */
    if (orderedStandardShelf.length > 0) {
      let firstYValue = Number((
        orderedStandardShelf[0].Location.Y + orderedStandardShelf[0].Fixture.Thickness
      ).toFixed(2));
      let firstZValue = Number((
        orderedStandardShelf[0].Location.Z + orderedStandardShelf[0].Dimension.Depth
      ).toFixed(2));
      for (const [i, shelf] of orderedStandardShelf.entries()) {
        let spreadSpanArrList = [];
        // Resetting the default values
        shelf.spreadSpanProperties = {};
        shelf.spreadSpanProperties.height = 0;
        shelf.spreadSpanProperties.width = 0;
        shelf.spreadSpanProperties.left = 0;
        shelf.spreadSpanProperties.bottom = 0;
        shelf.spreadSpanProperties.isSpreadSpan = false;
        shelf.spreadSpanProperties.isLeftMostShelf = false;
        shelf.spreadSpanProperties.isRightMostShelf = false;
        shelf.spreadSpanProperties.childOffsetX = 0;
        shelf.spanShelfs = [];
        shelf.isSpreadShelf = false;
        currentYValue = Number((shelf.Location.Y + shelf.Fixture.Thickness).toFixed(2));
        currentZValue = Number((shelf.Location.Z + shelf.Dimension.Depth).toFixed(2));

        if (currentYValue === firstYValue && currentZValue === firstZValue) {
          spreadSpanArr.push(shelf);
          if (i === orderedStandardShelf.length - 1) {
            if (spreadSpanArr.length > 1) {
              let temSpreadSpanFixtures = [];
              this.validateSpannedFixtures(
                this,
                spreadSpanArr,
                temSpreadSpanFixtures,
                rootObject,
                CrunchMode.SpreadSpan,
                CrunchMode.SpanLeft,
                CrunchMode.SpanRight,
              );
              if (temSpreadSpanFixtures.length > 0) {
                for (const temSprdFix of temSpreadSpanFixtures) {
                  spreadSpanArrList = this.validateShelfsWithDividers(
                    this,
                    temSprdFix,
                    rootObject,
                    CrunchMode.SpanLeft,
                    CrunchMode.SpreadSpan,
                    CrunchMode.SpanRight,
                  );
                  for (const spSpanAr of spreadSpanArrList) {
                    this.validateSpannedFixtures(
                      this,
                      spSpanAr,
                      spreadSpanFixtures,
                      rootObject,
                      CrunchMode.SpreadSpan,
                      CrunchMode.SpanLeft,
                      CrunchMode.SpanRight,
                    );
                  }
                }
              }
            }
          }
        } else {
          firstYValue = currentYValue;
          firstZValue = currentZValue;
          if (spreadSpanArr.length > 1) {
            let temSpreadSpanFixtures = [];
            this.validateSpannedFixtures(
              this,
              spreadSpanArr,
              temSpreadSpanFixtures,
              rootObject,
              CrunchMode.SpreadSpan,
              CrunchMode.SpanLeft,
              CrunchMode.SpanRight,
            );
            if (temSpreadSpanFixtures.length > 0) {
              for (const temSprdFix of temSpreadSpanFixtures) {
                spreadSpanArrList = this.validateShelfsWithDividers(
                  this,
                  temSprdFix,
                  rootObject,
                  CrunchMode.SpanLeft,
                  CrunchMode.SpreadSpan,
                  CrunchMode.SpanRight,
                );
                for (const spSpanAr of spreadSpanArrList) {
                  this.validateSpannedFixtures(
                    this,
                    spSpanAr,
                    spreadSpanFixtures,
                    rootObject,
                    CrunchMode.SpreadSpan,
                    CrunchMode.SpanLeft,
                    CrunchMode.SpanRight,
                  );
                }
              }
            }
          }
          spreadSpanArr = [];
          spreadSpanArr.push(shelf);
        }
      }
    }

    return spreadSpanFixtures;
  }

  public getNonSpreadSpanStandardshelfsList() {
    const nonSpreadSpanList: StandardShelf[] = [];
    const spreadSpanList: StandardShelf[] = [];
    const allStandardShelf: StandardShelf[] = this.getAllStandardShelfs();
    for (const shelfObj of allStandardShelf) {
      if (!shelfObj.spreadSpanProperties.isSpreadSpan) {
        for (const position of shelfObj.Children as Position[]) {
          if (position.asPosition()) {
            position.spredSpanPositionProperties.isSpreadPosition = false;
          }
        }
        nonSpreadSpanList.push(shelfObj);
      }
    }
    return nonSpreadSpanList;
  }

  // TODO: @malu change the to: matchedShelfs: StandardShelf[]
  public updateAllPositionXPos(sectionObj: Section, matchedShelfs: any[], refresh: RefreshParams) {
    let properties = this.getSpreadSpanProperties(sectionObj, matchedShelfs);
    let crunchType = properties.crunchType;
    let overFlowWidthForX = 0;
    let counter = 0;
    let spanShelfAllPositions = [],
      noOfPads = 0,
      addIncrements = 0,
      addOffset = 0;
    matchedShelfs = Utils.sortByXPos(matchedShelfs);
    let prevPos: any = '';
    let spanShelfList = [],
      sortedShelves,
      matchedShelfsMerHeight = [],
      totalWidth = 0,
      minMerHeight = 0,
      SPLocationx = 0;
    switch (crunchType) {
      case 0:
      case 1:
      case 2:
      case 4:
      case 5:
      case 6:
        counter = 0;
        (spanShelfAllPositions = []), (noOfPads = 0), (addIncrements = 0), (addOffset = 0);
        matchedShelfs = Utils.sortByXPos(matchedShelfs);
        matchedShelfs.forEach((shelf) => {
          shelf.spreadSpanProperties.childOffsetX = shelf.getChildOffsetX();
          shelf.spreadSpanProperties.isSpreadSpan = true;
        });
        const firstMatchedShelf = matchedShelfs[0];
        firstMatchedShelf.spreadSpanProperties.isLeftMostShelf = true;
        matchedShelfs[matchedShelfs.length - 1].spreadSpanProperties.isRightMostShelf = true;

        if (properties.AllPositions.length > 0) {
          let DividerInfo = firstMatchedShelf.getDividerInfo(properties.AllPositions[0]);
          noOfPads = properties.OffSet % DividerInfo.SlotSpacing;
          properties.OffSet = properties.OffSet - noOfPads;
          if (noOfPads > 0) {
            addIncrements = Math.floor(
              (properties.totalPosSize - 1) /
              (((properties.totalPosSize - 1) * noOfPads) / DividerInfo.SlotSpacing),
            );
          }
        }
        addOffset = properties.OffSet;
        prevPos = '';
        for (const [i, mShelf] of matchedShelfs.entries()) {
          mShelf.OffSet = properties.OffSet;
          const shelfChildWithPosition = mShelf.Children.filter(it => it.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT
            && it.baseItem == '');
          // No Items in shelf
          if (!shelfChildWithPosition.length) {
            overFlowWidthForX += mShelf.getChildDimensionWidth();
            continue;
          }

          for (const [j, position] of shelfChildWithPosition.entries()) {
            if (
              [AppConstantSpace.MERCH_ABOVE, AppConstantSpace.MERCH_BEHIND].includes(
                Number(position.Position.IDMerchStyle),
              ) &&
              position.baseItem !== ''
            ) {
              j === 0 && (prevPos = '');
              continue;
            }
            let DividerInfo = mShelf.getDividerInfo(position);
            let xGap = position.getSKUGap() / 2;
            if (Utils.isNullOrEmpty(position.spreadSpanPosNo)) {
              position.spreadSpanPosNo = null;
            }

            position.spreadSpanPosNo = counter++;
            if (j === 0 || prevPos === '') {
              if (overFlowWidthForX > 0) {
                overFlowWidthForX = -overFlowWidthForX;
              } else if (overFlowWidthForX < 0) {
                overFlowWidthForX = Math.abs(overFlowWidthForX);
              }
              if (i !== 0) {
                overFlowWidthForX += xGap;
              }
              mShelf.setPositionLocationX(position, overFlowWidthForX);
              prevPos = position;
            } else {
              if (i % addIncrements === 0 && DividerInfo.Type != 0) {
                addOffset = properties.OffSet + DividerInfo.SlotSpacing;
              } else {
                addOffset = properties.OffSet;
              }
              mShelf.setPositionLocationX(
                position,
                prevPos.Location.X + prevPos.linearWidth() + prevPos.getSKUGap() / 2 + xGap + addOffset,
              );
              prevPos = position;
            }
            if (position.hasAboveItem || position.hasBackItem) {
              mShelf.Children.filter(function (pos) {
                return pos.baseItem === position.$id;
              }).forEach((itm) => {
                mShelf.setPositionLocationX(itm, position.Location.X);
              });
            }
            if (j == shelfChildWithPosition.length - 1) {
              overFlowWidthForX =
                mShelf.getChildDimensionWidth() -
                (position.Location.X + position.linearWidth() + xGap) -
                addOffset;
            }

            spanShelfAllPositions.push(position);
          }
        }
        (spanShelfList = []), (matchedShelfsMerHeight = []), (totalWidth = 0);
        for (const shelf of matchedShelfs) {
          spanShelfList.push(shelf.$id);
          matchedShelfsMerHeight.push(shelf.ChildDimension.Height);
          totalWidth = totalWidth + shelf.getChildDimensionWidth();
        }
        minMerHeight = Math.min.apply(Math, matchedShelfsMerHeight);
        SPLocationx = Utils.sortByXPos(matchedShelfs)[0].Location.X;

        //Checking dividers in spread shelfs
        //1. Based on traffic flow we are applying dividers accross all the shelfs in spread span
        //2. If it is right to left, we will check right most shelf has dividers if it has we will apply across all the shelfs in spread span same for left to right
        const leftShelf = Utils.sortByXPos(matchedShelfs)[0];
        const rightShelf = Utils.sortByXPos(matchedShelfs)[matchedShelfs.length - 1];
        const dividerItems = leftShelf.Children.find(it => it.ObjectDerivedType == AppConstantSpace.DIVIDERS);
        if (this.LKTraffic === 1 && refresh && dividerItems)  {
          const hasDividersLeftShelf = leftShelf.Fixture.HasDividers;
          let firstLftShelfLKDividerType = dividerItems.Fixture.LKDividerType;
          for (const mShelf of matchedShelfs) {
            let leftShelfDividerType = mShelf.Children.filter(pos => {
              return pos.ObjectDerivedType == AppConstantSpace.DIVIDERS;
            })[0]?.Fixture?.LKDividerType
            if (hasDividersLeftShelf !== mShelf.Fixture.HasDividers ||
              (hasDividersLeftShelf && firstLftShelfLKDividerType !== leftShelfDividerType)) {
              this.dividerCurdService.addDividerToShelf(mShelf, {
                LKDividerType: leftShelf.Fixture.LKDividerType,
                HasDividers: leftShelf.Fixture.HasDividers,
              });
              this.dividerCurdService.applyDividers([mShelf], dividerItems);
            }
          }
        } else {
          const dividerItemData = rightShelf.Children.find(it => it.ObjectDerivedType == AppConstantSpace.DIVIDERS);
        if( this.LKTraffic == 2 && refresh && dividerItemData){
            const hasDividersRightShelf = rightShelf.Fixture.HasDividers;
            let firstRightShelfLKDividerType = dividerItemData.Fixture.LKDividerType;
            for (const mShelf of matchedShelfs) {
              let rightShelfDividerType = mShelf.Children.filter(pos => {
                return pos.ObjectDerivedType == AppConstantSpace.DIVIDERS;
              })[0]?.Fixture?.LKDividerType
              if (hasDividersRightShelf !== mShelf.Fixture.HasDividers ||
                (hasDividersRightShelf && firstRightShelfLKDividerType !== rightShelfDividerType))  {
                this.dividerCurdService.addDividerToShelf(mShelf, {
                  LKDividerType:
                    dividerItems.Fixture.LKDividerType,
                  HasDividers:
                    rightShelf.Fixture.HasDividers,
                });
                this.dividerCurdService.applyDividers([mShelf], dividerItemData);
              }
            }
          }
        }

        //apply all positions to Shelf
        for (const shelf of matchedShelfs) {
          shelf.spanShelfs = spanShelfList;
          shelf.spreadSpanProperties.height = minMerHeight;
          shelf.spreadSpanProperties.width = totalWidth;
          shelf.spreadSpanProperties.left = SPLocationx;
          shelf.spreadSpanProperties.bottom = shelf.Location.Y;
        }
        break;
      case 3:
        for (const shelf of matchedShelfs) {
          shelf.spreadSpanProperties.isSpreadSpan = false;
        }
        break;
      case 7:
        for (const shelf of matchedShelfs) {
          shelf.spreadSpanProperties.isSpreadSpan = false;
        }
        break;
      case 8: // span Left
        counter = 0;
        matchedShelfs = Utils.sortByXPos(matchedShelfs);

        for (const [i, shelf] of matchedShelfs.entries()) {
          shelf.spreadSpanProperties.isSpreadSpan = true;
          if (i === 0) {
            shelf.spreadSpanProperties.isLeftMostShelf = true;
          }
          if (i === matchedShelfs.length - 1) {
            shelf.spreadSpanProperties.isRightMostShelf = true;
          }
          shelf.spreadSpanProperties.childOffsetX = shelf.getChildOffsetX();
        }

        spanShelfAllPositions = [];
        prevPos = '';
        for (const [i, shelf] of matchedShelfs.entries()) {
          const shelfChildWithPosition = shelf.Children.filter(it => it.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT
            && it.baseItem == '');
          // No Items in shelf
          if (!shelfChildWithPosition.length) {
            overFlowWidthForX += shelf.getChildDimensionWidth();
            continue;
          }

          for (const [j, position] of shelfChildWithPosition.entries()) {
            let xGap = position.getSKUGap() / 2;
            if (Utils.isNullOrEmpty(position.spreadSpanPosNo)) {
              position.spreadSpanPosNo = null;
            }
            position.spreadSpanPosNo = counter++;
            if (
              [AppConstantSpace.MERCH_ABOVE, AppConstantSpace.MERCH_BEHIND].indexOf(
                Number(position.Position.IDMerchStyle),
              ) !== -1 &&
              position.baseItem !== ''
            ) {
              j === 0 && (prevPos = '');
              continue;
            }
            if (j === 0 || prevPos === '') {
              if (overFlowWidthForX > 0) {
                overFlowWidthForX = -overFlowWidthForX;
              } else if (overFlowWidthForX < 0) {
                overFlowWidthForX = Math.abs(overFlowWidthForX);
              }
              if (i !== 0) {
                overFlowWidthForX = overFlowWidthForX + xGap;
              }
              shelf.setPositionLocationX(position, overFlowWidthForX);
              prevPos = position;
            } else {
              shelf.setPositionLocationX(
                position,
                prevPos.Location.X + prevPos.linearWidth() + prevPos.getSKUGap() / 2 + xGap,
              );
              prevPos = position;
            }
            if (position.hasAboveItem || position.hasBackItem) {
              shelf.Children.filter(function (pos) {
                return pos.baseItem == position.$id;
              }).forEach((itm) => {
                shelf.setPositionLocationX(itm, position.Location.X);
              });
            }
            if (j == shelfChildWithPosition.length - 1) {
              overFlowWidthForX =
                shelf.getChildDimensionWidth() - (position.Location.X + position.linearWidth() + xGap);
            }
            spanShelfAllPositions.push(position);
          }
        }
        (spanShelfList = []), (matchedShelfsMerHeight = []), (totalWidth = 0);
        for (const shelf of matchedShelfs) {
          spanShelfList.push(shelf.$id);
          matchedShelfsMerHeight.push(shelf.ChildDimension.Height);
          totalWidth = totalWidth + shelf.getChildDimensionWidth();
        }

        sortedShelves = Utils.sortByXPos(matchedShelfs);

        minMerHeight = Math.min.apply(Math, matchedShelfsMerHeight);
        SPLocationx = sortedShelves[0].Location.X;

        const firstShelf = sortedShelves[0];

          // Checking dividers
          let dividerItemData = firstShelf.Children
            .find(it => it.ObjectDerivedType == AppConstantSpace.DIVIDERS);
          if(refresh && dividerItemData){
            const hasDividersFirstShelf = firstShelf.Fixture.HasDividers;
            let firstShelfLKDividerType = dividerItemData.Fixture.LKDividerType;
            for (let k = 1; k < matchedShelfs.length; k++) {
              let leftSpanShelfLKDividerType = matchedShelfs[k].Children.filter(pos => {
                return pos.ObjectDerivedType == AppConstantSpace.DIVIDERS;
              })[0]?.Fixture?.LKDividerType;
              if ((hasDividersFirstShelf !== matchedShelfs[k].Fixture.HasDividers) ||
                (hasDividersFirstShelf && firstShelfLKDividerType !== leftSpanShelfLKDividerType)) {
                this.dividerCurdService.addDividerToShelf(matchedShelfs[k], {
                  LKDividerType: dividerItemData.Fixture.LKDividerType,
                  HasDividers: firstShelf.Fixture.HasDividers,
                });
                this.dividerCurdService.applyDividers([matchedShelfs[k]], dividerItemData);
              }
            }
          }

        //apply all positions to Shelf
        for (const shelf of matchedShelfs) {
          shelf.spanShelfs = spanShelfList;
          shelf.spreadSpanProperties.height = minMerHeight;
          shelf.spreadSpanProperties.width = totalWidth;
          shelf.spreadSpanProperties.left = SPLocationx;
          shelf.spreadSpanProperties.bottom = shelf.Location.Y;
        }
        break;
      case 9: // span right
        counter = 0;
        spanShelfAllPositions = [];
        matchedShelfs = Utils.sortByXPos(matchedShelfs);
        for (const [i, shelf] of matchedShelfs.entries()) {
          shelf.spreadSpanProperties.isSpreadSpan = true;
          if (i === 0) {
            shelf.spreadSpanProperties.isLeftMostShelf = true;
          }
          if (i === matchedShelfs.length - 1) {
            shelf.spreadSpanProperties.isRightMostShelf = true;
          }
          shelf.spreadSpanProperties.childOffsetX = shelf.getChildOffsetX();
        }

        (spanShelfList = []), (matchedShelfsMerHeight = []), (totalWidth = 0);
        for (const shelf of matchedShelfs) {
          spanShelfList.push(shelf.$id);
          matchedShelfsMerHeight.push(shelf.ChildDimension.Height);
          totalWidth = totalWidth + shelf.getChildDimensionWidth();
        }
        prevPos = '';
        //calculating XSpread
        for (let i = matchedShelfs.length - 1; i >= 0; --i) {
          let shelf = matchedShelfs[i];
          let shelfChildWithPosition = shelf.Children.filter(it =>
            it.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT &&
            it.baseItem == ''
          );
          // No Items in shelf
          if (shelfChildWithPosition.length == 0) {
            overFlowWidthForX += shelf.getChildDimensionWidth();
            continue;
          }

          for (let j = shelfChildWithPosition.length - 1; j >= 0; --j) {
            let position = shelfChildWithPosition[j];
            if (!(position.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT)) {
              continue;
            }
            if (
              [AppConstantSpace.MERCH_ABOVE, AppConstantSpace.MERCH_BEHIND].indexOf(
                Number(position.Position.IDMerchStyle),
              ) != -1 &&
              position.baseItem != ''
            ) {
              j == 0 && (prevPos = '');
              continue;
            }
            let xGap = position.getSKUGap() / 2;
            let DividerInfo = shelf.getDividerInfo(position);
            if (Utils.isNullOrEmpty(position.spreadSpanPosNo)) {
              position.spreadSpanPosNo = null;
            }
            position.spreadSpanPosNo = counter++;
            if (j == shelfChildWithPosition.length - 1 || prevPos == '') {
              if (i == matchedShelfs.length - 1) {
                shelf.setPositionLocationX(
                  position,
                  shelf.getChildDimensionWidth() - position.linearWidth(),
                );
              } else {
                shelf.setPositionLocationX(
                  position,
                  overFlowWidthForX - position.linearWidth() - xGap + shelf.getChildDimensionWidth(),
                );
              }
              prevPos = position;
            } else {
              shelf.setPositionLocationX(
                position,
                prevPos.Location.X - prevPos.getSKUGap() / 2 - position.linearWidth() - xGap,
              );
              prevPos = position;
            }
            if (j == 0) {
              overFlowWidthForX = position.Location.X - xGap;
            }
            if (position.hasAboveItem || position.hasBackItem) {
              shelf.Children.filter(function (pos) {
                return pos.baseItem == position.$id;
              }).forEach((itm) => {
                shelf.setPositionLocationX(itm, position.Location.X);
              });
            }
            spanShelfAllPositions.push(position);
          }
        }
        spanShelfAllPositions = this.sortBySpanPosNo(spanShelfAllPositions);
        minMerHeight = Math.min.apply(Math, matchedShelfsMerHeight);
        SPLocationx = Utils.sortByXPos(matchedShelfs)[0].Location.X;
        const leftShelf1 = Utils.sortByXPos(matchedShelfs)[0];
        const rightShelf1 = Utils.sortByXPos(matchedShelfs)[matchedShelfs.length - 1];
        let dividerItemData1 = rightShelf1.Children.find(it => it.ObjectDerivedType == AppConstantSpace.DIVIDERS);
        if(dividerItemData1 && refresh){
           let firstRightShelfLKDividerType = dividerItemData1.Fixture.LKDividerType;
          const hasDividersRightShelf = rightShelf1.Fixture.HasDividers;
          for (const shelf of matchedShelfs) {
            let rightSpanShelfDividerLKType = shelf.Children.filter(pos => {
              return pos.ObjectDerivedType == AppConstantSpace.DIVIDERS;
            })[0]?.Fixture?.LKDividerType;
            if ((hasDividersRightShelf !== shelf.Fixture.HasDividers) ||
              (hasDividersRightShelf && firstRightShelfLKDividerType !== rightSpanShelfDividerLKType)) {
              this.dividerCurdService.addDividerToShelf(shelf, {
                LKDividerType: dividerItemData1.Fixture.LKDividerType,
                HasDividers: leftShelf1.Fixture.HasDividers,
              });
              this.dividerCurdService.applyDividers([shelf], dividerItemData1);
            }
          }
        }
        //apply all positions to Shelf
        for (const shelf of matchedShelfs) {
          shelf.spanShelfs = spanShelfList;
          shelf.spreadSpanProperties.height = minMerHeight;
          shelf.spreadSpanProperties.width = totalWidth;
          shelf.spreadSpanProperties.left = SPLocationx;
          shelf.spreadSpanProperties.bottom = shelf.Location.Y;
        }
        break;
    }
  }

  private sortBySpanPosNo<T>(obj: T[]): T[] {
    return Utils.sortPositions(obj, [{ fun: 'getSpreadSpanNo' }], [Utils.descendingOrder]);
  }

  public getSpreadSpanProperties(sectionObj, matchedShelfs) {
    matchedShelfs = Utils.sortByXPos(matchedShelfs);
    let totalWidth = 0;
    let toalUnusedSpace = 0;
    let toalPositionsSize = 0;
    let toalPositions = [],
      spanShelfList = [];
    let crunchType = null;
    let offSet = 0;
    let totalPosLinearWidth = 0;
    for (const shelf of matchedShelfs) {
      spanShelfList.push(shelf.$id);
    }
    for (const shelf of matchedShelfs) {
      shelf.spanShelfs = spanShelfList;
      const shelfChild = shelf.Children.filter(it => it.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT);
      totalWidth += shelf.Dimension.Width;

      shelfChild.forEach((itm) => {
        totalPosLinearWidth += itm.linearWidth();
      });
      toalUnusedSpace += shelf.Dimension.Width;
      if (shelfChild.length === 0) {
        if (sectionObj._IsSpanAcrossShelf.FlagData) {
          crunchType = Number(shelf.Fixture.LKCrunchMode);
          shelf.isSpreadShelf = true;
        }
        continue;
      }
      toalPositionsSize =
        toalPositionsSize +
        shelfChild.length -
        shelfChild.filter(function (itm) {
          return itm.baseItem != '';
        }).length;
      toalPositions = toalPositions.concat(shelfChild);
      crunchType = Number(shelf.Fixture.LKCrunchMode);
      shelf.isSpreadShelf = true;
    }
    toalUnusedSpace = toalUnusedSpace - totalPosLinearWidth;
    let DividerInfoSlotStart =
      toalPositions.length == 0 ? 0 : matchedShelfs[0].getDividerInfo(toalPositions[0]).SlotStart;
    offSet = (toalUnusedSpace - DividerInfoSlotStart) / (toalPositionsSize - 1);
    if (offSet < 0) {
      offSet = 0;
    }
    return {
      Width: totalWidth,
      Unusedspace: toalUnusedSpace,
      OffSet: offSet,
      AllPositions: toalPositions,
      crunchType: crunchType,
      totalPosSize: toalPositionsSize,
    };
  }

  public setSpreadSpanStandardshelfs(ctx: Context, refresh?) {
    let sectionObj: any = this;
    let spreadspanList = this.getSpreadSpanStandardshelfsList();
    //console.error(spreadspanList)
    if (spreadspanList == undefined) {
      return;
    }
    let spreadspanListLength = spreadspanList.length;
    //undo-redo ends here*/

    /*
 We should consider spreadspan Shelfs as single shelfs
 */
    for (const sprdSpan of spreadspanList) {
      this.updateAllPositionXPos(this, sprdSpan, refresh);
    }
    let nonSpreadSpanList = this.getNonSpreadSpanStandardshelfsList();
    let errorList = [];

    let canJoinArry = [];
    for (const nSprdSpan of nonSpreadSpanList) {
      if (!nSprdSpan.Fixture.CanJoin) {
        canJoinArry.push(nSprdSpan.Fixture.FixtureFullPath);
      }
      this.crunchMode.rePositionOnCrunch(ctx, nSprdSpan);
    }
    if (canJoinArry.length > 0) {
      errorList.push({
        Message:
          this.translate.instant('FOLLOWING_FIXTURES_WERE_MARKED_A_PART_OF_SPREADSPAN') +
          ' ' +
          this.translate.instant('FIXTURE_LIST') +
          ' ' +
          '[' +
          canJoinArry.join(', ') +
          ']',
        Type: 1,
        Code: 'SpreadSpan',
        SubType: 'SpreadSpan',
        IsClientSide: true,
        PlanogramID: sectionObj.IDPOG,
        Option: {
          $id: null,
          $sectionID: null,
          Group: 'SpreadSpan',
        },
      });
      this.informationConsoleLogService.setClientLog(errorList, sectionObj.IDPOG);
    }
   ctx.isSpanShelfCalculated = true;
  }

  public getNotchNumber(notchIntervels, fixObj) {
    let notchNumber = 0;

    let fixYPosToPog = 0;
    const sectionObj: any = this;
    if ('getYPosToPog' in fixObj) {
      fixYPosToPog = fixObj.getYPosToPog(true) + fixObj.getNotchThicknes();
      fixYPosToPog = Utils.preciseRound(fixYPosToPog, 2);
    }

    let height = 0.75;
    if (this.sharedService.measurementUnit == 'METRIC') {
      //metric
      height = height * 2.54;
    }

    if (fixYPosToPog < sectionObj.FirstNotch - (height / 2)) {
      return 0;
    }

    if (this._Reversenotch.FlagData) {
      notchNumber = Math.round((notchIntervels[notchIntervels.length - 1] - fixYPosToPog) / (sectionObj.Notch || 1));
      if (notchNumber < 0 && fixYPosToPog > notchIntervels[notchIntervels.length - 1]) {
        notchNumber = 0;
      }
    } else {
      notchNumber = Math.round((fixYPosToPog - sectionObj.FirstNotch) / (sectionObj.Notch || 1));
    }

    if (notchIntervels.length > notchNumber) {
      notchNumber = notchNumber < 0 ? 0 : notchNumber + 1;
    } else {
      notchNumber = notchIntervels.length;
    }

    return notchNumber;
  }

  public calculateFixtureNumber(
    sectionObj,
    orderedStandardShelf,
    bay,
    pegPosRenumber,
    notchIntervels,
    grillDividerArr,
  ) {
    let counter = 1;
    for (const obj of orderedStandardShelf) {
      //Redundant code: has to be refactored @refactorcode
      if (pegPosRenumber && pegPosRenumber.Load && Utils.checkIfstandardShelf(obj)) {
        const pos = obj.getAllPosition();
        pos.forEach((val, key) => {
          if (
            [AppConstantSpace.MERCH_ABOVE, AppConstantSpace.MERCH_BEHIND].indexOf(
              Number(val.Position.IDMerchStyle),
            ) != -1
          ) {
            let baseItem: any = pos.filter((itm) => {
              return itm.Location.X === val.Location.X;
            });
            baseItem = baseItem
              ? baseItem.filter((itm) => {
                return (
                  itm.Position.IDMerchStyle !== AppConstantSpace.MERCH_BEHIND &&
                  itm.Position.IDMerchStyle !== AppConstantSpace.MERCH_ABOVE
                );
              })[0]
              : '';
            val.baseItem = baseItem ? baseItem.$id : '';
            if (baseItem && val.Position.IDMerchStyle === AppConstantSpace.MERCH_BEHIND) {
              baseItem.hasBackItem = true;
            }
            if (baseItem && val.Position.IDMerchStyle === AppConstantSpace.MERCH_ABOVE) {
              baseItem.hasAboveItem = true;
            }
          }
        });
      }
      if (sectionObj.IDPOGStatus < 4 || this.sharedService.isLivePogEditable) {
        if (obj.ObjectDerivedType != AppConstantSpace.SHOPPINGCARTOBJ) {
          obj.Fixture.FixtureNumber = counter; // (j + 1);
          bay ? (obj.Fixture.ModularNumber = bay.Fixture.FixtureNumber) : '';
          obj.Fixture.FixtureFullPath = (bay ? bay.Fixture.FixtureFullPath : '') + 'F' + counter++;
          obj.Fixture.NotchNumber = this.getNotchNumber(notchIntervels, obj);
        }

        if (pegPosRenumber && Utils.checkIfPegType(obj)) {
          const positions = obj.Children.filter((itm) =>
            itm.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT
          );
          positions.forEach((item, i) => {
            obj.snapToPeg(item);
          });

          obj.Children = obj.pegPositionSort(obj);
        } else {
          grillDividerArr = grillDividerArr.concat(
            obj.Children.filter((x) => x.ObjectDerivedType == AppConstantSpace.DIVIDERS),
          );
          grillDividerArr = grillDividerArr.concat(
            obj.Children.filter((x) => x.ObjectDerivedType == AppConstantSpace.GRILLOBJ),
          );
        }
      }
    }
    (sectionObj.IDPOGStatus < 4 || this.sharedService.isLivePogEditable) &&
      this.calculateDivGrillCounter(grillDividerArr, counter);
  }

  public calculateDivGrillCounter(grillDividerArr, counter) {
    grillDividerArr.forEach((obj, key) => {
      obj.Fixture.FixtureNumber = counter; //  (i + 1);
      obj.Fixture.FixtureFullPath = 'F' + counter++;
    });

    grillDividerArr.length = 0;
  }

  public applyRenumberingShelfs(pegPosRenumber = null) {
    let sectionObj: any = this;
    let counter = 0;

    if (true) { // TODO: @malu can remove?
      let trafficFlowType = sectionObj.LKTraffic; // 1 : Left to Right
      let notchIntervels = this.getNotchInterval();
      let grillDividerArr = [];

      // Bay Use Case
      if (this.isBayPresents) {
        sectionObj.reassignLocationXofBays();

        //Bays
        this.Children.sort((a, b) => a.Location.X - b.Location.X);
        if (sectionObj.IDPOGStatus < 4 || this.sharedService.isLivePogEditable) {
          counter = 1;

          if (trafficFlowType == 1) {
            for (const obj of this.Children) {
              if (obj.ObjectDerivedType === AppConstantSpace.MODULAR) {
                obj.Fixture.FixtureNumber = counter++;
                obj.Fixture.FixtureFullPath = 'M' + obj.Fixture.FixtureNumber;
                obj.Fixture.ModularNumber = obj.Fixture.FixtureNumber;
              }
            }
          } else {
            for (let i = this.Children.length - 1; i >= 0; i--) {
              let obj = this.Children[i];
              if (obj.ObjectDerivedType == AppConstantSpace.MODULAR) {
                obj.Fixture.FixtureNumber = counter++;
                obj.Fixture.FixtureFullPath = 'M' + obj.Fixture.FixtureNumber;
                obj.Fixture.ModularNumber = obj.Fixture.FixtureNumber;
              }
            }
          }
          sectionObj.ModularCount = counter - 1;
        }

        // shelfs
        for (const bay of this.Children) {
          counter = 1;
          let orderedStandardShelf = bay.Children;
          if (bay.ObjectDerivedType === AppConstantSpace.MODULAR) {
            orderedStandardShelf = Utils.sortByXPos(bay.Children);

            if (trafficFlowType === 1) {
              if (sectionObj.shelfStackOrder === 0) {
                orderedStandardShelf = Utils.sortByXYPos(orderedStandardShelf);
              } else {
                orderedStandardShelf = Utils.sortByYDesXPos(orderedStandardShelf);
              }
            } else {
              if (sectionObj.shelfStackOrder === 0) {
                orderedStandardShelf = Utils.sortByXEndYPos(orderedStandardShelf);
              } else {
                orderedStandardShelf = Utils.sortByYDecXEndPos(orderedStandardShelf);
              }
            }
            this.calculateFixtureNumber(
              this,
              orderedStandardShelf,
              bay,
              pegPosRenumber,
              notchIntervels,
              grillDividerArr,
            );
          }
        }
      } else {
        // incase of no Modulars
        counter = 1;
        let allStandardShelf = this.getAllFixChildren();
        let orderedStandardShelf = allStandardShelf;
        //pop out the grills and dividers
        grillDividerArr = allStandardShelf.filter(function (fixture, key) {
          return (
            fixture.ObjectDerivedType == AppConstantSpace.DIVIDERS ||
            fixture.ObjectDerivedType == AppConstantSpace.GRILLOBJ
          );
        });
        allStandardShelf = allStandardShelf.filter(function (fixture, key) {
          return !(
            fixture.ObjectDerivedType == AppConstantSpace.DIVIDERS ||
            fixture.ObjectDerivedType == AppConstantSpace.GRILLOBJ
          );
        });
        orderedStandardShelf = Utils.sortByYPos(allStandardShelf);
        orderedStandardShelf = Utils.sortByXPos(orderedStandardShelf);

        if (trafficFlowType == 1) {
          if (sectionObj.shelfStackOrder == 0) {
            orderedStandardShelf = Utils.sortByXYPos(orderedStandardShelf);
          } else {
            orderedStandardShelf = Utils.sortByYDesXPos(orderedStandardShelf);
          }
        } else {
          if (sectionObj.shelfStackOrder == 0) {
            orderedStandardShelf = Utils.sortByXEndYPos(orderedStandardShelf);
          } else {
            orderedStandardShelf = Utils.sortByYDecXEndPos(orderedStandardShelf);
          }
          length = orderedStandardShelf.length;
        }
        this.calculateFixtureNumber(
          this,
          orderedStandardShelf,
          '',
          pegPosRenumber,
          notchIntervels,
          grillDividerArr,
        );
      }

    }
  }

  public reArrangeBasedOnSameYPos(sectionObj, orderedStandardShelf) {
    let arrangedShelfs = [];
    let tempShelfs = [];
    if (orderedStandardShelf.length > 1) {
      let firstYValue = 0;
      for (const [i, shelf] of orderedStandardShelf.entries()) {
        const currentYValue = sectionObj.Dimension.Width - (shelf.getXPosToPog() + shelf.Dimension.Width);
        if (i === 0) {
          firstYValue = currentYValue;
          tempShelfs.push(shelf);
        } else {
          if (currentYValue === firstYValue) {
            tempShelfs.push(shelf);
          } else {
            firstYValue = currentYValue;
            arrangedShelfs.push(shelf);
            tempShelfs = [];
          }
        }
      }
    } else {
      arrangedShelfs = orderedStandardShelf;
    }
    return arrangedShelfs;
  }

  public applyRenumberingShelfsBackup(ctx: Context) {
    let sectionObj: any = this;
    let trafficFlowType = sectionObj.LKTraffic; // 1 : Left to Right
    let counter = 0;
    let orderedStandardShelf;

    // Bay Use Case
    if (this.isBayPresents) {
      counter = 0;
      //Bays
      let bayChilds = _(this.Children)
        .chain()
        .sortBy(function (a) {
          return a.Location.X;
        })
        .value();
      if (trafficFlowType === 1) {
        for (const obj of bayChilds) {
          if (obj.ObjectDerivedType === AppConstantSpace.MODULAR) {
            counter += 1;
            obj.Fixture.FixtureNumber = counter;
            obj.Fixture.FixtureFullPath = 'M' + counter;
          }
        }
      } else {
        bayChilds = _(this.Children)
          .chain()
          .sortBy(function (a) {
            return a.Location.X;
          })
          .reverse()
          .value();
        for (const obj of bayChilds) {
          if (obj.ObjectDerivedType === AppConstantSpace.MODULAR) {
            counter += 1;
            obj.Fixture.FixtureNumber = counter;
            obj.Fixture.FixtureFullPath = 'M' + counter;
          }
        }
      }
      // shelfs
      for (const bay of this.Children) {
        counter = 1;
        if (bay.ObjectDerivedType === AppConstantSpace.MODULAR) {
          orderedStandardShelf = Utils.sortByYPos(bay.Children);
          orderedStandardShelf = Utils.sortByXPos(orderedStandardShelf);
          if (trafficFlowType === 1) {
            for (const obj of orderedStandardShelf) {
              if (obj.ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ) {
                obj.Fixture.FixtureNumber = counter++; // (j + 1);
              }
            }
          } else {
            let width = this.Dimension.Width;
            orderedStandardShelf = _(bay.Children)
              .chain()
              .sortBy(function (a) {
                return width - (a.getXPosToPog() + a.Dimension.Width);
              })
              .value();
            orderedStandardShelf = this.reArrangeBasedOnSameYPos(this, orderedStandardShelf);
            for (const obj of orderedStandardShelf) {
              if (obj.ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ) {
                obj.Fixture.FixtureNumber = counter++; // (j + 1);
              }
            }
          }
        }
      }
    } else {
      counter = 1;
      let orderedStandardShelf = ctx.allLimitingShelvesYPosAsc;

      if (trafficFlowType === 1) {
        for (const obj of orderedStandardShelf) {
          if (obj.ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ) {
            obj.Fixture.FixtureNumber = counter++; //  (i + 1);
          }
        }
      } else {
        let width = this.Dimension.Width;
        orderedStandardShelf = [...orderedStandardShelf]
          .sort(function (a) {
            return width - (a.getXPosToPog() + a.Dimension.Width);
          });
        orderedStandardShelf = this.reArrangeBasedOnSameYPos(sectionObj, orderedStandardShelf);
        for (const obj of orderedStandardShelf) {
          if (obj.ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ) {
            obj.Fixture.FixtureNumber = counter++; //  (i + 1);
          }
        }
      }
    }
    this.computeMerchHeight(ctx);
  }

  public getNotchInterval() {
    const sectionObj: any = this;
    const spacing = sectionObj.Notch == 0 ? 1 : sectionObj.Notch;
    const firstNotch = sectionObj.FirstNotch > 0 ? sectionObj.FirstNotch : 0;
    const no = Math.floor(this.Dimension.Height / spacing);
    const notchIntervalArr = [];
    let notchPointer = 0;

    for (let i = 0; i <= no; i++) {
      notchPointer = i * spacing + firstNotch;
      if (notchPointer < this.Dimension.Height) {
        notchIntervalArr.push(notchPointer);
      }
    }

    return notchIntervalArr;
  }

  public getAllAvailableXAxisIntervals(noUpright = null, includeVal?) {
    let intervals: number[] = [];

    //for section start
    intervals.push(0);

    // // TODO: @malu where are we doing the calc for isBayPresent?
    if (this.isBayPresents) {
      this.Children.forEach((obj) => {
        if (Utils.checkIfBay(obj)) {
          intervals.push(Utils.preciseRound(obj.Location.X, 2));
        }
      });
    }

    const uprightIntervals = this.uprightIntervals;
    if (uprightIntervals.length > 0 && !noUpright) {
      intervals = _.union(intervals, uprightIntervals);
    }

    //for section end
    intervals.push(includeVal || this.Dimension.Width);

    intervals = _.uniq(intervals);
    intervals.sort(function (a, b) {
      return a - b;
    });
    return intervals;
  }

  private getAllAvailableYAxisIntervals() {
    return this.getNotchInterval();
  }

  public getNearestXCoordinate(XCord, direction) {
    const intervals = this.getAllAvailableXAxisIntervals();
    for (let i = 0; i < intervals.length - 1; i++) {
      //return nearest interval
      if (XCord > intervals[i] && XCord < intervals[i + 1]) {
        if (direction === 'leftmost') return intervals[i];
        if (direction === 'rightmost') return intervals[i + 1];
      }

      //return exact match
      if (XCord === intervals[i]) return intervals[i];

      //return exact match
      if (XCord === intervals[i + 1]) return intervals[i + 1];
    }

    //return last interval
    if (XCord > intervals[intervals.length - 1]) {
      if (direction === 'leftmost') return intervals[intervals.length - 1];
      if (direction === 'rightmost') return XCord; // let it return the original XCord, will show fitcheck.
    }

    //return first interval
    if (XCord < intervals[0]) {
      return intervals[0];
    }
  }

  //get proposed, nearest notch
  public getNearestYCoordinate(YCord) {
    const intervals = this.getAllAvailableYAxisIntervals();
    for (let i = 0; i < intervals.length - 1; i++) {
      //return nearest interval
      if (YCord > intervals[i] && YCord < intervals[i + 1]) {
        let diff1 = YCord - intervals[i];
        let diff2 = intervals[i + 1] - YCord;
        if (diff1 >= diff2) {
          return intervals[i + 1];
        }
        if (diff1 < diff2) {
          return intervals[i];
        }
      }

      //return exact match
      if (YCord == intervals[i]) return intervals[i];

      //return exact match
      if (YCord == intervals[i + 1]) return intervals[i + 1];
    }

    //return last interval
    if (YCord > intervals[intervals.length - 1]) return intervals[intervals.length - 1];

    //return first interval
    if (YCord < intervals[0]) return intervals[0];
  }

  //get proposed, nearest upright/bay/section
  public getXRelativeToPogByAvailability(shelfXPosToPog, snapLeft) {
    let intervals = this.getAllAvailableXAxisIntervals();

    for (let i = intervals.length - 1; i >= 0; i--) {
      if (shelfXPosToPog >= intervals[i]) {
        return intervals[i];
      }
    }
    return 0;
  }

  public getZIndex(): any {
    return 1;
  }

  public getFixtureFullPathCollection(): FixtureList[] {
    let pogSettings: PogSettings = this.planogramService.rootFlags[this.$id];
    let allShelfs;
    if (pogSettings.isModularView) {
      allShelfs = Utils.getAllTypeShelves([AppConstantSpace.MODULAR], this) as Modular[];
    } else {
      allShelfs = Utils.getAllTypeShelves([
        AppConstantSpace.BLOCK_FIXTURE,
        AppConstantSpace.STANDARDSHELFOBJ,
        AppConstantSpace.PEGBOARDOBJ,
        AppConstantSpace.SLOTWALLOBJ,
        AppConstantSpace.CROSSBAROBJ,
        AppConstantSpace.COFFINCASEOBJ,
        AppConstantSpace.BASKETOBJ,
      ], this) as FixtureList[];
    }

    let fixtureFullPathCollection: FixtureList[] = [];

    // sorting number sensitive strings
    let collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    fixtureFullPathCollection = allShelfs.sort(collator.compare);

    return fixtureFullPathCollection;
  }

  public addModular(index: number, modular: Modular, addUprights: UprightEditPaylod = null): void {
    let sectionObj: Section = this;
    if (index > this.Children.length) {
      index = this.Children.length;
    }
    this.Children.splice(index, 0, modular);

    if (addUprights?.updatedUprights || addUprights?.removeUprights) {
      addUprights.updatedUprights = this.uprightService.clean(addUprights.updatedUprights);
      let uprights = addUprights.updatedUprights;
      let rangeStrt = uprights.indexOf(Utils.preciseRound(modular.getXPosToPog(), 2));
      let startPoint = uprights[rangeStrt];
      this.reassignLocationXofBays();
      this.addUprightOnSecWidthChange(modular, addUprights, sectionObj.Dimension.Width, false);

    } else {
      if (sectionObj.uprightType === UprightType.Variable) {
        // TODO: @malu Why is this additional step needed ?
        const uprights = sectionObj.Upright.split(',');
        uprights.push(Utils.preciseRound(this.Dimension.Width, 2).toString());
        sectionObj.Upright = uprights.join(',');
      }
    }
    if(this.parentApp.isAllocateApp) {
      this.allocateUtils.updatePaModularKey(modular);
    }
   //this.uprightService.updateUpright(this, this.Upright); No need to update upright when we just shift the modulars
  }

  public addUprightOnSecWidthChange(modular: any, addUprights: UprightEditPaylod, newUprightLoc: number, widthGettingIncreased: boolean): void {
    const sectionObj: any = this;
    let uprights = addUprights.updatedUprights;
    widthGettingIncreased ? uprights.pop() : uprights = this.adjustVariables(uprights, sectionObj);
    uprights.push(newUprightLoc);
    uprights = this.uprightService.clean(uprights);
    sectionObj.uprightIntervals = uprights;
    sectionObj.Upright = uprights.toString();
  }

  adjustVariables(variables: number[], section: this): number[] {
    return variables.filter(itm => {
      return itm < section.Dimension.Width
    });
  }

  public addUpright(modular, addUprights: UprightEditPaylod, startPoint?: number): void {
    const sectionObj: any = this;
    let uprights = addUprights.updatedUprights;
    const modLoc = modular.getXPosToPog();
    startPoint = Utils.isNullOrEmpty(startPoint) ? modular.getXPosToPog() : startPoint;
    let rangeStart = uprights.findIndex(upright => ((upright + 0.1) >= modLoc && upright <= modLoc) || ((upright + 0.1) >= modLoc && upright <= modLoc));
    rangeStart == -1? rangeStart = 0: '';
    if (rangeStart >= 0) {
      for (var k = 0; k < addUprights.removeUprights.length; k++) { //  is need when modular is shifting we need to consider the  removed uprights values
        if (addUprights.removeUprights[k] < startPoint) {
          uprights.splice(rangeStart + 1, 0, Utils.preciseRound((uprights[rangeStart] || 0) + addUprights.removeUprights[k], 2));
        } else {
          uprights.splice(rangeStart + 1, 0, Utils.preciseRound((uprights[rangeStart] || 0) + addUprights.removeUprights[k] - startPoint, 2));
        }
        startPoint = addUprights.removeUprights[k];
        rangeStart++;
    }
      for (let l = rangeStart + 1; l < uprights.length; l++) {
       uprights[l] = Utils.preciseRound(addUprights.sum + uprights[l], 2); //parseFloat((addUprights.sum + uprights[l]).toFixed(2));
      }
    }
    //uprights.push(...addUprights.removeUprights); adding removed uprights after caliculation adds extra uprights to the pog
    uprights = this.uprightService.clean(uprights);
    sectionObj.uprightIntervals = uprights;
    sectionObj.Upright = uprights.toString();
  }

  public removeUpright(modular, valueOld: number): UprightEditPaylod {
    let sectionObj: any = this;
    let sum = 0, removeUprights = [];
    let uprights = this.uprightIntervals;

    uprights = this.uprightService.clean(uprights);
    uprights = uprights.reverse();
    let updatedUprights = [...uprights];
    const rangeStrt = Utils.preciseRound(modular.getXPosToPog(), 2);
    const rangeEnd = Utils.preciseRound(modular.getXPosToPog() + (valueOld || modular.Dimension.Width), 2);

    sum = Utils.preciseRound(rangeEnd - rangeStrt, 2);
    if(this.uprightService.deleteModular) {
      sectionObj.Dimension.Width = sectionObj.Dimension.Width - modular.Dimension.Width;
      this.uprightService.deleteModular = false;
    }

    for (var i = 0; i < uprights.length; i++) {
      if(updatedUprights[i] && updatedUprights[i] > sectionObj.Dimension.Width) {
        updatedUprights.splice(i, 1);
      }
      if (rangeStrt < uprights[i] && rangeEnd >= uprights[i]) {
          removeUprights.push(uprights.splice(i, 1)[0]);
          i--;
          continue;
      }
      if (rangeEnd < uprights[i]) {
          uprights[i] = Utils.preciseRound(uprights[i] - sum, 2);// parseFloat((uprights[i] - sum).toFixed(2));
      };
    }
    updatedUprights = this.uprightService.clean(updatedUprights);
    updatedUprights.length == 1 && this.getAllBays().length == 1 && removeUprights.push(...updatedUprights.splice(0, 1));

    sectionObj.uprightIntervals = updatedUprights;
    sectionObj.Upright = updatedUprights.toString();
    return {
      sum: sum,
      removeUprights: removeUprights,
      updatedUprights: updatedUprights,
    };
  }

  public removeModular(index: number, valueOld?: number): UprightEditPaylod | undefined {
    let sectionObj: any = this;
    let returnUpright: UprightEditPaylod | undefined;
    let removeUprt: UprightEditPaylod;
    if (sectionObj.uprightType === UprightType.Variable) {
      let modular = this.Children[index];
      removeUprt = this.removeUpright(modular, valueOld);
    }
    this.Children.splice(index, 1);
    this.applyRenumberingShelfs();
    returnUpright = sectionObj.uprightType === UprightType.Variable
      ? {
        sum: removeUprt.sum,
        removeUprights: removeUprt.removeUprights,
        updatedUprights: removeUprt.updatedUprights,
      }
      : undefined;
      if (sectionObj.uprightType === UprightType.Variable) {
        this.uprightService.updateUpright(this, this.Upright);
     }
    return returnUpright;
  }

  public getModularByIndex(index) {
    let sortedModulars = this.sortModulars(this.sharedService.getAllModulars(this));
    return sortedModulars[index];
  }
  public sortModulars(obj) {
    return obj.sort(function (a, b) {
      return a.Location.X - b.Location.X;
    });
  }
  public addFixturesToBay(bayObject, fixtureObject, fixIndex) {
    let clonedFixture: FixtureList = _.cloneDeep(fixtureObject);
    clonedFixture.Children = [];
    clonedFixture.IDPOGObject = null;
    clonedFixture.IDPOGObjectParent = null;
    clonedFixture.Fixture.IDPOGObject = null;
    this.planogramService.prepareModelFixture(fixtureObject, this);
    this.planogramCommonService.extend(clonedFixture, true, this.$sectionID);
    this.planogramCommonService.setParent(clonedFixture, this);
    Utils.checkIfstandardShelf(clonedFixture) ? (clonedFixture.spanShelfs = []) : '';
    clonedFixture.setParentId(bayObject.$id);
    bayObject.Children.splice(fixIndex, 0, clonedFixture);
    return clonedFixture;
  }
  public reassignLocationXofBays() {
    const sectionObj = this;
    let locX = 0;
    const allModulars = this.sharedService.getAllModulars(sectionObj);
    for (const modular of allModulars) {
      modular.Location.X = locX;
      locX = Utils.preciseRound(locX + modular.Dimension.Width, 2);
    }
    //Width of the section will be total width of the all modulars
    this.Dimension.Width = locX;
  }
  public addModularByIndex(indexArr, addUprights: UprightEditPaylod = null) {
    for (const item of indexArr) {
      const bayObj = item.bay ? item.bay : this.sharedService.getObject(item.$id, this.$sectionID);
      const indexOfBay = item.index;
      this.Dimension.Width = this.Dimension.Width + bayObj.Dimension.Width;
      this.ChildDimension.Width = this.Dimension.Width;
      this.addModular(indexOfBay, bayObj, addUprights);
      const ctx = new Context(this.sharedService.getObjectAs(this.$sectionID, this.$sectionID));
      this.computeMerchHeight(ctx);
    }
    this.applyRenumberingShelfs();
  }
  public removeModularByIndex(indexArr) {
    for (const item of indexArr) {
      //calculate index by using $id
      const bayObj = this.sharedService.getObject(item.$id, this.$sectionID);
      const indexOfBay = this.Children.indexOf(bayObj);
      this.Dimension.Width = this.Dimension.Width - bayObj.Dimension.Width;
      this.ChildDimension.Width = this.Dimension.Width;
      this.removeModular(indexOfBay);
      const ctx = new Context(this.sharedService.getObjectAs(this.$sectionID, this.$sectionID));
      this.computeMerchHeight(ctx);
    }
    this.applyRenumberingShelfs();
  }
  public duplicateModulars(modularTemplate, duplicateItemsInfo) {
    let sectionObj: any = this;
    const oldUpright = this.Upright;
    const ctx = new Context(sectionObj);
    let index = 0;
    let modularToBeCopied: any = {};
    let modularIndexArr = [];
    if (sectionObj.isBayPresents) {
      duplicateItemsInfo.copiedModular
        ? ((duplicateItemsInfo.modularDepth = duplicateItemsInfo.copiedModular.Dimension.Depth),
          (duplicateItemsInfo.modularHeight = duplicateItemsInfo.copiedModular.Dimension.Height))
        : '';

      duplicateItemsInfo.oldDepthVal = sectionObj.Dimension.Depth;
      duplicateItemsInfo.oldHeightVal = sectionObj.Dimension.Height;
      index = duplicateItemsInfo.addRightOrLeft ? this.sharedService.getAllModulars(this).length - 1 : 0;
      if (duplicateItemsInfo.copiedModular && sectionObj.Dimension.Height < duplicateItemsInfo.modularHeight) {
        sectionObj.Dimension.Height = duplicateItemsInfo.modularHeight;
      }
      if (duplicateItemsInfo.copiedModular && sectionObj.Dimension.Depth < duplicateItemsInfo.modularDepth) {
        sectionObj.Dimension.Depth = duplicateItemsInfo.modularDepth;
      }
      for (let i = 0; i < duplicateItemsInfo.noOfMoudlars; i++) {
        let clonedModularTemplate = _.cloneDeep(modularTemplate);
        modularToBeCopied = duplicateItemsInfo.copiedModular
          ? _.cloneDeep(duplicateItemsInfo.copiedModular)
          : _.cloneDeep(this.getModularByIndex(index));
        clonedModularTemplate.Fixture = _.cloneDeep(modularToBeCopied.Fixture);
        clonedModularTemplate.Fixture.Width = duplicateItemsInfo.modularWidth;

        //add modular related required info to the cloned objec
        clonedModularTemplate.ChildDimension = modularToBeCopied.ChildDimension;
        clonedModularTemplate.ChildDimension.Width = duplicateItemsInfo.modularWidth;
        clonedModularTemplate.ChildOffset = modularToBeCopied.ChildOffset;
        clonedModularTemplate.Dimension = modularToBeCopied.Dimension;
        clonedModularTemplate.Dimension.Width = duplicateItemsInfo.modularWidth;
        clonedModularTemplate.Dimension.Height = sectionObj.Dimension.Height;
        clonedModularTemplate.Dimension.Depth = sectionObj.Dimension.Depth;
        clonedModularTemplate.Fixture.Height = sectionObj.Dimension.Height;
        clonedModularTemplate.Fixture.Depth = sectionObj.Dimension.Depth;
        clonedModularTemplate.ChildDimension.Height = sectionObj.Dimension.Height;
        clonedModularTemplate.ChildDimension.Depth = sectionObj.Dimension.Depth;
        clonedModularTemplate.Rotation = modularToBeCopied.Rotation;
        clonedModularTemplate.RotationOrigin = modularToBeCopied.RotationOrigin;
        // TODO: @malu why to assign IDPOG when the prop not there in FixtureObjectResponse?
        clonedModularTemplate.IDPOG = sectionObj.IDPOG;
        clonedModularTemplate.IDPOGObject = null;
        clonedModularTemplate.Fixture.IDPOGObject = null;
        clonedModularTemplate.IDPOGObjectParent = null;
        this.planogramService.prepareModelFixture(clonedModularTemplate, sectionObj);
        this.planogramCommonService.extend(clonedModularTemplate, true, sectionObj.$sectionID, sectionObj);
        this.planogramCommonService.setParent(clonedModularTemplate, sectionObj);
        sectionObj.ChildDimension.Width = sectionObj.ChildDimension.Width + modularToBeCopied.Dimension.Width;
        sectionObj.Dimension.Width = sectionObj.ChildDimension.Width;
        //if fixtures to be copied add it to the cloned object
        if (duplicateItemsInfo.duplicateFixtures) {
          for (const [j, modular] of modularToBeCopied.Children.entries()) {
            //Allow all the fixtures to clone
            if (
              Utils.checkIfstandardShelf(modular) ||
              Utils.checkIfBlock(modular) ||
              Utils.checkIfPegboard(modular) ||
              Utils.checkIfSlotwall(modular) ||
              Utils.checkIfCrossbar(modular) ||
              Utils.checkIfGrill(modular) ||
              Utils.checkIfCoffincase(modular) ||
              Utils.checkIfBasket(modular)
            ) {
              if (modular.Fixture.Width > clonedModularTemplate.Fixture.Width) {
                modular.Fixture.Width = clonedModularTemplate.Fixture.Width;
                modular.ChildDimension.Width = clonedModularTemplate.Fixture.Width;
                modular.Dimension.Width = clonedModularTemplate.Fixture.Width;
              } else if (modular.Fixture.Width < clonedModularTemplate.Fixture.Width) {
                if (modular.Fixture.SnapToRight) {
                  modular.Fixture.Width = clonedModularTemplate.Fixture.Width;
                  modular.ChildDimension.Width = clonedModularTemplate.Fixture.Width;
                  modular.Dimension.Width = clonedModularTemplate.Fixture.Width;
                }
              }
            }

            const clonedFixtureOBJ = sectionObj.addFixturesToBay(
              clonedModularTemplate,
              modularToBeCopied.Children[j],
              j,
            );
            //if duplicate positions is true
            if (duplicateItemsInfo.duplicatePositions) {
              const shelfOBJ = _.cloneDeep(modularToBeCopied.Children[j]);
              for (const [jp, positoinOBJ] of shelfOBJ.Children.entries()) {
                positoinOBJ.IDPOGObject = null;
                positoinOBJ.IDPOGObjectParent = null;
                this.planogramCommonService.extend(positoinOBJ, true, clonedFixtureOBJ.$sectionID);
                this.planogramCommonService.setParent(positoinOBJ, clonedFixtureOBJ);
                if (Utils.checkIfPosition(shelfOBJ.Children[jp])) {
                  positoinOBJ.Position.IDPOGObject = null;
                  this.planogramService.prepareModelPosition(positoinOBJ, sectionObj);
                } else {
                  if (
                    Utils.checkIfGrill(shelfOBJ.Children[jp]) ||
                    Utils.checkIfDivider(shelfOBJ.Children[jp])
                  ) {
                    positoinOBJ.Fixture.IDPOGObject = null;
                    this.planogramService.prepareModelFixture(positoinOBJ, sectionObj);
                  } else {
                    continue;
                  }
                }

                //if Duplicate Facings is true
                if (!duplicateItemsInfo.duplicateFacings) {
                  if (Utils.checkIfPosition(positoinOBJ)) {
                    positoinOBJ.Position.FacingsX = positoinOBJ.Position.MinFacingsX;
                  }
                }
                clonedFixtureOBJ.addCopiedPositions(ctx, positoinOBJ, jp);
              }
            }
          }
        }

        if (Utils.isNullOrEmpty(duplicateItemsInfo.toIndex)) {
          index == 0
            ? (clonedModularTemplate.Location.X = 0)
            : (clonedModularTemplate.Location.X = this.Dimension.Width);
        }

        sectionObj.addModular(
          !Utils.isNullOrEmpty(duplicateItemsInfo.toIndex)
            ? duplicateItemsInfo.toIndex
            : duplicateItemsInfo.addRightOrLeft
              ? index + 2
              : 0,
          clonedModularTemplate,
        );
        modularIndexArr.push({
          // TODO: @malu why to assign IDPOG when the prop not there?
          $id: clonedModularTemplate.$id,
          index: !Utils.isNullOrEmpty(duplicateItemsInfo.toIndex)
            ? duplicateItemsInfo.toIndex
            : duplicateItemsInfo.addRightOrLeft
              ? index + 2
              : 0,
        });
        sectionObj.reassignLocationXofBays();
        sectionObj.computeMerchHeight(ctx);
        //if facings should be copied directly add it to the shelfs with out changes

        //if facings are not required give minimum facings to every position
      }
      sectionObj.applyRenumberingShelfs();
      this.uprightService.updateUpright(sectionObj, sectionObj.Upright);
      const original = ((sectionObj, modularIndexArr, duplicateItemsInfo) => {
        return () => {
          if (sectionObj.Dimension.Height < duplicateItemsInfo.modularHeight) {
            sectionObj.Dimension.Height = duplicateItemsInfo.modularHeight;
          }
          if (sectionObj.Dimension.Depth < duplicateItemsInfo.modularDepth) {
            sectionObj.Dimension.Depth = duplicateItemsInfo.modularDepth;
          }
          sectionObj.addModularByIndex(modularIndexArr);
          this.uprightService.updateUpright(sectionObj, sectionObj.Upright);
        };
      })(sectionObj, modularIndexArr, duplicateItemsInfo);
      const revert = ((sectionObj, modularIndexArr, duplicateItemsInfo, upright) => {
        return () => {
          if (sectionObj.Dimension.Height > duplicateItemsInfo.oldHeightVal) {
            sectionObj.Dimension.Height = duplicateItemsInfo.oldHeightVal;
          }
          if (sectionObj.Dimension.Depth > duplicateItemsInfo.oldDepthVal) {
            sectionObj.Dimension.Depth = duplicateItemsInfo.oldDepthVal;
          }
          sectionObj.removeModularByIndex(modularIndexArr);
          this.uprightService.updateUpright(sectionObj, oldUpright);
        };
      })(sectionObj, modularIndexArr, duplicateItemsInfo, oldUpright);
      this.historyService.captureActionExec({
        funoriginal: original,
        funRevert: revert,
        funName: 'duplicateModulars',
      }, this.$id);
      // this.intersectionUtils.insertPogIDs(null, true);
    } else {
      //Non Bay handling
    }
  }
  public getAllTypeShelvesWithChildren(types) {
    let AllShelfs = [];
    let xPos = 0;

    function recurseFixtureObjects(obj, xPos, types) {
      if (obj !== undefined && obj.length > 0) {
        for (const fixtureRef of obj) {
          let isType = false;
          for (const type of types) {
            if (Utils.checkIfMMShelfType(fixtureRef, type) && fixtureRef.Children.length > 0) {
              isType = true;
            }
          }
          if (isType) {
            AllShelfs.push(fixtureRef);
          } else if (
            fixtureRef.ObjectDerivedType === AppConstantSpace.MODULAR &&
            fixtureRef.hasOwnProperty('Children')
          ) {
            recurseFixtureObjects(fixtureRef.Children, fixtureRef.Location.X, types);
          }
        }
      }
    }
    recurseFixtureObjects(this.Children, xPos, types);
    return AllShelfs;
  }

  public addCopiedFixtureToTop(ctx, fixtureObj) {
    let sectionObj: any = this;
    let allStandardShelf = this.getAllLimitingShelves();
    let orderedStandardShelf = Utils.sortByYPosDesendingOrder(allStandardShelf);
    let parentObj = this;
    let isFitCheckRequired = sectionObj.fitCheck;
    let initiateAdd = (copiedFixture, locationX, locationY, parentObj) => {
      copiedFixture = _.cloneDeep(copiedFixture);
      if (locationY > parentObj.Dimension.Height || locationY < 0) {
        this.notifyService.error(
          'Please Select some other fixture and paste, seems copied fixture dimension exceeds section area',
        );
        return false;
      }
      copiedFixture.$$hashKey = null;
      copiedFixture.IDPOGObject = null;
      copiedFixture.Fixture.IDPOGObject = null;
      copiedFixture.IDPOGObjectParent = parentObj.IDPOGObject;
      this.planogramCommonService.extend(copiedFixture, true, parentObj.$sectionID);
      this.planogramCommonService.setParent(copiedFixture, parentObj);
      copiedFixture.Children.forEach((obj: any) => {
        obj.$$hashKey = null;
        obj.IDPOGObject = null;
        obj.IDPOGObjectParent = copiedFixture.IDPOGObject;
        this.planogramCommonService.extend(obj, true, copiedFixture.$sectionID);
        this.planogramCommonService.setParent(obj, copiedFixture);
      });
      copiedFixture.Location.X = locationX;
      copiedFixture.Location.Y = locationY;
      parentObj.Children.push(copiedFixture);
      this.planogramService.removeAllSelection(parentObj.$sectionID);
      this.planogramService.addToSelectionByObject(copiedFixture, parentObj.$sectionID);

      //undo redo
      const original = ((methodName, copiedFixture, locationX, locationY, parentObj) => {
        return () => {
          methodName(copiedFixture, locationX, locationY, parentObj);
        };
      })(initiateAdd, copiedFixture, locationX, locationY, parentObj);
      const revert = ((obj) => {
        return () => {
          obj.removeFixtureFromSection();
        };
      })(copiedFixture);
      this.historyService.captureActionExec({
        funoriginal: original,
        funRevert: revert,
        funName: 'addCopiedFixture',
      }, this.$id);
    };

    if (orderedStandardShelf.length == 0) {
      initiateAdd(fixtureObj, 0, 0, parentObj);
      return;
    }

    let locationX = orderedStandardShelf[0].Location.X;
    let locationY =
      orderedStandardShelf[0].Location.Y +
      orderedStandardShelf[0].Fixture.Thickness +
      orderedStandardShelf[0].minMerchHeight;

    if (isFitCheckRequired) {
      let orignalObj = this.sharedService.getObject(fixtureObj.$id, this.$id);
      let isValidFitcheck = fixtureObj.doeShelfValidateFitCheck(
        ctx,
        locationX,
        locationY,
        orignalObj.getXPosToPog(),
        orderedStandardShelf[0],
      );
      if (!isValidFitcheck) {
        this.notifyService.error('Fitcheck Error, not finding any space at the top of the section to paste');
        return false;
      }
      initiateAdd(fixtureObj, locationX, locationY, parentObj);
    } else {
      initiateAdd(fixtureObj, locationX, locationY, parentObj);
    }
  }

  public realYPos(rootObject, offsetYDifference) {
    return rootObject.Dimension.Height - offsetYDifference;
  }

  public addCopiedFixtureToLocation(ctx: Context, copiedObj, mousePos, scaleF, selectedObj) {
    let rootObject: any = this;
    let pogOffSetPX = document.querySelector('#innerWebPOG_' + rootObject.IDPOG).getBoundingClientRect(); //= $('#innerWebPOG_' + rootObject.IDPOG).offset();
    let errorDelta = 0.21;
    let offsetYDifference =
      this.planogramService.convertToUnit((mousePos.clientY - pogOffSetPX.top) / scaleF, this.$id) - errorDelta;
    let offsetXDifference =
      this.planogramService.convertToUnit((mousePos.clientX - pogOffSetPX.left) / scaleF, this.$id) - errorDelta;

    let realXPos = offsetXDifference;
    let isExceedsSectionWidth = copiedObj.Dimension.Width + realXPos > rootObject.Dimension.Width ? true : false;
    let isExceedsSectionHeight =
      copiedObj.getRectDimension().height + this.realYPos(rootObject, offsetYDifference) >
        rootObject.Dimension.Height || this.realYPos(rootObject, offsetYDifference) < 0
        ? true
        : false;
    if (isExceedsSectionWidth || isExceedsSectionHeight) {
      this.notifyService.error('FIX_WIDTH_EXCEEDING_SECTION');
      return false;
    }
    let proposedXPosToPog = rootObject.getNearestXCoordinate(realXPos, 'leftmost');
    let val = this.realYPos(rootObject, offsetYDifference);
    if (rootObject.fitCheck && 'getYPosToPog' in selectedObj && !Utils.checkIfBay(selectedObj)) {
      val = selectedObj.getYPosToPog() + selectedObj.minHeightRequired();
    }
    let proposedYPosToPog = rootObject.getNearestYCoordinate(val);

    copiedObj.addCopiedFixtureToLocation(ctx, proposedXPosToPog, proposedYPosToPog, selectedObj);
  }

  public checkFitCheckErrorOccurred(draggbleItemData, droppableItemData) {
    //let startTime = new Date();
    let parentFixtureList = {};
    let intersectItems = [],
      tempIntersectItems: ObjectListItem[] = [];
    let sectionObj: any = this;
    try {
      let insertFitCheckPogObjs = (fitChekcPogObj) => {
        for (let dragPos of fitChekcPogObj) {
          let parentFixture: any = {};
          dragPos = this.sharedService.getObject(dragPos, this.$id);
          if (
            dragPos.ObjectDerivedType === AppConstantSpace.SECTIONOBJ ||
            dragPos.ObjectDerivedType === AppConstantSpace.MODULAR
          ) {
            continue;
          }
          if (Utils.checkIfFixture(dragPos)) {
            parentFixture = dragPos;
          } else {
            parentFixture = this.sharedService.getObject(dragPos.$idParent, dragPos.$sectionID) as MerchandisableList;
          }
          if (
            !Utils.isNullOrEmpty(parentFixtureList[parentFixture.$id]) ||
            Utils.checkIfShoppingCart(parentFixture)
          ) {
            continue;
          }
          if (Utils.checkIfBlock(parentFixture)) {
            tempIntersectItems = tempIntersectItems.concat(parentFixture);
            continue;
          }
          //Check if parent object is section or modular if they are skip adding child and fixture dimensions
          if (
            parentFixture.ObjectDerivedType != AppConstantSpace.SECTIONOBJ &&
            parentFixture.ObjectDerivedType != AppConstantSpace.MODULAR
          ) {
            parentFixtureList[parentFixture.$id] = parentFixture.$id;
            tempIntersectItems = tempIntersectItems.concat(parentFixture.getAllPosition());
            tempIntersectItems = tempIntersectItems.concat(parentFixture);
          }
          //if it is spreadspan
          //If it is spreadspan add all those spanned positoins for fit check array
          if (Utils.checkIfstandardShelf(parentFixture)) {
            if (sectionObj._IsSpanAcrossShelf.FlagData && parentFixture.spreadSpanProperties.isSpreadSpan) {
              let spredSpanFixtures = parentFixture.spanShelfs;
              for (const sprdSpanFix of spredSpanFixtures) {
                const spreadSpanFix = this.sharedService.getObject(sprdSpanFix, sectionObj.$id) as PositionParentList;
                if (
                  !Utils.isNullOrEmpty(parentFixtureList[spreadSpanFix.$id]) ||
                  Utils.checkIfShoppingCart(spreadSpanFix)
                ) {
                  continue;
                }
                parentFixtureList[spreadSpanFix.$id] = spreadSpanFix.$id;
                tempIntersectItems = tempIntersectItems.concat(spreadSpanFix.getAllPosition());
              }
            }
          }
        }
      };
      if (!Utils.isNullOrEmpty(draggbleItemData)) {
        insertFitCheckPogObjs.call(this, draggbleItemData);
      }

      if (
        !Utils.isNullOrEmpty(droppableItemData) &&
        Utils.checkIfFixture(droppableItemData) &&
        !Utils.checkIfBlock(droppableItemData)
      ) {
        insertFitCheckPogObjs.call(this, [droppableItemData]);
      }
      intersectItems = tempIntersectItems;
      this.quadtreeUtil.createQuadTree(this.$id);

      const intersectionDetails = this.quadtreeUtil
        .findingIntersectionsOfChild(this.$id, intersectItems, false, 0,);
      const intersectingInfo = intersectionDetails.intersectingFixtures;
      const vals = intersectionDetails.intersectingFlag
        ? Object.entries(intersectingInfo) : [];

      /*   check if any position item is marked to be force fit */
      for (const val of vals) {
        //check if key is position
        let key = val[0]; // $id
        let value: any = val[1]; // array of intersecting objects
        let item = this.sharedService.getObject(key, this.sharedService.getActiveSectionId());
        if (item.ObjectType === 'Position' && item.Position.attributeObject.ForceFit === true) {
          delete intersectingInfo[key];
          continue;
        }
        // check for the values
        for (let [i, val] of value.entries()) {
          let item = this.sharedService.getObject(val, this.sharedService.getActiveSectionId());
          if (item.ObjectType === 'Position' && item.Position.attributeObject.ForceFit) {
            intersectingInfo[key].splice(val, 1);
            i--;
          }
        }

        if (intersectingInfo[key].length == 0) delete intersectingInfo[key];
      }

      if (intersectingInfo && Object.keys(intersectingInfo).length != 0) {
        let msgArry = this.planogramService.composeIntersectionMsg(intersectingInfo, this.$id);
        this.planogramService.openIntersectionDialog({
          message: msgArry,
          revertFlag: true,
        });
        if (this.planogramService.effectedAction == 'npiInItemScanned') {
          this.notifyService.error('NPI_ADDNPIFAILED_MESSAGE');
          this.planogramService.effectedAction = '';
        }
      } else if (!this.planogramService.dialogOpened) {
        this.planogramService.historyUniqueID = null;
        this.planogramService.pogIntersectionsCheck = false;
        this.planogramService.effectedPogObjIds.length = 0;
        if (this.planogramService.effectedAction == 'npiInItemScanned') {
          this.notifyService.success('NPI_ADDSCNANNEDNPICONFIRM_MESSAGE');
          this.planogramService.effectedAction = '';
        }
        let guid = this.panelService.panelPointer[this.panelID]['globalUniqueID'];
        let npiPosition;
        let currObj;
        if (guid != '') {
          currObj = this.planogramService.getCurrentObject(guid);
          npiPosition = this.newProductInventoryService.getChangedPositionValues(currObj.IDPOG);
        }

        if (!(Utils.isNullOrEmpty(npiPosition) && npiPosition != '')) {
          this.newProductInventoryService.insertNewTempProduct([npiPosition]).subscribe(
            (response) => {
              this.tempProductSaveHandler(response, currObj);
            },
            (d) => {
              this.newProductInventoryService.setChangedPositionValues(null, currObj.IDPOG);
              this.notifyService.success(d.Log.Details[0].Message);
            },
          );
        }
      }
    } catch (e) {
      console.log('Error occured while checking intersections' + e);
      this.planogramService.historyUniqueID = null;
      this.planogramService.pogIntersectionsCheck = false;
      this.planogramService.effectedPogObjIds.length = 0;
    }
  }

  private tempProductSaveHandler(apiResponse : IApiResponse<NewProductInventory>,idPog: number): void {
    if (apiResponse[`Data`] != null) {
      this.newProductInventoryService.setChangedPositionValues(null, idPog);
      this.sharedService.updateNPIGrid.next({ reloadNPI: true });
      if (this.parentApp.isAllocateApp && this.allocateNpi.hasNpiUpdated(this.sharedService.getActiveSectionId())) {
        this.notifyService.warn('NPI_UPC_CHANGED_RELOAD_POG');
      }else {
        this.notifyService.success('NPI_EDITNPICONFIRM_MESSAGE');
      }
    } else {
      this.newProductInventoryService.setChangedPositionValues(null, idPog);
      this.notifyService.warn(apiResponse.Log.Details[0].Message);
    }
  }

  public checkInitFitCheckErrors(): void {
    let sectionID = this.$sectionID;
    this.quadtreeUtil.createQuadTree(sectionID);
    const intersections = this.quadtreeUtil.findingIntersectionsOfChild(sectionID, undefined, false, 0);
    let intersectingFlag = intersections.intersectingFlag;
    if (intersectingFlag && !this.parentApp.isAssortAppInAutoMode) {
      //If fitcheck is on then only we need to show the dialog
      this.logfitCheckError(sectionID, intersections);
    } else if (this.parentApp.isAssortAppInAutoMode) {
      this.logfitCheckError(sectionID, intersections);
    }
  }

  public isRecurseObject = function () {
    return false;
  };

  //TODO @karthik move to annotation service.
  public computeAnnotationDimension() {
    let anDimension: any = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    };

    this.annotations.forEach((child, key) => {
      if (child.status == 'deleted') return;
      anDimension.top = Math.max(anDimension.top, child.top());
      anDimension.bottom = Math.min(anDimension.bottom, child.bottom());
      anDimension.left = Math.min(anDimension.left, child.left());
      anDimension.right = Math.max(anDimension.right, child.right());
    }, this);

    anDimension.left = Math.abs(anDimension.left);
    anDimension.top = anDimension.top > this.Dimension.Height ? anDimension.top - this.Dimension.Height : 0;
    anDimension.bottom = Math.abs(anDimension.bottom);
    anDimension.right = anDimension.right > this.Dimension.Width ? anDimension.right - this.Dimension.Width : 0;

    let anDimensionChanged = false;
    if (
      anDimension.left != this.anDimension.left ||
      anDimension.top != this.anDimension.top ||
      anDimension.bottom != this.anDimension.bottom ||
      anDimension.right != this.anDimension.right
    ) {
      anDimensionChanged = true;
    }
    this.anDimension = anDimension;
    return anDimensionChanged;
  }

  public getWidth() {
    if (this.showAnnotation) {
      return this.Dimension.Width + this.anDimension.left + this.anDimension.right;
    }
    return this.Dimension.Width;
  }

  public getHeight() {
    if (this.showAnnotation) {
      return this.Dimension.Height + this.anDimension.top + this.anDimension.bottom;
    }
    return this.Dimension.Height;
  }

  public getAnnotationDimensionTop() {
    return this.anDimension.top;
  }

  public getAnnotationDimensionLeft() {
    return this.anDimension.left;
  }

  public getAnnotationDimensionRight() {
    return this.anDimension.right;
  }

  public getAnnotationDimensionBottom() {
    return this.anDimension.bottom;
  }

  public getAnnotation(belongsToID) {
    let result = this.annotations.filter(function (val) {
      return val.$belongsToID == belongsToID;
    });
    return result.length ? result[0] : null;
  }

  public addAnnotation(annotation, isPogReadOnly, freeFlow?: boolean) {
    let selPos = {
      lx: annotation.Attribute.location.locX,
      by: annotation.Attribute.location.locY,
      rx: annotation.Attribute.location.locX + annotation.Attribute.location.width,
      ty: annotation.Attribute.location.locY + annotation.Attribute.location.height,
    };

    !freeFlow && this.annotations.forEach((child, pos) => {
      let placedPos = {
        lx: child.Attribute.location.locX,
        by: child.Attribute.location.locY,
        rx: child.Attribute.location.locX + child.Attribute.location.width,
        ty: child.Attribute.location.locY + child.Attribute.location.height,
      };

      if (placedPos.ty > selPos.by && placedPos.by < selPos.ty) {
        if (placedPos.rx > selPos.lx && placedPos.lx < selPos.rx) {
          // There is overlap. Now move the annotation.
          selPos.lx =
            selPos.lx > placedPos.lx
              ? placedPos.rx + 0.5
              : placedPos.lx - 0.5 - annotation.Attribute.location.width;
        }
      }
    });
    annotation.Attribute.location.locX = selPos.lx;
    annotation.Attribute.location.locY = selPos.by;

    // In case of Readonly POG the save is immediate. Hence no need to insert into this.History.
    if (!isPogReadOnly) {
      let me = this;
      this.historyService.startRecording();
      const original = ((obj, annotation) => {
        return () => {
          annotation.status = 'insert';
          obj.annotations.push(annotation);
          obj.computeAnnotationDimension();
          obj.sharedService.updateAnnotationPosition.next(true);
        };
      })(me, annotation);
      const revert = ((obj, annotation) => {
        return () => {
          obj.annotations.forEach((child, pos) => {
            if (child.$id === annotation.$id) {
              obj.annotations[pos].status = 'deleted';
              obj.annotations.splice(pos, 1);
              obj.sharedService.updateAnnotationPosition.next(true);
              return;
            }
          });
          obj.computeAnnotationDimension();
        };
      })(me, annotation);
      this.historyService.captureActionExec({
        funoriginal: original,
        funRevert: revert,
        funName: 'AddAnnotation',
      }, this.$id);
      this.historyService.stopRecording();
    }
    let annIndex = this.annotations.findIndex(ann => ann.$belongsToID == annotation.$belongsToID && annotation.$belongsToID != this.$sectionID);
    if (annIndex != -1) {
      this.annotations[annIndex] = annotation;
    } else {
      this.annotations.push(annotation);
    }
    this.computeAnnotationDimension();
  }

  revert(sectionObj, children, prevAnnotation) {
    sectionObj.Children = children;
    sectionObj.annotations = prevAnnotation;
    if (this.sharedService.splitChangeStatus != undefined) {
      if (
        this.sharedService.splitChangeStatus.state &&
        this.sharedService.splitChangePOGId.indexOf(sectionObj.IDPOG) > -1
      ) {
        this.sharedService.splitChangeStatus.state = false;
      }
    }
  }

  original(sectionObj, children, currentAnnotation) {
    sectionObj.Children = children;
    sectionObj.annotations = currentAnnotation;
    if (this.sharedService.splitChangeStatus != undefined) {
      if (
        !this.sharedService.splitChangeStatus.state &&
        this.sharedService.splitChangePOGId.indexOf(sectionObj.IDPOG) > -1
      ) {
        this.sharedService.splitChangeStatus.state = true;
      }
    }
  }

  public splitShelf(modularTemplate: FixtureObjectResponse, splitPreference: number, bayObj) {
    let clonedDataSource = null;
    let copyOfThis = _.cloneDeep(this);
    let prevAnnotation = copyOfThis.annotations;
    let unqHistoryID = this.historyService.startRecording(null);

    let revert = ((that, children, prevAnnotation) => {
      return () => {
        that.Children = children;
        that.annotations = prevAnnotation;
        if (that.sharedService.splitChangeStatus != undefined) {
          if (
            that.sharedService.splitChangeStatus.state &&
            that.sharedService.splitChangePOGId.indexOf(that.IDPOG) > -1
          ) {
            that.sharedService.splitChangeStatus.state = false;
          }
        }
      };
    })(this, this.Children, prevAnnotation);

    if (_.isEmpty(this.getAllCoffinCases())) {
      clonedDataSource = this.splitShelves(this, modularTemplate, bayObj, splitPreference);

      this.Children = clonedDataSource.Children;

      this.isBayPresents = true;
    } else {
      this.notifyService.warn('SPLIT_SHELF_MESSAGE_FOR_OTHERTHAN_STANDARD_SHELF');
    }

    this.applyRenumberingShelfs();
    let currentAnnotation = _.cloneDeep(this.annotations);

    const original = ((that, children, currentAnnotation) => {
      return () => {
        that.Children = children;
        that.annotations = currentAnnotation;
        if (that.sharedService.splitChangeStatus != undefined) {
          if (
            !that.sharedService.splitChangeStatus.state &&
            that.sharedService.splitChangePOGId.indexOf(that.IDPOG) > -1
          ) {
            that.sharedService.splitChangeStatus.state = true;
          }
        }
      };
    })(this, clonedDataSource.Children, currentAnnotation);

    this.historyService.captureActionExec({
      funoriginal: original,
      funRevert: revert,
      funName: 'revertModulars',
    }, this.$id);
    this.planogramService.insertPogIDs(null, true);
    this.historyService.stopRecording(undefined, undefined, unqHistoryID);

    const splitSuccessMsg = this.translate.instant('SPLIT_SUCCESSFUL_MESSAGE');
    const baysTranslation = this.translate.instant('BAYS');
    this.notifyService.success(
      `${splitSuccessMsg} ${(this.Children.length - 1)} ${baysTranslation}`);
  }

  public containsOnlyCoffinCaseFamily() {
    let allFixtures = this.getAllMerchandisableFixures();

    let otherFixtures = _.filter(allFixtures, function (val) {
      return (
        val.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ ||
        val.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
        val.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ ||
        val.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ
      );
    });

    if (otherFixtures.length > 0) {
      return false;
    } else {
      return true;
    }
  }

  adjustEdgeFixtures(edgeDirection, oldWidth, modular) {
    let getAllSnappedFix = (data, edgeDirection) => {
      //Check any fixture is snapped to right and if there are any fixtures needs increase/decrease in width
      //to attach nearest upright or section width
      let allFixtures = this.getAllLimitingShelves();
      let intervals = this.getAllAvailableXAxisIntervals(true, oldWidth);
      let intervalLen = intervals.length;
      let secWidDiff = this.Dimension.Width - oldWidth;
      //Check any of the fixtures are snapped to right in the last bay
      for (const fix of allFixtures) {
        const dragShelfXPosToPog = fix.getXPosToPog();
        let proposedX2PosToPog = dragShelfXPosToPog + fix.Dimension.Width,
          proposedX1PosToPog = dragShelfXPosToPog,
          proposedWidth = fix.Dimension.Width,
          getParentobject = this.sharedService.getObject(fix.$idParent, data.$id) as StandardShelf;
        let proposedLocationX = getParentobject.getXPosToPog();
        const intervalStart = edgeDirection ? intervals[intervalLen - 2] : intervals[0];
        const intervalEnd = edgeDirection ? intervals[intervalLen - 1] : intervals[1];
        if (!edgeDirection && 0 <= proposedX1PosToPog && intervalEnd > proposedX1PosToPog) {
          if (intervalStart === proposedX1PosToPog) {
            proposedWidth = secWidDiff + fix.Dimension.Width;
          } else if (-secWidDiff > proposedX1PosToPog) {
            proposedWidth = proposedWidth + secWidDiff + proposedX1PosToPog;
            proposedX1PosToPog = 0;
          } else {
            proposedX1PosToPog = fix.Location.X + secWidDiff;
          }
        } else if (intervalStart < proposedX2PosToPog && proposedX2PosToPog <= oldWidth && edgeDirection) {
          if (oldWidth === proposedX2PosToPog) {
            proposedWidth = secWidDiff + fix.Dimension.Width;
          } else if (this.Dimension.Width < proposedX2PosToPog) {
            proposedX2PosToPog = this.Dimension.Width;
            proposedWidth = proposedX2PosToPog - proposedX1PosToPog;
          }
        } else {
          continue;
        }
        proposedLocationX = proposedX1PosToPog - proposedLocationX;
        fix.changeFixWidth(proposedWidth, proposedLocationX);
      }
    };
    getAllSnappedFix(this, edgeDirection);
  }

  public adjustSectionWidth(edgeDirecToAdjust, newWidth) {
    let modular: any = {},
      oldWidth = this.Dimension.Width;
    if (!edgeDirecToAdjust) {
      modular = this.getModularByIndex(0);
    } else {
      modular = this.getLastModular();
    }

    let modularOldValue = modular.Dimension.Width;
    let modularNewValue = modular.Dimension.Width + (newWidth - oldWidth);
    let flag = modular.checkMinWidthTemp(
      edgeDirecToAdjust
        ? modular.Location.X + modularNewValue
        : modular.Location.X + modularOldValue - modularNewValue,
      edgeDirecToAdjust,
    );
    if (flag.flag) {
      this.Dimension.Width = newWidth;
      modular.ChildDimension.Width = modular.Dimension.Width = modular.Fixture.Width = modularNewValue;
      let unqHistoryID = this.historyService.startRecording();
      this.adjustEdgeFixtures(edgeDirecToAdjust, oldWidth, modular);
      this.uprightService.updateUpright(this, this.Upright);
      const original = ((that, modular, newWidth, modularNewValue) => {
        return () => {
          modular.ChildDimension.Width = modular.Dimension.Width = modular.Fixture.Width = modularNewValue;
          that.Dimension.Width = newWidth;
          this.uprightService.updateUpright(that, that.Upright);
        };
      })(this, modular, newWidth, modularNewValue);
      const revert = ((that, modular, oldWidth, modularOldValue) => {
        return () => {
          modular.ChildDimension.Width = modular.Dimension.Width = modular.Fixture.Width = modularOldValue;
          that.Dimension.Width = oldWidth;
          this.uprightService.updateUpright(that, that.Upright);
        };
      })(this, modular, oldWidth, modularOldValue);
      this.historyService.captureActionExec({
        funoriginal: original,
        funRevert: revert,
        funName: 'adjustSecWidth',
      }, this.$id);
      this.historyService.stopRecording(undefined, undefined, unqHistoryID);
    } else {
      return 'failed';
    }
  }

  private splitShelves(dataSource: Section, modularTemplate: FixtureObjectResponse, bayObj: Modular, splitPreference: number): Section {
    this.planogramService.removeAllSelection(dataSource.$sectionID);
    this.modularTemplate = modularTemplate;
    this.bayObj = bayObj;
    let mergeChildren = (mergedShelvesArr, fixture) => {
      let fixtureChildren = fixture.Children;
      for (const fixChild of fixtureChildren) {
        //location x with respect to the shelf its merging
        if (fixChild.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
          const currentFixture = this.sharedService.getParentObject(fixChild, fixChild.$sectionID);
          fixChild.Location.X = currentFixture.getXPosToPog() + fixChild.Location.X;
        }
        if (mergedShelvesArr?.Children) {
          mergedShelvesArr.Children.push(fixChild);
        }
      }
    };
    let allFixtures: any;
    let mergeFixtures = (dataSource) => {
      //Extract all fixtures, standardshelf and pegboard with derived types
      allFixtures = _.cloneDeep(
        Utils.getAllTypeShelves([
          AppConstantSpace.STANDARDSHELFOBJ,
          AppConstantSpace.PEGBOARDOBJ,
          AppConstantSpace.SLOTWALLOBJ,
          AppConstantSpace.CROSSBAROBJ,
          AppConstantSpace.BLOCK_FIXTURE,
        ], this),
      );
      const filterArrLocY = [];
      const resultantFixtures = [];

      //Put fixtures in one index with same location y
      for (const fix of allFixtures) {
        if (!filterArrLocY[fix.Location.Y]) {
          filterArrLocY[fix.Location.Y] = [];
        }
        filterArrLocY[fix.Location.Y].push(fix);
      }

      //Loop through above resultant array
      const iterableObj = Object.keys(filterArrLocY);
      for (const obj of iterableObj) {
        let filterLocYEle = filterArrLocY[obj];
        filterLocYEle = Utils.sortByXPos(filterLocYEle);

        let lastFixture: any = {};
        let locationX = null;
        let mergedShelvesArr = [];
        let isLkCrunchModeSame = true;
        let collectids = [];
        let annotationFound = false;
        //Loop through sorted array
        for (const [j, currentFixture] of filterLocYEle.entries()) {
          if (dataSource.getAnnotation(currentFixture.$id)) {
            collectids.push(currentFixture.$id);
            annotationFound = true;
          }
          if (
            (j < filterLocYEle.length - 1) &&
            filterLocYEle[j].Fixture.LKCrunchMode !== filterLocYEle[j + 1].Fixture.LKCrunchMode &&
            isLkCrunchModeSame
          ) {
            isLkCrunchModeSame = false;
          }

          //if start pos of current fixture is same as end pos of last fixture and object derived type is same, merge shelves
          if (
            !_.isEmpty(lastFixture) &&
            (currentFixture.getXPosToPog() === (lastFixture.getXPosToPog() + lastFixture.Dimension.Width) &&
            currentFixture.ObjectDerivedType === lastFixture.ObjectDerivedType)
          ) {
            if (locationX==null) {
              locationX = lastFixture.getXPosToPog();
            }

            mergeChildren(mergedShelvesArr[locationX], currentFixture);
            if (mergedShelvesArr[locationX]?.Dimension) {
              mergedShelvesArr[locationX].Dimension.Width += currentFixture.Dimension.Width;
            }
          } else {
            mergedShelvesArr[currentFixture.getXPosToPog()] = currentFixture;
            locationX = currentFixture.getXPosToPog();
          }

          lastFixture = currentFixture;
        } //end of sorted array loop
        if (annotationFound) {
          //annoation exists add to the first fixture
          let annotaionFirstObj = dataSource.getAnnotation(collectids[0]);
          let nextannotationObjs;
          annotaionFirstObj.$belongsToID = mergedShelvesArr[0].$id;
          if (collectids.length > 1) {
            for (let k = 1; k < collectids.length; k++) {
              nextannotationObjs = dataSource.getAnnotation(collectids[k]);
              nextannotationObjs.$belongsToID = dataSource.$id;
            }
          }
        }
        if (!isLkCrunchModeSame) {
          mergedShelvesArr[Object.keys(mergedShelvesArr)[0]].Fixture.LKCrunchMode = 5; //no crunch
        }

        resultantFixtures.push(mergedShelvesArr);
      }

      let resultantIndexedArr = [];
      const flatten = (resultantArr) => {
        resultantArr.forEach((value, key) => {
          if (Object.keys(value).length === 1) {
            let key1: any = Object.keys(value);
            resultantIndexedArr.push(value[key1]);
          } else {
            for (const val of Object.keys(value)) {
              resultantIndexedArr.push(value[val]);
            }
          }
        });
      };
      flatten(resultantFixtures);
      return resultantIndexedArr;
    };

    //if merge flag is true
    if (this.bayObj.isMerge) {
      //merge all fixtures with same location y and get the resultant fixtures
      allFixtures = mergeFixtures(dataSource);
    } else {
      //getalltypefixtures
      allFixtures = Utils.getAllTypeShelves([
        AppConstantSpace.STANDARDSHELFOBJ,
        AppConstantSpace.PEGBOARDOBJ,
        AppConstantSpace.SLOTWALLOBJ,
        AppConstantSpace.CROSSBAROBJ,
        AppConstantSpace.BLOCK_FIXTURE,
      ], this);
    }

    //create modulars
    this.modularArr = this.createModulars(allFixtures, dataSource, splitPreference);

    //remove all modular object from cloned datasource
    let rootObject = this.sharedService.getObject(dataSource.$sectionID, dataSource.$sectionID) as Section;

    rootObject.Children = _.filter(dataSource.Children, function (val) {
      return val.ObjectDerivedType == AppConstantSpace.SHOPPINGCARTOBJ;
    });

    //assign new created modulars to the cloned datasource
    rootObject.Children = rootObject.Children.concat(this.modularArr);
    rootObject.ModularCount = this.modularArr.length;

    return rootObject;
  }

  private createModulars(allFixtures, dataSource, splitPreference: number) {
    let fixture2;
    this.modularArr = [];
    let newModularWidth = 0;
    let width = dataSource.Dimension.Width;
    let annotationArrFixture = [];
    let sectionObj = this.sharedService.getObject(
      this.sharedService.getActiveSectionId(),
      this.sharedService.getActiveSectionId(),
    ) as Section;

    //divide the section into baylength and create number of Modulars
    let bays: number;
    if(splitPreference === SplitPreference.resetBaysToUpright) {
      if(this.uprightService.uprightObj.uprightType === UprightType.Variable) {
        bays = this.uprightService.uprightObj.uprightValues.length - 1;
      } else if(this.uprightService.uprightObj.uprightType === UprightType.Fixed) {
        bays = sectionObj.Dimension.Width/this.uprightService.uprightObj.uprightValues[0];
      }
    } else if(splitPreference === SplitPreference.splitShelf) {
        bays = this.bayObj.noBays ? 1 : Number(((width / this.bayObj.width) * 100).toFixed(2)) / 100; //number of bays in decimal
    }


    let noOfBays = Math.ceil(bays);
    let lastModularWidth = noOfBays - bays == 0 ? this.bayObj.width : noOfBays - bays;
    let noBays = this.bayObj.noBays;
    let isNonUniform = eval(
      Number(width % this.bayObj.width)
        .toFixed(8)
        .replace(/\.?0+$/, ''),
    );

    let recalcPositionsLocationX = (fixture, fixture1width) => {
      let children = fixture.Children;

      for (const child of children) {
        if (child.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
          child.Location.X = Number(Math.abs(fixture1width - Number(child.Location.X.toFixed(2))).toFixed(2));
        }
      }

      return children;
    };

    let resetPositionsParent = (fixture) => {
      let children = fixture.Children;
      let originalPosition, positionAnnotationObj;
      for (const child of children) {
        if (child.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
          originalPosition = _.cloneDeep(child);
          child.IDPOGObjectParent = fixture.IDPOGObject;
          this.planogramService.prepareModelPosition(child, this);

          if (sectionObj.getAnnotation(originalPosition.$id)) {
            positionAnnotationObj = sectionObj.getAnnotation(originalPosition.$id);
            positionAnnotationObj.$belongsToID = child.$id;
          }
        }
        this.planogramCommonService.extend(child, true, fixture.$sectionID);
        this.planogramCommonService.setParent(child, fixture);
      }
    };
    let addAnnotationToModular = (modArray) => {
      const allModulars = sectionObj.getAllBays();
      const modularAnnotationIndex = [];
      let modularAnnotationObj;

      for (const modularAnnotation of modularAnnotationIndex) {
        modularAnnotationObj = sectionObj.getAnnotation(allModulars[modularAnnotation].$id);
        modularAnnotationObj.$belongsToID = modArray[modularAnnotation].$id;
      }
    };

    let uprightValues = [...this.uprightService.uprightObj.uprightValues];
    let totalWidth = uprightValues.shift();
    //iterate through each modular
    for (let i = 0; i < noOfBays; i++) {
      let clonedModularTemplate = _.cloneDeep(this.modularTemplate);
      if (this.bayObj.noBays) {
        clonedModularTemplate.Dimension.Width = dataSource.Dimension.Width;
        clonedModularTemplate.Fixture.Width = dataSource.Dimension.Width;
        newModularWidth = this.bayObj.width;
      } else {
          if(splitPreference === SplitPreference.resetBaysToUpright) {
            if(this.uprightService.uprightObj.uprightType === UprightType.Variable) {
              newModularWidth = uprightValues[i] - totalWidth;
              totalWidth += newModularWidth;
            } else if(this.uprightService.uprightObj.uprightType === UprightType.Fixed) {
              newModularWidth = this.uprightService.uprightObj.uprightValues[0];
              if(lastModularWidth > 0 && i === noOfBays-1) {
                newModularWidth = dataSource.Dimension.Width - (this.uprightService.uprightObj.uprightValues[0] * (noOfBays-1));
              }
            }
          } else if(splitPreference === SplitPreference.splitShelf) {
            if (i == noOfBays - 1) {
              if (isNonUniform) {
                newModularWidth = isNonUniform;
              } else {
                newModularWidth = lastModularWidth;
              }
            } else {
              newModularWidth = this.bayObj.width;
            }
          }
        clonedModularTemplate.Dimension.Width = newModularWidth;
        clonedModularTemplate.Fixture.Width = newModularWidth;
      }
      clonedModularTemplate.ChildDimension = _.cloneDeep(dataSource.ChildDimension);
      clonedModularTemplate.ChildOffset = _.cloneDeep(dataSource.ChildOffset);
      clonedModularTemplate.Dimension.Height = dataSource.Dimension.Height;
      clonedModularTemplate.Dimension.Depth = dataSource.Dimension.Depth;
      clonedModularTemplate.Fixture.Height = dataSource.Dimension.Height;
      clonedModularTemplate.Fixture.Depth = dataSource.Dimension.Depth;
      clonedModularTemplate.IDPOGObject = null;
      clonedModularTemplate.Fixture.IDPOGObject = null;
      clonedModularTemplate.IDPOGObjectParent = null;
      clonedModularTemplate.Fixture.FixtureNumber = i + 1;
      this.planogramService.prepareModelFixture(clonedModularTemplate, dataSource);
      this.planogramCommonService.extend(clonedModularTemplate, true, dataSource.$sectionID, dataSource);
      this.planogramCommonService.setParent(clonedModularTemplate, dataSource);

      //add modular related required info to the cloned object

      clonedModularTemplate.selected = false;

      if (i == 0) {
        clonedModularTemplate.Location.X = 0;
      } else {
        clonedModularTemplate.Location.X =
          this.modularArr[i - 1].Location.X + this.modularArr[i - 1].Dimension.Width;
      }
      //check which all fixtures fall into modular x-start and x-end
      let filteredFixtureArr = _.filter(allFixtures, function (val) {
        return (
          Number(val.getXPosToPog().toFixed(2)) >= Number(clonedModularTemplate.Location.X.toFixed(2)) &&
          Number(val.getXPosToPog().toFixed(2)) <
          Number(clonedModularTemplate.Location.X.toFixed(2)) +
          (noBays ? clonedModularTemplate.Dimension.Width : newModularWidth)
        );
      });

      if (!_.isEmpty(filteredFixtureArr)) {
        for (const value of filteredFixtureArr) {
          //divide fixtures into two halves if fixture x-end pos is greater than modular x-end
          let fixture1 = _.cloneDeep(value);
          let positions = value.Children;

          if (value.getXPosToPog() === clonedModularTemplate.getXPosToPog()) {
            //when fixture and modular start positions are same
            fixture1.Location.X = 0;
          } else {
            //when fixture is present in between modular width
            fixture1.Location.X = Utils.preciseRound(value.getXPosToPog() - clonedModularTemplate.getXPosToPog(), 2);
          }
          fixture1.Dimension.Width = Number(fixture1.Dimension.Width.toFixed(2));
          value.Dimension.Width = Number(value.Dimension.Width.toFixed(2));

          if (
            (Number(fixture1.Location.X.toFixed(2)) % newModularWidth) +
            Number(fixture1.Dimension.Width.toFixed(2)) -
            0.09 >
            newModularWidth
          ) {
            fixture1.Dimension.Width = Number(
              Math.abs((fixture1.Location.X % newModularWidth) - newModularWidth).toFixed(2),
            );
          } else {
            fixture1.Dimension.Width = Number(value.Dimension.Width.toFixed(2));
          }

          fixture1.Fixture.Width = fixture1.Dimension.Width;

          //reassign positions to fixture1, positions whose location x falls inside fixture start and end location.
          let fixture1Positions =
            Number(fixture1.Dimension.Width.toFixed(2)) == Number(value.Dimension.Width.toFixed(2))
              ? fixture1.Children
              : _.filter(fixture1.Children, function (val) {
                if (val.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                  return (
                    val.Location.X + fixture1.Location.X <
                    fixture1.Location.X + fixture1.Dimension.Width
                  );
                }
              });

          let originalFixture = this.sharedService.getObject(fixture1.$id, fixture1.$sectionID) as any;

          if (originalFixture.Fixture.HasGrills) {
            let grillsList = _.filter(originalFixture.Children, function (val) {
              if (val.ObjectDerivedType == AppConstantSpace.GRILLOBJ) {
                val.IDPOGObject = null;
                val.Fixture.IDPOGObject = null;
                return val;
              }
            });
            if (grillsList[0] != undefined) {
              fixture1.Children = fixture1Positions.concat(_.cloneDeep(grillsList[0]));
            } else {
              fixture1.Children = fixture1Positions;
            }
          } else {
            fixture1.Children = fixture1Positions;
          }
          //divide fixtures when fixture width is greater than modular width
          if (Number(fixture1.Dimension.Width.toFixed(2)) != Number(value.Dimension.Width.toFixed(2))) {
            fixture2 = _.cloneDeep(value);
            fixture2.Location.X = fixture1.Dimension.Width + value.Location.X;
            fixture2.Dimension.Width =
              Number(value.Dimension.Width.toFixed(2)) - Number(fixture1.Dimension.Width.toFixed(2));
            fixture2.Fixture.Width = fixture2.Dimension.Width;
            fixture2.ChildDimension.Width = fixture2.Dimension.Width;
            fixture2.ChildDimension.Height = fixture2.Dimension.Height;
            fixture2.ChildDimension.Depth = fixture2.Dimension.Depth;
            fixture2.IDPOGObject = null;
            fixture2.Fixture.IDPOGObject = null;
            //reassign positions to fixture2
            let fixture2Positions = _.filter(positions, function (val) {
              if (val.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                return (
                  val.Location.X + fixture1.Location.X >=
                  fixture1.Location.X + fixture1.Dimension.Width
                );
              }
            });
            if (fixture1.Fixture.HasGrills) {
              let grillsList2 = _.filter(originalFixture.Children, function (val) {
                if (val.ObjectDerivedType == AppConstantSpace.GRILLOBJ) {
                  val.IDPOGObject = null;
                  val.Fixture.IDPOGObject = null;
                  return val;
                }
              });
              if (grillsList2[0] != undefined) {
                fixture2.Children = fixture2Positions.concat(_.cloneDeep(grillsList2[0]));
              } else {
                fixture2.Children = fixture2Positions;
              }
            } else {
              fixture2.Children = fixture2Positions;
            }

            //recalculate location x of positions
            fixture2.Children = recalcPositionsLocationX(fixture2, fixture1.Dimension.Width);
          }

          //remove the fixture from all fixtures array
          allFixtures = _.filter(allFixtures, function (val) {
            return val != value;
          });
          this.planogramService.prepareModelFixture(fixture1, this);
          //assign first half of the fixture to the current modular
          this.planogramCommonService.extend(fixture1, true, clonedModularTemplate.$sectionID);
          this.planogramCommonService.setParent(fixture1, clonedModularTemplate);
          fixture1.IDPOGObjectParent = clonedModularTemplate.IDPOGObject;
          let annotationObj = sectionObj.getAnnotation(originalFixture.$id);
          if (annotationObj && annotationArrFixture.indexOf(originalFixture.$id) == -1) {
            annotationArrFixture.push(originalFixture.$id);
            annotationObj.$belongsToID = fixture1.$id;
          }
          resetPositionsParent(fixture1);

          clonedModularTemplate.Children.push(fixture1);

          if (Number(fixture1.Dimension.Width.toFixed(2)) != Number(value.Dimension.Width.toFixed(2))) {
            //push the other half to all fixtures array
            noBays ? filteredFixtureArr.push(fixture2) : allFixtures.push(fixture2);
          }
        }
      }
      if (this.parentApp.isAllocateApp) {
        this.allocateUtils.updatePaModularKey(clonedModularTemplate);
      }
      this.modularArr.push(clonedModularTemplate);
    }
    addAnnotationToModular(this.modularArr);

    return this.modularArr;
  }

  public callCalcFields(): void {
    const eachRecursive = (dataSource: Section) => {
      if (dataSource.hasOwnProperty('Children')) {
        dataSource.Children.forEach((child) => {
          this.planogramService.readCalculatedFieldFromData(child);
          eachRecursive(child);
        });
      }
    };
    eachRecursive(this);
    this.planogramService.readCalculatedFieldFromData(this);
  }

  public applyCrunchmode(): void {
    let sectionObj: Section = this;
    let fix = this.getAllFixChildren();
    fix.forEach((fixture) => {
      if (fixture.ObjectDerivedType !== AppConstantSpace.PEGBOARDOBJ
        && fixture.ObjectDerivedType !== AppConstantSpace.SLOTWALL
        && fixture.ObjectDerivedType !== AppConstantSpace.BLOCK_FIXTURE
        && fixture.ObjectDerivedType !== AppConstantSpace.DIVIDERS
        && fixture.ObjectDerivedType !== AppConstantSpace.GRILLOBJ) {
        fixture.Fixture.LKCrunchMode = sectionObj.LKCrunchMode;
      }
    })
  }

  private logfitCheckError(sectionID: string, intersections: QuadChildIntersections): void {
    let errorList = [];
    if (intersections.intersectingFlag && this.fitCheck) {
      let fitCheckMsg = this.translate.instant('FITCHECK_ERR_RECTIFY_TURNON_SWITCH');
      let errorObj: LogsListItem = {
        Message: fitCheckMsg,
        Type: -1,
        Code: 'FitCheck',
        SubType: 'FitCheck',
        IsClientSide: true,
        PlanogramID: this.IDPOG,
        Option: {
          $id: sectionID,
          $sectionID: sectionID,
          Group: 'FitCheck',
        },
      };
      errorList.push(errorObj);
      this.fitCheck = false;
      let isReadOnly = () => {
        let curObj: POGLibraryListItem = this.sharedService.getObjectFromIDPOG(this.IDPOG);
        return curObj && curObj.IsReadOnly;
      };
      if (!isReadOnly()) {
        this.planogramService.rootFlags[this.$id].isSaveDirtyFlag = true;
        this.planogramService.updateSaveDirtyFlag(true);
      }
    }
    this.SetFitCheckErrors(intersections, errorList);
  }
}

export type LimitingShelf = StandardShelf | PegBoard | BlockFixture | SlotWall | Crossbar | Coffincase | Basket;
