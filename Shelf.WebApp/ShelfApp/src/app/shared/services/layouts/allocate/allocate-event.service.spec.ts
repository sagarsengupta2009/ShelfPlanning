import { TestBed } from '@angular/core/testing';

import { AllocateEventService } from './allocate-event.service';

describe('AllocateEventService', () => {
  let service: AllocateEventService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AllocateEventService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
