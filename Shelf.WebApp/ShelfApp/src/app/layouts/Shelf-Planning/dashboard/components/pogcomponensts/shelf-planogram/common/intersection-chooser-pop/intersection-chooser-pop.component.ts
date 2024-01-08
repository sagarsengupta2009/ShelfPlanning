import { Component, OnInit, OnChanges, Input, SimpleChanges } from '@angular/core';
import { Section } from 'src/app/shared/classes';
import { AppConstantSpace } from 'src/app/shared/constants';
import { PanelService, IntersectionChooserHandlerService } from 'src/app/shared/services';

@Component({
  selector: 'sp-intersection-chooser-pop',
  templateUrl: './intersection-chooser-pop.component.html',
  styleUrls: ['./intersection-chooser-pop.component.scss']
})
export class IntersectionChooserPopComponent implements OnInit, OnChanges {

  public sectionID: string;
  public intersectingPosition: any = [];
  public Xoffset: number = 0;
  public Yoffset: number = 0;
  public Zoffset: number = 0;
  public panelID;

  @Input() datasource: Section;

  constructor(
    private readonly intersectionChooserHandlerService: IntersectionChooserHandlerService,
    private readonly panelService: PanelService) {
    this.intersectingPosition = [];
  }

  public ngOnInit(): void {
    this.sectionID = this.datasource.$id;
    this.panelID = this.panelService.activePanelID;

    //linking factory to this scope
    this.intersectionChooserHandlerService.rootFlags[this.sectionID].scope = this;
    this.intersectingPosition = this.intersectionChooserHandlerService.intersectingPosition;
  }

  public ngOnChanges(changes: SimpleChanges): void {
    this.sectionID = this.datasource.$id;
    this.panelID = this.panelService.activePanelID;
  }
  public hasIntersected = function () {
    return (this.intersectingPosition.length > 1)
  }
  public isYZSwapped(itemData) {
    return (itemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ || itemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ);
  }

  public getOffsetX(itemData, useChild: boolean = true) {
    let childOffset: number = useChild ? itemData.ChildOffset.X : 0;
    return itemData.Location ? itemData.Location.X + childOffset : 0;
  }

  public getOffsetY(itemData, useChild: boolean = true) {
    let childOffset: number;
    let pos: number;

    childOffset = useChild ? (this.isYZSwapped(itemData) ? itemData.ChildOffset.Z : itemData.ChildOffset.Y) : 0;
    pos = itemData.Location ? itemData.Location.Y + childOffset : 0;
    return pos;
  }
  public getOffsetZ(itemData, useChild: boolean = true) {
    let childOffset: number = useChild ? itemData.ChildOffset.Z : 0;
    return itemData.Location ? itemData.Location.Z + childOffset : 0;
  }

  public clickedOnIntersectWindow = function (e) {
    e.stopPropagation();
  }

  public clickedOnIntersectOverlay = function (e) {
    this.IntersectionChooserHandlerService.closePop(this.sectionID);
    e.stopPropagation();
  }
}
