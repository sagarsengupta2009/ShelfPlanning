import { TestBed } from '@angular/core/testing';

import { AgGridColumnService } from './ag-grid-column.service';

describe('AgGridColumnService', () => {
  let service: AgGridColumnService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AgGridColumnService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
