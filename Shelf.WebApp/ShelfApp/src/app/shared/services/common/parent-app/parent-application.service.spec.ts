import { TestBed } from '@angular/core/testing';

import { ParentApplicationService } from './parent-application.service';

describe('ParentApplicationService', () => {
  let service: ParentApplicationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ParentApplicationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
