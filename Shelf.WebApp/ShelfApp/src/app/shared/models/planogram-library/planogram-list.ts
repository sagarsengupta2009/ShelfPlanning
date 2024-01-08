export interface PogList {
    CheckOutMessage: string;
    CheckoutOwner:string;
    Custom: {IdPogExternal: any}
    Dimension: string;
    EffectiveFrom: string;
    IDPOG: number;
    IDPogStatus: number;
    Image: string;
    IsActive: boolean;
    IsApproved: any;
    IsAutoSaved: boolean;
    IsFavorite: boolean;
    IsLoaded: string;
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
    POGGuid:string;
    POGLastModifiedBy: string;
    POGLastModifiedDate: string;
    POGStatus: number;
    POGType: number;
    POGTypeSymbol:string;
    POGTypeValue: string;
    PermissionCreate: boolean;
    PermissionRead: boolean;
    PogDepth: number;
    PogHeight: number;
    PogStatusSymbol: string;
    PogWidth: number;
    StoreName: string;
    StoreNum: string;
    Version:string;
    editable: boolean;
    globalUniqueID: string;
    id: number;
    isCheckInOutEnable: boolean;
    isCheckedOut: boolean;
    isLoaded: boolean;
    isPinned: string;
    isSelected: boolean;
    sectionID:string;
    version: string;
    RunOn?: string
}

export interface PlanogramInfo {
    displayView:string;
    isPogDownloaded: boolean;
    pogInfo:PogList
}