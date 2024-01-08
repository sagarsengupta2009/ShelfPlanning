import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SlotwallComponent } from './slotwall.component';

describe('SlotwallComponent', () => {
  let component: SlotwallComponent;
  let fixture: ComponentFixture<SlotwallComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SlotwallComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SlotwallComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
