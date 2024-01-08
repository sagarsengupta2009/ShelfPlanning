import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryWorksheetComponent } from './inventory-worksheet.component';

describe('InventoryWorksheetComponent', () => {
  let component: InventoryWorksheetComponent;
  let fixture: ComponentFixture<InventoryWorksheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InventoryWorksheetComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InventoryWorksheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
