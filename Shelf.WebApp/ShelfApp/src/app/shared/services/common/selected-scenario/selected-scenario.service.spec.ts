import { TestBed } from '@angular/core/testing';

import { SelectedScenarioService } from './selected-scenario.service';

describe('SelectedScenarioService', () => {
  let service: SelectedScenarioService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SelectedScenarioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
