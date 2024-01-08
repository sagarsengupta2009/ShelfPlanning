import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerformanceWorksheetComponent } from './performance-worksheet.component';

describe('PerformanceWorksheetComponent', () => {
  let component: PerformanceWorksheetComponent;
  let fixture: ComponentFixture<PerformanceWorksheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PerformanceWorksheetComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PerformanceWorksheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
