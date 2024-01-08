import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxI2eNotesComponent } from './ngx-i2e-notes.component';

describe('NgxI2eNotesComponent', () => {
  let component: NgxI2eNotesComponent;
  let fixture: ComponentFixture<NgxI2eNotesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NgxI2eNotesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgxI2eNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
