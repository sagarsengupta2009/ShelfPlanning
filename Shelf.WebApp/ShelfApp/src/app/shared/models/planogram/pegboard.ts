import { Position } from '../../classes';
import {PogObject, PositionXYCords} from './pog-object'

export interface Pegboard extends PogObject{
}

export interface PosXY{
    X: number;
    Y: number;
    PegHoleX: number;
    PegHoleY: number
}

export interface PegHoleInfo{
    PegIncrementX: number;
    PegIncrementY: number;
    PegOffsetLeft: number;
    PegOffsetRight: number;
    PegOffsetTop: number;
    PegOffsetBottom: number;
}

export interface NwdropCord{
    positionXYCords: PositionXYCords;
    dropCord : PegDropCord
}

export interface PegDropCord{
    left : number;
    top : number;
    nextX?: number;
    nextY?: number;
}

export interface PegInputJson{
    "PegXIncrement": number;
    "PegYIncrement": number;
    "ShelfLength": number;
    "ShelfHeight": number;
    "PegXStart": number;
    "PegYStart": number;
    "PegXEnd": number
    "PegYEnd": number;
    "Positions": PegPositions[];
}

export interface PegPositions{
    "ID": string,
    "PosNo": number,
    "X": number,
    "Y": number,
    "GapX": number,
    "GapY": number,
    "FacingsX": number,
    "FacingsY": number,
    "ProductWidth": number,
    "ProductHeight": number,
    "SKUWidth": number,
    "SKUHeight": number,
    "PegHoleX": number,
    "PegHoleY": number,
    "PegType": number,
}

export interface StylePeg {
    bottom: string;
    height: string;
    left: string;
    position: string;
    width: string;
}

export interface pegFitCheckObject {
    flag: boolean;
    left: number;
    top: number;
}

export interface GetDropCordInputData {
    position: Position,
    positionXYCords: PositionXYCords,
    dropCord: PegDropCord,
    intersectingPos: Position,
    exculdedContainerItems: Position[],
    pegHoleInfo: PegHoleInfo,
    pegDirection: number,
    isPaste?: boolean
}

export interface UpdatedDropCordData {
    flag: boolean,
    left: number,
    top: number,
    intersectPosObj: Position
}

export interface BeyondEdgeFitCheckInput {
    position: Position,
    positionXYCords: PositionXYCords,
    dropCord: PegDropCord,
    pegHoleInfo: PegHoleInfo,
    pegboardXposToPog: number,
    isPaste?:boolean
}

export interface BeyondEdgeFitCheckOutput {
    flag: boolean,
    dropCord: PegDropCord,
    positionXYCords: PositionXYCords
}