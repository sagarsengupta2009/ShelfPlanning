
export interface PlanogramHierarchyState {
    PogHierID: number;
    IsRecursive: boolean;
    PageSize: number;
    Skip: number;
    SortBy: string;
    SortOrder: string;
    Filters: PlanogramHierarchyFilterVM[];
    MultiSort: { Key: string; Value: string }[];
}

interface PlanogramHierarchyFilterVM {
    Filter: string;
    FilterValues: string[];
}

export interface DistinctPrimitive {
    field: string;
    value: string;
    type: string;
}

export interface HierarchyPlanogramResponse {
    Data: {
        Planograms: HierarchyPlanogram[];
    };
    Total: number;
}

export interface HierarchyPlanogram {
    id: number;
    IDPOG: number;
    Name: string;
    IsActive: boolean;
    IsLocked: boolean;
    PogStatusSymbol: string;
    POGStatus: number;
    PogHeight: number;
    PogWidth: number;
    PogDepth: number;
    Dimension: string;
    Custom: Custom;
    POGFamilyIdentifier: string;
    POGType: number;
    POGTypeSymbol: string;
    POGTypeValue: string;
    POGGuid: string;
    POGLastModifiedBy: string;
    CheckoutOwner?: any;
    POGLastModifiedDate: string;
    Image: string;
    LkTraffic: number;
    ModalPOGDescription?: any;
    IsStatusLock: boolean;
    IsApproved: boolean;
    IsMarkedAsDelete: boolean;
    IsReadOnly: boolean;
    IsAutoSaved: boolean;
    LastAutoSavedDate?: any;
    IsFavorite: boolean;
    CheckOutMessage: string;
    Version: string;
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
    StoreName: string;
    StoreNum: string;
    NoOfProducts: number;
    NoOfStores: number;
    EffectiveFrom?: any;
    IDPogStatus: number;
    Version_template: string;
    PogAddedToLibrary: boolean;
}

export interface Custom {
    IdPogExternal?: number;
}

export interface HierarchyGridData {
    data: HierarchyPlanogram[];
    total: number;
}
