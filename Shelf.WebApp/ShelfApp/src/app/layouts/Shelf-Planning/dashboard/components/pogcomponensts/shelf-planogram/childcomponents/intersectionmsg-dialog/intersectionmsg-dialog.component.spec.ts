import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IntersectionmsgDialogComponent } from './intersectionmsg-dialog.component';

describe('IntersectionmsgDialogComponent', () => {
  let component: IntersectionmsgDialogComponent;
  let fixture: ComponentFixture<IntersectionmsgDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IntersectionmsgDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(IntersectionmsgDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
