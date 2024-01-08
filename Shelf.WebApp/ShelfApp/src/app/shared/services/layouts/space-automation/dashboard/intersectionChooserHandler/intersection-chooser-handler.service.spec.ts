import { TestBed } from '@angular/core/testing';

import { IntersectionChooserHandlerService } from './intersection-chooser-handler.service';

describe('IntersectionChooserHandlerService', () => {
  let service: IntersectionChooserHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IntersectionChooserHandlerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
