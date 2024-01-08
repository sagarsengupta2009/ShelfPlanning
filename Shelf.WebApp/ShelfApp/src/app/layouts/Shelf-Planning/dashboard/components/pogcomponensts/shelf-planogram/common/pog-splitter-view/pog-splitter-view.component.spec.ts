import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PogSplitterViewComponent } from './pog-splitter-view.component';

describe('PogSplitterViewComponent', () => {
  let component: PogSplitterViewComponent;
  let fixture: ComponentFixture<PogSplitterViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PogSplitterViewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PogSplitterViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
