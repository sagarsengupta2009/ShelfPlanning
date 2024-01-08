import { TestBed } from '@angular/core/testing';

import { AnalysisReportService } from './analysis-report.service';

describe('AnalysisReportService', () => {
  let service: AnalysisReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalysisReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
