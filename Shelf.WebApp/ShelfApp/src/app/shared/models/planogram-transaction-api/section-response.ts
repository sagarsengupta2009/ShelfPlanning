import { ProductAuth } from '../panel/panel-containt/product-auth-data';
import { PogProfile, Dimension } from '../planogram';
import { CommonResponseObject } from './common-object-response';
import { FixtureObjectResponse } from './fixture-object-response';
import { FlagData, Images, Location } from './pog-object-response';

/** #api
 * response of api/PlanogramTransaction/Get
 * Do not add modify fields unless network tab is checked
 */
export interface SectionResponse extends CommonResponseObject {
  $id: string;
  ObjectDerivedType: string;
  PogProfile: PogProfile;
  LKPOGType: number;
  IDPOGStatus: number;
  PlanogramStatus: string;
  IDPOGLiveOriginal: number;
  PogStatus: string;
  IDCorp: number;
  IsActive: boolean;
  IDPOG: number;
  IDPOGExternal: number;
  IDPOGCheckOut: number;
  POGFamilyIdentifier: string;
  Name: string;
  IDNotes: number;
  AllowOverhang: boolean;
  AllowOverlap: boolean;
  Dimension: Dimension;
  Location: Location;
  Notch: number;
  FirstNotch: number;
  ModularCount: number;
  LKTraffic: number;
  LKCrunchMode: number;
  IDFillPattern: number;
  IDErrList: number;
  IDInvModel: number;
  CheckoutOwner: string;
  /** Upright is a comma seperated string */
  Upright: string;
  fitCheck: boolean;
  IsVariableHeightShelf: boolean;
  shelfStackOrder: number
  Capacity: number
  IsMarkedForDelete: boolean;
  LKFixtureMovement: number;
  StoreEffectiveFrom: string;
  StoreEffectiveTo: string;
  CreatedBy: string
  ModifiedTs: string;
  ModifiedBy: string
  Color: string
  IDContent: number;
  Clob: unknown;
  CreatedTs: string;
  L1: string;
  L2: string;
  L3: string;
  L4: string;
  L5: string;
  L6: string;
  L7: string;
  L8: string;
  L9: string;
  L10: string;
  RowVersion: number;
  Version: string;
  PlanogramImageRepository: [];
  PlanogramNotes: [];
  Thumbnail: string;
  POGGuid: string;
  Tags: string;
  Remarks: string;
  DaysInWeek: number;
  FileName: string;
  Sales: number;
  Profit: number;
  DPP: number;
  LinearMultiplier: number;
  SquareMultiplier: number;
  CubicMultiplier: number;
  AvailableLinear: number;
  UsedLinear: number;
  POGQualifier: string;
  ControllingHier: number;
  SKUCount: number | { pog: number, cart: number };
  RuleSetId: number;
  IDPerfPeriod: number;
  SuppressFingerSpace: boolean;
  IsCalculationRequired: boolean;
  ObjectType: string;
  PerformancePeriod: number;
  ProductPackages: any[];
  PogObjectExtension: any[];
  PogBlocks: any[];
  LookUp: any;
  ClonedFrom: any;
  PogActionType: number;
  InventoryModel: PackageInventoryModel;
  PackageAttributes: { [key: string]: PackageAttributes };
  PackageInventoryModel: { [key: string]: PackageInventoryModel };
  isBayPresents: boolean;
  Children: FixtureObjectResponse[];
  UnitPackageItemInfos: UnitPackageItemInfos[];
  _IsSpanAcrossShelf: FlagData;
  _Reversenotch: FlagData;

  // extended properties referred in section.ts
  _DeltaSales: PogExtendedProperty | undefined;
  _DeltaMovement: PogExtendedProperty | undefined;
  _DeltaProfit: PogExtendedProperty | undefined;
  _TotalSales: PogExtendedProperty | undefined;
  _TotalMovement: PogExtendedProperty | undefined;
  _TotalProfit: PogExtendedProperty | undefined;
  _PerChangeSales: PogExtendedProperty | undefined;
  _PerChangeMovement: PogExtendedProperty | undefined;
  _PerChangeProfit: PogExtendedProperty | undefined;
  // PA specific
  ProdAuthData?:ProductAuth;
  //Section level Position numbering fields by fixture type
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
  OverrideSectionPosNumbering: boolean;
}

