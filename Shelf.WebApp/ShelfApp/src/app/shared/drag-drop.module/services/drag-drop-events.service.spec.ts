import { TestBed } from '@angular/core/testing';

import { DragDropEventsService } from './drag-drop-events.service';

describe('DragDropEventsService', () => {
  let service: DragDropEventsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DragDropEventsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
