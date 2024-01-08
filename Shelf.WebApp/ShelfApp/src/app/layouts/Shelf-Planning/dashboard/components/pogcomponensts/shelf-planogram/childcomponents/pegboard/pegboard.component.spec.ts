import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PegboardComponent } from './pegboard.component';

describe('PegboardComponent', () => {
  let component: PegboardComponent;
  let fixture: ComponentFixture<PegboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PegboardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PegboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
