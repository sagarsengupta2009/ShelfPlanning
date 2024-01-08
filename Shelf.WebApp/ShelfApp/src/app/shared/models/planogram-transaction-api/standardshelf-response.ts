import { FixtureResponse } from ".";
import { GrillResponse } from "./grill-object-response";
import { PogObjectResponse } from "./pog-object-response";

export interface StandardshelfResponse extends PogObjectResponse{
  Fixture: StandardShelfFixtureResponse;

}

export interface StandardShelfFixtureResponse extends FixtureResponse {
  LKCrunchModetext: string;
  DividerColor: string;
  DividerSlotEnd: number;
  Grills: GrillResponse[];
  FixtureFullPath: string;
  ModularNumber: number;
  FixtureDerivedType: string;
  LKFitCheckStatustext: string;
}
