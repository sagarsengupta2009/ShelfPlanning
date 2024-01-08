import { Dimension } from '../planogram/dimension';

/** #api
 * response of api/PlanogramTransaction/Get
 * Do not add modify fields unless network tab is checked
 */
export interface PogTransactionResponse {
    LKPOGType: number;
    IDPOGStatus: number;
    PlanogramStatus: string;
    IDCorp: number;
    IsActive: boolean;
    IDPOG: number;
    POGFamilyIdentifier: string;
    Name: string;
    AllowOverhang: boolean;
    AllowOverlap: boolean;
    Notch: number;
    FirstNotch: number;
    ModularCount: number;
    LKTraffic: number;
    LKCrunchMode: number;
    CheckoutOwner: string;
    Upright: string;
    fitCheck: boolean;
    IsVariableHeightShelf: boolean;
    shelfStackOrder: number;
    Capacity: number;
    IsMarkedForDelete: boolean;
    LKFixtureMovement: number;
    CreatedBy: string;
    ModifiedTs: Date;
    ModifiedBy: string;
    Color: string;
    CreatedTs: Date;
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
    SKUCount: number;
    RuleSetId: number;
    IDPerfPeriod: number;
    SuppressFingerSpace: boolean;
    IsCalculationRequired: boolean;
    ObjectType: string;
    ClonedFrom: number;
    PogActionType: number;
    Children: Child[];
}

interface DirectionImage {
    Url: string;
    LkDisplayType: number;
}

export interface Fixture extends Dimension {
    IDPOGObject: number;
    IDFixtureType: number;
    FixtureDesc: string;
    FixtureType: string;
    PositionDesc1?: any;
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
    CanJoin: boolean;
    IdContent?: any;
    IDPattern?: any;
    BackColor: string;
    UsedLinear: number;
    AvailableLinear: number;
    Clob?: any;
    AutoComputeFronts: boolean;
    AutoComputeDepth: boolean;
    TestItemCollision: boolean;
    LKFitCheckStatus: number;
    SnapToLeft: boolean;
    SnapToRight: boolean;
    PogObject?: any;
    HasGrills: boolean;
    HasDividers: boolean;
    PartNumber: string;
    ImageObject3D?: any;
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
    NotchNumber?: any;
    IdCorp?: any;
    TempId?: any;
    Capacity: number;
    LKDividerType: number;
    UsedSquare: number;
    AvailableSquare?: any;
    UsedCubic: number;
    AvailableCubic: number;
    Coefficient: number;
    Color: string;
    SeparatorsData?: any;
    LeftImage: DirectionImage;
    LeftImageS?: any;
    RightImage: DirectionImage;
    RightImageS?: any;
    FrontImage: DirectionImage;
    FrontImageS?: any;
    BackImage: DirectionImage;
    BackImageS?: any;
    TopImage: DirectionImage;
    TopImageS?: any;
    BottomImage: DirectionImage;
    BottomImageS?: any;
    _Depth: ProductDesc;
    _Height: ProductDesc;
    _Width: ProductDesc;
    _DividerSlotSpacing: ProductDesc;
    _DividerSlotStart: ProductDesc;
    _GrillPlacement: ProductDesc;
    _GrillSpacing: ProductDesc;
    _Movement: ProductDesc;
}

export interface Point3 {
    X: number;
    Y: number;
    Z: number;
}


interface ProdAuth {
    AuthFlag: number;
    Remarks: string;
}

interface ProdCorpMapping {
    IDProdCorpMap: number;
    IdCorp: number;
    IdProduct: number;
    Upc: string;
    Csc_Id: string;
    Sku: string;
    Name: string;
    ScreenDesc: string;
    Char1: string;
    Size: number;
    Uom: string;
    Color: string;
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
    Brand: string;
    Manufacturer: string;
    Distributor: string;
    LKDistributionType: string;
    IdInvModel?: any;
    LKInternalStatus?: any;
    DefaultMerchStyle?: any;
    DefaultOrientation?: any;
    RetailPrice?: any;
    EquivalentVolume?: any;
    DefaultPackage: number;
    AdjMovtFactor: number;
    DPCA: number;
    IsActive: boolean;
    IsNPI: boolean;
    IsPrimaryUPC: string;
    IsPrefSKU: string;
    ClassificationCode: string;
    WarehouseDuedate?: any;
    WarehouseActualDate?: any;
    SKUCreatedDate?: any;
    BuyerName: string;
    VendorName: string;
    DeliveryFrequency?: any;
    AverageShelfLife?: any;
    CreatedTs: Date;
    CreatedBy: string;
    ModifiedTs: Date;
    ModifiedBy: string;
    DescSize: string;
    ProdCorpDate: any[];
    ProdCorpDesc: any[];
    ProdCorpFlag: any[];
    ProdCorpValue: any[];
}

interface ProductDesc {
    IDProduct: number;
    DescData: string;
    Key: string;
    IDDictionary: number;
}

interface ProductBase {
    IDProduct: number;
    UPC: string;
    SKU: string;
    Name: string;
    ScreenDesc: string;
    Char1: string;
    Size: number;
    UOM: string;
    Color: string;
    ObjectType: string;
    DescSize: string;
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
    Brand: string;
    Manufacturer: string;
    Distributor: string;
    IDInvModel?: any;
    LKDistributionType: string;
    InternalStatus?: any;
    DefaultMerchStyle?: any;
    DefaultOrientation?: any;
    RetailPrice?: any;
    EquivalentVolume?: any;
    IsActive: boolean;
    DefaultPackage: number;
    AdjMovtFactor: number;
    DPCA: number;
    IsNPI: boolean;
    IsPrimaryUPC: string;
    IsPrefSKU: string;
    ClassificationCode: string;
    WarehouseDuedate?: any;
    WarehouseActualDate?: any;
    SKUCreatedDate?: any;
    BuyerName: string;
    VendorName: string;
    DeliveryFrequency?: any;
    AverageShelfLife?: any;
    Csc_Id: string;
    CreatedTs: Date;
    CreatedBy: string;
    ModifiedTs: Date;
    ModifiedBy: string;
    ProdAuth: ProdAuth;
    ExtendedFields?: any;
    ProductDate: any[];
    ProductDesc: any[];
    ProductFlag: any[];
    ProductValue: any[];
    Hierarchy: any[];
    ProdCorpMapping: ProdCorpMapping[];
}

interface Images {
    front?: any;
    back?: any;
    left?: any;
    right?: any;
    top?: any;
    bottom?: any;
}

interface Child {
    IDPOGObject: number;
    IdPog: number;
    Planogram?: any;
    Dimension: Dimension;
    Location: Point3;
    Fixture: Fixture;
    Position?: any;
    RotationOrigin: Point3;
    Rotation: Point3;
    ChildOffset: Point3;
    ChildDimension: Dimension;
    IDPOGObjectParent?: any;
    ObjectType: string;
    Color: string;
    Children: Child[];
    ParentPogObject?: any;
    IDCorp: number;
    TempId?: any;
    TempParentId?: any;
}
