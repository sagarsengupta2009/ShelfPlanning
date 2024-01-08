import { TestBed } from '@angular/core/testing';

import { AgGridHelperService } from './ag-grid-helper.service';

describe('AgGridHelperService', () => {
  let service: AgGridHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AgGridHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
