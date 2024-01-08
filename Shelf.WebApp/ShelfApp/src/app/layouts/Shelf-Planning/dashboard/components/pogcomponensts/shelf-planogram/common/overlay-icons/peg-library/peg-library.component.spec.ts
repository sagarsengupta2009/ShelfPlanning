import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PegLibraryComponent } from './peg-library.component';

describe('PegLibraryComponent', () => {
  let component: PegLibraryComponent;
  let fixture: ComponentFixture<PegLibraryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PegLibraryComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PegLibraryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
