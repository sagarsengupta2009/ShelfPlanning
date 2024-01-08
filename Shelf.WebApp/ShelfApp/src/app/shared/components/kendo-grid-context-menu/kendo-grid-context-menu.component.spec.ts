import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { KendoGridContextMenuComponent } from './kendo-grid-context-menu.component';

describe('KendoGridContextMenuComponent', () => {
  let component: KendoGridContextMenuComponent;
  let fixture: ComponentFixture<KendoGridContextMenuComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [KendoGridContextMenuComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(KendoGridContextMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
