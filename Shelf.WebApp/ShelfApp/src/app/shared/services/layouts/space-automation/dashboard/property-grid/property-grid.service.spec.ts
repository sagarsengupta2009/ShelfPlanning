import { TestBed } from '@angular/core/testing';

import { PropertyGridService } from './property-grid.service';

describe('PropertyGridService', () => {
  let service: PropertyGridService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PropertyGridService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
