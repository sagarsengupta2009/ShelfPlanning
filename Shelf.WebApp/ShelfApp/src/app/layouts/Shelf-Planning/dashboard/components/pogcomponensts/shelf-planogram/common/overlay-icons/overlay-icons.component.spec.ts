import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverlayIconsComponent } from './overlay-icons.component';

describe('OverlayIconsComponent', () => {
  let component: OverlayIconsComponent;
  let fixture: ComponentFixture<OverlayIconsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OverlayIconsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OverlayIconsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
