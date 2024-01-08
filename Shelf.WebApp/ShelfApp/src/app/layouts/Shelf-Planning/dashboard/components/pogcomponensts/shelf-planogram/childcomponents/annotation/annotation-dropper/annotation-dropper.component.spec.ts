import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnotationDropperComponent } from './annotation-dropper.component';

describe('AnnotationDropperComponent', () => {
  let component: AnnotationDropperComponent;
  let fixture: ComponentFixture<AnnotationDropperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnotationDropperComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnotationDropperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
