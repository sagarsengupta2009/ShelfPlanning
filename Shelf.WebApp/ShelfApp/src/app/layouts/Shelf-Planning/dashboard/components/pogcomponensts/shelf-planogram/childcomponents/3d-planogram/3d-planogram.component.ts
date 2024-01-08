import { Component, OnInit, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core'
import { isEmpty } from 'lodash';
import { SharedService } from 'src/app/shared/services';

@Component({
  selector: 'sp-3d-planogram',
  templateUrl: './3d-planogram.component.html',
  styleUrls: ['./3d-planogram.component.scss']
})

export class ThreedPlanogramComponent implements OnInit, OnChanges {
  @Input() dataSource: any;
  @Input() panalID: any
  sectionID: any;
  private componentNumber: number = 4;

  constructor(
    private readonly sharedService: SharedService,
    private readonly cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    if (this.dataSource != null || this.dataSource != undefined) {
      this.sectionID = this.dataSource.$id;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isEmpty(this.dataSource)) {
      this.sectionID = this.dataSource.$id;
      this.cd.markForCheck();
    }
  }

  activate() {
    this.setActiveComponent();
  }

  getStyleForActive() {
    if (this.sharedService.getActiveSectionId() == this.sectionID && this.sharedService.getActiveComponentNumber() == this.componentNumber) {
      return true;
    }
    return false;
  };

  toggleAnnotations() {
    //if ($scope.ChangeAnnotationMode != undefined) {
    //  $scope.ChangeAnnotationMode();
    //}
  };

  toggleDisplayMode() {
    //if ($scope.ChangeDisplayMode != undefined) {
    //  $scope.ChangeDisplayMode();
    //}
  };

  fitToWindowPanZoom() {
    //if ($scope.ResetPOV != undefined) {
    //  $scope.ResetPOV();
    //}
  };

  fitToHeightPanZoom() {
    //if ($scope.heightPOV != undefined) {
    //  $scope.heightPOV();
    //}
  };

  upPanZoom() {
    //if ($scope.panUp != undefined) {
    //  $scope.panUp();
    //}
  };

  leftPanZoom() {
    //if ($scope.panLeft != undefined) {
    //  $scope.panLeft();
    //}
  };

  rightPanZoom() {
    //if ($scope.panRight != undefined) {
    //  $scope.panRight();
    //}
  };

  downPanZoom() {
    //if ($scope.panDown != undefined) {
    //  $scope.panDown();
    //}
  };

  ZoomIn() {
    //if ($scope.zoomIn != undefined) {
    //  $scope.zoomIn();
    //}
  };

  ZoomOut() {
    //if ($scope.zoomOut != undefined) {
    //  $scope.zoomOut();
    //}
  };

  setActiveComponent() {
    //this.planogramService.setSelectedIDPOGPanelID($scope.panelid);
    this.sharedService.setActiveSectionId(this.sectionID);
    this.sharedService.setActiveComponentNumber(this.componentNumber);
    if (this.sharedService.link == 'iAssort') {
      window.focus();
    }
  }

}
