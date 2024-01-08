import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NewProductInventoryComponent } from './new-product-inventory.component';

describe('NewProductInventoryComponent', () => {
  let component: NewProductInventoryComponent;
  let fixture: ComponentFixture<NewProductInventoryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NewProductInventoryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NewProductInventoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
