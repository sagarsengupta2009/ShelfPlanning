import { TestBed } from '@angular/core/testing';

import { ShelfbumpService } from './shelfbump.service';

describe('ShelfbumpService', () => {
  let service: ShelfbumpService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShelfbumpService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
