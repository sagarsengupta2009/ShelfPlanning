import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShelfNestedComponent } from './shelf-nested.component';

describe('ShelfNestedComponent', () => {
  let component: ShelfNestedComponent;
  let fixture: ComponentFixture<ShelfNestedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ShelfNestedComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ShelfNestedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
