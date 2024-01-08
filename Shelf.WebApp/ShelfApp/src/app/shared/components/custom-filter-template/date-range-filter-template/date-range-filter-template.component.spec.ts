import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DateRangeFilterTemplateComponent } from './date-range-filter-template.component';

describe('DateRangeFilterTemplateComponent', () => {
  let component: DateRangeFilterTemplateComponent;
  let fixture: ComponentFixture<DateRangeFilterTemplateComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [DateRangeFilterTemplateComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DateRangeFilterTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
