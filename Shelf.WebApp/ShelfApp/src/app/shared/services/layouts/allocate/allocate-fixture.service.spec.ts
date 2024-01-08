import { TestBed } from '@angular/core/testing';

import { AllocateFixtureService } from './allocate-fixture.service';

describe('AllocateFixtureService', () => {
  let service: AllocateFixtureService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AllocateFixtureService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
