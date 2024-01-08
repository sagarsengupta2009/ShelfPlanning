import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { AssignementConfirmationComponent } from './assignement-confirmation.component';

describe('AssignementConfirmationComponent', () => {
  let component: AssignementConfirmationComponent;
  let fixture: ComponentFixture<AssignementConfirmationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MatDialogModule],
      declarations: [AssignementConfirmationComponent],
      providers: [
        MatDialog,
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: { close: () => { } } }
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignementConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be close the Alert dialog on onNoClick', () => {
    const spy = spyOn(component.dialogRef, 'close').and.callThrough();
    component.onNoClick();
    expect(spy).toHaveBeenCalled();
  });

  it('should be close the Alert dialog on onYesClick', () => {
    const spy = spyOn(component.dialogRef, 'close').and.callThrough();
    component.onYesClick();
    expect(spy).toHaveBeenCalled();
  });
});
