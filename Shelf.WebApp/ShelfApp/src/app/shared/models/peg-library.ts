export interface PegLibrary extends PegHookInfo {
    IDPegLibrary: number;
    PegGuid: string;
    PegType: string;
    PegDescription?: string;
    PegName: string;
    PegImage?: string;
    PegVendor?: string;
    PegPartID?: string;
    PegWeight?: number
    HeightSlope: number;
    MaxPegWeight?: number;
    IsPegTag: boolean;
    TagHeight: number;
    TagWidth: number;
    TagYOffset: number;
    TagXOffset: number;
    IsActive?: boolean;
}

export interface PegHookInfo {
    PegLength: number;
    BackHooks: number;
    BackSpacing: number; //mandatory if backhooks > 1
    BackYOffset: number;
    FrontBars: number;
    FrontSpacing: number;
    IDPegLibrary: number;
}
