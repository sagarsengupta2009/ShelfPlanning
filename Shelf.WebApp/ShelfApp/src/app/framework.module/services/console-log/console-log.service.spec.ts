import { TestBed } from '@angular/core/testing';

import { ConsoleLogService } from './console-log.service';

describe('ConsoleLogService', () => {
  let service: ConsoleLogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConsoleLogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
