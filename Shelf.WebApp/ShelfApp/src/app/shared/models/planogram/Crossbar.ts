import {PogObject} from './pog-object'

export interface Crossbar extends PogObject{


}
export interface XYCords {
    X1: number;
    X2: number;
    Y1: number;
    Y2: number;
}

export interface CrossbarInputJson{
  PegXIncrement: number;
  ShelfLength: number;
  PegXStart: number;
  PegXEnd: number;
  Positions:CrossbarInputItems[];
}

export interface CrossbarInputItems{
  ID: number;
  PosNo: number;
  FacingsX: number;
  ProductWidth: number;
  PegHoleX: number;
  PegType: number;
}
