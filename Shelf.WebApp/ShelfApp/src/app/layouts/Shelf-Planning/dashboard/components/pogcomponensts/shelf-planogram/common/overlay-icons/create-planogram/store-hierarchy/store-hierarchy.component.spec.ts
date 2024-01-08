import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StoreHierarchyComponent } from './store-hierarchy.component';

describe('StoreHierarchyComponent', () => {
  let component: StoreHierarchyComponent;
  let fixture: ComponentFixture<StoreHierarchyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StoreHierarchyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StoreHierarchyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
