import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DndSourceWrapperComponent } from './dnd-source-wrapper.component';

describe('DndSourceWrapperComponent', () => {
  let component: DndSourceWrapperComponent<any>;
  let fixture: ComponentFixture<DndSourceWrapperComponent<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DndSourceWrapperComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DndSourceWrapperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
