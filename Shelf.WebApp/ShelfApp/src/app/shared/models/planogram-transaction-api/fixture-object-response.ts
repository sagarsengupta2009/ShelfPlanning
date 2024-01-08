import { Dimension } from '../planogram/dimension';
import { DirectionImage, DescData, PogObjectResponse, ValData } from './pog-object-response';

export interface FixtureObjectResponse extends PogObjectResponse {
  Fixture: FixtureResponse;
}

export interface FixtureResponse extends Dimension {
  IDPOGObject: number;
  IDFixtureType: number;
  FixtureDesc: string;
  FixtureType: string;
  PositionDesc1: string;
  FixtureNumber: number;
  IsReferenceFixture: boolean;
  IsLikePosition: boolean;
  IsMerchandisable: boolean;
  IsMovable: boolean;
  Thickness: number;
  MaxMerchWidth: number;
  MaxMerchDepth: number;
  MaxMerchHeight: number;
  LKCrunchMode: number;
  CanJoin: CanJoin;
  IdContent: number;
  IDPattern: number;
  BackColor: string;
  UsedLinear: number;
  AvailableLinear: number;
  Clob: unknown;
  AutoComputeFronts: boolean;
  AutoComputeDepth: boolean;
  TestItemCollision: boolean;
  LKFitCheckStatus: number;
  SnapToLeft: boolean;
  SnapToRight: boolean;
  PogObject: unknown;
  HasGrills: boolean;
  HasDividers: boolean;
  PartNumber: string;
  ImageObject3D: number;
  OverhangXLeft: number;
  OverhangXRight: number;
  OverhangZFront: number;
  OverhangZBack: number;
  DisablePegOverHang: boolean;
  AllowPegOverlap: boolean;
  SuppressShrinkOrExpandX: boolean;
  SuppressShrinkOrExpandY: boolean;
  SuppressShrinkOrExpandZ: boolean;
  DisplayViews: number;
  ForceApplyShrinkX: boolean;
  Sales: number;
  Profit: number;
  DPP: number;
  SKUCount: number;
  StackOrder: string;
  NotchNumber: number;
  IdCorp: number;
  TempId: string;
  Capacity: number;
  LKDividerType: number;
  UsedSquare: number;
  AvailableSquare: number;
  UsedCubic: number;
  AvailableCubic: number;
  Coefficient: number;
  Color: string;
  SeparatorsData: string;
  LeftImage: DirectionImage;
  LeftImageS: string;
  RightImage: DirectionImage;
  RightImageS: string;
  FrontImage: DirectionImage;
  FrontImageS: string;
  BackImage: DirectionImage;
  BackImageS: string;
  TopImage: DirectionImage;
  TopImageS: string;
  BottomImage: DirectionImage;
  BottomImageS: string;
  ForegroundImage: DirectionImage;
  BackgroundFrontImage: DirectionImage;
  BackgroundBackImage: DirectionImage;
  _Depth: DescData;
  _Height: DescData;
  _Width: DescData;
  _DividerSlotSpacing: DescData;
  _DividerSlotStart: DescData;
  _GrillPlacement: ValData;
  _GrillSpacing: ValData;
  _Movement: DescData;
  AutoComputeFonts?: boolean;
  FixtureFullPath?: string;
  ModularNumber?: number;
  FixtureWeightCapacity:number;
  MaxFixtureWeight :number;
  IgnoreMerchHeight?: boolean;
  IgnoreFingerSpace?: boolean;
}

export enum CanJoin{
  'NONE' = 0,
  'JOIN_LEFT_RIGHT' = 1,
  'JOIN_LEFT' = 2,
  'JOIN_RIGHT' = 3
}
