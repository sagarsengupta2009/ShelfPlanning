import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CheckBoxFilterTemplateComponent } from './checkbox-filter-template.component';

describe('CheckboxFilterTemplateComponent', () => {
  let component: CheckBoxFilterTemplateComponent;
  let fixture: ComponentFixture<CheckBoxFilterTemplateComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [CheckBoxFilterTemplateComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CheckBoxFilterTemplateComponent);
    component = fixture.componentInstance;
    const mockCurrentFilter: any = {
      filters: [
        {
          field: 'isMarked_template',
          operator: 'eq',
          value: `<input class="assignpog" type="checkbox" value=16151>`
        },
        {
          field: 'isMarked_template',
          operator: 'eq',
          value: `<input type="checkbox" checked disabled>`
        }
      ],
      logic: 'or'
    };
    component.currentFilter = mockCurrentFilter;
    fixture.detectChanges();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should apply filter on records', () => {
    const mockData = [
      {
        field: `<input type="checkbox" checked disabled>`,
        type: 'string',
        value: `<input type="checkbox" checked disabled>`
      },
      {
        field: `<input class="assignpog" type="checkbox" value=16151>`,
        type: 'string',
        value: `<input class="assignpog" type="checkbox" value=16151>`
      }
    ];
    component.data = mockData;
    component.filterValues('unchecked');
  });
});
