import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FixtureGalleryComponent } from './fixture-gallery.component';

describe('FixtureGalleryComponent', () => {
  let component: FixtureGalleryComponent;
  let fixture: ComponentFixture<FixtureGalleryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FixtureGalleryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FixtureGalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
