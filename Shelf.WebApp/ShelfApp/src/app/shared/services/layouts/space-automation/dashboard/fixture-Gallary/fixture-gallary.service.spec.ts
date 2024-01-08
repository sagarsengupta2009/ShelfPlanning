import { TestBed } from '@angular/core/testing';

import { FixtureGallaryService } from './fixture-gallary.service';

describe('FixtureGallaryService', () => {
  let service: FixtureGallaryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FixtureGallaryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
