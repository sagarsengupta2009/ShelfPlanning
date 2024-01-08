import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DimensionDisplayComponent } from './dimension-display.component';

describe('DimensionDisplayComponent', () => {
  let component: DimensionDisplayComponent;
  let fixture: ComponentFixture<DimensionDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DimensionDisplayComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DimensionDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
