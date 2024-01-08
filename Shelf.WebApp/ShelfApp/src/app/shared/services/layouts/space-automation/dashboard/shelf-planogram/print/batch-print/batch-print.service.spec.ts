import { TestBed } from '@angular/core/testing';

import { BatchPrintService } from './batch-print.service';

describe('BatchPrintService', () => {
  let service: BatchPrintService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BatchPrintService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
