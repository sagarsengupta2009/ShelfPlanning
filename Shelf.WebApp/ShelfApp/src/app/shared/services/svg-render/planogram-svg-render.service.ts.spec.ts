import { TestBed } from '@angular/core/testing';

import { PlanogramSvgRenderService } from './planogram-svg-render.service';

describe('PlanogramSvgRenderService', () => {
  let service: PlanogramSvgRenderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlanogramSvgRenderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
