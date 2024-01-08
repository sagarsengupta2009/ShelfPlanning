export interface BayMappingFixtureDetails {
  Depth: number;
  FixtureId: number;
  Height: number;
  Width: number;
  Thickness: number;
  StartXCoordinate: number;
  YCoordinate: number;
  Type: string;
  CanJoin: boolean;
  FixtureNumber: number;
}

export interface PogFixtureDetails {
  [IDPog: number]: BayMappingFixtureDetails[];
}