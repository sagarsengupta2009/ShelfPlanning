import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IntersectionChooserPopComponent } from './intersection-chooser-pop.component';



describe('IntersectionChooserPopComponent', () => {
  let component: IntersectionChooserPopComponent;
  let fixture: ComponentFixture<IntersectionChooserPopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IntersectionChooserPopComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(IntersectionChooserPopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
