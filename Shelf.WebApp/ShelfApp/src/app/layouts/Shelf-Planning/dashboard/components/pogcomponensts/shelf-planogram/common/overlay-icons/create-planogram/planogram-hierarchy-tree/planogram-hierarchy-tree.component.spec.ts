import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanogramHierarchyTreeComponent } from './planogram-hierarchy-tree.component';

describe('PlanogramHierarchyTreeComponent', () => {
  let component: PlanogramHierarchyTreeComponent;
  let fixture: ComponentFixture<PlanogramHierarchyTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlanogramHierarchyTreeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PlanogramHierarchyTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
