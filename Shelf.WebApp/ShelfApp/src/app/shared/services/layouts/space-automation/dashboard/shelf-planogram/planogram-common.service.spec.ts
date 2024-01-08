import { TestBed } from '@angular/core/testing';

import { PlanogramCommonService } from './planogram-common.service';

describe('PlanogramCommonService', () => {
  let service: PlanogramCommonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlanogramCommonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
