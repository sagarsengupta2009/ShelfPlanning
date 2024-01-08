import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AgGridHelperService } from '../../services';
import { GridConfig } from '../ag-grid/models';

@Component({
    selector: 'sp-help',
    templateUrl: './help.component.html',
    styleUrls: ['./help.component.scss'],
})
export class HelpComponent implements OnInit {
    public gridConfigGrid: GridConfig;
    public gridData = [
        {
            DESCRIPTION: this.translate.instant('SELECT_POSITION_FIXTURE'),
            SHORTCUT_KEYS: 'Click ' + this.translate.instant('SELECTED_POSITIONS'),
        },
        {
            DESCRIPTION: this.translate.instant('SELECTION_LEFT_POSITION_RIGHT_RIGHT POSITION'),
            SHORTCUT_KEYS: '&#8594;, &#8592;' + this.translate.instant('NAVIGATION_DIRECTION'),
        },
        {
            DESCRIPTION: this.translate.instant('SELECTION_TOP_DOWN_POSITION'),
            SHORTCUT_KEYS: '&#8593;, &#8595;' + this.translate.instant('NAVIGATION_DIRECTION'),
        },
        {
            DESCRIPTION: this.translate.instant('SELECT_MULTIPLE_DISCONTIGUOUS_POSITIONS_FIXTURES'),
            SHORTCUT_KEYS: 'Ctrl + Click',
        },
        {
            DESCRIPTION: this.translate.instant('SELECT_CURRENT_ITEM_RIGHT'),
            SHORTCUT_KEYS: 'Shift + &#8594;',
        },
        {
            DESCRIPTION: this.translate.instant('SELECT_CURRENT_ITEM_LEFT'),
            SHORTCUT_KEYS: 'Shift + &#8592;',
        },
        {
            DESCRIPTION: this.translate.instant('SELECT_ITEMS_TILL_START'),
            SHORTCUT_KEYS: 'Shift + Home',
        },
        {
            DESCRIPTION: this.translate.instant('SELECT_ITEMS_TILL_END'),
            SHORTCUT_KEYS: 'Shift + End',
        },
        {
            DESCRIPTION: this.translate.instant('TOGGLE_GRILL_VIEW'),
            SHORTCUT_KEYS: 'Ctrl + G',
        },
        {
            DESCRIPTION: this.translate.instant('MOVE_POSITION_TO_RIGHT'),
            SHORTCUT_KEYS: 'Ctrl + &#8594;',
        },
        {
            DESCRIPTION: this.translate.instant('MOVE_POSITION_TO_LEFT'),
            SHORTCUT_KEYS: 'Ctrl + &#8592;',
        },
        {
            DESCRIPTION: this.translate.instant('CHANGE_FACINGS_BY_NUMBER'),
            SHORTCUT_KEYS: this.translate.instant('NUMBER_KEY'),
        },
        {
            DESCRIPTION: this.translate.instant('INCREASE_FACINGS_BY_ONE'),
            SHORTCUT_KEYS: 'Shift + &gt;' + this.translate.instant('GREATER_THAN_KEY'),
        },
        {
            DESCRIPTION: this.translate.instant('DECREASE_FACINGS_BY_ONE'),
            SHORTCUT_KEYS: 'Shift + &lt;' + this.translate.instant('LESS_THAN_KEY'),
        },
        {
            DESCRIPTION: this.translate.instant('CHANGE_ORIENTATION'),
            SHORTCUT_KEYS: 'Shift + &#8593;Shift + &#8595;',
        },
        {
            DESCRIPTION: this.translate.instant('FLIP_POSITIONS'),
            SHORTCUT_KEYS: 'Ctrl + I',
        },
        {
            DESCRIPTION: this.translate.instant('ZOOM_IN_ZOOM_ZOOM_OUT'),
            SHORTCUT_KEYS: '+ and - key (or) Mouse wheel up & down', //this.translate.instant('PLUS_MINUS_KEYS')
        },
        {
            DESCRIPTION: this.translate.instant('CENTER_VIEW'),
            SHORTCUT_KEYS: 'Ctrl + Shift + R',
        },
        {
            DESCRIPTION: this.translate.instant('RESET_ZOOM'),
            SHORTCUT_KEYS: 'Ctrl + R',

        },
        {
            DESCRIPTION: this.translate.instant('FIT_PLANOGRAM'),
            SHORTCUT_KEYS: 'R',
        },
        {
            DESCRIPTION: this.translate.instant('ITEM_SCANNING'),
            SHORTCUT_KEYS: 'Ctrl + K',
        },
        {
            DESCRIPTION: this.translate.instant('PANNING'),
            SHORTCUT_KEYS: this.translate.instant('PAN_ACTIONS'),
        },
        {
            DESCRIPTION: this.translate.instant('PANNING_2D'),
            SHORTCUT_KEYS: 'Shift + Drag',
        },
        {
            DESCRIPTION: this.translate.instant('PANNING_3D'),
            SHORTCUT_KEYS: 'Right Click + Drag',
        },
        {
            DESCRIPTION: this.translate.instant('TOGGLE_BETWEEN_SECTION_VIEWS'),
            SHORTCUT_KEYS: 'Ctrl + M',
        },
        {
            DESCRIPTION: this.translate.instant('UNDO'),
            SHORTCUT_KEYS: 'Ctrl + Z',
        },
        {
            DESCRIPTION: this.translate.instant('REDO'),
            SHORTCUT_KEYS: 'Ctrl + Y',
        },
        {
            DESCRIPTION: this.translate.instant('SELECT_ALL_POSITIONS'),
            SHORTCUT_KEYS: 'Ctrl + A',
        },
        {
            DESCRIPTION: this.translate.instant('MANUAL_SAVE'),
            SHORTCUT_KEYS: 'Ctrl + S',
        },
        {
            DESCRIPTION: this.translate.instant('MANUAL_SAVE_ALL'),
            SHORTCUT_KEYS: 'Ctrl + Shift + S',
        },
        {
            DESCRIPTION: this.translate.instant('CUT_COPY_PASTE'),
            SHORTCUT_KEYS: 'Ctrl + X / Ctrl + C / Ctrl + V',
        },
        {
            DESCRIPTION: this.translate.instant('HIGHLIGHT'),
            SHORTCUT_KEYS: 'Ctrl + H',
        },
        {
            DESCRIPTION: this.translate.instant('SHOW_MODULAR'),
            SHORTCUT_KEYS: 'Ctrl + B' + '[' + this.translate.instant('TOGGLE_CURRENT_MODE') + ']',
        },
        {
            DESCRIPTION: this.translate.instant('SHOW_ANNOTATION'),
            SHORTCUT_KEYS: 'Ctrl + D',
        },
        {
            DESCRIPTION: this.translate.instant('SHOW_POSITION_LABELS'),
            SHORTCUT_KEYS: 'Ctrl + L',
        },
        {
            DESCRIPTION: this.translate.instant('CLOSE_DIALOG'),
            SHORTCUT_KEYS: this.translate.instant('ESC'),
        },
        {
            DESCRIPTION: this.translate.instant('FILL_DOWN_VALUES_IN_WORKSHEET_MODE'),
            SHORTCUT_KEYS: 'Ctrl + D',
        },
        {
            DESCRIPTION: this.translate.instant('FILL_UP_VALUES_IN_WORKSHEET_MODE'),
            SHORTCUT_KEYS: 'Ctrl + U',
        },
        {
            DESCRIPTION: this.translate.instant('SWITCHING_BETWEEN_HIGHLIGHT_TEMPLATES_IN_FORWARD_DIRECTION'),
            SHORTCUT_KEYS: 'Ctrl + F9',
        },
        {
            DESCRIPTION: this.translate.instant('SWITCHING_BETWEEN_HIGHLIGHT_TEMPLATES_IN_BACKWARD_DIRECTION'),
            SHORTCUT_KEYS: 'Ctrl + Shift + F9',
        },
        {
            DESCRIPTION: this.translate.instant('COPY_POSITION_AND_FIXTURE_FROM_ONE_POG_TO_ANOTHER'),
            SHORTCUT_KEYS: 'Ctrl + Drag',
        },
        {
            DESCRIPTION: this.translate.instant('COPY_FIXTURE_FROM_ONE_POG_TO_ANOTHER_BY_EXCLUDING_OCCUPIED_ POSITIONS_IN_IT'),
            SHORTCUT_KEYS: 'Ctrl + Shift + Drag',
        },
        {
            DESCRIPTION: this.translate.instant('MOVE_THE_ITEM_INTO_SAFEST_UPWARD_DIRECTION'),
            SHORTCUT_KEYS: 'Ctrl + Shift + &#8593;',
        },
        {
            DESCRIPTION: this.translate.instant('MOVE_THE_ITEM_INTO_SAFEST_DOWNWARD_DIRECTION'),
            SHORTCUT_KEYS: 'Ctrl + Shift + &#8595;',
        },
        {
            DESCRIPTION: this.translate.instant('MOVE_THE_ITEM_INTO_SAFEST_LEFT_DIRECTION'),
            SHORTCUT_KEYS: 'Ctrl + Shift + &#8592;',
        },
        {
            DESCRIPTION: this.translate.instant('MOVE_THE_ITEM_INTO_SAFEST_RIGHT_DIRECTION'),
            SHORTCUT_KEYS: 'Ctrl + Shift + &#8594;',
        },
        {
            DESCRIPTION: this.translate.instant('MOVE_THE_ITEM_INTO_UPWARD_DIRECTION'),
            SHORTCUT_KEYS: 'Ctrl + &#8593;',
        },
        {
            DESCRIPTION: this.translate.instant('MOVE_THE_ITEM_INTO_DOWNWARD_DIRECTION'),
            SHORTCUT_KEYS: 'Ctrl + &#8595;',
        },
    ];

    constructor(
        private readonly translate: TranslateService,
        private readonly agGridHelperService: AgGridHelperService
    ) {}

    ngOnInit(): void {
        this.gridConfigGrid = {
                id: `info-Grid`,
                columnDefs: this.agGridHelperService.getAgGridColumns(`info-Grid`),
                data: this.gridData,
                height: '64vh',
                hideColumnConfig: true,
                hideGroupHeader: true
            }
    }
}
