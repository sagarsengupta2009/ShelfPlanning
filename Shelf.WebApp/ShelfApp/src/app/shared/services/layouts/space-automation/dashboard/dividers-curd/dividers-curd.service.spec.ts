import { TestBed } from '@angular/core/testing';

import { DividersCurdService } from './dividers-curd.service';

describe('DividersCurdService', () => {
  let service: DividersCurdService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DividersCurdService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
