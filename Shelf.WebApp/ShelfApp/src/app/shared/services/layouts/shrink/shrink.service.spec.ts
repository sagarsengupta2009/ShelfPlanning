import { TestBed } from '@angular/core/testing';

import { ShrinkService } from './shrink.service';

describe('ShrinkService', () => {
  let service: ShrinkService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShrinkService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
