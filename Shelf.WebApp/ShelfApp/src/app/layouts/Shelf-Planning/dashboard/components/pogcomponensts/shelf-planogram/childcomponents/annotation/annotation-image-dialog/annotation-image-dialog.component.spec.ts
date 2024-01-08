import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnotationImageDialogComponent } from './annotation-image-dialog.component';

describe('AnnotationImageDialogComponent', () => {
  let component: AnnotationImageDialogComponent;
  let fixture: ComponentFixture<AnnotationImageDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnotationImageDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnotationImageDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
