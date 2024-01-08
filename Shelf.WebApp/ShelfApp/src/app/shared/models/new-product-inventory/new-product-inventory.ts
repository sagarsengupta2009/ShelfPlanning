import { Dimension } from '../planogram';
import { ProductPackageResponse } from '../planogram-transaction-api';

export interface NewProductInventory {
    [key: number]: ProductType;
}

export interface ProductType {
    IDPackage: number;
    IDProduct: number;
    PkgUOM: string;
    ProdUOM: string;
    Product: Product;
    ProductPackage: ProductPackageResponse;
    UOM: string;
    UPC: string;
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
    CreatedTs: Date;
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
    ModifiedTs: Date;
    Name: string;
    ObjectType: string;
    ProdAuth: ProdAuth;
    ProdCorpMapping: any[];
    ProductDate: any[];
    ProductDesc: any[];
    ProductFlag: any[];
    ProductValue: any[];
    RecCPI: string;
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
    CurrSales?: any;
    CurrMovt?: any;
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

export interface AddProductNPIRequest {
    data: NewProductNPI[];
    pogScenerioID: PogScenerioID;
}

export interface PogScenerioID {
    scenarioID: number;
    pogID: number;
}


export interface BasicProduct extends Dimension {
    UPC: string;
    Name: string;
    Brand: string;
    Manufacturer: string;
    CasePack: number;

    L1: string;
    L2: string;
    L3: string;
    L4: string;
}

export interface NewProductNPI extends BasicProduct {
    Size?: number;
    UOM?: string;
    L5?: string;
    L6?: string;
    IsNPI?: boolean;
    IsItemScanned?: boolean;
    positionID?: string;
}

export interface AddNPIResponse {
    [key: number]: ProductType;
    PerfData: PerfData[];
}

export interface PerfData {

}
