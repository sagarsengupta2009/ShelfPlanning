import { PositionObjectResponse } from './../planogram-transaction-api/position-response';
import { FixtureObjectResponse } from './../planogram-transaction-api/fixture-object-response';
import { Dimension, PogTemplate } from '../planogram';

/** Represents the structure in which data is received from API */
export interface PlanogramAPIResponse {
    Hierarchy1_GetHierarchy: PlanogramApisParams<Hierarchy>;
    PkgAttrTemplate_GetPkgAttrTemplate: PlanogramApisParams<PkgAttrTemplate>;
    PlanogramScenariosPogs_GetPlanogramScenariosPogs: PlanogramApisParams<PlanogramScenariosPogs>;
    Pog3DObjects_GetPog3DObjects: PlanogramApisParams<Pog3DObjects[]>;
    PogFixturesSearch_DefaultPogFixturesSearch: PlanogramApisParams<PogTemplate[]>;
    RenderingModel0_GetObjectRenderingModel: PlanogramApisParams<FixtureObjectResponse[]>;
    RenderingModel6_GetObjectRenderingModel: PlanogramApisParams<FixtureObjectResponse[]>;
    RenderingModel7_GetObjectRenderingModel: PlanogramApisParams<FixtureObjectResponse[]>;
    RenderingModel_GetObjectRenderingModel: PlanogramApisParams<PositionObjectResponse[]>;
    projectProductHierarchy_GetProjectProductHierarchy: PlanogramApisParams<ProjectProductHierarchy>;
}
/** Readable format, used for transformation */
export interface AllPlanogramResponse {
    hierarchy: Hierarchy;
    pkgAttrTemplate: PkgAttrTemplate;
    planogramScenariosPogs: PlanogramScenariosPogs;
    pog3DObjects: Pog3DObjects[];
    defaultPogFixturesSearch: PogTemplate[];
    modularTemplate: FixtureObjectResponse;
    grillsTemplate: FixtureObjectResponse;
    dividerTemplate: FixtureObjectResponse;
    positionTemplate: PositionObjectResponse;
    projectProductHierarchy: ProjectProductHierarchy;
}

export interface PlanogramApisParams<T> {
    data: T;
    status: number;
}

export interface ProjectProductHierarchy {
    FilterQuery: string;
    Hierarchy: ProductHierarchy[];
    IsFilterable: false;
}

export interface ProductHierarchy {
    Name: string;
    Id: number;
    Children: ProductHierarchy[];
    Expanded: boolean;
}

export interface Hierarchy {
    groupDescription: string;
    groupName: string;
    hierarchyChildren: HierarchyChildren[];
    idCorp: number;
    idPogGroup: number;
    isActive: boolean;
    isPrimary: boolean;
    minimumHierarchy: number;
}

export interface HierarchyChildren {
    Children: HierarchyChildren[];
    IsChildrenAvailable: boolean;
    depth: number;
    id: number;
    idParentPogHier: any;
    idPogGroup: number;
    isActive: boolean;
    name: string;
}

