import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowPogMoreInfoComponent } from './show-pog-more-info.component';

describe('ShowPogMoreInfoComponent', () => {
  let component: ShowPogMoreInfoComponent;
  let fixture: ComponentFixture<ShowPogMoreInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ShowPogMoreInfoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ShowPogMoreInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
