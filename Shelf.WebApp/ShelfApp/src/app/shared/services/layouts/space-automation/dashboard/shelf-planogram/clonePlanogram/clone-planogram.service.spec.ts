import { TestBed } from '@angular/core/testing';

import { ClonePlanogramService } from './clone-planogram.service';

describe('ClonePlanogramService', () => {
  let service: ClonePlanogramService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClonePlanogramService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
