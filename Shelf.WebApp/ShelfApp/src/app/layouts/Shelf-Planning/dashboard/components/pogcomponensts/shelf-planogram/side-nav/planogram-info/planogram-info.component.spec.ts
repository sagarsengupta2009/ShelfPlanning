import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanogramInfoComponent } from './planogram-info.component';

describe('PlanogramInfoComponent', () => {
  let component: PlanogramInfoComponent;
  let fixture: ComponentFixture<PlanogramInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlanogramInfoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PlanogramInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
