import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmBaymappingResetComponent } from './confirm-baymapping-reset.component';

describe('ConfirmBaymappingResetComponent', () => {
  let component: ConfirmBaymappingResetComponent;
  let fixture: ComponentFixture<ConfirmBaymappingResetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmBaymappingResetComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfirmBaymappingResetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
