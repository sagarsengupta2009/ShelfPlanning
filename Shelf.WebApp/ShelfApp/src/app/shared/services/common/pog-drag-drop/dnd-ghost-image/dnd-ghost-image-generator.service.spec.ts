import { TestBed } from '@angular/core/testing';

import { DndGhostImageGeneratorService } from './dnd-ghost-image-generator.service';

describe('DndGhostImageService', () => {
  let service: DndGhostImageGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DndGhostImageGeneratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
