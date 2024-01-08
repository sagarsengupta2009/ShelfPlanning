import { TestBed } from '@angular/core/testing';

import { ShowMorePogInfoService } from './show-more-pog-info.service';

describe('ShowMorePogInfoService', () => {
  let service: ShowMorePogInfoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShowMorePogInfoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
