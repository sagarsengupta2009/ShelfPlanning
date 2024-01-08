export interface ProductResponse {
  /** TODO @og ProductKey doesn't exist on ProductResponse and is undefined on runtime,
   * seems it is not used but is here to satisfy the typing for now */
  ProductKey?: string;

  /** TODO @og ProductKey doesn't exist on ProductResponse but added later on it seems */
  ReferenceUPCForNPI?: any;

  IDProduct: number;
  UPC: string;
  SKU: string;
  Name: string;
  ScreenDesc: string;
  Char1: string;
  Size: number;
  UOM: string;
  Color: string;
  ObjectType: string;
  DescSize: string;
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
  Brand: string;
  Manufacturer: string;
  Distributor: string;
  IDInvModel: number;
  LKDistributionType: string;
  InternalStatus: number;
  DefaultMerchStyle: number;
  DefaultOrientation: number;
  RetailPrice: number;
  EquivalentVolume: number;
  IsActive: boolean;
  DefaultPackage: number;
  AdjMovtFactor: number;
  DPCA: number;
  IsNPI: boolean;
  IsPrimaryUPC: string;
  IsPrefSKU: string;
  ClassificationCode: string;
  WarehouseDuedate: string;
  WarehouseActualDate: string;
  SKUCreatedDate: string;
  BuyerName: string;
  VendorName: string;
  DeliveryFrequency: number;
  AverageShelfLife: number;
  Csc_Id: string;
  CreatedTs: string;
  CreatedBy: string;
  ModifiedTs: string;
  ModifiedBy: string;
  ProdAuth: ProdAuth;
  ProductDate: ProductDate[];
  ProductDesc: ProductDesc[];
  ProductFlag: ProductFlag[];
  ProductValue: ProductValue[];
  Hierarchy: ProdToHierarchy[];
  ProdCorpMapping: ProdCorpMapping[];
}

interface ProductExtendedFields {
  IdProduct: number;
  IdDictionary: number;
  Product: ProductResponse;
  DictionaryName: string;
}
interface ProductDate extends ProductExtendedFields {
  DateData: string;
}
interface ProductDesc extends ProductExtendedFields {
  DateData: string;
}
interface ProductValue extends ProductExtendedFields {
  ValData: number;
}
interface ProductFlag extends ProductExtendedFields {
  FlagData: boolean;
}


interface ProdToHierarchy {
  IdProduct: number;
  Product: ProductResponse;
  EffectiveFrom: string;
  EffectiveTo: string;
  IsActive: boolean;
  CreatedBy: string;
  CreatedTs: string;
  ModifiedBy: string;
  ModifiedTs: string;
}

interface ProdAuth {
  AuthFlag: number;
  Remarks: string;
}

interface ProdCorpMapping {
  IDProdCorpMap: number;
  IdCorp: number;
  IdProduct: number;
  Upc: string;
  Csc_Id: string;
  Sku: string;
  Name: string;
  ScreenDesc: string;
  Char1: string;
  Size: number;
  Uom: string;
  Color: string;
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
  Brand: string;
  Manufacturer: string;
  Distributor: string;
  LKDistributionType: string;
  IdInvModel: number;
  LKInternalStatus: number;
  DefaultMerchStyle: number;
  DefaultOrientation: number;
  RetailPrice: number;
  EquivalentVolume: number;
  DefaultPackage: number;
  AdjMovtFactor: number;
  DPCA: number;
  IsActive: boolean;
  IsNPI: boolean;
  IsPrimaryUPC: string;
  IsPrefSKU: string;
  ClassificationCode: string;
  WarehouseDuedate: string;
  WarehouseActualDate: string;
  SKUCreatedDate: string;
  BuyerName: string;
  VendorName: string;
  DeliveryFrequency: number;
  AverageShelfLife: number;
  CreatedTs: Date;
  CreatedBy: string;
  ModifiedTs: Date;
  ModifiedBy: string;
  DescSize: string;
  ProdCorpDate: ProdCorpDate[];
  ProdCorpDesc: ProdCorpDesc[];
  ProdCorpFlag: ProdCorpFlag[];
  ProdCorpValue: ProdCorpValue[];
}

interface IdCorpField {
  IdCorp: number;
}

interface ProdCorpDate extends ProductDate, IdCorpField { }
interface ProdCorpDesc extends ProductDesc, IdCorpField { }
interface ProdCorpFlag extends ProductFlag, IdCorpField { }
interface ProdCorpValue extends ProductValue, IdCorpField { }
