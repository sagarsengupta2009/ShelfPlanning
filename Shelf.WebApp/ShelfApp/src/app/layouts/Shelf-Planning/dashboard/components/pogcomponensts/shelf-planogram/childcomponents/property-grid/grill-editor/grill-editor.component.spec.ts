import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrillEditorComponent } from './grill-editor.component';

describe('GrillEditorComponent', () => {
  let component: GrillEditorComponent;
  let fixture: ComponentFixture<GrillEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GrillEditorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GrillEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
