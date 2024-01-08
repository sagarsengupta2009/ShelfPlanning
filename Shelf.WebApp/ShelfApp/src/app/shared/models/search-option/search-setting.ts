export interface RawSearchSetting {
    [key: string]: string;
}

export interface HierarchyObject {
    text: string;
    id: number;
    expanded: true;
    items: HierarchyObject[];
}

export enum SearchTypeName {
    PLANOGRAM = 'Planogram',
    PRODUCT = 'Product',
    FIXTURE = 'Fixture',
}

export enum UserSearchMode {
    ENTERPRISE = 'Enterprise',
    DB = 'DB',
}

export interface CustomSearchSchema {
    Planogram: RawSearchSetting[];
    Fixture: RawSearchSetting[];
    Product: RawSearchSetting[];
    PogProducts: RawSearchSetting[];
}