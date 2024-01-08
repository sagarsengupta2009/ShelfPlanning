import { TestBed } from '@angular/core/testing';

import { AgGridStoreService } from './ag-grid-store.service';

describe('AgGridStoreService', () => {
  let service: AgGridStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AgGridStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
