import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StringMatchComponent } from './string-match.component';

describe('StringMatchComponent', () => {
  let component: StringMatchComponent;
  let fixture: ComponentFixture<StringMatchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StringMatchComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StringMatchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
