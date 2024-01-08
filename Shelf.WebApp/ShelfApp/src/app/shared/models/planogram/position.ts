import { InventoryModel, PackageAttributes, PositionResponse } from "..";
import { DescData, PackageInventoryModel, ValData } from "../planogram-transaction-api";

export interface PackageBlock {
    type?: string;
    x?: number;
    y?: number;
    z?: number;
    wide?: number;
    high?: number;
    deep?: number;
    gapX?: number;
    gapY?: number;
    gapZ?: number;
    orientation?: number;
    itemHeight?: number;
    itemWidth?: number;
    itemDepth?: number;
    isFingerSpaceIgnored?: boolean;
    isShrinkDirty?: boolean;
    shape?: string;
    slotSpacing?: number;
    slotStart?: number;
    FrontScale?: number;
    color?: string;
}

export interface Orientation {
    idOrientation: number;
    name: string;
    idResource: number;
    stringResourceMaster: any;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    isDefault: boolean;
    displayOrder: number;
    isActive: boolean;
}

export interface InventoryObject {
    DOSMax: any;
    CasesMin: any;
    CasesMax: any;
    UnitsMax: any;
    FacingsMin: any;
    FacingsMax: any;
    UPC: string;
    DOSMin: number;
    UnitsMin: number;
}

export interface PositionPosition extends PositionResponse {
    // added by coffincase.ts
    IsPeggable: boolean;
    _X05_XPEGHOLEPOS:ValData;
    _X05_YPEGHOLEPOS: ValData;
    PegLocation: string;
    SpreadFacingsFactor?: number;
    LKFitCheckStatustext: any;
    _X05_PEGLENGTH: ValData;
    IDOrientationtext: string;
    inventoryObject: PackageInventoryModel & {UPC: string};
    InventoryModel: InventoryModel;
    attributeObject: PackageAttributes & { IsNPI?: boolean; Color_color: string; Calc_ItemCapacity?: number; Calc_ItemFacingsX?: number; };
    LayundersY?:number;
    LayundersZ?:number;
    imageUrl?:string;
    _PosDeletedRef: DescData;
    _LastLocation: DescData;
    RecommendationNumber?:number;
    canDragFlag?:boolean;
    /** @karthik PA Specifc keys, can this be handled differently? */
    ParentKey?: string;
    ProductKey?: string;
    PackName?: string;
    blockType?: string;
    isAdvacncedTray: boolean;
    UnitCappingCount: number;
    UnitCapping: number;
    PegOverhang:number;
    HeightSlope:number;
    BackHooks:number;
    BackSpacing:number;
    BackYOffset:number;
    FrontBars:number;
    FrontSpacing:number;
    PegScannerTag:number;
    TagHeight:number;
    TagWidth:number;
    TagYOffset:number;
    TagXOffset:number;
    MaxPegWeight:number;
    PegHole1X:number;
    PegHole2X:number;
    PegSpanCount:number;
    ProductPegHole1X:number;
    ProductPegHole2X:number;
    ProductPegHoleY:number;
    IsPegTag: boolean;
    PegWeightCapacity: number;
    PegPartID: string;
    IDPegLibrary: number;
    PositionWeightCapacity:number;
    PegWeight: number;
    _PegLibraryPegType: DescData;
    EdgeImage?: { Url: string, LkDisplayType: number };
    side?: string;
    newUrl?: string;
    previousUrl?: string;
    UnitCappingOrientation?: number;
    Congruent?:boolean;
}

export interface InventoryConstraints {
    MaxFacingsX: number;
    MinFacingsX: number;
    MaxUnits: number;
    MinUnits: number;
    MaxCases: number;
    MinCases: number;
    MaxDOS: number;
    MinDOS: number;
}

export interface LabelCustomizedObject {
    text: string;
    //for font
    fontsize: number;
    fontcolor: string;
    fontfamily: string;
    backgroundcolor: string;
    opacity: number;
    strokecolor: string;
    //orientation
    orientation: number;
    //alignments
    alignment: string;
    yAlignment: number;
    xAlignment: number;
    //decimals
    decimals: number;
    //word wrap
    wordwrap: boolean;
    //shrink to fit
    shrinkToFit: boolean;
    //character width calc mchanism
    calcMechanism:'d3' | 'canvas';
    stretchToFacing: boolean;
    type?: string;
    fontStyle:string;
}

export interface PegInfo {
    OffsetX: number;
    Offset2X: number;
    OffsetY: number;
    Length: number;
    Type: number;
    HeightSlope: number;
    BackHooks: number;
    BackSpacing: number;
    BackYOffset: number;
    FrontBars : number;
    FrontSpacing: number;
    IsPegTag: boolean;
    TagHeight: number;
    TagWidth: number;
    TagYOffset: number;
    TagXOffset: number;
    MaxPegWeight: number;
    PegPartID: string;
    PegWeight: number;
    IDPegLibrary: number;
    OffsetXMedian: number;
}
