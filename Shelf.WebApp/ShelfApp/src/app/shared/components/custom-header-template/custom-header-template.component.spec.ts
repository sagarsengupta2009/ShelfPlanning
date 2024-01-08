import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomHeaderTemplateComponent } from './custom-header-template.component';

describe('CustomHeaderTemplateComponent', () => {
  let component: CustomHeaderTemplateComponent;
  let fixture: ComponentFixture<CustomHeaderTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CustomHeaderTemplateComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomHeaderTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
