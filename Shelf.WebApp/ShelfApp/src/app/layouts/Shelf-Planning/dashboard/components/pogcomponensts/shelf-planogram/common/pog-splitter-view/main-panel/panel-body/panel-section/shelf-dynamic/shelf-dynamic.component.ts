import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  Directive,
  Input,
  OnChanges,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import { Subscription } from 'rxjs';
import { SelectableList } from 'src/app/shared/services/common/shared/shared.service';
import { ShelfDynamicInjectorService } from 'src/app/shared/services';

@Directive({
  selector: '[dynamicAnchorDirective]'
})
export class DynamicAnchorDirective {
  constructor(public viewContainerRef: ViewContainerRef) { }
}

@Component({
  selector: 'shelf-shelf-dynamic',
  templateUrl: './shelf-dynamic.component.html',
  styleUrls: ['./shelf-dynamic.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShelfDynamicComponent implements OnChanges {
  @Input() panelID: string;
  @Input() component: Component;
  @Input() properties: { data: SelectableList };
  @ViewChild('templateShelfDynamicComponentContainer', {
    read: ViewContainerRef
  })
  public viewRef;
  @ViewChild(DynamicAnchorDirective, { static: true })
  adHost!: DynamicAnchorDirective;
  @Input() nestedItemKey: string;
  processStack: number = 0;
  subscriptions: Subscription = new Subscription();

  constructor(
    private readonly shelfInjector: ShelfDynamicInjectorService,
  ) { }

  public ngOnChanges(): void {
    this.loadComponent();
  }

  public loadComponent(): void {
    const viewContainerRef: ViewContainerRef = this.adHost.viewContainerRef;
    viewContainerRef.clear();
    const properties = { ...(this.properties || {}) };
    this.shelfInjector.render(viewContainerRef, this.component, properties, 'shelfDynamicComponentContainer');
  }

  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
