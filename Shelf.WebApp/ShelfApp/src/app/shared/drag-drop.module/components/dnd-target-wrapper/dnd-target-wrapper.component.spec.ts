import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DndTargetWrapperComponent } from './dnd-target-wrapper.component';

describe('DndTargetWrapperComponent', () => {
  let component: DndTargetWrapperComponent;
  let fixture: ComponentFixture<DndTargetWrapperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DndTargetWrapperComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DndTargetWrapperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
