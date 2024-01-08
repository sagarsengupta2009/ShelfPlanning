import { TestBed } from '@angular/core/testing';

import { ModularSvgRenderService } from './modular-svg-render.service';

describe('ModularSvgRenderService', () => {
  let service: ModularSvgRenderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModularSvgRenderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
