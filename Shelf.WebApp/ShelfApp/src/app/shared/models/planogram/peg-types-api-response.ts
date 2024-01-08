export interface CrossbarSpreadPack {
  LastEndPosition: number;
  XFacingGap: number;
  GapOnFirstPosition: boolean;
  StatusMessage: string;
  OutPositions: OutPosition[]
}

export interface PegAlign extends CrossbarSpreadPack {
  YFacingGap: number;
}

export interface OutPosition {
  XFacingGap: number;
  ID: number;
  PosNo: number;
  XPosition: number;
  YPosition?: number;
}
