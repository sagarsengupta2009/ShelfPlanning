import { TestBed } from '@angular/core/testing';

import { UprightService } from './upright.service';

describe('UprightService', () => {
  let service: UprightService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UprightService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
