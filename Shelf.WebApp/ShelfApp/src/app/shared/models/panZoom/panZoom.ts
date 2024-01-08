export interface Transform {
    k: number;
    x: number;
    y: number;
}

export enum ZoomType {
    RESET_ZOOM = 1,
    CENTER_ZOOM = 2,
    FIT_TO_HIGHT_ZOOM = 3
}