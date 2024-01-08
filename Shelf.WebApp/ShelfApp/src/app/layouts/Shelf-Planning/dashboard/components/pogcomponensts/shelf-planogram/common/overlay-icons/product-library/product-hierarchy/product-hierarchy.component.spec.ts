import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductHierarchyComponent } from './product-hierarchy.component';

describe('ProductHierarchyComponent', () => {
  let component: ProductHierarchyComponent;
  let fixture: ComponentFixture<ProductHierarchyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProductHierarchyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductHierarchyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
