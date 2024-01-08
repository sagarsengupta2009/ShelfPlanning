import { PegBoard, Position } from '../../classes';

export interface GhostImage {
  imgTagHTML: string;
  coffinImgTagHTML?: string;
  pegImgTagHTML?: {
    pegImgTagHTML?: string;
    pegDIVOffsetX?: number;
    pegDivOffsetY?: number;
  };
}

export interface NextPositionLeftData {
  currentObject: Position;
  droppableItemdata: PegBoard;
  diffPegleft: number;
  pegOffsetX: number;
}

export interface SvgStringInput {
  left: number;
  imgHeightRef: number;
  imgWidthRef: number;
  SVGHeader: string;
  currentObject: Position;
  pegItemData;
  top: string;
}
