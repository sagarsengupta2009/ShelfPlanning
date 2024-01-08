import { TestBed } from '@angular/core/testing';

import { WorkSheetGridConfigurationService } from './work-sheet-grid-configuration.service';

describe('WorkSheetGridConfigurationService', () => {
  let service: WorkSheetGridConfigurationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkSheetGridConfigurationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
