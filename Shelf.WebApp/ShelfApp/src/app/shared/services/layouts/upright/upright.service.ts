import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Section } from 'src/app/shared/classes';
import { 
  TabChildren,
  UprightObject,
  UprightType, 
  UprightValidationResult } from 'src/app/shared/models';
import { PlanogramStoreService } from '../../common';
import { Subject } from 'rxjs';

export enum UprightDirection {
  None = 0,
  Horizontal = 1,
  Vertical = 2,
  Both = 3,
}

@Injectable({
  providedIn: 'root'
})
export class UprightService {
  deleteModular: boolean = false;
  uprightObj: UprightObject = {
    uprightType: 0,
    uprightValues: []
  };
  lastSelectedFixedUpright: string = '';
  lastSelectedVariableUpright: string = '';
  setUprightsToBayChecked: boolean = false;
  isPogChanged: boolean = false;

  constructor(
    private readonly translate: TranslateService,
    private readonly planogramStore: PlanogramStoreService,
  ) { }

  public fixtureDirectionOptions(): { text: string, value: UprightDirection }[] {
    // @og FIXTURE_UPRIGHTS_DIRECTION is undefined for me, is this setup per account in the database?
    return this.planogramStore.lookUpHolder.FIXTURE_UPRIGHTS_DIRECTION?.options
      ?? Object.keys(UprightDirection).filter(it => isNaN(it as any)).map((text, value) => ({ text, value }));
  }

  public calculateUprightType(upright: string): UprightType {
    if (!upright) { return UprightType.None; }

    if (upright.indexOf(',') == -1) {
      // no comma, means single value,
      // But if value is "0" or "0.00", means no upright
      const fixedValue = +upright;
      if (!fixedValue) { return UprightType.None; }

      // else, single non-zero value. i.e. Fixed upright
      return UprightType.Fixed;
    }

    return UprightType.Variable;
  }

  /** Calculate upright intervals from the upright string */
  public calculateUprightIntervals(sectionObj: Section): number[] {
    const type = this.calculateUprightType(sectionObj.Upright);
    switch (type) {
      case UprightType.None: return [];
      case UprightType.Fixed:
        return this.calculateFixedUprightIntervals(sectionObj);
      case UprightType.Variable:
        const variableIntervals = sectionObj.Upright.split(',')
          .map(Number);
        return this.clean(variableIntervals);
    }
  }

  public calculateFixedUprightIntervals(sectionObj: Section): number[] {
    const intervalWidth = +sectionObj.Upright;
    const pogWidth = sectionObj.Dimension.Width;

    const intervalCount = Math.floor(pogWidth / intervalWidth);

    const intervals: number[] = [];
    // calculate middle intervals
    for (let i = 1; i <= intervalCount; i++) {
      intervals.push(intervalWidth * i);
    }

    // 0 - upright interval range
    return this.clean([0, ...intervals]);
  }

  public validateNewUprightsValue(newValue: number, sectionObj: Section): UprightValidationResult {
    if (!newValue || Number(newValue) < 1) {
      return {
        flag: false,
        errMsg: this.translate.instant('CANNOT_INSERT_VALUE_LESS_THAN_ONE'),
      };
    }

    if (Number(newValue) > sectionObj.Dimension.Width) {
      const moreWidthMsg = this.translate.instant('CANNOT_INSERT_VALUE_GREATER_THAN_SECTION_WIDTH');
      return {
        flag: false,
        errMsg: `${moreWidthMsg} ${sectionObj.Dimension.Width}`,
      }
    }

    return { flag: true };
  }

  public validateVariableUprights(uprights: number[], sectionObj: Section): UprightValidationResult {

    uprights.push(0);
    uprights.push(sectionObj.Dimension.Width);
    uprights = this.clean(uprights);

    const intervals = sectionObj.getAllAvailableXAxisIntervals(true);

    if (uprights.length < intervals.length) {
      return {
        flag: false,
        errMsg: this.translate.instant('PLEASE_ADD_MORE_VARIABLES_UPRIGHTS'),
        validatedUprights: uprights,
      };
    }

    // every element in x-axis intervals should be present in upright interval list
    const isAllIntervalsPresesent = intervals.every(x => uprights.includes(x));
    if (!isAllIntervalsPresesent) {
      return {
        flag: false,
        errMsg: this.translate.instant('PLEASE_SELECT_THE_VARIABLE_UPRIGHTS_IN_SYNC'),
        validatedUprights: uprights,
      }
    }

    return { flag: true, validatedUprights: uprights };
  }

  /** Assign Upright property and recalculate uprightType and uprightIntervals */
  public updateUpright(data: Section, newValue: string): void {
    data.Upright = newValue;
    data.uprightType = this.calculateUprightType(data.Upright);
    data.uprightIntervals = this.calculateUprightIntervals(data);
  }

  public updateUprightForPropGrid(data: Section, newValue: string): void {
    data.Upright = newValue;
    data.uprightIntervals = this.calculateUprightIntervals(data);
  }

  /** Remove any duplicate and sort */
  public clean(uprights: number[]): number[] {
    const uniqUprights = [...new Set(uprights.filter(upr => upr != undefined))];
    return uniqUprights.sort((a, b) => a - b);
  }
}
