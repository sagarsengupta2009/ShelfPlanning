import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectedStoresComponent } from './selected-stores.component';

describe('SelectedStoresComponent', () => {
  let component: SelectedStoresComponent;
  let fixture: ComponentFixture<SelectedStoresComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelectedStoresComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectedStoresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
