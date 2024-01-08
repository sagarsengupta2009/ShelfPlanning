import { TestBed } from '@angular/core/testing';

import { ReportandchartsService } from './reportandcharts.service';

describe('ReportandchartsService', () => {
  let service: ReportandchartsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReportandchartsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
