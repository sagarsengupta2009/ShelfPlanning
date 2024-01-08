import { ComponentFixture, TestBed, fakeAsync, waitForAsync } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { UserService } from '../../services/common/user/user.service';
import { ThemeService } from '../../services/common/theme/theme.service';
import { SharedService } from '../../services/common/shared/shared.service';
import { PipeTransform, Pipe } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { HttpClient } from '@angular/common/http';
import { LocalStorageKeys } from '../../constants';

@Pipe({ name: 'translate' })
export class TranslatePipe implements PipeTransform {
  transform = (args: string): string => 'hi';
}

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  let isDarkThemeSpy: jasmine.Spy;

  const isDarkThemeSpyresposne = false;

  const MockThemeService = jasmine.createSpyObj('ThemeService', ['getCurrentThemeName', 'setTheme', 'setQuickMenuAcess']);
  const MockSharedService = jasmine.createSpyObj('SharedService', ['changeSideNav', 'changeSplitterOrientation']);
  const MockDBService = jasmine.createSpyObj('NgxIndexedDBService', ['getAll', 'add', 'update']);
  const MockUserService = jasmine.createSpyObj('UserService', ['GetUserInfo']);

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      providers: [HttpClient,
        { provide: ThemeService, useValue: MockThemeService },
        { provide: SharedService, useValue: MockSharedService },
        { provide: UserService, useValue: MockUserService },
        { provide: MatDialog, useValue: {} },
        { provide: Router, useValue: {} }
      ],
      declarations: [HeaderComponent, TranslatePipe],
      imports: [MatMenuModule]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('all object should contain expected records after Angular calls ngOnInit', fakeAsync(() => {
    component.ngOnInit();
    expect(component.ngOnInit).toBeTruthy();
  }));
  it('should able to open navigation menu', () => {
    component.openNav();
  });

  it('should be able to open Planogram settings', () => {
    expect(component.openPlanogramSettings).toBeTruthy();
  });

  it('should be able to set user preference', () => {
    let currentTheme: jasmine.Spy;
    expect(currentTheme).toEqual(MockThemeService.getCurrentThemeName());
    if (!MockSharedService.getSplitterView()) {
      expect(localStorage.setItem(LocalStorageKeys.SPLITTER_VIEW, '1'));
    }
    expect(MockSharedService.getSplitterView()).toEqual('1');
  });

  it('should be able to set splitter orientation', () => {
    expect(component.setview(0)).toBeTruthy();
    expect(component.view).toEqual(0);
    if (0) {
      expect(MockSharedService.changeSplitterOrientation(0, true)).toHaveBeenCalled();
    }
    else {
      expect(MockSharedService.changeSplitterOrientation(1)).toHaveBeenCalled();
    }
  });
});
