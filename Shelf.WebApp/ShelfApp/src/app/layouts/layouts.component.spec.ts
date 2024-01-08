import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LayoutsComponent } from './layouts.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('LayoutsComponent', () => {
  let component: LayoutsComponent;
  let fixture: ComponentFixture<LayoutsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      declarations: [LayoutsComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LayoutsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
