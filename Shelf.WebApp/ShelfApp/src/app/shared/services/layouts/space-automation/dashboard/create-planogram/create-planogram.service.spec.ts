import { TestBed } from '@angular/core/testing';

import { CreatePlanogramService } from './create-planogram.service';

describe('CreatePlanogramService', () => {
  let service: CreatePlanogramService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CreatePlanogramService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
