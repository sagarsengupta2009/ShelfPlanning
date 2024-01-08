import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisSettingComponent } from './analysis-setting.component';

describe('AnalysisSettingComponent', () => {
  let component: AnalysisSettingComponent;
  let fixture: ComponentFixture<AnalysisSettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnalysisSettingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnalysisSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
