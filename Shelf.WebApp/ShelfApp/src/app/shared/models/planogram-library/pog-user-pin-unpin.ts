export interface PogUserPinUnpin {
  IdPogScenario: number;
  IsFavorite: boolean;
  PogIDs: PogUserPinUnpinData[];
}
interface PogUserPinUnpinData {
  IDPOG: number;
}
export interface PogUserPinUnpinResultData {
  IDPOG: number;
  Result: number;
}
