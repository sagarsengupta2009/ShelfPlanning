import { Component, NgZone, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { LocalStorageService } from 'src/app/framework.module';
import { ReportDesignerComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/childcomponents';
import { CreatePlanogramComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/common';
import {
    AnalysisReportComponent,
    AppendSectionComponent,
    SyncPogComponent,
    PlanogramInfoComponent,
} from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/side-nav';
import { ShelfPowerBiReportsComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/side-nav/shelf-power-bi-reports/shelf-power-bi-reports.component';
import { CustomMenuClick } from '../../models/config/application-resources';
import { PogInfoPosition } from '../../models/planogram-library/planogram-details';
import { CorpDetail } from '../../models/sa-dashboard';
import {
    AssortService,
    ParentApplicationService,
    PlanogramStoreService,
    PogSideNavStateService,
    SharedService,
    SidebarService,
    SelectedScenarioService,
    PlanogramInfoService,
} from '../../services';

@Component({
    selector: 'srp-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class SidebarComponent implements OnInit, OnDestroy {
    public canShowSidePanel: boolean;

    public thumbnail: string;

    public nameOfScenario: string = '';
    public abbrScenarioName: string = '';

    public navHide: boolean = true;
    public isExpanded: boolean = false;
    public pogInfoPosition: PogInfoPosition = {
        top: '256px',
        left: '32px'
    };
    

    private subscriptions: Subscription = new Subscription();

    public get isOnCompatMode(): boolean {
        return !this.isExpanded;
    }

    constructor(
        private readonly router: Router,
        private readonly dialog: MatDialog,
        private readonly sidebarservice: SidebarService,
        private readonly sharedService: SharedService,
        private readonly parentApp: ParentApplicationService,
        private readonly pogSideNavStateService: PogSideNavStateService,
        private readonly assortService: AssortService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly zone: NgZone,
        private readonly selectedScenarioService: SelectedScenarioService,
        private readonly pogInfoService: PlanogramInfoService,
        private readonly localStorage: LocalStorageService
    ) {}

    public ngOnInit(): void {
        this.subscriptions.add(
            this.parentApp.onReady.pipe(filter((isReady) => isReady)).subscribe(() => {
                // when parentApp is ready, check conditions to show side panel
                this.canShowSidePanel =
                    !this.parentApp.isAllocateApp &&
                    !this.parentApp.isAssortAppInIAssortNiciMode &&
                    !this.parentApp.isWebViewApp;
            }),
        );

        this.subscriptions.add(
            this.sidebarservice.getCorpDetails().subscribe((corpDetail: CorpDetail) => {
                this.thumbnail = corpDetail.Logo;
            }),
        );

        this.registerEvents();
    }

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    public toggleNav(isExpanded: boolean): void {
        this.isExpanded = isExpanded;
    }

    public sideMenuClick(event: CustomMenuClick): void {
        const selectedMenu = event?.data;
        switch (selectedMenu?.key) {
            case 'SCENARIOS':
                if (this.parentApp.isAssortApp) {
                    window.parent.postMessage('invokePaceFunc:closeIShelfNavigateScenarios', '*');
                } else {
                    this.router.navigate([selectedMenu.template]);
                    this.sharedService.isNavigatedToPogLib.next(true);
                }
                break;
            case 'PLATFORM':
                const link: any = '/platform';
                if (!this.parentApp.isAssortApp) {
                    window.location = link;
                }
                break;
            case 'BACK_TO_ASSORTMENT':
                this.subscriptions.add(this.assortService.closeShelf().subscribe());
                break;
            case 'PLANOGRAMS':
                this.router.navigate(['sp/pogs'], {
                    queryParams: {
                        scenarioID: this.planogramStore.scenarioId,
                        projectID: this.planogramStore.projectId,
                    },
                });
                break;
            case 'UTILITIES_SYNCPOG':
                this.zone.runOutsideAngular(() => {
                    this.dialog.open(SyncPogComponent, {
                        height: '85vh',
                        width: '100%',
                    });
                });
                break;
            case 'UTILITIES_APPENDSECTION':
                this.dialog.open(AppendSectionComponent, {
                    height: '80vh',
                    width: '80vw',
                });
                break;
            case 'PLANOGRAM_TEMPLATE':
                this.dialog.open(CreatePlanogramComponent, {
                    panelClass: 'myapp-no-padding-dialog',
                    height: '85vh',
                    width: '100%',
                    data: { fromMenu: true },
                });
                break;
            case 'REPORT_TEMPLATES':
                this.dialog.open(ReportDesignerComponent, {
                    height: '75vh',
                    width: '100%',
                }); //removing navigation and opening as dialog pop up
                break;
            case 'ANALYSIS':
                this.dialog.open(AnalysisReportComponent, {
                    height: '85vw',
                    width: '96vw',
                    maxWidth: '96vw',
                    disableClose: true,
                    autoFocus: false
                });
                break;
            case 'PLANOGRAM_INFORMATION':
                if (!this.pogInfoService.isPogInfoOpened) {
                    this.pogInfoService.openPogInfoDialog();
                }
                break;
            case 'SHELF_POWERBI_REPORTS':
                this.dialog.open(ShelfPowerBiReportsComponent, {
                    height: '80vh',
                    width: '80vw',
                });
                break;
            default:
                break;
        }
        this.mouseoverDockToolbar(false);
    }

    public mouseoverDockToolbar(hover: boolean): void {
        if (this.sharedService.isShelfLoaded && !this.planogramStore.appSettings.dockToolbar) {
            this.sharedService.mouseoverDockToolbar(hover);
        }
    }

    private registerEvents(): void {
        this.subscriptions.add(
            this.selectedScenarioService.selectedScenarioNameChangeEvent.subscribe((scenarioName) => {
                this.updateScenarioName(scenarioName);
            }),
        );

        this.subscriptions.add(
            this.sharedService.toggleSideNav.subscribe((isOnCompatMode: boolean) => {
                this.isExpanded = !isOnCompatMode;
            }),
        );

        this.subscriptions.add(
            this.pogSideNavStateService.showSideNavigation.subscribe((showNav: boolean) => {
                this.navHide = !showNav;
            }),
        );
    }

    private updateScenarioName(scenarioName: string): void {
        this.nameOfScenario = scenarioName;
        this.abbrScenarioName = this.abbreviateScenarioName(scenarioName);
    }

    private abbreviateScenarioName(text: string): string {
        if (!text) return '';
        let strData = text
            .replace(/NICI|RESET|TEST|TESTING|ALLOCATE|AUTOMATION|DEFAULT|SCENARIO|PROJECT+/gi, '')
            .replace(/\s+/, '');
        const abbreviatedChars = [];
        strData.replace(/(^|\s+)[A-Za-z&#]/g, function (t) {
            abbreviatedChars[abbreviatedChars.length] = t.replace(/\s+/g, '');
            return t;
        });
        if (abbreviatedChars.length > 1) {
            return abbreviatedChars.slice(0, 3).join('').toUpperCase();
        } else if (strData.match(/[a-z]/i)) {
            strData =
                strData.match(/[a-zA-Z#&]+/g).join(' ').length > 2
                    ? strData.match(/[a-zA-Z&#]+/g).join(' ')
                    : text.match(/[a-zA-Z&#]+/g).join(' ');
            if (strData.length > 3) {
                return strData.substring(0, 3).toUpperCase();
            } else {
                return text.substring(0, text.length > 2 ? 3 : text.length).toUpperCase();
            }
        } else {
            return text.substring(0, text.length > 2 ? 3 : text.length).toUpperCase();
        }
    }
}
