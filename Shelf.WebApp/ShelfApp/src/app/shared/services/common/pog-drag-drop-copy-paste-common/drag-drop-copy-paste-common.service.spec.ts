import { TestBed } from '@angular/core/testing';

import { DragDropCopyPasteCommonService } from './drag-drop-copy-paste-common.service';

describe('DragDropCopyPasteCommonService', () => {
  let service: DragDropCopyPasteCommonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DragDropCopyPasteCommonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
