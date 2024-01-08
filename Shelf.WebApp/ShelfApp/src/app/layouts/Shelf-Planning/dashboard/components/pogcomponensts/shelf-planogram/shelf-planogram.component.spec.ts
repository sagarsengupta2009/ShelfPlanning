import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShelfPlanogramComponent } from './shelf-planogram.component';

describe('ShelfPlanogramComponent', () => {
  let component: ShelfPlanogramComponent;
  let fixture: ComponentFixture<ShelfPlanogramComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ShelfPlanogramComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ShelfPlanogramComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
