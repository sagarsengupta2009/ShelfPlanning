import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HighlightSettingComponent } from './highlight-setting.component';

describe('HighlightSettingComponent', () => {
  let component: HighlightSettingComponent;
  let fixture: ComponentFixture<HighlightSettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HighlightSettingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HighlightSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
