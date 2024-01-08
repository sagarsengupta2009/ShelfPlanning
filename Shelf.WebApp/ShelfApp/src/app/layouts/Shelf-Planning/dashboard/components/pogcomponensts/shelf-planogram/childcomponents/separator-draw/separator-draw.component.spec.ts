import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeparatorDrawComponent } from './separator-draw.component';

describe('SeparatorDrawComponent', () => {
  let component: SeparatorDrawComponent;
  let fixture: ComponentFixture<SeparatorDrawComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SeparatorDrawComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SeparatorDrawComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
