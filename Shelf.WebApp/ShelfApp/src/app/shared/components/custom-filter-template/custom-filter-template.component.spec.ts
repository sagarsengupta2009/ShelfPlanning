import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CustomFilterTemplateComponent } from './custom-filter-template.component';

describe('CustomFilterTemplateComponent', () => {
  let component: CustomFilterTemplateComponent;
  let fixture: ComponentFixture<CustomFilterTemplateComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [CustomFilterTemplateComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomFilterTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
