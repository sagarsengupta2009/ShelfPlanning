import { TestBed } from '@angular/core/testing';

import { 2dPlanogramService } from './2d-planogram.service';

describe('2dPlanogramService', () => {
  let service: 2dPlanogramService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(2dPlanogramService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
