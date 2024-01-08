import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { PlanogramService, SharedService } from '../common';

@Injectable({
    providedIn: 'root'
})
export class Render2dService {


    public isDirty = false;
    public mustCheck: Event;
    /** subscribe to listen to the requestFrame event without triggering ngZone */
    public onUpdate = new Subject<number>();
    public onKeyDown = new Subject<KeyboardEvent>();
    public isCartDirty: boolean = false;

    constructor(
        private readonly shared: SharedService,
        private readonly ngZone: NgZone,
        private readonly planogramService: PlanogramService,
    ) {
        this.requestAnimationFrame();
    }

    public setDirty(obj: any) {
        this.isDirty = true;
    }

    private requestAnimationFrame() {
        //Running functions via runOutsideAngular allows you to escape Angular's zone and do work that doesn't trigger Angular change-detection or is subject to Angular's error handling
        this.ngZone.runOutsideAngular(() => window.requestAnimationFrame(dt => this.update(dt)));
    }

    private update(dt: number) {

        for (const event of (window as any).keydown) {
            this.onKeyDown.next(event);
        }
        (window as any).keydown = [];

        this.onUpdate.next(dt);

        if (this.isCartDirty) {
           //Use run to reenter the Angular zone and do work that updates the application model.(typically started via runOutsideAngular)
           this.ngZone.run(() => { this.shared.changeInCartItems.next(true); });
            this.isCartDirty = false;
        }

        if (this.isDirty) {
            const t0 = performance.now();
            this.shared.updateValueInPlanogram.next({ products: [], updateInInactiveSection: this.planogramService.updateInInactivePOG });
            this.isDirty = false;
            this.planogramService.updateInInactivePOG = {flag: false, sectionID: null};
            const t1 = performance.now();
            //console.log(`update took ${t1 - t0} milliseconds.`);
        }

        if (this.planogramService.updateNestedStyleDirty) {
            this.planogramService.updateNestedStyle.next(true);
            this.planogramService.updateNestedStyleDirty = false;
        }

        if (this.mustCheck) {
            window.dispatchEvent(this.mustCheck);
            this.mustCheck = null;
        }

        this.requestAnimationFrame();
    }

}
