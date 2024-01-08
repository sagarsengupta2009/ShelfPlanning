import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UprightDrawComponent } from './upright-draw.component';

describe('UprightDrawComponent', () => {
  let component: UprightDrawComponent;
  let fixture: ComponentFixture<UprightDrawComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UprightDrawComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UprightDrawComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
