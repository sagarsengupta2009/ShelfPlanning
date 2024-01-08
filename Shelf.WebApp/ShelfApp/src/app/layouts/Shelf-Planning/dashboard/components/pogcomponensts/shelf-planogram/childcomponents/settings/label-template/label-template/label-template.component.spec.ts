import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelTemplateComponent } from './label-template.component';

describe('LabelTemplateComponent', () => {
  let component: LabelTemplateComponent;
  let fixture: ComponentFixture<LabelTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LabelTemplateComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LabelTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
