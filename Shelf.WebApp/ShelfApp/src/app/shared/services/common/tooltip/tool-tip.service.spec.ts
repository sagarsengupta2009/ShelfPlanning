import { TestBed } from '@angular/core/testing';

import { ToolTipService } from './tool-tip.service';

describe('ToolTipService', () => {
  let service: ToolTipService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToolTipService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
