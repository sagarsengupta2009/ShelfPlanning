import { Position } from '../../classes';
import { IDragDropSettings } from '../../drag-drop.module';
import { Dimension } from './dimension';
import { Fixture } from './fixture';

export interface PogObject {
  $id: string;
  $sectionID: string;
  dragDropSettings: IDragDropSettings;
  IdPogObject?: number;
  IdPog?: number;
  Planogram: any;
  DimensionHeight: number;
  DimensionWidth: number;
  DimensionDepth: number;
  Dimensions: Dimension;
  LocationX: number;
  LocationY?: number;
  LocationZ?: number;
  Location: Location;
  Fixture: Fixture;
  Position: Position;
  RotationOriginX?: number;
  RotationOriginY?: number;
  RotationOriginZ?: number;
  RotationOrigin: Location;
  RotationX?: number;
  RotationY?: number;
  RotationZ?: number;
  Rotation: Location;
  ChildOffsetX?: number;
  ChildOffsetY?: number;
  ChildOffsetZ?: number;
  ChildOffset: Location;
  ChildDimensionHeight: number;
  ChildDimensionWidth: number;
  ChildDimensionDepth: number;
  ChildDimension: Dimension;
  Capacity: number;
  LKDividerType: number;
  UsedLinear?: number;
  AvailableLinear?: number;
  UsedSquare?: number;
  AvailableSquare?: number;
  UsedCubic?: number;
  AvailableCubic?: number;
  Coefficient: number;
  IdPogObjectParent?: number;
  ObjectType: string;
  Color: string;
  TrackChangeDate?: any;
  TrackChangeCode: string;
  Children?: PogObject[];
  ParentPogObject: PogObject;
  IdCorp?: number;
  TempId: string;
  TempParentId: string;
}

export interface Size3 {
  width: number;
  height: number;
  depth: number;
}

export interface QuadBounds extends Size3 {
  left: number;
  top: number;
  back: number;
  selectTop: number;
  selectHeight: number;
  minMerchHeight: number;
  rotationx: number;
  backtop: number;
}

/** x and y coordinates or the point in a plain */
export interface Coordinates2 {
  x: number;
  y: number;
}
/** x,y and z coordinates or point in 3D */
export interface Coordinates3 extends Coordinates2 {
  z: number;
}

export interface IPlanogramBase {
  Dimension: Dimension;
  Color: string;
  Children: any[];
  ObjectType: string;
  ObjectDerivedType: string;
  _CalcField: { id: string; sectionId: string; };
  ChildDimension: Dimension;
}

export interface PogObjectBoundary extends Size3, Coordinates3 {
  id: string;
  yposToPog: number;
  rotationx: number;
  backtop: number;
};

export interface PositionXYCords {
  X1: number;
  X2: number;
  Y1: number;
  Y2: number;
}

export interface RectangleCoordinates2d {
  xstart: number;
  xend: number;
  ystart: number;
  yend: number;
}
export interface RectangleCoordinates3d extends RectangleCoordinates2d {
  zstart: number;
  zend: number;
}

export interface PogObjectCoordinates extends RectangleCoordinates3d {
  yselstart: number;
  yselend: number;
}

export interface Bounds extends Coordinates3, QuadBounds { }

export interface QuardTreeBound extends PogObjectBoundary {
  name: string | undefined;
  ObjectDerivedType: string;
  image: string | undefined;
  parentID: string;
  FixtureDesc: string;
  selectY: number;
  selectHeight: number;
  minMerchHeight: number;
  parentFixtureType: string;
}

export interface Offset {
  top: number;
  left: number;
}

export interface RectangleBoundary {
  x: number;
  y: number;
  height: number;
  width: number;
}

export interface QuadChildIntersections {
  intersectingFlag: boolean,
  intersectingFixtures: { [key: string]: string[] },
  minMerchCheckFlag: boolean,
  minMerchCheckFixtures: { [key: string]: string[] }
}

export interface CartDomRect {
  cartId: string,
  bottom: number,
  height: number,
  left: number,
  right: number,
  top: number,
  width: number,
  x: number,
  y: number
}
