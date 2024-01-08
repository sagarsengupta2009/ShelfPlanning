import { SearchSettingVM } from "../fixture-gallary";
import { ProductResponse, ProductPackageResponse } from "../planogram-transaction-api";
import { ProductLibraryViewMode } from "./product-library-enum";

export interface ProductHierarchyList {
    IsChildrenAvailable?: number;
    Children: ProductHierarchyList[];
    HierLevel: number;
    IdParentProdHier: number;
    IdProdHier: number;
    Name: string;
    Parent?: any;
}

export interface SearchProductList {
    Depth: string;
    Dimensions: string;
    Height: string;
    IDPackage: number | string;
    IDProduct: number | string;
    PkgUOM: string;
    ProdUOM: string;
    Product: ProductResponse;
    ProductPackage: ProductPackageResponse;
    UOM: string;
    UPC: string;
    Width: string;
    LastModifiedDate:Date;
    selected?: boolean;
    filteredStyle?: string;
}

export interface SuggestProducts {
    Brand: string;
    L1: string;
    L2: string;
    L3: string;
    Name: string;
    SKU: string;
    Size: number
    UPC: string;
    PackageName?:string;
    ComboGTIN_NAME_PKGNAME?:string;
    ComboL123?:string;
}


export interface ProductSearchSetting extends SearchSettingVM {
    includeProjectFilter: boolean;
}

export interface ProductLibraryHeaderMenuShowHide {
    isProductItemSelected: boolean;
    showProductHierarchy: boolean;
    hideOrderBy: boolean;
    displayMode: ProductLibraryViewMode;
    productItems: boolean;
    isPlanogramLoaded: boolean;
    showAsMenu: boolean;
    isPin: boolean;
    isFilterExisting: boolean;
}

export interface ProductGallery{
    products: SearchProductList[],
    searchText: string,
    hierarchyProducts: any[],
    suggestionData: SuggestProducts[],
    isFilterExisting: boolean,
    existingProducts: string[],
    isPosResultReturned: boolean,
    allProductList: SearchProductList[]
}