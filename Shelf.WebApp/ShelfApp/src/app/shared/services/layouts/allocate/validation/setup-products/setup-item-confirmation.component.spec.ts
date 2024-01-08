import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupItemConfirmationComponent } from './setup-item-confirmation.component';

describe('SetupItemConfirmationComponent', () => {
  let component: SetupItemConfirmationComponent;
  let fixture: ComponentFixture<SetupItemConfirmationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SetupItemConfirmationComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SetupItemConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
