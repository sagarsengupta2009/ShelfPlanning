import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupTemplateComponent } from './group-template.component';

describe('GroupTemplateComponent', () => {
  let component: GroupTemplateComponent;
  let fixture: ComponentFixture<GroupTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GroupTemplateComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
