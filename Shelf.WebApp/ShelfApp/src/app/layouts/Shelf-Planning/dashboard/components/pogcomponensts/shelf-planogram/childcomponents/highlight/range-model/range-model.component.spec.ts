import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RangeModelComponent } from './range-model.component';

describe('RangeModelComponent', () => {
  let component: RangeModelComponent;
  let fixture: ComponentFixture<RangeModelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RangeModelComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RangeModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