export interface PkgAttrTemplate {
    ActualMargin: any;
    AdjMovtFactor: boolean;
    AdjustedMovement: any;
    AdjustmentFactor: boolean;
    Casepack: any;
    Color: any;
    ContributedMargin: any;
    Cost: any;
    CostInventory: any;
    CurrAdjGrossProfit: any;
    CurrGrossProfit: any;
    CurrMovt: any;
    CurrMovtAdj: any;
    CurrMovtLY: any;
    CurrNoOfStores: any;
    CurrPSW: any;
    CurrSales: any;
    CurrSalesLY: any;
    CurrTrueProfit: any;
    DOS: any;
    DPP: any;
    ForceFit: boolean;
    GMROII: any;
    IdCorp: boolean;
    IdPackage: number;
    IdPackageAttribute: boolean;
    IdPog: any;
    IdProduct: number;
    LostSales: any;
    ManualPerfData: any;
    Movement: any;
    OOS: any;
    Profit: any;
    ProfitPerUnit: any;
    ROII: any;
    RecADRI: any;
    RecAppliedOn: any;
    RecAvailableToOrder: any;
    RecCPI: any;
    RecCapacity: boolean;
    RecCases: boolean;
    RecCostInventory: boolean;
    RecDOS: boolean;
    RecDistNumeric: any;
    RecDistWeighted: any;
    RecFacings: any;
    RecFrontsDeep: boolean;
    RecLoyaltyIndex: any;
    RecMarginCash: any;
    RecMarginPercentage: any;
    RecMktSales: any;
    RecMktUnits: any;
    RecMktVolume: any;
    RecMovtFCST: any;
    RecMustNotStock: any;
    RecMustStock: any;
    RecNPI: any;
    RecNoOfStores: any;
    RecPSW: any;
    RecProfitCash: any;
    RecProfitPercentage: any;
    RecROII: boolean;
    RecROSSales: any;
    RecROSUnits: any;
    RecROSVolume: any;
    RecSalesFCST: any;
    RecSystemNotes: any;
    RecTurns: boolean;
    RecUserNotes: any;
    RecVolume: any;
    RecWOS: boolean;
    Retail: any;
    SPM: any;
    Sales: any;
    Turns: any;
    UniqueProdPkg: any;
    WeeksOfSupply: any;
    WhiteSpacePosition: boolean;
    WhiteSpaceText: any;
    WhiteSpaceWidth: boolean;
}

export interface PlanogramScenariosPogs {
    Planograms: Planograms[];
    ProjectName: string;
    Remarks: string;
    ScenarioName: string;
    StartDate: string;
    Status: number;
    StatusDesc: string;
}

/**  #api model
 * Returned by Api: /api/planogram/GetAllPlanogramApis
 *  found under response.Data.PlanogramScenariosPogs_GetPlanogramScenariosPogs
 * IMPORTANT!: do not add any field unless the api changes
 * If you see a field that the api returned as null changes it to optional here
 */
export interface Planograms {
    isLoaded: boolean;
    CheckOutMessage: string;
    CheckoutOwner?: string;
    Custom: {
        IdPogExternal?: number;
    };
    Dimension: Dimension;
    EffectiveFrom: string;
    EffectiveTo: string;
    IDPOG: number;
    IDPogStatus: number;
    Image?: string;
    IsActive: boolean;
    IsApproved?: boolean;
    IsAutoSaved: boolean;
    IsFavorite: boolean;
    IsLocked: boolean;
    IsMarkedAsDelete: boolean;
    IsReadOnly: boolean;
    IsStatusLock: boolean;
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
    LastAutoSavedDate?: string;
    LkTraffic: number;
    ModalPOGDescription: string;
    Name: string;
    NoOfProducts: number;
    NoOfStores: number;
    POGFamilyIdentifier: string;
    POGGuid: string;
    POGLastModifiedBy: string;
    POGLastModifiedDate: string;
    POGStatus: number;
    POGType: number;
    POGTypeSymbol: string;
    POGTypeValue: string;
    PogDepth: number;
    PogHeight: number;
    PogStatusSymbol: string;
    PogWidth: number;
    StoreName: string;
    StoreNum: string;
    Version: string;
    id: number;
    $sectionID: string;
    //PA specific
    displayVersion?: string;
    rowKey?: string;
    cached?: boolean;
    pinned?:boolean;
    ThumbnailFileName: string;
    IsMerchandized: boolean; //ABS specific
}

export interface Pog3DObjects extends Dimension {
    Clob: Clob;
    IDClob: number;
    IDPOG3DObject: number;
    IdFixtureType: number;
    IsActive: boolean;
    Manufacturer: string;
    ObjectDescription: string;
    ObjectType: number;
    Url: string;
    Image3DObjects?: Image3DObjects[];
    Selected3DObject?: Selected3DObject;
    IdPogObject?: IdPogObject;
}
interface Clob {
    ClobData: string;
    CreatedBy: Date;
    CreatedTs: Date;
    FileLocation: any;
    IdClob: number;
    IsActive: boolean;
    ModifiedBy: Date;
    ModifiedTs: Date;
}

