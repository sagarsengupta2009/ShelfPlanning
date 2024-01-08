import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PogInfoComponent } from './pog-info.component';

describe('PogInfoComponent', () => {
  let component: PogInfoComponent;
  let fixture: ComponentFixture<PogInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PogInfoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PogInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
