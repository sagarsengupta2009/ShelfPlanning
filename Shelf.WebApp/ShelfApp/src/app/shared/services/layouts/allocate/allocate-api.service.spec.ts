import { TestBed } from '@angular/core/testing';

import { AllocateAPIService } from './allocate-api.service';

describe('AllocateAPIService', () => {
  let service: AllocateAPIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AllocateAPIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
