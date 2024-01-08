import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PogqualifierEditorComponent } from './pogqualifier-editor.component';

describe('PogqualifierEditorComponent', () => {
  let component: PogqualifierEditorComponent;
  let fixture: ComponentFixture<PogqualifierEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PogqualifierEditorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PogqualifierEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
