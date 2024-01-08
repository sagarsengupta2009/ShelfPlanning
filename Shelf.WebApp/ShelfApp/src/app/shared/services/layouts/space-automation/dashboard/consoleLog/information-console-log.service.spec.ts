import { TestBed } from '@angular/core/testing';

import { InformationConsoleLogService } from './information-console-log.service';

describe('ConsoleLogService', () => {
  let service: InformationConsoleLogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InformationConsoleLogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
