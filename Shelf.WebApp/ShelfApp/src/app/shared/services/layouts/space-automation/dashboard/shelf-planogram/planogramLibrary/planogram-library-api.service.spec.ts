import { TestBed } from '@angular/core/testing';

import { PlanogramLibraryApiService } from './planogram-library-api.service';

describe('PlanogramLibraryApiService', () => {
  let service: PlanogramLibraryApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlanogramLibraryApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
