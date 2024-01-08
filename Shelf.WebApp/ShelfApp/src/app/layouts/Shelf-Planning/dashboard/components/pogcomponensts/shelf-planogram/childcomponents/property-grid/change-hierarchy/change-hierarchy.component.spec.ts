import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeHierarchyComponent } from './change-hierarchy.component';

describe('ChangeHierarchyComponent', () => {
  let component: ChangeHierarchyComponent;
  let fixture: ComponentFixture<ChangeHierarchyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChangeHierarchyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChangeHierarchyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
