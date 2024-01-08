import { Component, Input, OnInit } from '@angular/core';
import { MoveService } from 'src/app/shared/services';
import {
   ITargetInfo,
} from '../../models';
import { AppConstantSpace } from 'src/app/shared/constants';

/** This component is supposed to be used only in the DndWrapperComponent */
@Component({
  selector: 'app-dnd-target-wrapper',
  templateUrl: './dnd-target-wrapper.component.html',
  styleUrls: ['./dnd-target-wrapper.component.scss']
})
export class DndTargetWrapperComponent implements OnInit {

  @Input() public targetInfo: ITargetInfo;

  constructor(
    private readonly move: MoveService,
  ) {}

  public ngOnInit() {
  }

  public onMouseUp(ev:MouseEvent) {
    this.move.dropTargets.push(this.targetInfo);
  }
  public onMouseOver(ev:MouseEvent) {
    const fixtureList = [
      AppConstantSpace.STANDARDSHELFOBJ,
      AppConstantSpace.PEGBOARDOBJ,
      AppConstantSpace.BLOCK_FIXTURE,
      AppConstantSpace.SLOTWALLOBJ,
      AppConstantSpace.CROSSBAROBJ,
      AppConstantSpace.COFFINCASEOBJ,
      AppConstantSpace.BASKETOBJ
    ];
    if(this.move.isDragging && fixtureList.includes(this.targetInfo?.targetData?.ObjectDerivedType as any)){
      this.move.hoverTargets =[];
      this.move.hoverTargets.push(this.targetInfo);
    }
  }
}
