import { TestBed } from '@angular/core/testing';

import { AllocateSaveService } from './allocate-save.service';

describe('AllocateSaveService', () => {
  let service: AllocateSaveService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AllocateSaveService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
