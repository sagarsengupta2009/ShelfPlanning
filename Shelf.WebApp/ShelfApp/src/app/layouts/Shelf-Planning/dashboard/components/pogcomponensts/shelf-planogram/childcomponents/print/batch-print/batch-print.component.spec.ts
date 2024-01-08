import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatchPrintComponent } from './batch-print.component';

describe('BatchPrintComponent', () => {
  let component: BatchPrintComponent;
  let fixture: ComponentFixture<BatchPrintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BatchPrintComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BatchPrintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
