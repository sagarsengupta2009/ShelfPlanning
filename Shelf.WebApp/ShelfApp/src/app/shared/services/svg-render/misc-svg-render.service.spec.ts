import { TestBed } from '@angular/core/testing';

import { MiscSvgRenderService } from './misc-svg-render.service';

describe('MiscSvgRenderService', () => {
  let service: MiscSvgRenderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MiscSvgRenderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
