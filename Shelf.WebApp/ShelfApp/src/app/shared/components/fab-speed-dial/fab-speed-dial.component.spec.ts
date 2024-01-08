import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { FabSpeedDialComponent } from './fab-speed-dial.component';

describe('FabSpeedDialComponent', () => {
  let component: FabSpeedDialComponent;
  let fixture: ComponentFixture<FabSpeedDialComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [FabSpeedDialComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FabSpeedDialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
