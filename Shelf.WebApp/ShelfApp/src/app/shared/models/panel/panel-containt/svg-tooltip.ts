export interface SvgTooltip {
    [propName: number]: Tooltip[];
}


export interface Tooltip {
    [propName: string]: string | number;
}