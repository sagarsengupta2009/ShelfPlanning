import { Dimension } from '../planogram/dimension';
import { Images } from './pog-object-response';

export interface ProductPackageResponse extends Dimension, ProductPackageSummary {
  IDPackageStyle: number;
  IDProduct: number;
  IdPog?: any;
  Product?: any;
  ProductGuid: string;
  IDMerchStyle: number;
  IDParentPackage?: any;
  NumInnerPacks: number;
  ObjectType: string;
  MinDOS: number;
  MaxDOS: number;
  MaxHeight: number;
  MinFacingsX: number;
  MaxFacingsX: number;
  MaxFacingsY: number;
  MaxFacingsZ: number;
  MaxLayoversY: number;
  MaxLayoversZ: number;
  MinPkgs?: any;
  MaxPkgs: number;
  EffectiveFrom: Date;
  EffectiveTo: Date;
  IDSymbol?: any;
  GTIN: string;
  NestingX?: any;
  NestingY?: any;
  NestingZ?: any;
  Overhang: number;
  OverhangX: number;
  OverhangZ: number;
  FingerSpace: number;
  ExpandPctX?: any;
  ExpandPctY?: any;
  ExpandPctZ?: any;
  ShrinkPctX?: any;
  ShrinkPctY?: any;
  ShrinkPctZ?: any;
  InnerPackHigh: number;
  InnerPackWide: number;
  InnerPackDeep: number;
  InnerOrientation?: any;
  DefaultOrientation?: any;
  IdNestingType?: any;
  XPegHole: number;
  ProductPegHole2X: number;
  YPegHole: number;
  UOM: string;
  CasePack: number;
  IsActive: boolean;
  OtherItemOnTop: boolean;
  OtherItemBehind: boolean;
  CreatedTs: Date;
  CreatedBy: string;
  ModifiedTs: Date;
  ModifiedBy: string;
  ImageVersion: number;
  Retail?: any;
  Cost?: any;
  IsImageAvailable: boolean;
  Images: Images;
  PackageImages: any[];
  PackageDate: any[];
  PackageDesc: any[];
  PackageFlag: any[];
  PackageValue: any[];
  X2PegHole: number;
}

export interface ProductPackageSummary {
  AvailablePackageOrientations?: number[];
  Depth: number;
  Height: number;
  IDPackage: number;
  IdPackageStyle: number;
  Images: Images;
  ModifiedTs?: Date;
  Name: string;
  Width: number;
  Orientation?: number;
  Weight?: number;
}
