import { Section } from "../classes";
import { KendoColumnSetting } from "./kendoGrid";
import { BasicProduct } from "./new-product-inventory/new-product-inventory";
import { PackageAttributes } from "./planogram/planogram";

export interface CurrentMovSales {
    CurrSales?: number;
    CurrMovt?: number;
}

export interface ProductOptions {
    brand: string[];
    manufacturer: string[];
    L1: string[];
    L2: string[];
    L3: string[];
    L4: string[];
}

export interface ProductInventoryForm extends GridSourceProduct {
    ReferenceUPC: string;
    AdjustmentFactor: number;
    IDPackageCurr?: number;
    IDProductCurr?: number;

    Cloned?: boolean;
    isEdited?: boolean;
    isUpdated?: boolean;
    positionID?: string;
}

export interface GridSourceProduct extends BasicProduct {
    id?: string;
    IDProduct: number;
    IDPackage: number;
    MustStock: boolean;

    DescSize: string;
    CIC: string;
    CSC: string;
    Fixture?: string;

    CPI: number;
    Movt: number;
    Sales: number;
    isNPI?: boolean;
}


export interface ProductInventoryDialogData {
    dialogTitle: string;
    col: KendoColumnSetting[];
    npigridSource: GridSourceProduct[];
    gridSource: GridSourceProduct[];
    datasource: Section,
    editDropDownobj: ProductOptions,
    editNPIGridSource: any;
}

export interface PositionAttributes {
    attributeObject: PackageAttributes;
}