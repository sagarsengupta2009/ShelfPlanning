import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { BayMappingFixtureDetails, PogFixtureDetails } from 'src/app/shared/models';
@Injectable({
  providedIn: 'root'
})
export class AllocateEventService {

  public openProductLibrary: Subject<boolean> = new Subject<boolean>();
  public savePlanogram: Subject<boolean> = new Subject<boolean>();
  public synchronize: Subject<boolean> = new Subject<boolean>();

  private _bayMappingEnabled: boolean = false;
  private _resetBayMapping: boolean = false;
  private _originalFixtureData: PogFixtureDetails = {};
  
  constructor() { }

  public set originalFixtureData(fixtureDetails) {
    this._originalFixtureData = fixtureDetails;
    this.resetBayMapping = false;
  }

  public get originalFixtureData(): PogFixtureDetails {
    return this._originalFixtureData;
  }

  public getPogFixturesData(IDPog: number): BayMappingFixtureDetails[] {
    return Object.values(this._originalFixtureData[IDPog]);
  }

  public set resetBayMapping(change: boolean) {
    this._resetBayMapping = change;
  }

  public get resetBayMapping(): boolean {
    return this._resetBayMapping;
  }

  public get isBayMappingEnabled(): boolean {
    return this._bayMappingEnabled;
  }

  public set bayMappingEnabled(isEnabled: boolean) {
    this._bayMappingEnabled = isEnabled;
  }

}
