export interface NodeData {
    Children: NodeData[];
    HierLevel: number;
    IdHierStr: number;
    IdParentStrHier: number;
    Name: string;
}

export interface HierarchyStoreData {
    Table: StoreData[];
}

export interface StoreData {
    Address1: string;
    Address2: string;
    City: string;
    Country: string;
    CreatedBy: string;
    CreatedTS: string;
    DistrictCode: number;
    DivisionName: string;
    EffectiveFrom: Date;
    EffectiveTo: Date;
    Email: string;
    FacilityName: string;
    Fax: string;
    IDNotes: number;
    IDStore: number;
    IsActive: boolean;
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
    LKInternalStatus: number;
    Latitude: number;
    Longitude: number;
    MerchArea: number;
    MerchareaSize: number;
    ModifiedBy: string;
    ModifiedTS: Date;
    Name: string;
    Phone: string;
    PogCount: number;
    PostalCode: string;
    ROG: string;
    RemodelDate: Date;
    State: string;
    StoreDescX01: string;
    StoreDescX02: string;
    StoreDescX03: string;
    StoreDescX04: string;
    StoreDescX05: string;
    StoreNum: number;
    StoreSize: number;
    TotalArea: number;
    CreatedTs: Date;
    IdPog: number;
}

export interface SelectedStoreData {
    Address1: string;
    City: string;
    Country: string;
    CreatedBy: string;
    CreatedTs: Date;
    EffectiveFrom: string;
    EffectiveTo: Date;
    IdPog: number;
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
    ModifiedBy: string;
    ModifiedTs: Date;
    Name: string;
    PostalCode: string;
    State: string;
    StoreNum: number;
    idStore: number;
    IDStore: number;
    idPogStatus: number;
}

export interface ClonedData {
    CheckOutMessage: string;
    CheckoutOwner: string;
    ControllingHier: number;
    Custom: Custom;
    Dimension: string;
    EffectiveFrom: Date;
    IDPOG: number;
    Image: string;
    IsActive: boolean;
    IsApproved: boolean;
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
    LastAutoSavedDate: Date;
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
}

export interface Custom {
    IdPogExternal: number;
}

export interface PlanogramType {
    pogStatusAllowed?: number[];
    text: string;
    value: number;
}

export interface EditDateEvent {
    data: SelectedStoreData;
    event: {
        field: string;
        value: string;
    };
}

export interface RowDeleteData {
    dataItem: SelectedStoreData;
    item: StoreContextMenu;
}

export interface MultiClonePostData {
    cloneStoreLink: number;
    idPogScenario: number;
    pogType: number;
    idPogs: number[];
}

export interface StoreContextMenu {
    name: string;
    key: string;
}

export interface PostDataForClone {
    IDPOG: number;
    IdPogScenario: number;
    IdProject: number;
    pogType: number;
    StoreData: SelectedStoreData[];
}
