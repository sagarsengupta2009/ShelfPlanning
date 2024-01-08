import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoffinCaseComponent } from './coffincase.component';

describe('CoffinCaseComponent', () => {
  let component: CoffinCaseComponent;
  let fixture: ComponentFixture<CoffinCaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CoffinCaseComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CoffinCaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
