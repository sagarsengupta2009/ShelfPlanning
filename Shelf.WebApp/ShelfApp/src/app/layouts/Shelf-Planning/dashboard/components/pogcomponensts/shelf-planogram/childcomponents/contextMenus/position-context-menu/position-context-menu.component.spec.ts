import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PositionContextMenuComponent } from './position-context-menu.component';

describe('PositionContextMenuComponent', () => {
  let component: PositionContextMenuComponent;
  let fixture: ComponentFixture<PositionContextMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PositionContextMenuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PositionContextMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
