import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContextModelComponent } from './context-model.component';

describe('ContextModelComponent', () => {
  let component: ContextModelComponent;
  let fixture: ComponentFixture<ContextModelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ContextModelComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ContextModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
