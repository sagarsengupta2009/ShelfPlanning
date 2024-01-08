import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { KendoGridMultiHeaderComponent } from './kendo-grid-multi-header.component';

describe('KendoGridMultiHeaderComponent', () => {
  let component: KendoGridMultiHeaderComponent;
  let fixture: ComponentFixture<KendoGridMultiHeaderComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [KendoGridMultiHeaderComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(KendoGridMultiHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
