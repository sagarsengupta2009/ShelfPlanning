export interface CartDisplaySetting {
    column1: Setting[]
}
interface Setting {
    fieldName: string,
    enable: boolean,
}

export enum CartDisplaySettingName {
    UPC = 'Position.Product.UPC',
    SKU = 'Position.Product.SKU',
    NAME = 'Position.Product.Name',
    BRAND = 'Position.Product.Brand'
}

export interface ShoppingCartFieldOptions {
    Applicability: number;
    AttributeType: string;
    DataType: number;
    DataTypeDesc: string;
    DictionaryName: string;
    Expression: string;
    FormatType: string;
    IDDictionary: number;
    IsDialog: boolean;
    LkUpGroupName: string;
    MaxValue: number;
    MinValue: number;
    Owner: string;
    Remarks: string;
    ShortDescription: string;
    accessType: boolean;
    field: string;
    options: string;
    title: string;
    value: string;
}

export enum AssortRecADRI {
    Add = 'A',
    Retain = 'R',
    Delete = 'D'
}

export enum DisplayMode {
    ListView = 1,
    CompactView = 2
}

export interface DialogSearch {
    position: string,
    filterText: string,
    flag?: boolean
}

export interface SortFieldDetails {
    field: string,
    name: string,
    dir: 'asc' | 'desc',
    order: number
}