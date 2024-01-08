import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewProductIntroductionComponent } from './new-product-introduction.component';

describe('NewProductIntroductionComponent', () => {
  let component: NewProductIntroductionComponent;
  let fixture: ComponentFixture<NewProductIntroductionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewProductIntroductionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NewProductIntroductionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
