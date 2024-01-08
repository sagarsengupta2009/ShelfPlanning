import { TestBed } from '@angular/core/testing';

import { DictionaryFunctionService } from './dictionary-function.service';

describe('DictionaryService', () => {
  let service: DictionaryFunctionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DictionaryFunctionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
