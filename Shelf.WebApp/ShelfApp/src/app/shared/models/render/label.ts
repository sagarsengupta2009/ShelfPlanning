export enum LabelOrientation {
  Horizontal = 0,
  Vertical = 1,
  Bestfit = -1,
}

export interface LabelObject {
  yshift?: number;
  crossLabelDisplay?: string;
  backgroundcolor?: string;
  fontcolor?: string;
  lncolor: string;
  centerTxt: boolean;
  calcMechanism?: 'd3' | 'canvas';
  text: string;
  color: string;
  fontfamily: string;
  fontsize: number;
  orientation: number;
  bgcolor: string;
  truncateByHeight: boolean;
  shrinkToFit? :boolean;
  xAlignment?:number;
}
export interface Redraw {
  draw: boolean,
  label: number,
  yAlign: number
}