import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultipleCloneComponent } from './multiple-clone.component';

describe('MultipleCloneComponent', () => {
  let component: MultipleCloneComponent;
  let fixture: ComponentFixture<MultipleCloneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MultipleCloneComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MultipleCloneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
