import { TestBed } from '@angular/core/testing';

import { PromoteDemoteService } from './promote-demote.service';

describe('PromoteDemoteService', () => {
  let service: PromoteDemoteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PromoteDemoteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
