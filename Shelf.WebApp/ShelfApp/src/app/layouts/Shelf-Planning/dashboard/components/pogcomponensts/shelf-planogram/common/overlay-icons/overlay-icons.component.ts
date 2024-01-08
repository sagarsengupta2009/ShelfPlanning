import { Component, NgZone, Output, EventEmitter, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

import { FabButton, Planograms, PogSideNaveView } from 'src/app/shared/models';
import {
    LocalSearchService,
    NotifyService,
    SharedService,
    PlanogramLibraryService,
    PanelService,
    PlanogramLibraryApiService,
    PlanogramStoreService,
    PogSideNavStateService,
    ParentApplicationService,
    AllocateEventService,
    PaBroadcasterService,
    PegLibraryService,
} from 'src/app/shared/services/';

import { ConsoleLogService } from 'src/app/framework.module';


import { CreatePlanogramComponent } from './create-planogram/create-planogram.component';
import { FixtureGalleryComponent } from './fixture-gallery/fixture-gallery.component';
import { ProductLibraryComponent } from './product-library/product-library.component';
import { PegLibraryComponent } from './peg-library/peg-library.component';

declare const window: any;

@Component({
    selector: 'shelf-overlay-icons',
    templateUrl: './overlay-icons.component.html',
    styleUrls: ['./overlay-icons.component.scss'],
})
export class OverlayIconsComponent implements OnInit {
    @Output() addPlanogram: EventEmitter<Planograms[]> = new EventEmitter<Planograms[]>();
    @Output() updateState: EventEmitter<boolean> = new EventEmitter<boolean>();
    private subscriptions: Subscription = new Subscription();
    public speedDialFabButtons: FabButton[] = [];
    public link: string;
    public mode: string;


    constructor(
        private readonly sharedService: SharedService,
        private readonly translate: TranslateService,
        private readonly dialog: MatDialog,
        private readonly zone: NgZone,
        private readonly panelService: PanelService,
        private readonly localSearch: LocalSearchService,
        private readonly planogramLibService: PlanogramLibraryService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly notifyService: NotifyService,
        private readonly log: ConsoleLogService,
        private readonly planogramLibApiService: PlanogramLibraryApiService,
        private readonly PogSideNavStateService: PogSideNavStateService,
        private readonly parentApp: ParentApplicationService,
        private readonly allocateEvent: AllocateEventService,
        private readonly allocateBroadcast: PaBroadcasterService,
        private readonly pegLibraryService: PegLibraryService
    ) 
    {
    }

    ngOnInit(): void {
        this.speedDialFabButtons = [
            {
                icon: 'description',
                tooltip: this.translate.instant('FLOATING_BUTTON_PRODUCTS'),
                btncolor: '#4caf50',
                displayIcon: true,
            },
            {
                icon: 'dns',
                tooltip: this.translate.instant('FLOATING_BUTTON_FIXTURES'),
                btncolor: '#fdd835',
                displayIcon: true,
            },
            {
                icon: 'pegicon',
                tooltip: this.translate.instant('PEG_LIBRARY'),
                btncolor: '#e63ea4',
                displayIcon: true,
            },
            {
                icon: 'add_to_photos',
                tooltip: this.translate.instant('CREATE_NEW_PLANOGRAM'),
                btncolor: '#2196f3',
                displayIcon: true,
            },
        ];
        this.subscriptions.add(
            this.planogramLibService.FixtureGallery.subscribe(() => {
                window.parent.expandFrame(true);
                this.openFixtureDialog();
            }),
        );

        this.subscriptions.add(
            this.localSearch.openProductLib.subscribe((val) => {
                if (val) {
                    this.openProductDialog(true);
                }
            }),
        );
        this.subscriptions.add(this.allocateEvent.openProductLibrary.subscribe((res)=>{
          this.openProductDialog();
        }));

        this.link = this.sharedService.link;
        this.mode = this.sharedService.mode;
    }
    public iconClickEvent(icon: string): void {
        switch (icon) {
            case 'add_to_photos':
                this.createPlanogram();
                break;
            case 'description':
                this.openProductDialog();
                break;
            case 'dns':
                this.openFixtureDialog();
                break;
            case 'pegicon':
                this.openPegLibraryDialog();
                break;
            case 'open_in_new':
                if (this.parentApp.isWebViewApp || this.parentApp.isShelfInAutoMode) {
                    this.notifyService.warn('In this mode you cannot view library');
                } else {
                    this.updateState.emit(true);
                }
                break;
            default:
                break;
        }
    };
    private createPlanogram(): void {
        this.zone.runOutsideAngular(() => {
            const dialogRef = this.dialog.open(CreatePlanogramComponent, {
                height: '85vh',
                width: '100%',
                data: { fromMenu: false },
                panelClass: 'mat-dialog-move-cursor',
            });
            dialogRef.afterClosed().subscribe((resultSection) => {
                if (resultSection && resultSection.Data) {
                    resultSection.Data.Permissions = resultSection.Permissions;
                    this.panelService.donwloadPogData = resultSection;
                    this.planogramLibApiService
                        .getPlanogramsInfo(resultSection.Data.IDPOG)
                        .subscribe((resultPog) => {
                            this.addPlanogram.emit(resultPog.Data);
                            const list = this.planogramStore.downloadedPogs;
                            if (!list.some((x) => x.IDPOG === resultSection.Data.IDPOG)) {
                                this.planogramStore.downloadedPogs.push({
                                    IDPOG: resultSection.Data.IDPOG,
                                    sectionObject: resultSection,
                                    isCreated: true,
                                });
                            }
                            this.planogramStore.activeSelectedPog = this.planogramStore.mappers.find((x) => x.IDPOG === resultSection.Data.IDPOG)
                        });
                }
            });
        });
    };

    private openProductDialog(newProd: boolean = false): void {
        let flag = false;
        let activeKey;
        if (this.sharedService.isWorkSpaceActive) {
            if (this.PogSideNavStateService.productLibView.isPinned) {
                flag = true;
                activeKey = PogSideNaveView.PRODUCT_LIBRARY;
            }
        }
        if (flag && activeKey == PogSideNaveView.PRODUCT_LIBRARY) {
            this.sharedService.openSelectedComponentInSideNav.next({ activeScreen: 'PL', isPin: true });
        } else {
            this.allocateBroadcast.resizeParentWindow(true);
            const dialogRef = this.dialog.open(ProductLibraryComponent, {
                height: '85vh',
                width: '100%',
                panelClass: 'mat-dialog-move-cursor',
                data: { newProduct : newProd },
            });
            dialogRef.afterClosed().subscribe((result) => {
                this.allocateBroadcast.resizeParentWindow(false);
                this.localSearch.cloneProduct.next(result);
            });
        }
    };

    private openFixtureDialog(): void {
        const dialogRef = this.dialog.open(FixtureGalleryComponent, {
            height: '85vh',
            width: '100%',
        });
        dialogRef.afterClosed().subscribe((result) => {
            this.log.info(`Dialog result: ${result}`);
        });
        dialogRef.beforeClosed().subscribe((result) => {
            if (this.sharedService.link == 'allocate') {
                window.parent.expandFrame(false);
            }
        });
    }

    private openPegLibraryDialog(): void {
        this.pegLibraryService.pegLibraryDialogRef = this.dialog.open(PegLibraryComponent, { // have to change the component
            height: '85vh',
            width: '100%',
            maxWidth: '95vw',
            disableClose: true
        });
        this.pegLibraryService.pegLibraryDialogRef.afterClosed().subscribe((result) => {
            this.log.info(`Dialog result: ${result}`);
        });
        this.pegLibraryService.pegLibraryDialogRef.beforeClosed().subscribe((result) => {
            if (this.sharedService.link == 'allocate') {
                window.parent.expandFrame(false);
            }
        });
    }

    public ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }
}
