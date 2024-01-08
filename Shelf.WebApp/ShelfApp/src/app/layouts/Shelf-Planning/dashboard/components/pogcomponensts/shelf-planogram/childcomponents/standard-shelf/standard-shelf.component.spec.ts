import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StandardShelfComponent } from './standard-shelf.component';

describe('StandardShelfComponent', () => {
  let component: StandardShelfComponent;
  let fixture: ComponentFixture<StandardShelfComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StandardShelfComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StandardShelfComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
