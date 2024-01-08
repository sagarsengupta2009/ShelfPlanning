import { TestBed } from '@angular/core/testing';

import { PanelBodyService } from './panel-body.service';

describe('PanelBodyService', () => {
  let service: PanelBodyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PanelBodyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
