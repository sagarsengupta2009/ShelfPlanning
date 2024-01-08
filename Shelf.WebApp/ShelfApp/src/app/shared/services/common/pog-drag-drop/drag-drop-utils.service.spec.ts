import { TestBed } from '@angular/core/testing';

import { DragDropUtilsService } from './drag-drop-utils.service';

describe('DragDropUtilsService', () => {
  let service: DragDropUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DragDropUtilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
