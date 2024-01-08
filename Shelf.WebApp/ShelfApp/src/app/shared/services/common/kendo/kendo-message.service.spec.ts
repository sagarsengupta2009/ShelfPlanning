import { TestBed } from '@angular/core/testing';

import { KendoMessageService } from './kendo-message.service';

describe('KendoMessageService', () => {
  let service: KendoMessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(KendoMessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
