import { TestBed } from '@angular/core/testing';

import { ProductlibraryService } from './productlibrary.service';

describe('ProductlibraryService', () => {
  let service: ProductlibraryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductlibraryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
