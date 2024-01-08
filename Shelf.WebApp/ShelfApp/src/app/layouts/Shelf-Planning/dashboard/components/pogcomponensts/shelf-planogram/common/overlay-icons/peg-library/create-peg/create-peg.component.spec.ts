import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatePegComponent } from './create-peg.component';

describe('CreatePegComponent', () => {
  let component: CreatePegComponent;
  let fixture: ComponentFixture<CreatePegComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreatePegComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatePegComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
