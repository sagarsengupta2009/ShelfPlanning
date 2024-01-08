import { TestBed } from '@angular/core/testing';

import { DictConfigService } from './dict-config.service';

describe('DictConfigService', () => {
  let service: DictConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DictConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
