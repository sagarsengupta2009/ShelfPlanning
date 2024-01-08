import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { InterceptorService } from '../../interceptor/interceptor.service';
import { SpinnerService } from '../../services/common';
import { ConfigService, ParentApplicationService, SharedService } from './../../services';

@Component({
    selector: 'srp-spinner',
    templateUrl: './spinner.component.html',
    styleUrls: ['./spinner.component.scss']
})
export class SpinnerComponent implements OnInit {
    private subscriptions = new Subscription();
    public spinnerImagePath: string = '';
    public spinnerMessage: string = '';

    constructor(
        private readonly config: ConfigService,
        private readonly sharedService: SharedService,
        private readonly parentApp: ParentApplicationService,
        public readonly interceptor: InterceptorService,
        public readonly spinner: SpinnerService,
    ) {
    }

    public ngOnInit(): void {
        
        const deploymentPath: string = this.config.deploymentPath;
        this.spinnerImagePath = `${deploymentPath}/assets/images/spinner_newlogo.gif`;

        this.subscriptions.add(
            this.sharedService.spinnerText.subscribe((newText) => {
                this.spinnerMessage = newText;
            }),
        );
        /** Hide Loader for PA */
        this.subscriptions.add(
          this.parentApp.onReady
          .pipe(filter(isReady => isReady))
          .subscribe(() => {
              if (this.parentApp.isAllocateApp) {
                  this.spinner.hide();
              }
          })
        )
    }
}
