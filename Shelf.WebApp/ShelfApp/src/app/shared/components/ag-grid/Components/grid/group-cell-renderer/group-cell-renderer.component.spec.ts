import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupCellRendererComponent } from './group-cell-renderer.component';

describe('GroupCellRendererComponent', () => {
  let component: GroupCellRendererComponent;
  let fixture: ComponentFixture<GroupCellRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GroupCellRendererComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupCellRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
