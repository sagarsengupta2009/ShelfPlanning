import { TestBed } from '@angular/core/testing';

import { PropertyFieldService } from './property-field.service';

describe('PropertyFieldService', () => {
  let service: PropertyFieldService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PropertyFieldService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
