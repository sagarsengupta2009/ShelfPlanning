import { TestBed } from '@angular/core/testing';

import { AvailableWSConfColService } from './available-wsconf-col.service';

describe('AvailableWSConfColService', () => {
  let service: AvailableWSConfColService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AvailableWSConfColService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
