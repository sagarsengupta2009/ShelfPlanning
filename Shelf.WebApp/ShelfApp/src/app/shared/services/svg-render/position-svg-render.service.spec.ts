import { TestBed } from '@angular/core/testing';

import { PositionSvgRenderService } from './position-svg-render.service';

describe('PositionSvgRenderService', () => {
  let service: PositionSvgRenderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PositionSvgRenderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
