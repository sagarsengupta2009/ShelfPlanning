import { TestBed } from '@angular/core/testing';

import { CoffincaseSvgRenderService } from './coffincase-svg-render.service';

describe('CoffincaseSvgRenderService', () => {
  let service: CoffincaseSvgRenderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CoffincaseSvgRenderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
