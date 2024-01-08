import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FreeflowDialogComponent } from './freeflow-dialog.component';

describe('FreeflowDialogComponent', () => {
  let component: FreeflowDialogComponent;
  let fixture: ComponentFixture<FreeflowDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FreeflowDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FreeflowDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