// TODO: @malu - This class can be removed.
// Components referring to this class has to use pog mixin classess
// Then cleanup this code.
export interface ObjectRenderingModel {
    ChildDimension: Dimension;
    ChildOffset: { X?: number; Y?: number; Z?: number };
    Children: any[];
    Color?: string;
    Dimension: Dimension;
    Fixture: Fixture;
    IDPOGObject?: object;
    IDPOGObjectParent?: object;
    Location: { X?: number; Y?: number; Z?: number };
    ObjectType: string;
    Rotation: { X?: number; Y?: number; Z?: number };
    RotationOrigin: { X?: number; Y?: number; Z?: number };
    TempId?: number;
    TempParentId?: number;
    ObjectDerivedType: string;
    $sectionID: string;
}

interface Fixture {
    AllowPegOverlap: boolean;
    AutoComputeDepth: boolean;
    AutoComputeFronts?: boolean;
    AvailableCubic: any;
    AvailableLinear: any;
    AvailableSquare: any;
    BackColor?: string;
    BackImage: { Url: string; LkDisplayType: number };
    BottomImage: { Url: string; LkDisplayType: number };
    CanJoin: boolean;
    Capacity: number;
    ClobData: any;
    Coefficient: number;
    Color: string;
    DPP: any;
    Depth: any;
    DisablePegOverHang: boolean;
    DisplayViews: number;
    FixtureDesc: string;
    FixtureNumber: number;
    FixtureType: string;
    ForceApplyShrinkX: boolean;
    FrontImage: { Url: string; LkDisplayType: number; FarFrontUrl: string };
    HasDividers: boolean;
    HasGrills: boolean;
    Height: any;
    IDContent: any;
    IDFixtureType: number;
    IDPOGObject: any;
    IDPattern: any;
    IdPattern: any;
    ImageObject3D: any;
    IsLikePosition: any;
    IsMerchandisable: any;
    IsMovable: any;
    IsReferenceFixture: boolean;
    LKCrunchMode: any;
    LKDividerType: number;
    LKFitCheckStatus: number;
    LeftImage: { Url: string; LkDisplayType: number };
    MaxMerchDepth: any;
    MaxMerchHeight: any;
    MaxMerchWidth: any;
    NotchNumber: any;
    OverhangXLeft: number;
    OverhangXRight: number;
    OverhangZBack: number;
    OverhangZFront: number;
    PartNumber: any;
    PositionDesc1: any;
    Profit: any;
    RightImage: { Url: string; LkDisplayType: number };
    SKUCount: number;
    Sales: any;
    SeparatorsData: any;
    SnapToLeft: boolean;
    SnapToRight: boolean;
    StackOrder: any;
    SuppressShrinkOrExpandX: boolean;
    SuppressShrinkOrExpandY: boolean;
    SuppressShrinkOrExpandZ: boolean;
    TempId: any;
    TestItemCollision: boolean;
    Thickness: number;
    TopImage: { Url: string; LkDisplayType: number };
    UsedCubic: any;
    UsedLinear: any;
    UsedSquare: any;
    Width: any;
    side: string; // TODO: create enum
    newUrl?: string;
    Grills: any;
    _Depth: FixtureChildParams;
    _DividerSlotSpacing: FixtureChildParams;
    _DividerSlotStart: FixtureChildParams;
    _GrillPlacement: FixtureChildParams;
    _GrillSpacing: FixtureChildParams;
    _Height: FixtureChildParams;
    _ISRESERVELINEAR: FixtureChildParams;
    _Movement: FixtureChildParams;
    _Width: FixtureChildParams;
}
interface FixtureChildParams {
    IDDictionary: number;
    IDPOGObject: number;
    Key: string;
    ValData?: number;
    DescData?: string;
    FlagData?: boolean;
    DateData?: Date;
}
interface Image3DObjects {
    IdPog3dObject: number;
    Manufacturer: string;
    ObjectDescription: string;
    ObjectType?: number;
    ModifiedTs?: Date;
    IdClob?: number;
    Url: string;
}
interface Selected3DObject {
    ID?: number;
    Value?: number;
}
interface IdPogObject {
    IdPogObject: number;
}
