import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DividerEditorComponent } from './divider-editor.component';

describe('DividerEditorComponent', () => {
  let component: DividerEditorComponent;
  let fixture: ComponentFixture<DividerEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DividerEditorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DividerEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
