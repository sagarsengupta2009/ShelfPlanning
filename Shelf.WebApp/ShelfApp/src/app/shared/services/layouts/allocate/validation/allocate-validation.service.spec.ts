import { TestBed } from '@angular/core/testing';

import { AllocateValidationService } from './allocate-validation.service';

describe('AllocateValidationService', () => {
  let service: AllocateValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AllocateValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
