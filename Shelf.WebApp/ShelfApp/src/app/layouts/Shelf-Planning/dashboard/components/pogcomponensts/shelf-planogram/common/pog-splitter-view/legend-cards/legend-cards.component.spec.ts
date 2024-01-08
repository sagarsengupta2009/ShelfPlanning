import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LegendCardsComponent } from './legend-cards.component';

describe('LegendCardsComponent', () => {
  let component: LegendCardsComponent;
  let fixture: ComponentFixture<LegendCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LegendCardsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LegendCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
