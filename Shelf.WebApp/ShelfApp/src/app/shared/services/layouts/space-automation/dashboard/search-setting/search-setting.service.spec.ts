import { TestBed } from '@angular/core/testing';

import { SearchSettingService } from './search-setting.service';

describe('SearchSettingService', () => {
  let service: SearchSettingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchSettingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
