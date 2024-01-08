import { TestBed } from '@angular/core/testing';

import { BlockHelperService } from './block-helper.service';

describe('BlockHelperService', () => {
  let service: BlockHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BlockHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
