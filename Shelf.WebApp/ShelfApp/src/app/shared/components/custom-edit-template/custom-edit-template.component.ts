import {
    Component,
    OnInit,
    Input,
    ViewEncapsulation,
    Output,
    EventEmitter,
    OnChanges,
    SimpleChanges,
} from '@angular/core';
import { IntlService } from '@progress/kendo-angular-intl';
import { SharedService } from '../../services/common/shared/shared.service';
import { TranslateService } from '@ngx-translate/core';
import { COLOR_PALETTE } from '../../constants/colorPalette';
import { NotifyService, LanguageService } from '../../services';

@Component({
    selector: 'srp-custom-edit-template',
    templateUrl: './custom-edit-template.component.html',
    styleUrls: ['./custom-edit-template.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class CustomEditTemplateComponent implements OnInit, OnChanges {
    @Input() public column: any;
    @Input() public dataItem: any;
    @Input() public data: any;
    @Input() public field: string;
    @Output() currentValue = new EventEmitter<any>();
    public fieldType = ``;
    public ddlValues: any;
    public blockRulecopyFromModel: boolean;
    public previousValue: any;
    public dropdownColor: boolean;
    public todayDate: any = new Date();
    public skeletonDateFormat: string;

    //public minimunDate: any = new Date(this.todayDate);
    public gradientSettings = {
        opacity: false,
    };
    public paletteSettings = {
        columns: 17,
        palette: COLOR_PALETTE,
    };
    constructor(
        private intl: IntlService,
        private readonly notifyService: NotifyService,
        private sharedService: SharedService,
        private translate: TranslateService,
        private readonly languageService: LanguageService,
    ) {
      this.skeletonDateFormat = this.languageService.getDateFormat();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.column.type.toLowerCase() === `date`) {
            //this.minimunDate.setDate(this.todayDate.getDate() + 1);
            this.data = new Date(this.data);
        }
    }
    ngOnInit(): void {
        this.fieldType = this.column.type.toLowerCase();
        // if (this.column.field == 'Type') {
        //   this.ddlValues = [
        //     { key: `Cases`, value: `Cases` },
        //     { key: `Facing`, value: `Facing` },
        //     { key: `Dos`, value: `Dos` },
        //     { key: `Capacity`, value: `Capacity` },
        //   ];
        // }
        switch (this.fieldType) {
            case `dropdown`:
                this.ddlValues = [];
                if (this.column.templateDummy && this.column.templateDummy !== '') {
                    this.ddlValues = JSON.parse(this.column.templateDummy);
                    if (this.field.includes(`selectedVersionvalue`)) {
                        if (this.dataItem.IDPOGStatusTo && this.dataItem.IDPOGStatusTo.length > 0) {
                            this.ddlValues = this.dataItem.IDPOGStatusTo.map((ele) => {
                                return {
                                    value: ele.Name,
                                    key: ele.Value,
                                };
                            });
                        } else {
                            this.ddlValues = [];
                        }
                    }
                }
                break;

            default:
                break;
        }
        if (this.column.field == 'Advanced') {
            if (this.dataItem[`Type`].toLowerCase() == `dos`) {
                this.ddlValues = [
                    { key: ``, value: `` },
                    { key: `From SPA for Store Specific POGs`, value: `From SPA for Store Specific POGs` },
                ];
            } else {
                this.ddlValues = [{ key: ``, value: `` }];
            }
        }
        this.previousValue = this.data;
    }
    public OnChange($event) {
        if (this.dataItem[this.field] !== $event.checked) {
            if (this.dataItem[this.field + `_template`]) {
                this.dataItem[this.field + `_template`] = $event.checked;
            }
            this.dataItem[this.field] = $event.checked;
            this.dataItem.Dirty = true;
        }
        this.currentValue.emit({ field: this.field, value: $event.checked });
    }
    isInt(n) {
        return Number(n) === n && n % 1 === 0;
    }
    isFloat(n) {
        return Number(n) === n && n % 1 !== 0;
    }
    public valueChanged = (val) => {
        if (this.dataItem && this.dataItem[`Type`]) {
            switch (this.dataItem[`Type`].toLowerCase()) {
                case `cases`:
                case `dos`:
                    if (isNaN(Number(val))) {
                        if (this.column.field === `Type_template`) {
                            this.dataItem[`Value`] = ``;
                            this.dataItem[`Advanced`] = ``;
                            this.dataItem[`Value_template`] = ``;
                        } else {
                            if (this.column.field === `Advanced`) {
                            } else {
                                val = ``;
                            }
                        }
                        !isNaN(val) ? this.notifyService.warn('Please enter numeric data', 'GOT IT!') : null;
                    }
                    val = !isNaN(Number(val))
                        ? this.isFloat(Number(val))
                            ? Number(Number(val).toFixed(2))
                            : val
                        : val;
                    break;

                case `facing`:
                case `capacity`:
                    if (isNaN(Number(val)) || !this.isInt(Number(val))) {
                        if (this.column.field === `Type_template`) {
                            this.dataItem[`Value`] = ``;
                            this.dataItem[`Advanced`] = ``;
                            this.dataItem[`Value_template`] = ``;
                        } else {
                            val = ``;
                        }
                        !isNaN(val) ? this.notifyService.warn('Please enter integer number', 'GOT IT!') : null;
                    }
                    break;
            }
        }
        if (
            this.fieldType === `numeric` ||
            this.fieldType === `number` ||
            this.fieldType === `float` ||
            this.fieldType === `integer` ||
            this.fieldType === `floatNeg`
        ) {
            val = Number(val); // Removed unwanted 0s
            if (isNaN(val)) {
                val = 0;
            }
            if (this.fieldType === `float`) {
                val = Number(Number(val).toFixed(2));
            }
            if (this.fieldType === `floatNeg`) {
                val = Number(Number(val).toFixed(2));
            }
        }
        if (this.fieldType === `date`) {
            val = this.intl.formatDate(val, this.skeletonDateFormat);
        }
        if (this.fieldType === `color`) {
            val = val;
            let color = {
                colorcode: val,
            };
        }
        if (this.dataItem[this.field] !== val) {
            if (this.field.indexOf('_template') !== -1) {
                this.dataItem[this.field.replace('_template', '')] = val;
            }
            this.dataItem[this.field] = val;
            if (this.dataItem[this.field + `_template`]) {
                this.dataItem[this.field + `_template`] = val;
            }
            this.dataItem[`Dirty`] = true;
        }
        this.currentValue.emit({ field: this.field, value: val });
    };
    private validateNumericEntries(value, validPattern: RegExp = null) {
        const e = event as KeyboardEvent;
        const escapeKeys = [46, 8, 9, 27, 13];
        // Ignore delete, backspace, tab, esc, , enter, shift
        if (
            escapeKeys.indexOf(e.keyCode) !== -1 ||
            // Allocw ctrl A, C , V and X
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            (e.keyCode === 88 && e.ctrlKey === true) ||
            // Allow: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39)
        ) {
            return; // Navigation only
        }
        const numberValidator = new RegExp(`^[0-9]*$`);
        const isNumberValid = numberValidator.test(e.key);
        let isPatternValid = false;
        if (validPattern != null) {
            isPatternValid = validPattern.test(e.key);
        }
        if (isNumberValid || isPatternValid) {
            return;
        } else {
            e.preventDefault();
        }
    }

    public editorInputKeyDown(val) {
        const e = event as KeyboardEvent;
        switch (this.fieldType) {
            case `number`:
            case `integer`:
            case `numeric`:
                this.validateNumericEntries(val);
                if (val > 99999) {
                    e.preventDefault();
                    return;
                }
                break;
            case `float`:
                this.validateNumericEntries(val, new RegExp(`^[.]*$`));
                if (val > 99999) {
                    e.preventDefault();
                    return;
                }
                break; // Max value for Allocate fields
            case `floatNeg`:
                this.validateNumericEntries(val, new RegExp(`^[-+]?\d+(\.\d+)?$`));
                if (val > 99999) {
                    e.preventDefault();
                    return;
                }
                break;
            default:
                break;
        }
        if (e.keyCode === 13) {
            // enter key save value
            this.valueChanged(val);
        }
    }

    public disabledDates = (date: Date): boolean => {
        return date < this.todayDate;
    };
}
