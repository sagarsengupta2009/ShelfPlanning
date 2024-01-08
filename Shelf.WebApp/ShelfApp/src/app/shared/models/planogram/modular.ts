export interface ErrorObj {
    msg: string;
    error: boolean;
    info: string;
    warning: string;
}

export interface StyleModularFarFront {
    pointerEvents: string;
    position: string;
    width: number;
    height: number;
    bottom: number;
    left: number;
    zIndex: number;
}

export enum SplitPreference {
    'splitShelf' = 1,
    'resetBaysToUpright' = 2
}
