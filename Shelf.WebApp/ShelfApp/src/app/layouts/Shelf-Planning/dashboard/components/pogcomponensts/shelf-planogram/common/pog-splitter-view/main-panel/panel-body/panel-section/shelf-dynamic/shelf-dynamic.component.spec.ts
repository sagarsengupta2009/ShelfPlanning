import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShelfDynamicComponent } from './shelf-dynamic.component';

describe('ShelfDynamicComponent', () => {
  let component: ShelfDynamicComponent;
  let fixture: ComponentFixture<ShelfDynamicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ShelfDynamicComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ShelfDynamicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
