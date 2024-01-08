import { TestBed } from '@angular/core/testing';

import { AllocateUtilitiesService } from './allocate-utilities.service';

describe('AllocateUtilitiesService', () => {
  let service: AllocateUtilitiesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AllocateUtilitiesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
