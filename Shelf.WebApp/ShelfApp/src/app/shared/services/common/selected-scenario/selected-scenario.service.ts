import { Injectable } from '@angular/core';
import { LocalStorageKeys } from 'src/app/shared/constants';
import { PlanogramScenario } from 'src/app/shared/models';
import { LocalStorageService } from 'src/app/framework.module';
import { BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SelectedScenarioService {
  public scenarioPogDataLoaded: boolean = false;
  private keys = LocalStorageKeys;

  // Temperory storage variable, to avoid repeated parsing of same localStorage entries
  private selectedShelfScenario: PlanogramScenario = null;

  public selectedScenarioNameChangeEvent = new BehaviorSubject<string>(null);

  constructor(
    private readonly localStorage: LocalStorageService,
  ) { }

  public getSelectedPlanogramScenario(): PlanogramScenario {
    if (!this.selectedShelfScenario) {
      this.selectedShelfScenario = this.localStorage.get<PlanogramScenario>(this.keys.SELECTED_SCENARIO);
    }
    return this.selectedShelfScenario;
  }
  public setSelectedPlanogramScenario(data: PlanogramScenario): void {
    if (!data) { return; }
    this.selectedShelfScenario = data;
    this.localStorage.set<PlanogramScenario>(this.keys.SELECTED_SCENARIO, data);
    this.selectedScenarioNameChangeEvent.next(data.Name);
  }

  public getSelectedScenarioName(): string {
    const scenarioName = this.selectedScenarioNameChangeEvent.value;
    return scenarioName ? scenarioName : '';
  }
  public setSelectedScenarioName(scenarioName: string): void {
    this.selectedScenarioNameChangeEvent.next(scenarioName);
  }

}
