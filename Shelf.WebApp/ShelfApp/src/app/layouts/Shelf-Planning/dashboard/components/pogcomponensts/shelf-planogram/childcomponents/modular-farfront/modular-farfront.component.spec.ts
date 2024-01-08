import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModularFarfrontComponent } from './modular-farfront.component';

describe('ModularFarfrontComponent', () => {
  let component: ModularFarfrontComponent;
  let fixture: ComponentFixture<ModularFarfrontComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModularFarfrontComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ModularFarfrontComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
