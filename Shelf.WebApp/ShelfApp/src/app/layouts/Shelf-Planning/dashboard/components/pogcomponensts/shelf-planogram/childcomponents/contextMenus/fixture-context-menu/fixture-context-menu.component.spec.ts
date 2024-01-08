import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FixtureContextMenuComponent } from './fixture-context-menu.component';

describe('FixtureContextMenuComponent', () => {
  let component: FixtureContextMenuComponent;
  let fixture: ComponentFixture<FixtureContextMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FixtureContextMenuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FixtureContextMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
