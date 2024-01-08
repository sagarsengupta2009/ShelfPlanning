import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  public selectedPogLabelData: string;
  public selectedPositionLabelData: string;
  public selectedFixtureLabelData: string; 
  constructor() { }
}
