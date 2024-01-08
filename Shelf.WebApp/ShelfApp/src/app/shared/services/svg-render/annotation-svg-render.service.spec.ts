import { TestBed } from '@angular/core/testing';

import { AnnotationSvgRenderService } from './annotation-svg-render.service';

describe('AnnotationSvgRenderService', () => {
  let service: AnnotationSvgRenderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnnotationSvgRenderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
