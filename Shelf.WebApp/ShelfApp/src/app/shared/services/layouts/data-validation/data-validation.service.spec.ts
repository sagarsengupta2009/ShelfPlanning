import { TestBed } from '@angular/core/testing';

import { DataValidationService } from './data-validation.service';

describe('DataValidationService', () => {
  let service: DataValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
