export interface PogPinningUnpinning {
  Comments: string;
  IsPinning: boolean;
  data: IdPOGData[];

}
interface IdPOGData {
  IDPOG: number;
  IDPOGScenario: number;
  IDPOGStatus: string;
  IDProject: number;
}

export interface PogPinningUnpinningResult {
  CheckOutMessage: string;
  IDPOG: number;
  IsMarkedAsDelete: boolean;
  IsReadOnly: boolean;
  POGLastModifiedBy: string;
  POGLastModifiedDate: string;
  Result: boolean;
  id: number;
}
