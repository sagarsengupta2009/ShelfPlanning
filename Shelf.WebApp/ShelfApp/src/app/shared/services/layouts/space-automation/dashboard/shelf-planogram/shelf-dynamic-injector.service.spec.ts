import { TestBed } from '@angular/core/testing';

import { ShelfDynamicInjectorService } from './shelf-dynamic-injector.service';

describe('ShelfDynamicInjectorService', () => {
  let service: ShelfDynamicInjectorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShelfDynamicInjectorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
