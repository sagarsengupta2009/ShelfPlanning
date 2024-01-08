import { TestBed } from '@angular/core/testing';

import { ImportTemplateService } from './import-template.service';

describe('ImportTemplateService', () => {
  let service: ImportTemplateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImportTemplateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
