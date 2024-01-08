import { TestBed } from '@angular/core/testing';

import { NewProductInventoryService } from './new-product-inventory.service';

describe('NewProductInventoryService', () => {
  let service: NewProductInventoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NewProductInventoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
