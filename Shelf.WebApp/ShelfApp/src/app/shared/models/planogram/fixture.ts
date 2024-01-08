import { PogObject } from "./pog-object";

export interface Fixture {
  IDPOGObject: number;
  IDFixtureType: number;
  fixtureDesc: string;
  fixtureType: string;
  positionDesc1: string;
  fixtureNumber: number;
  isReferenceFixture: boolean;
  isLikePosition?: boolean;
  isMerchandisable?: boolean;
  isMovable?: boolean;
  height?: number;
  width?: number;
  depth?: number;
  thickness: number;
  maxMerchWidth?: number;
  maxMerchDepth?: number;
  maxMerchHeight?: number;
  LKCrunchMode?: number;
  canJoin?: boolean;
  idContent?: number;
  IDPattern?: number;
  backColor: string;
  availableLinear?: number;
  clob: any;
  autoComputeFronts?: boolean;
  autoComputeDepth: boolean;
  testItemCollision: boolean;
  lKFitCheckStatus: number;
  snapToLeft: boolean;
  snapToRight: boolean;
  pogObject: PogObject;
  hasGrills: boolean;
  hasDividers: boolean;
  partNumber: string;
  imageObject3D?: number;
  overhangXLeft: number;
  overhangXRight: number;
  overhangZFront: number;
  overhangZBack: number;
  disablePegOverHang: boolean;
  allowPegOverlap: boolean;
  suppressShrinkOrExpandX: boolean;
  suppressShrinkOrExpandY: boolean;
  suppressShrinkOrExpandZ: boolean;
  DisplayViews: number;
  forceApplyShrinkX: boolean;
  sales?: number;
  profit?: number;
  dPP?: number;
  sKUCount: number;
  stackOrder: string;
  notchNumber?: number;
  idCorp?: number;
  tempId?: string;
  capacity: number;
  lKDividerType: number;
  availableSquare?: number;
  availableCubic?: number;
  coefficient: number;
  color: string;
  separatorsData: string;
  leftImage: any;
  leftImageS: string;
  rightImage: any;
  rightImageS: string;
  frontImage: any;
  frontImageS: string;
  backImage: any;
  backImageS: string;
  topImage: any;
  topImageS: string;
  bottomImage: any;
  bottomImageS: string;
  Children?: PogObject[];

  // @og added 2 fields for PlanogramHelperService.updateSVGWithIdPogObject function
  IdPogObject?: string;
  Guid?: string;
}

export interface FromPropertyGrid {
  oldWidth: number;
  oldLocY: number;
  oldLocX: number;
}

export interface LogStackMax {
  wide: number;
  high: number;
  deep: number;
}

export interface LogStackListObject extends LogStackMax {
  x: number;
  y: number;
  z: number;
}

export interface DrawingList {
  listObject: LogStackListObject[];
  facingsY?: number;
  facingsZ?: number;
  shape?: string;
}

export interface ValidaMoveParams {
  height: boolean;
  width: boolean;
  newHeight: number;
  newWidth?: number;
  forSection: boolean;
  forBoth?: boolean;
  forSelf?: boolean;
  LocX?: number;
  LocY?: number;
}
//Specific to Next Location X fucntion which is used in position class.
export interface NextLocXDirection {
  left?: boolean,
  isUpDown?: boolean
}

export interface NextLocYDirection {
  leftRight?: boolean,
  up?: boolean
}

export enum FixtureType {
  ShoppingCart = -1,
  Modular = 0,
  StandardShelf = 1,
  Crossbar = 2,
  Pegboard = 3,
  HangingBar = 4,
  BlockFixture = 5,
  Grill = 6,
  Divider = 7,
  CoffinCase = 8,
  Slotwall = 9,
  Basket = 10,
}
