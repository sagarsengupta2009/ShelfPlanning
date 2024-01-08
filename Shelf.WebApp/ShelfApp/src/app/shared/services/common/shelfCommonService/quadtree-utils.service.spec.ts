import { TestBed } from '@angular/core/testing';

import { QuadtreeUtilsService } from './quadtree-utils.service';

describe('QuadtreeUtilsService', () => {
  let service: QuadtreeUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QuadtreeUtilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
