import { TestBed } from '@angular/core/testing';

import { AllocateNpiService } from './allocate-npi.service';

describe('AllocateNpiService', () => {
  let service: AllocateNpiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AllocateNpiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
