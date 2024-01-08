import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PropertyGridTemplateComponent } from './property-grid-template.component';

describe('PropertyGridTemplateComponent', () => {
  let component: PropertyGridTemplateComponent;
  let fixture: ComponentFixture<PropertyGridTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PropertyGridTemplateComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PropertyGridTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
