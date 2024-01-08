import { POGLibraryListItem } from "./planogram-library/planogram-details";


export interface ItemsAddDelete {
    Planograms: PlanogramsAddDelete[];
    Products: ProductsAddDelete[];
    ProjectId: string;
}

export interface PlanogramsAddDelete {
    IdPog: number;
    IdPogStatus: number;
    IsActive: boolean;
    Name: string;
    Reason: string;
    Status: number;
}
export interface ProductsAddDelete {
    Action: string;
    IDPOG: string;
    IdPackageStyle: number | string;
    PackageName: string;
    Reason: string;
    SKU: string;
    Status: number;
    UPC: string;
}

export interface ImportPog extends POGLibraryListItem {
    Result?: string;
}

export interface ImportProducts extends ProductsAddDelete {
    [key: string]: string | number;
}
