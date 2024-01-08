import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CustomEditTemplateComponent } from './custom-edit-template.component';

describe('CustomEditTemplateComponent', () => {
  let component: CustomEditTemplateComponent;
  let fixture: ComponentFixture<CustomEditTemplateComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [CustomEditTemplateComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomEditTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
