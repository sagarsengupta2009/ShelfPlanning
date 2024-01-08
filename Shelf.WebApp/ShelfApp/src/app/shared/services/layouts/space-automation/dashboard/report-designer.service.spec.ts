import { TestBed } from '@angular/core/testing';

import { ReportDesignerService } from './report-designer.service';

describe('ReportDesignerService', () => {
  let service: ReportDesignerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReportDesignerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
