import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelBodyComponent } from './panel-body.component';

describe('PanelBodyComponent', () => {
  let component: PanelBodyComponent;
  let fixture: ComponentFixture<PanelBodyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PanelBodyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PanelBodyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
