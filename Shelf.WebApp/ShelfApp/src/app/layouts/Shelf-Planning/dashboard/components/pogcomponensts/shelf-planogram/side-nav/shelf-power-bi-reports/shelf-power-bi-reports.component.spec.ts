import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShelfPowerBiReportsComponent } from './shelf-power-bi-reports.component';

describe('ShelfPowerBiReportsComponent', () => {
  let component: ShelfPowerBiReportsComponent;
  let fixture: ComponentFixture<ShelfPowerBiReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ShelfPowerBiReportsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ShelfPowerBiReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
