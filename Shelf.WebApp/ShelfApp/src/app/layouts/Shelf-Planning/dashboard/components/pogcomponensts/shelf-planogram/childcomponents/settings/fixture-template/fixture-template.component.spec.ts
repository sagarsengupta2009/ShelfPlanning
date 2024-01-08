import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FixtureTemplateComponent } from './fixture-template.component';

describe('FixtureTemplateComponent', () => {
  let component: FixtureTemplateComponent;
  let fixture: ComponentFixture<FixtureTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FixtureTemplateComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FixtureTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
