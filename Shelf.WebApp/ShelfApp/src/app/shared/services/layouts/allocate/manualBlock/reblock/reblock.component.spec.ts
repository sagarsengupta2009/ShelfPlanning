import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReblockComponent } from './reblock.component';

describe('ReblockComponent', () => {
  let component: ReblockComponent;
  let fixture: ComponentFixture<ReblockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReblockComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReblockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
