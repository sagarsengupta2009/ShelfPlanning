import { Product } from "../../planogram";
import { ProductPackageResponse, ProductPackageSummary, ProductResponse } from "../../planogram-transaction-api";

export interface PAProductCorpDetail {
  sourceCorpId: number;
  targetCorpId: number;
  products: { productKey: string, upc: string, corpId: number }[];
}

export interface PAProductPackageDetails {
  Children: {
    Product: Product;
    ProductPackages: ProductPackageResponse[];
  };
  IsValid: boolean;
  ProductKey: string;
}

export interface PAProductDetails {
  AvailablePackages?: ProductPackageSummary[] ;
  IDPackage?: number| string;
  IDProduct?: number| string;
  PkgUOM?: string;
  ProdUOM?: string;
  UOM?: string;
  UPC?: string;
  Product: ProductResponse;
  ProductPackage: ProductPackageResponse;
  corpId?: number;
}
