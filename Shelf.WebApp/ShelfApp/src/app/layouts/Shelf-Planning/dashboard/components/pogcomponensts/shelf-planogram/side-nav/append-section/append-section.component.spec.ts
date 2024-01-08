import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppendSectionComponent } from './append-section.component';

describe('AppendSectionComponent', () => {
  let component: AppendSectionComponent;
  let fixture: ComponentFixture<AppendSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AppendSectionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppendSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
