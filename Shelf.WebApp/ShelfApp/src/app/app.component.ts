import { Component, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { ConsoleLogService } from 'src/app/framework.module';
import { LanguageService } from './shared/services';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {

    private subscriptions = new Subscription();

    constructor(
        private readonly languageService: LanguageService,
        private readonly swUpdate: SwUpdate,
        private readonly log: ConsoleLogService,
        private el: ElementRef,
    ) {
        this.checkApplicationVersion();
        const element = this.el.nativeElement;
        const rightClick = fromEvent<PointerEvent>(element, 'contextmenu');
        this.subscriptions.add(
            rightClick.subscribe((event) => {
                event.preventDefault();
            }),
        );
    }

    public ngOnInit(): void {
        this.subscriptions.add(
            this.languageService.init().subscribe((language) => {
                this.log.info(`Current Translation Language: ${language}`);
            }));
    }

    public ngOnDestroy(): void {
        return this.subscriptions?.unsubscribe();
    }

    private checkApplicationVersion(): void {
        if (!this.swUpdate.isEnabled) {
            return;
        }

        this.subscriptions.add(
            this.swUpdate.versionUpdates
                .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
                .subscribe(() => {
                    if (confirm('New version available. Load New Version?')) {
                        window.location.reload();
                    }
                }),
        );
    }
}
