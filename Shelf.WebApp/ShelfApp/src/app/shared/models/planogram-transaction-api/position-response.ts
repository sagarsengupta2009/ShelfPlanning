import { DescData, PogObjectResponse } from './pog-object-response';
import { ProductPackageResponse, ProductPackageSummary } from './product-package-response';
import { ProductResponse } from './product-response';

export interface PositionObjectResponse extends PogObjectResponse {
  Position: PositionResponse;
}

export interface PositionResponse {
  IDPOGObject: number;
  PositionNo: number;
  BayPosition: number;
  IDProduct: number;
  IDPackage: number;
  Product: ProductResponse;
  ProductPackage: ProductPackageResponse;
  FacingsX: number;
  FacingsX_Old: number;
  FacingsY: number;
  FacingsZ: number;
  LayoversY: number;
  LayoversZ: number;
  IsLayUnder: boolean;
  IDMerchStyle: number;
  GapX: number;
  GapY: number;
  GapZ: number;
  SKUGapX: number;
  SKUGapY: number;
  SKUGapZ: number;
  MinDOS: number;
  MaxDOS: number;
  MinFacingsX: number;
  MaxFacingsX: number;
  MaxFacingsY: number;
  MaxFacingsZ: number;
  MaxLayoversY: number;
  MaxLayoversZ: number;
  MinPKGs: number;
  MaxPKGs: number;
  DimX: number;
  DimY: number;
  DimZ: number;
  Modular: number;
  MultiX: number;
  MultiZ: number;
  MultiY: number;
  MultiOrientation: number;
  PegType: number;
  Capacity: number;
  LKDividerType: number;
  UsedLinear: number;
  AvailableLinear: number;
  UsedSquare: number;
  AvailableSquare: number;
  UsedCubic: number;
  AvailableCubic: number;
  Coefficient: number;
  Color: string;
  TrackChangeDate: string;
  TrackChangeCode: string;
  IDErrorList: number;
  IDOrientation: number;
  IdOrientation_Old: number;
  Orientation: unknown;
  LKFitCheckStatus: number;
  PogObject: unknown;
  Cases: number;
  OverhangX: number;
  OverhangZ: number;
  ShrinkHeight: number;
  ShrinkWidth: number;
  ShrinkDepth: number;
  CapacityPerLinear: number;
  DppPerLinear: number;
  MovtPerLinear: number;
  ProfitPerLinear: number;
  SalesPerLinear: number;
  PrcntLinearPerSec: number;
  PrcntLinearPerShelf: number;
  EndPosX: number;
  EndPosY: number;
  EndPosZ: number;
  NestedBlockId: number;
  IdBlock: number | string; // generally number, in fixture blocking its string i.e $id of the fixture
  Date1: string;
  Date2: string;
  PositionCoOrd: string;
  PositionPlace: string;
  LkProductInternalStatus: number;
  ProductAuthCode: number;
  IdCorp: number;
  PositionDesc1: string;
  PositionDesc2: string;
  PositionDesc3: string;
  TempId: string;
  AvailablePackageType: ProductPackageSummary[];
  SlotNo: number;
  _Depth: DescData;
  _EXTDESC39: DescData;
  _FixtureDerivedType: DescData;
  _Height: DescData;
  _PlanogramId: DescData;
  _PlanogramName: DescData;
  _Width: DescData;
  _X05_POSDESCX10: DescData;
  _FixtureNumber: DescData;
}