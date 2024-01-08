export interface StoreHierarchyView {
    HierLevel: number;
    IdParentStrHier: number;
    IdHierStr: number;
    Name: string;  
    Children?: StoreHierarchyView[];
}