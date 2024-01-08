import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrossbarComponent } from './crossbar.component';

describe('CrossbarComponent', () => {
  let component: CrossbarComponent;
  let fixture: ComponentFixture<CrossbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CrossbarComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CrossbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
