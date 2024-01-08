import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DndLayerWrapperComponent } from './dnd-layer-wrapper.component';

describe('DndLayerWrapperComponent', () => {
  let component: DndLayerWrapperComponent;
  let fixture: ComponentFixture<DndLayerWrapperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DndLayerWrapperComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DndLayerWrapperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
