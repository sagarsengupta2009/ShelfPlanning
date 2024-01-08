import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectedStoreComponent } from './selected-store.component';

describe('SelectedStoreComponent', () => {
  let component: SelectedStoreComponent;
  let fixture: ComponentFixture<SelectedStoreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelectedStoreComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectedStoreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
