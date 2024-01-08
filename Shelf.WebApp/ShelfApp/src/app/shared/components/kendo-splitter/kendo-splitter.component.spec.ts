import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { KendoSplitterComponent } from './kendo-splitter.component';

describe('KendoSplitterComponent', () => {
  let component: KendoSplitterComponent;
  let fixture: ComponentFixture<KendoSplitterComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [KendoSplitterComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(KendoSplitterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
