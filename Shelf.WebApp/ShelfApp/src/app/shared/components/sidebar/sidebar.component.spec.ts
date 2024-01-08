import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { SidebarComponent } from './sidebar.component';
import { asyncData } from 'src/test';
import { SidebarService } from '../../services/common/sidebar/sidebar.service';
import { SharedService } from '../../services/common/shared/shared.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateService } from '@ngx-translate/core';
import { SidebarMockData } from 'src/assets/dummyApis/TestingConstants/Sidebar.const';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { of, Observable, BehaviorSubject } from 'rxjs';
import { PipeTransform, Pipe } from '@angular/core';
import { SelectedScenarioService } from '../../services';

@Pipe({ name: 'translate' })
export class TranslatePipe implements PipeTransform {
  transform = (args: string): string => 'hi';
}

const getNavMenuEvent = SidebarMockData.selectedScenarioForGetNavMock;
const getAppMenuEvent = SidebarMockData.GetappMenuResponseMock;
const getCorpDetailsEvent = SidebarMockData.GetCorpDetailsResponseMock;
const getAppMenu = SidebarMockData.appMenuMock;

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let GetappMenuSpy: jasmine.Spy;
  let GetCorpDetailsSpy: jasmine.Spy;
  let GetRowChangeEvent: jasmine.Spy;
  let GetToggleNav: jasmine.Spy;
  // const toggleNav: any = false;
  // const rowChangeEvent: any = {};
  const MockSharedService = jasmine.createSpyObj('SharedService', ['rowChangeInvoked', 'changeSideNav']);
  const MockSidebarService = jasmine.createSpyObj('SidebarService', ['appMenu', 'getCorpDetails']);

  const scenarioNameChangeEventMock = new BehaviorSubject<string>(undefined);
  const MockSelectedScenarioService = {
    selectedDate: scenarioNameChangeEventMock.asObservable(),
  };

  beforeEach(waitForAsync(() => {
    GetappMenuSpy = MockSidebarService.appMenu.and.returnValue(
      getAppMenuEvent
    );
    GetCorpDetailsSpy = MockSidebarService.getCorpDetails.and.returnValue(
      getCorpDetailsEvent
    );

    // GetRowChangeEvent = MockSharedService.rowChangeInvoked.and.returnValue(rowChangeEvent);
    // GetToggleNav = MockSharedService.changeSideNav.and.returnValue(toggleNav);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        HttpClient,
        { provide: SidebarService, useValue: MockSidebarService },
        { provide: SharedService, useValue: MockSharedService },
        { provide: TranslateService },
        { provide: SelectedScenarioService, useValue: MockSelectedScenarioService },
      ],
      declarations: [SidebarComponent, TranslatePipe]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // it('sidebar service methods to be called', () => {
  //  spyOn(MockSidebarService, 'getCorpDetails').and.returnValue({ subscribe: () => { } })
  //  expect(MockSidebarService.getCorpDetails).toHaveBeenCalled();
  // })

  it('all object should contain expected records after Angular calls ngOnInit', fakeAsync(() => {
    component.ngOnInit();
    expect(component.ngOnInit).toBeTruthy();
  }));

  it('should set the sidebar menu', () => {
    //component.SetSideBarMenu();
    // expect(localStorage.getItem('navMenus')).toEqual(null);
    // expect(component.menuToDisplay).toEqual(getAppMenuEvent);
    // expect(localStorage.getItem(`navMenus`)).toEqual(component.menuToDisplay);
  });

  it('should able to close navigation menu', () => {
    component.toggleNav(false);
  });

  it('should return all navigation menu', () => {
    const newScenarioName = 'test scenario name';
    scenarioNameChangeEventMock.next(newScenarioName);

    let ProjectTypeSpy: jasmine.Spy;
    let ScenarioStatusSpy: jasmine.Spy;
    let AssignmentTypeSpy: jasmine.Spy;
    expect(component.nameOfScenario).toEqual(newScenarioName);
    expect(component.nameOfScenario).toEqual(getNavMenuEvent.ScenarioName);
    expect(ProjectTypeSpy).toEqual(getNavMenuEvent.ProjectType.toUpperCase());
    expect(ScenarioStatusSpy).toEqual(getNavMenuEvent.Status);
    expect(AssignmentTypeSpy).toEqual(getNavMenuEvent.AssignmentType);
    // }
    // }
    // expect(component.appMenu).toEqual(getAppMenu);
    expect(component.abbrScenarioName).toEqual('GFB');
  });
});
