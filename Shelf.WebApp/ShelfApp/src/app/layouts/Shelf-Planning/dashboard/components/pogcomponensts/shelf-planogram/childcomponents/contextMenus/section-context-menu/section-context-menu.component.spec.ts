import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectionContextMenuComponent } from './section-context-menu.component';

describe('SectionContextMenuComponent', () => {
  let component: SectionContextMenuComponent;
  let fixture: ComponentFixture<SectionContextMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SectionContextMenuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SectionContextMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
