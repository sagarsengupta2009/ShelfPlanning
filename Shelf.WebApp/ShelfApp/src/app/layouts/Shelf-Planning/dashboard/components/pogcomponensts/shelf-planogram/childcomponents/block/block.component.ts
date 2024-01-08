import { ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { Block} from 'src/app/shared/classes';
import { PlanogramService } from 'src/app/shared/services/common/planogram/planogram.service';
import { BlockHelperService } from 'src/app/shared/services/layouts/allocate/block-helper.service';
import { BlockSvgRenderService } from 'src/app/shared/services/svg-render/block-svg-render.service';

@Component({
  selector: 'app-block',
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.scss']
})

export class BlockComponent implements OnInit, OnDestroy {
  @ViewChild('PAblockContainer') PAblockContainer: ElementRef;
  @Input() data: Block;
  public blockElement: SafeHtml;

  private _subscriptions: Subscription = new Subscription();
  
  constructor(private planogramService: PlanogramService,
    private readonly blockHelperService: BlockHelperService,
    private readonly domSanitizer: DomSanitizer,
    private readonly changeDetection: ChangeDetectorRef,
    private readonly blockSvgRender: BlockSvgRenderService
  ) { }

  ngOnInit(): void {
    this.blockElement = this.domSanitizer.bypassSecurityTrustHtml(this.blockSvgRender.renderBlockElement(this.data, this.planogramService.convertToScale(this.data.$sectionID)));

    //TODO @karthik not sure why on selection its not detecting automatically.
    this._subscriptions.add(this.planogramService.updateNestedStyle.subscribe((res) => {
        this.changeDetection.detectChanges();
    }));

    this._subscriptions.add(this.blockHelperService.blocksUpdated.subscribe((res) => {
      if (res) {
        this.blockElement = this.domSanitizer.bypassSecurityTrustHtml(this.blockSvgRender.renderBlockElement(this.data, this.planogramService.convertToScale(this.data.$sectionID)));
      }
    }))
  }

  ngOnDestroy(): void {
    this._subscriptions.unsubscribe();
  }

  public svg(itemData: Block): string {
    return this.blockSvgRender.renderBlockSvg(itemData);
  }
}
