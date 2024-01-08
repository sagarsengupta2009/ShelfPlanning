import { FixtureObjectResponse, FixtureResponse } from "./fixture-object-response";
import { PogObjectResponse } from "./pog-object-response";
import { PositionObjectResponse } from "./position-response";

export interface ShoppingcartResponse extends PogObjectResponse{
  ObjectDerivedType: string;
  Fixture: ShoppingFixturecartResponse;
  Children: PositionObjectResponse[];
}

export interface ShoppingFixturecartResponse extends FixtureResponse{
  FixtureDerivedType: string;
}
