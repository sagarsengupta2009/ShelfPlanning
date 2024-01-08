export interface PogHierarchyView {
    id: number;
    name: string;
    idParentPogHier: number;
    idPogGroup: number;
    depth: number;
    isActive: boolean;
    Children: any[];
    IsChildrenAvailable: boolean;
}