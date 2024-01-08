// TODO: rename to PropertyStoreListItem
export interface PropertyStoreList {
    Display: string;
    Value: number | string;
    Default?: boolean;
}

export interface HierarchyList {
    groupDescription: string;
    groupName: string;
    hierarchyChildren: HierarchyChildren;
    idCorp: number;
    idPogGroup: number;
    isActive: boolean;
    isPrimary: boolean;
    minimumHierarchy: number;
}

export interface HierarchyChildren {
    Children: any[]
    IsChildrenAvailable: boolean;
    depth: number;
    id: number;
    idParentPogHier: any;
    idPogGroup: number;
    isActive: boolean;
    name: string;
}

export enum FixtureImageSide {
    Left = 'Left',
    Top = 'Top',
    Bottom = 'Bottom',
    Right = 'Right',
    Front = 'Front',
    FarFront = 'FarFront',
    Back = 'Back',
    FGFront = 'FGFront',
    BGFront = 'BGFront',
    BGBack = 'BGBack',
    Edge = 'Edge'
}

export enum PropertyPaneType {
    Position = 'Position',
    Fixture = 'Fixture',
    POG = 'POG',
    Multiple = 'Multiple'
}
