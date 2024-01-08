import { TestBed } from '@angular/core/testing';

import { BlockSvgRenderService } from './block-svg-render.service';

describe('BlockSvgRenderService', () => {
  let service: BlockSvgRenderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BlockSvgRenderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
