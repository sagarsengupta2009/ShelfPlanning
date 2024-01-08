import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NumericRangeComponent } from './numeric-range.component';

describe('NumericRangeComponent', () => {
  let component: NumericRangeComponent;
  let fixture: ComponentFixture<NumericRangeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NumericRangeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NumericRangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
