import { TestBed } from '@angular/core/testing';

import { PlanogramLoaderService } from './planogram-loader.service';

describe('PlanogramLoaderService', () => {
  let service: PlanogramLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlanogramLoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
