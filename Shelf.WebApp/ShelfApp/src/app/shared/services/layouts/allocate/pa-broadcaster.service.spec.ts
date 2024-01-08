import { TestBed } from '@angular/core/testing';

import { PaBroadcasterService } from './pa-broadcaster.service';

describe('PaBroadcasterService', () => {
  let service: PaBroadcasterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaBroadcasterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
