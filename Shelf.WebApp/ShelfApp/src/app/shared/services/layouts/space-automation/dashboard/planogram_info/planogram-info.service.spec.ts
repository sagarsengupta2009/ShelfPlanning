import { TestBed } from '@angular/core/testing';

import { PlanogramInfoService } from './planogram-info.service';

describe('PlanogramInfoService', () => {
  let service: PlanogramInfoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlanogramInfoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
