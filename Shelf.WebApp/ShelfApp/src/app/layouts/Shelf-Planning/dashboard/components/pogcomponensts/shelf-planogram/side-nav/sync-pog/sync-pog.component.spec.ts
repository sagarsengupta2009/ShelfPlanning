import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SyncPogComponent } from './sync-pog.component';

describe('SyncPogComponent', () => {
  let component: SyncPogComponent;
  let fixture: ComponentFixture<SyncPogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SyncPogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SyncPogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
