import { TestBed } from '@angular/core/testing';

import { StandardshelfSvgRenderService } from './standardshelf-svg-render.service';

describe('StandardshelfSvgRenderService', () => {
  let service: StandardshelfSvgRenderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StandardshelfSvgRenderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
