import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ToolTipRendererDirective } from './tool-tip-renderer.directive';

@Component({
  template: `
    <div customToolTip><h2>Something Yellow</h2></div>`
})
class TestComponent { }

describe('ToolTipRendererDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let des: DebugElement[];
  beforeEach(waitForAsync(() => {
    fixture = TestBed.configureTestingModule({
      declarations: [ToolTipRendererDirective, TestComponent]
    }).createComponent(TestComponent);

    fixture.detectChanges(); // initial binding

    des = fixture.debugElement.queryAll(By.directive(ToolTipRendererDirective));
  }));
});
