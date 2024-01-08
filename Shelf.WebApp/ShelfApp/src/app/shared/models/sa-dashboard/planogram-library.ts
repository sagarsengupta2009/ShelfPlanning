export interface PlanogramStore {
    DMinus1StoreHierName: string;
    DMinus2StoreHierName?: string;
    DMinus3StoreHierName?: string;
    DMinus4StoreHierName?: string;
    DMinus5StoreHierName?: string;
    Depth: string;
    Dimension: string;
    Height: string;
    IDCorp: number;
    IDPOG: string;
    IDPOGScenario: number;
    IDProject: number;
    IDStore: number;
    Image: string;
    Length: string;
    Measurement: string;
    Name: string;
    POGCreatedBy: string;
    POGCreatedDate: string;
    POGL1: string;
    POGL2: string;
    POGL3: string;
    POGL4: string;
    POGL5: string;
    POGL6: string;
    POGL7: string;
    POGL8: string;
    POGL9: string;
    POGL10: string;
    POGLastModifiedBy: string;
    POGLastModifiedDate: string;
    POGStatus: string;
    POGStatusSymbol: string;
    POGType: number;
    POGTypeSymbol: string;
    POGTypeValue: string;
    POGVersionLabel: string;
    PlanogramEffectiveDateEnd: string;
    PlanogramEffectiveDateStart: string;
    PogStatuSymbol: string;
    ProjectName: string;
    QIDPOGScenario: string;
    QIDProject: string;
    QStoreName: string;
    ScenarioName: string;
    StoreCity: string;
    StoreL1: string;
    StoreL2: string;
    StoreL3: string;
    StoreL4: string;
    StoreL5: string;
    StoreName: string;
    StoreNumber: number;
    Tags: string;
    isActive: boolean;
    nDepth: number;
    nHeight: number;
    nLength: number;
    ThumbnailFileName: string;
}
export interface PlanogramContext<T> {
    data: T;
    menu: string;
    product: string;
}

export interface POGResources {
    POG: Resource[];
    Product: Resource[];
    StoreViewPOG: Resource[];
    POG_SIDENAV_INFO: Resource[];
}
export interface Resource {
    ColumnName: string;
    ResourceKey: string;
}

export interface MoreInfo {
    name: string;
    value: string;
}
