import { TestBed } from '@angular/core/testing';

import { CommonSvgRenderService } from './common-svg-render.service';

describe('CommonSvgRenderService', () => {
  let service: CommonSvgRenderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommonSvgRenderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
