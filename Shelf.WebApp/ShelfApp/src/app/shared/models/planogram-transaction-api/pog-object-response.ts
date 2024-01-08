import { Dimension } from '../planogram';
import { CommonResponseObject } from './common-object-response';
import { FixtureResponse } from './fixture-object-response';
import { PositionResponse } from './position-response';

//Common properties of all the POGObject types.
export interface PogObjectResponse extends CommonResponseObject {
  IDPOGObject: number;
  IdPog: number;
  Planogram: any;
  Dimension: Dimension;
  Location: Location;
  RotationOrigin: Location;
  Rotation: Location;
  ChildOffset: Location;
  ChildDimension: Dimension;
  IDPOGObjectParent: number;
  ObjectType: string;
  Color: string;
  Children: PogObjectResponse[];
  ParentPogObject: PogObjectResponse;
  IDCorp: number;
  TempId: string;
  TempParentId: string;
  Fixture: FixtureResponse;
  Position: PositionResponse;
  ObjectDerivedType: string;//TODO once extend method is not depending on ObjectDerivedtype we can remove this
  uiProperties?: string[];
}

export interface Images {
  front: string;
  back: string;
  left: string;
  right: string;
  top: string;
  bottom: string;
}

export interface DirectionImage {
  FarFrontUrl: string;
  Url: string;
  LkDisplayType: number;
}

export interface Location {
  X: number;
  Y: number;
  Z: number;
}

interface ExtendedField{
  IDProduct: number;
  Key: string;
  IDDictionary: number;
  IDPOGObject: number;
}

export interface DescData extends ExtendedField {
  IDPOGObject: number;
  DescData: string;
  ValData:number;
}

export interface ValData extends ExtendedField {
  ValData: number;
}

export interface ImageData extends ExtendedField {
  ImageData: number;
}

export interface FlagData extends ExtendedField {
  FlagData: boolean;
}

export interface DateData extends ExtendedField {
  DateData: Date;
}
