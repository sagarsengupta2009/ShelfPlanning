import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuadrantAnalysisComponent } from './quadrant-analysis.component';

describe('QuadrantAnalysisComponent', () => {
  let component: QuadrantAnalysisComponent;
  let fixture: ComponentFixture<QuadrantAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QuadrantAnalysisComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(QuadrantAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
