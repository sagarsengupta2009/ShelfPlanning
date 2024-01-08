export interface ProductAuth{
    [propertyName:number] : AuthInfo
}

export interface AuthInfo{
    AuthFlag: number
    IDPackage: number
    IDProduct: number
    Remarks: string
}