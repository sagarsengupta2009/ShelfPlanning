import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PromoteDemoteComponent } from './promote-demote.component';

describe('PromoteDemoteComponent', () => {
  let component: PromoteDemoteComponent;
  let fixture: ComponentFixture<PromoteDemoteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PromoteDemoteComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PromoteDemoteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
