import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParamMPCardComponent } from './param-mpcard.component';

describe('ParamMPCardComponent', () => {
  let component: ParamMPCardComponent;
  let fixture: ComponentFixture<ParamMPCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ParamMPCardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ParamMPCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
