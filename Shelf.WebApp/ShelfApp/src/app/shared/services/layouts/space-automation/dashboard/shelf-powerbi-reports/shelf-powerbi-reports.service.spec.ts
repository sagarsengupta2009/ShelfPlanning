import { TestBed } from '@angular/core/testing';

import { ShelfPowerbiReportsService } from './shelf-powerbi-reports.service';

describe('ShelfPowerbiReportsService', () => {
  let service: ShelfPowerbiReportsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShelfPowerbiReportsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
