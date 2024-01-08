import { TestBed } from '@angular/core/testing';

import { AllocateCommonService } from './allocate-common.service';

describe('AllocateCommonService', () => {
  let service: AllocateCommonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AllocateCommonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
