import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PogProfileEditorComponent } from './pog-profile-editor.component';

describe('PogProfileEditorComponent', () => {
  let component: PogProfileEditorComponent;
  let fixture: ComponentFixture<PogProfileEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PogProfileEditorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PogProfileEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
