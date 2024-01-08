export interface FieldSearchVM {
    FieldSearch: SearchFieldDetails[];
    Expression: SearchFieldDetails[];
    Actions: SearchAction[];
}

interface SearchFieldDetails {
    Applicability?: any;  // TODO: @pranita Data type
    IDDictionary: number;
    IsDialog: boolean;
    LkUpGroupName: string;
    MaxValue?: number;
    MinValue?: number;
    OverriddenName: string;
    RefName: string;
    Remarks: string;
    SearchGroup: string;
    accessType: boolean;
    field: string;
    options: any;  // TODO: @pranita Data type
    type: string;
    value: string;
    selected?: boolean;
}
export interface SearchAction {
    ACTIONID: string;
    FunctionRef: string;
    Name: string;
    selected?: boolean;
}

export interface SavedSearch {
    name: string;
    search: string;
}
