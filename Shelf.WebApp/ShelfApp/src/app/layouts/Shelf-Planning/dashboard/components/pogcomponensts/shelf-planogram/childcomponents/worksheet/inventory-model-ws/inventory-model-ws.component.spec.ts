import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryModelWsComponent } from './inventory-model-ws.component';

describe('InventoryModelWsComponent', () => {
  let component: InventoryModelWsComponent;
  let fixture: ComponentFixture<InventoryModelWsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InventoryModelWsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InventoryModelWsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
