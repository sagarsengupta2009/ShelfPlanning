import { Injectable } from '@angular/core';
import { PlanogramService } from 'src/app/shared/services/common';
import { BaseLabelsCommonService } from 'src/app/shared/services/svg-render/svg-render-common/services/base-labels-common.service';
@Injectable({
    providedIn: 'root',
})
export class LabelsCommonService extends BaseLabelsCommonService {

    constructor(
        public readonly planogramService: PlanogramService,
    ) {
      super(planogramService);
    }
}
