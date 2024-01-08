import { TestBed } from '@angular/core/testing';

import { PogQualifierConfigurationService } from './pog-qualifier-configuration.service';

describe('PogQualifierConfigurationService', () => {
  let service: PogQualifierConfigurationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PogQualifierConfigurationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
