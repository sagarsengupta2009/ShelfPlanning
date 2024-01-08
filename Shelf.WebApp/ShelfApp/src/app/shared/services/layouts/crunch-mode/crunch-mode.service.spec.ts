import { TestBed } from '@angular/core/testing';

import { CrunchModeService } from './crunch-mode.service';

describe('CollisionService', () => {
  let service: CrunchModeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CrunchModeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
