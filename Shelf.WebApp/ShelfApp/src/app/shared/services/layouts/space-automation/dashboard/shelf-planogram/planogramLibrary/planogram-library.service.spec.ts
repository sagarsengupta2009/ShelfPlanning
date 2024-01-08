import { TestBed } from '@angular/core/testing';

import { PlanogramLibraryService } from './planogram-library.service';

describe('PlanogramLibraryService', () => {
  let service: PlanogramLibraryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlanogramLibraryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
