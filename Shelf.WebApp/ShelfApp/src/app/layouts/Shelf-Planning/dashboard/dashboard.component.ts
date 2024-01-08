import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AssortService, ParentApplicationService } from 'src/app/shared/services';

@Component({
    selector: 'sp-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
    public noSidePanel: boolean = false;
    private subscriptions: Subscription = new Subscription();

    constructor(
        private readonly assortService: AssortService,
        private readonly parentApp: ParentApplicationService,
    ) { }

    ngOnInit(): void {
        this.subscriptions.add(
            this.parentApp.onReady
                .pipe(filter(isReady => isReady))
                .subscribe(() => {
                    if(this.parentApp.isAssortApp){
                      this.assortService.initAssortListner();
                    }
                    if (this.parentApp.isWebViewApp
                        || this.parentApp.isAllocateApp
                        || this.parentApp.isAssortAppInIAssortNiciMode
                    ) {
                        this.noSidePanel = true;
                    }
                }));
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }
}
