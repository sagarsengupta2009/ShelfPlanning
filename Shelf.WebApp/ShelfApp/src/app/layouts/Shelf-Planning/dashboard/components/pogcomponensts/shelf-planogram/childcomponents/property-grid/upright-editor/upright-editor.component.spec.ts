import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UprightEditorComponent } from './upright-editor.component';

describe('UprightEditorComponent', () => {
  let component: UprightEditorComponent;
  let fixture: ComponentFixture<UprightEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UprightEditorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UprightEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
