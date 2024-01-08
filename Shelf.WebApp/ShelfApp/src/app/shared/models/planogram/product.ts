import { ProductPackageResponse } from '../planogram-transaction-api';

export interface ProductType {
    IDPackage: number;
    IDProduct: number;
    PkgUOM: string;
    ProdUOM: string;
    Product: Product;
    ProductPackage: ProductPackageResponse;
    UOM: string;
    UPC: string;
    corpId?: number; // PA specifc 
}

export interface Product {
    AdjMovtFactor: number;
    AdjustmentFactor: number;
    AverageShelfLife: any;
    Brand: string;
    BuyerName: string;
    Char1: string;
    ClassificationCode: string;
    Color: string;
    CreatedBy: string;
    CreatedTs: any;
    Csc_Id: string;
    DPCA: number;
    DefaultMerchStyle: any;
    DefaultOrientation: any;
    DefaultPackage: number;
    DeliveryFrequency: any;
    DescSize: any;
    Distributor: string;
    EquivalentVolume: number;
    ExtendedFields: object;
    Hierarchy: any[];
    IDInvModel: any;
    IDProduct: number;
    InternalStatus: number;
    IsActive: boolean;
    IsNPI: boolean;
    IsPrefSKU: string;
    IsPrimaryUPC: string;
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
    LKDistributionType: string;
    Manufacturer: string;
    ModifiedBy: string;
    ModifiedTs: any;
    Name: string;
    ObjectType: string;
    ProdAuth: ProdAuth;
    ProdCorpMapping: any[];
    ProductDate: any[];
    ProductDesc: any[];
    ProductFlag: any[];
    ProductValue: any[];
    RecCPI: number;
    RecMustStock: boolean;
    ReferenceUPCForNPI: string;
    RetailPrice: number;
    SKU: string;
    SKUCreatedDate: any;
    ScreenDesc: any;
    Size: number;
    UOM: string;
    UPC: string;
    VendorName: string;
    WarehouseActualDate: any;
    WarehouseDuedate: any;
    ProductKey?: string; // PA specifc
}

export interface ProdAuth {
    AuthFlag: number;
    Remarks: string;
}

export interface Images {
    front: any;
    back: any;
    left: any;
    right: any;
    top: any;
    bottom: any;
}