export interface UnitPackageItemInfos{
  Depth: number;
  Height: number;
  Width: number;
  IDProduct: number;
  PackageImages:Images;
  orientation: number;
  Weight: number;
}
export interface InventoryModel {
  IDCorp: number,
  Corporation: string,
  IDPog: number,
  Planogram: string,
  CasesMin: number,
  CasesMax: number,
  DOSMin: number,
  DOSMax: number,
  FacingsMin: number,
  FacingsMax: number,
  UnitsMin: number,
  UnitsMax: number,
  ReplenishmentMin: number,
  ReplenishmentMax: number,
  PeakSafetyFactor: number,
  BackroomStock: number,
  DeliverySchedule: string,
  Movement: number,
  IDInvModel: number
}

export interface PackageAttributes {
  IdPackageAttribute: number;
  IdCorp: number;
  IdPog: number;
  IdProduct: number;
  IdPackage: number;
  UniqueProdPkg: string;
  Cost: number;
  CostInventory: number;
  Retail: number;
  Profit: number;
  DOS: number;
  DPP: number;
  Sales: number;
  SPM: number;
  AdjustmentFactor: number;
  Movement: number;
  Turns: number;
  GMROII: number;
  ROII: number;
  ProfitPerUnit: number;
  LostSales: number;
  OOS: number;
  ActualMargin: number;
  ContributedMargin: number;
  AdjustedMovement: number;
  WeeksOfSupply: number;
  Casepack: number;
  AdjMovtFactor: number;
  Color: string;
  RecADRI: string;
  RecAppliedOn: string;
  RecROSUnits: number;
  RecROSSales: number;
  RecROSVolume: number;
  RecCPI: number;
  RecLoyaltyIndex: number;
  RecFacings: number;
  RecSalesFCST: number;
  RecMovtFCST: number;
  RecUserNotes: string
  RecSystemNotes: string
  RecNPI: boolean;
  RecMustStock: boolean;
  RecMustNotStock: boolean;
  RecAvailableToOrder: boolean;
  RecMktUnits: number;
  RecMktSales: number;
  RecMktVolume: number;
  RecVolume: number;
  RecMarginCash: number;
  RecMarginPercentage: number;
  RecProfitCash: number;
  RecProfitPercentage: number;
  RecDistNumeric: number;
  RecDistWeighted: number;
  RecNoOfStores: number;
  RecPSW: number;
  RecCapacity: number;
  RecCases: number;
  RecCostInventory: number;
  RecDOS: number;
  RecFrontsDeep: number;
  RecROII: number;
  RecTurns: number;
  RecWOS: number;
  CurrNoOfStores: number;
  CurrPSW: number;
  CurrMovt: number;
  CurrMovtLY: number;
  CurrMovtAdj: number;
  CurrSales: number;
  CurrSalesLY: number;
  CurrGrossProfit: number;
  CurrAdjGrossProfit: number;
  CurrTrueProfit: number;
  ManualPerfData: string;
  ForceFit: boolean
  WhiteSpacePosition: number;
  WhiteSpaceWidth: number;
  WhiteSpaceText: string;
  /* PA specific */
  ProductKey?: string;
  PackName?: string;
  unitHeight: number;
  unitWidth: number;
  unitDepth: number;
  unitOrientation: number;
}

export interface PackageInventoryModel {
  BackroomStock: number
  CapacityPerFacings: number;
  CapacityTarget: number;
  CasesMax: number;
  CasesMin: number;
  DOSMax: number;
  DOSMin: number;
  DeliverySchedule: string;
  FacingDeviation: number;
  FacingsMax: number;
  FacingsMin: number;
  HighlightLabel: string;
  IDCorp: number;
  IDPackage: number;
  IDPog: number;
  IDProduct: number;
  IDInvModel: number;
  ItemCapacity: number;
  ItemFacingsX: number;
  LostSales: number;
  PeakSafetyFactor: number;
  Planogram: SectionResponse;
  ReplenishmentMax: number;
  ReplenishmentMin: number;
  TgtFacingsX: number;
  UniqueProdPkg: string;
  UnitsMax: number;
  UnitsMin: number;
  /* PA specific */
  ProductKey?: string;
  PackName?: string;
}

export interface PogExtendedProperty {
  IDDictionary: number;
  IDPOG: number;
  Key: string;
  ValData: number;
}
