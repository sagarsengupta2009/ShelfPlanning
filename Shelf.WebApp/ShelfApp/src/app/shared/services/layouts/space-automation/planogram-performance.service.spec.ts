import { TestBed } from '@angular/core/testing';

import { PlanogramPerformanceService } from './planogram-performance.service';

describe('PlanogramPerformanceService', () => {
  let service: PlanogramPerformanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlanogramPerformanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
