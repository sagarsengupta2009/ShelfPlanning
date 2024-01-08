import { TestBed } from '@angular/core/testing';

import { PogDragDropService } from './pog-drag-drop.service';

describe('PogDragDropService', () => {
  let service: PogDragDropService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PogDragDropService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
