import { TestBed } from '@angular/core/testing';

import { AssortService } from './assort.service';

describe('AssortService', () => {
  let service: AssortService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AssortService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
