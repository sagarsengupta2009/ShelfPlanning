import { Component, Input } from '@angular/core';
import { PogSettingParamGroup } from 'src/app/shared/models/sa-dashboard';

@Component({
    selector: 'app-group-template',
    templateUrl: './group-template.component.html',
    styleUrls: ['./group-template.component.scss'],
})
export class GroupTemplateComponent {
    @Input() groupData: PogSettingParamGroup[];
    constructor() {}
}
