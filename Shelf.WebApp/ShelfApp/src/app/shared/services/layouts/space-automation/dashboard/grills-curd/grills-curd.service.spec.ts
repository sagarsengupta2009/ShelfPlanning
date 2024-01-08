import { TestBed } from '@angular/core/testing';

import { GrillsCurdService } from './grills-curd.service';

describe('GrillsCurdService', () => {
  let service: GrillsCurdService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GrillsCurdService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
