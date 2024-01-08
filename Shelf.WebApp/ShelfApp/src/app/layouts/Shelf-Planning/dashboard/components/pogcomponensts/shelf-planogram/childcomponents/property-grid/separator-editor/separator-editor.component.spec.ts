import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeparatorEditorComponent } from './separator-editor.component';

describe('SeparatorEditorComponent', () => {
  let component: SeparatorEditorComponent;
  let fixture: ComponentFixture<SeparatorEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SeparatorEditorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SeparatorEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
