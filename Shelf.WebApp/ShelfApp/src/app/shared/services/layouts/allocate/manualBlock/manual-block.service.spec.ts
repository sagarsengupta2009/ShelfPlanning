import { TestBed } from '@angular/core/testing';

import { ManualBlockService } from './manual-block.service';

describe('ManualBlockService', () => {
  let service: ManualBlockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ManualBlockService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
