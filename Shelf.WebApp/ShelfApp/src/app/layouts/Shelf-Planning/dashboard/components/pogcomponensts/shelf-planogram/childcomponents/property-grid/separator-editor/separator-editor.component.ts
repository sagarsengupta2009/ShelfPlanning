import { Component, Inject, Input, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { isEmpty, filter } from 'lodash-es';
import { AppConstantSpace } from 'src/app/shared/constants/appConstantSpace';
import { DividerGap, LookUpChildOptions } from 'src/app/shared/models';
import { DividersCurdService, NotifyService, PlanogramHelperService, PlanogramStoreService, UprightService } from 'src/app/shared/services';
import { UprightDirection } from 'src/app/shared/services/layouts/upright/upright.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Basket, Coffincase, StandardShelf } from 'src/app/shared/classes';

@Component({
    selector: 'app-separator-editor',
    templateUrl: './separator-editor.component.html',
    styleUrls: ['./separator-editor.component.scss'],
})
export class SeparatorEditorComponent implements OnInit {
    @Input('itemData') itemData;
    public separatorDirectionLkup: LookUpChildOptions[];
    public separatorDir: UprightDirection = 0;
    public uprightsPositionsArrX: number[] = [];
    public uprightsPositionsArrY: number[] = [];
    public separatorThickness: number;
    public type: string;
    public fixedUprightX: number;
    public fixedUprightY: number;
    public newValX: number;
    public newValY: number;
    public selectedRowX: number;
    public selectedRowY: number;
    public isReadonly: boolean;

    constructor(
        private readonly planogramStore: PlanogramStoreService,
        private readonly notifyService: NotifyService,
        public readonly translate: TranslateService,
        private readonly planogramHelper: PlanogramHelperService,
        private readonly upright: UprightService,
        private readonly dividersCurdService: DividersCurdService,
        @Inject(MAT_DIALOG_DATA) private readonly data: StandardShelf | Basket | Coffincase,
    ) { }

    ngOnInit(): void {
        this.separatorDirectionLkup = this.upright.fixtureDirectionOptions();
        this.initSeparatorData();
        this.isReadonly = this.planogramHelper.isPOGLive(this.itemData.$sectionID, false);
    }

    private initSeparatorData(): void {
        const hasAnyDivider = this.data.Children.find(it=> it.ObjectDerivedType === AppConstantSpace.DIVIDERS);
        if(hasAnyDivider){
            this.separatorDir = this.itemData.Fixture.LKDividerType;
        }
        else{
            this.separatorDir = 0;
        }
        const separatorsData = JSON.parse(this.itemData.Fixture.SeparatorsData);
        const dividerItemData = filter(this.itemData.Children, { ObjectDerivedType: AppConstantSpace.DIVIDERS })[0];
        if (separatorsData && dividerItemData) {
            this.separatorThickness = dividerItemData.Fixture.Thickness;
            this.type = separatorsData.type;
            if (this.type == 'fixed') {
                if (separatorsData.vertical.length > 0) {
                    this.fixedUprightX = separatorsData.vertical[0].x;
                }
                if (separatorsData.horizontal.length > 0) {
                    this.fixedUprightY = separatorsData.horizontal[0].y;
                }
            }
            if (this.type == 'variable') {
                separatorsData.vertical.forEach((element, index) => {
                    const xcord = index > 0 ? element.x - this.separatorThickness : element.x;
                    this.uprightsPositionsArrX.push(xcord);
                });

                separatorsData.horizontal.forEach((element, index) => {
                    const ycord = index > 0 ? element.y - this.separatorThickness : element.y;
                    this.uprightsPositionsArrY.push(ycord);
                });
            }
        }
    }

    public onKeyUp(event: InputEvent): void {
        const width = this.itemData.ChildDimension.Width;
        const height = this.itemData.ChildDimension.Depth;
        if (this.type == 'fixed') {
            //vertical dividers validation
            if (Number(this.fixedUprightX) >= width) {
                this.notifyService.warn(
                    this.translate.instant('CANNOT_INSERT_VALUE_GREATER_THAN_COFFIN_CASE_WIDTH') +
                    ' ' +
                    this.itemData.ChildDimension.Width,
                );
                this.fixedUprightX = null;
                event.preventDefault();
            } else if (
                (this.separatorDir == UprightDirection.Vertical || this.separatorDir == UprightDirection.Both) &&
                this.fixedUprightX &&
                Number(this.fixedUprightX) < 1
            ) {
                this.notifyService.warn('CANNOT_INSERT_VALUE_LESS_THAN_ONE');
                this.fixedUprightX = null;
                event.preventDefault();
            }

            //horizontal dividers validation
            if (Number(this.fixedUprightY) >= height) {
                this.notifyService.warn(
                    this.translate.instant('CANNOT_INSERT_VALUE_GREATER_THAN_COFFIN_CASE_DEPTH') +
                    ' ' +
                    this.itemData.ChildDimension.Depth,
                );
                this.fixedUprightY = null;
                event.preventDefault();
            } else if (
                (this.separatorDir == UprightDirection.Horizontal || this.separatorDir == UprightDirection.Both) &&
                this.fixedUprightY &&
                Number(this.fixedUprightY) < 1
            ) {
                this.notifyService.warn('CANNOT_INSERT_VALUE_LESS_THAN_ONE');
                this.fixedUprightY = null;
                event.preventDefault();
            }
        }
    }

    public onBlureThickness(value: string): void {
        this.separatorThickness = value ? Math.round(parseFloat(value) * 100) / 100 : null;
    }

    public variableAddX(value: string): void {
        if (this.uprightsPositionsArrX.indexOf(Number(parseFloat(value).toFixed(2))) == -1 && !isEmpty(this.newValX)) {
            const width = this.itemData.ChildDimension.Width;
            if (Number(parseFloat(value)) + this.separatorThickness >= width) {
                this.notifyService.warn(
                    this.translate.instant('CANNOT_INSERT_DIVIDER_CROSSING_COFFIN_CASE_MERCH_WIDTH') +
                    ' ' +
                    this.itemData.ChildDimension.Width,
                );
                this.newValX = null;
                return;
            }

            this.uprightsPositionsArrX.push(Number(parseFloat(value).toFixed(2)));
            this.uprightsPositionsArrX.sort(function (a, b) {
                return a - b;
            });
            this.newValX = null;
        }
    }

    public variableRemoveX(): void {
        if (this.selectedRowX >= 0) {
            const index = this.uprightsPositionsArrX.indexOf(this.selectedRowX);
            if (index != -1) {
                this.uprightsPositionsArrX.splice(index, 1);
                this.uprightsPositionsArrX.sort(function (a, b) {
                    return a - b;
                });
                this.selectedRowX = null;
                this.newValX = null;
            }
        }
    }

    public variableAddY(value: string): void {
        if (this.uprightsPositionsArrY.indexOf(Number(parseFloat(value).toFixed(2))) == -1 && !isEmpty(this.newValY)) {
            const height = this.itemData.ChildDimension.Depth;
            if (Number(parseFloat(value)) + this.separatorThickness >= height) {
                this.notifyService.warn(
                    this.translate.instant('CANNOT_INSERT_DIVIDER_CROSSING_COFFIN_CASE_MERCH_HEIGHT') +
                    ' ' +
                    this.itemData.ChildDimension.Depth,
                );
                this.newValY = null;
                return;
            }
            this.uprightsPositionsArrY.push(Number(parseFloat(value).toFixed(2)));
            this.uprightsPositionsArrY.sort(function (a, b) {
                return a - b;
            });
            this.newValY = null;
        }
    }

    public variableRemoveY(): void {
        if (this.selectedRowY >= 0) {
            const index = this.uprightsPositionsArrY.indexOf(this.selectedRowY);
            if (index != -1) {
                this.uprightsPositionsArrY.splice(index, 1);
                this.uprightsPositionsArrY.sort(function (a, b) {
                    return a - b;
                });
                this.selectedRowY = null;
                this.newValY = null;
            }
        }
    }

    public selectItX(index: number): void {
        this.selectedRowX = this.uprightsPositionsArrX[index];
        this.newValX = null;
    }

    public selectItY(index: number): void {
        this.selectedRowY = this.uprightsPositionsArrY[index];
        this.newValY = null;
    }

    public validateDividerCrossingBoundary(data: DividerGap): boolean {
        if (data) {
            if (data.horizontal.length) {
                const lastIndex = data.horizontal.length - 1;
                const lastHorizontalDividerLocYEnd = data.horizontal[lastIndex].y;
                if (lastHorizontalDividerLocYEnd > this.itemData.ChildDimension.Depth) {
                    this.notifyService.warn('Dividers crossing coffin case boundary');
                    return false;
                }
            }

            if (data.vertical.length) {
                const lastIndex = data.vertical.length - 1;
                const lastVerticalDividerLocXEnd = data.vertical[lastIndex].x;
                if (lastVerticalDividerLocXEnd > this.itemData.ChildDimension.Width) {
                    this.notifyService.warn('Dividers crossing coffin case boundary');
                    return false;
                }
            }
        }
        return true;
    }

    public separatorsApply(): boolean | DividerGap {
        this.separatorThickness = this.separatorThickness;
        this.fixedUprightX = Math.round(Number(this.fixedUprightX) * 100) / 100;
        this.fixedUprightY = Math.round(Number(this.fixedUprightY) * 100) / 100;
        
        const dividerGap = this.dividersCurdService.createCoffincaseDivider({
            coffincaseObj: this.itemData,
            separatorThickness: this.separatorThickness,
            type: this.type,
            fixedUprightX: this.fixedUprightX,
            fixedUprightY: this.fixedUprightY,
            separatorDir: this.separatorDir,
            uprightsPositionsArrX: this.uprightsPositionsArrX,
            uprightsPositionsArrY: this.uprightsPositionsArrY
        });
        
        const flag = this.validateDividerCrossingBoundary(dividerGap);
        return flag ? dividerGap : false;
    }
}
