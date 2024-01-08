import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaneltoolsComponent } from './paneltools.component';

describe('PaneltoolsComponent', () => {
  let component: PaneltoolsComponent;
  let fixture: ComponentFixture<PaneltoolsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PaneltoolsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PaneltoolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
