
export interface LookUpRecords { [key: string]: LookUpOptions }
export interface LookUpOptions<T=any> {
    field: string;
    value: string;
    group: string;
    type: string;
    options: LookUpChildOptions<T>[]
}

export interface LookUpChildOptions<T=any> {
    text: string;
    value: T;
    IsLayoutPog?: boolean;
    DisplayOrder?: number;
    pogStatusAllowed?: number[];
    MerchStyleSymbol?: string;
    PackageStyleSymbol?: string;
    IsDefault?: boolean;
}

export interface OrientationsObject {
  orientationsGroups: LookUpChildOptions<number>[][];
  orientationsList: LookUpChildOptions<number>[];
}
