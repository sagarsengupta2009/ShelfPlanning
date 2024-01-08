import { TestBed } from '@angular/core/testing';

import { SyncPogItemsService } from './sync-pog-items.service';

describe('SyncPogItemsService', () => {
  let service: SyncPogItemsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SyncPogItemsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
