import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClonePlanogramComponent } from './clone-planogram.component';

describe('ClonePlanogramComponent', () => {
  let component: ClonePlanogramComponent;
  let fixture: ComponentFixture<ClonePlanogramComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClonePlanogramComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ClonePlanogramComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
