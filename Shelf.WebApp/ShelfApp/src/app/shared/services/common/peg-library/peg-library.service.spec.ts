import { TestBed } from '@angular/core/testing';

import { PegLibraryService } from './peg-library.service';

describe('PegLibraryService', () => {
  let service: PegLibraryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PegLibraryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
