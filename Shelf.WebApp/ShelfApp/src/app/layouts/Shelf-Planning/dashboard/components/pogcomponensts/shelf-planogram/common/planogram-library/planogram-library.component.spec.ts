import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanogramLibraryComponent } from './planogram-library.component';

describe('PlanogramLibraryComponent', () => {
  let component: PlanogramLibraryComponent;
  let fixture: ComponentFixture<PlanogramLibraryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlanogramLibraryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PlanogramLibraryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
