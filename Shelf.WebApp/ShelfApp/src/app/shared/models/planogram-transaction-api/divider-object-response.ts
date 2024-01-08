import { FixtureObjectResponse } from './fixture-object-response';

export interface DividerResponse extends FixtureObjectResponse {
  _CalcField: any;
  ObjectDerivedType: string;
  HasDividers:boolean;
  selectedDividerPlacement:number;
}
