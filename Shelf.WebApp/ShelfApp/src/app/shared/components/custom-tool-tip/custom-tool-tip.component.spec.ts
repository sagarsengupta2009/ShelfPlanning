import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CustomToolTipComponent } from './custom-tool-tip.component';

describe('CustomToolTipComponent', () => {
  let component: CustomToolTipComponent;
  let fixture: ComponentFixture<CustomToolTipComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [CustomToolTipComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomToolTipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
