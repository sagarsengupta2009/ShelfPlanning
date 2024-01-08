import { FixtureObjectResponse, FixtureResponse } from './fixture-object-response';
import { ValData } from './pog-object-response';

export interface GrillResponse extends FixtureObjectResponse{
  Fixture: GrillFixtureResponse;

}

export interface GrillFixtureResponse extends FixtureResponse{
  _GrillSpacing:ValData;
}
