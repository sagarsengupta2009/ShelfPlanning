import { TestBed } from '@angular/core/testing';

import { WorksheetGridService } from './worksheet-grid.service';

describe('ItemWorksheetService', () => {
  let service: WorksheetGridService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WorksheetGridService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
