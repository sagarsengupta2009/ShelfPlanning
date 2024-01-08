import { FixtureList } from "../../services/common/shared/shared.service";

export interface IntersectingShelfInfo{
  Y: number,
  Slope: number,
  Depth: number,
  Thickness: number,
  shelfsAbove: FixtureList[],
}

export interface DividerInfo{
  Width: number,
  Height: number,
  Depth: number,
  Color: string,
  Type: number,
  SlotEnd: number,
  SlotSpacing: number,
  SlotStart: number,
}

export interface GrillInfo{
  Display: boolean,
  Spacing: number,
  Info: GrillInfoInfo[],
  Color: string,
}

export interface GrillEdgeInfo{
  Display: boolean,
  Spacing: number,
  Height: number,
  Thickness: number,
  Color: string,
}

export interface StyleStandard {
  bottom: string;
  height: string;
  left: string;
  position: string;
  width: string;
  'z-index'?: number;
  'pointer-events'?: string;
}

interface GrillInfoInfo{
  Height: number,
  Type: string,
  Thickness: number;
}
