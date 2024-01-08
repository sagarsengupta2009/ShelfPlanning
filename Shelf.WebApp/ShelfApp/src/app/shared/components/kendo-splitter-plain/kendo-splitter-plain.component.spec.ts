import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { KendoSplitterPlainComponent } from './kendo-splitter-plain.component';

describe('KendoSplitterPlainComponent', () => {
  let component: KendoSplitterPlainComponent;
  let fixture: ComponentFixture<KendoSplitterPlainComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [KendoSplitterPlainComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(KendoSplitterPlainComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
