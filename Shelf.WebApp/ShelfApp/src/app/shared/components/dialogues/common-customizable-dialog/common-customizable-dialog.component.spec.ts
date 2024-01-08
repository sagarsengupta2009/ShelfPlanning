import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommonCustomizableDialogComponent } from './common-customizable-dialog.component';

describe('CommonCustomizableDialogComponent', () => {
  let component: CommonCustomizableDialogComponent;
  let fixture: ComponentFixture<CommonCustomizableDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CommonCustomizableDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommonCustomizableDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
