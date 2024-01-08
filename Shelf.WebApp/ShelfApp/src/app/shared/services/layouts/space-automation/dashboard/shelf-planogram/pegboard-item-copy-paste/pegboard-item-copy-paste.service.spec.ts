import { TestBed } from '@angular/core/testing';

import { PegboardItemCopyPasteService } from './pegboard-item-copy-paste.service';

describe('PegboardItemCopyPasteService', () => {
  let service: PegboardItemCopyPasteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PegboardItemCopyPasteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
