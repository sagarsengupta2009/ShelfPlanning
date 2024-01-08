import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Section } from 'src/app/shared/classes';
import { UprightType } from 'src/app/shared/models';
import {
    SharedService, HistoryService, PlanogramHelperService,
    PlanogramStoreService, NotifyService,
    UprightService,
} from 'src/app/shared/services';

@Component({
    selector: 'sp-upright-editor',
    templateUrl: './upright-editor.component.html',
    styleUrls: ['./upright-editor.component.scss'],
})
export class UprightEditorComponent implements OnInit {

    public uprightsPositionsArr: number[] = [];
    public fixedUpright: number;
    public newVal: number;
    public selectedRow: number;

    public type: UprightType = UprightType.None;

    /** enum type to use in *.html */
    public uprightType: typeof UprightType = UprightType;

    public isReadOnlyUpright: boolean;
    public isReadonly: boolean;

    constructor(
        private readonly planogramStore: PlanogramStoreService,
        private readonly sharedService: SharedService,
        private readonly planogramHelperService: PlanogramHelperService,
        public readonly translate: TranslateService,
        private readonly dialog: MatDialogRef<UprightEditorComponent>,
        @Inject(MAT_DIALOG_DATA) private readonly data: Section,
        private readonly historyService: HistoryService,
        private readonly notifyService: NotifyService,
        private readonly uprightService: UprightService,
    ) { }

    public ngOnInit(): void {
        this.isReadOnlyUpright = this.planogramStore.appSettings.isReadOnly;
        this.populateDataToDialog(this.data);
        this.isReadonly = this.planogramHelperService.isPOGLive(this.data.$sectionID, false);
    }

    private populateDataToDialog(data: Section): void {
        this.type = this.data.uprightType;
        switch (this.data.uprightType) {
            case UprightType.Fixed:
                this.fixedUpright = +data.Upright;
                break;
            case UprightType.Variable:
                this.uprightsPositionsArr = data.uprightIntervals;
                break;
        }
    }
    public updateModel(): void {
        const oldVal = this.data.Upright;
        let newVal = '';
        switch (this.type) {
            case UprightType.None: break; // default value holds good
            case UprightType.Fixed:
                const valResult = this.uprightService.validateNewUprightsValue(this.fixedUpright, this.data);
                if (valResult.flag) { // valid
                    newVal = Number(this.fixedUpright).toFixed(2);
                } 
                break;
            case UprightType.Variable:
                const validationResult = this.uprightService.validateVariableUprights(this.uprightsPositionsArr, this.data);
                this.uprightsPositionsArr = validationResult.validatedUprights;
                if (validationResult.flag) { // valid
                    // if valid, then update the Section property
                    newVal = validationResult.validatedUprights.join(',')
                } else {
                    this.notifyService.error(validationResult.errMsg);
                    return;
                }
                break;
        }

        this.uprightService.updateUpright(this.data, newVal);
        this.uprightService.uprightObj = {
            uprightType: this.type,
            uprightValues: newVal.split(',').map(num => Number(num))
        };
        if (oldVal != newVal) {
            this.addUndoRedoRecord(oldVal, newVal);
            this.sharedService.uprightEvent.next(true);
        }
        this.resetAndCloseDialog();
    }

    private resetAndCloseDialog() {
        this.uprightsPositionsArr = [];
        this.fixedUpright = null;
        this.newVal = null;
        this.selectedRow = null;
        this.type = UprightType.None;
        this.dialog.close();
    }

    private addUndoRedoRecord(oldVal: string, newVal: string): void {
        this.historyService.startRecording();
        const obj_$id = this.data.$id;
        const fieldHierarchyStr = 'Upright';
        const original = ((sectionId, fieldHierarchyStr, value) => {
          return () => {
            this.sharedService.setObjectField(sectionId, fieldHierarchyStr, value, sectionId);
            let secObj = this.sharedService.getObject(sectionId, sectionId) as Section;
            this.uprightService.updateUpright(secObj, value);
            this.sharedService.uprightEvent.next(true);
          };
        })(obj_$id, fieldHierarchyStr, newVal);
        const revert = ((sectionId, fieldHierarchyStr, value) => {
          return () => {
            this.sharedService.setObjectField(sectionId, fieldHierarchyStr, value, sectionId);
            let secObj = this.sharedService.getObject(sectionId, sectionId) as Section;
            this.uprightService.updateUpright(secObj, value);
            this.sharedService.uprightEvent.next(true);
          };
        })(obj_$id, fieldHierarchyStr, oldVal);
        this.historyService.captureActionExec({
          funoriginal: original,
          funRevert: revert,
          funName: 'UpRightChange',
        });
        this.historyService.stopRecording();
    }

    public variableAdd(): void {
        const newValue = parseFloat(Number(this.newVal).toFixed(2));

        if (newValue && !this.uprightsPositionsArr.includes(newValue)) {
            const uprights: number[] = [...this.uprightsPositionsArr, newValue];
            this.uprightsPositionsArr = this.uprightService.clean(uprights);
            this.newVal = null;
        }
    }

    public variableRemove(): void {
        if (this.selectedRow >= 0) {
            const index = this.uprightsPositionsArr.indexOf(this.selectedRow);
            if (index != -1) {
                this.uprightsPositionsArr.splice(index, 1);
                this.selectedRow = null;
                this.newVal = null;
            }
        }
    }

    public variableRemoveAll(): void {
        this.uprightsPositionsArr = [];
        this.selectedRow = null;
        this.newVal = null;
    }

    public selectIt(index: number): void {
        this.selectedRow = this.uprightsPositionsArr[index];
        this.newVal = null;
    }

    public validateOnblur(value: number): void {
        const result = this.uprightService.validateNewUprightsValue(value, this.data);
        if (!result.flag) {
            this.notifyService.error(result.errMsg);
            this.fixedUpright = null;
            this.newVal = null;
        }
    }

    public getUprightsPositions(): void {
        if (this.uprightsPositionsArr.length) { return; }
        this.uprightsPositionsArr = this.data.getAllAvailableXAxisIntervals(true);
        if (this.data.uprightType === UprightType.Fixed) {
            const fixedIntervals = this.uprightService.calculateFixedUprightIntervals(this.data);
            this.uprightsPositionsArr = this.uprightService.clean([...this.uprightsPositionsArr, ...fixedIntervals]);;
        }
    }
}
