import { DatePipe } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ScenarioService } from 'src/app/shared/services/layouts/space-automation/dashboard/scenario/scenario.service';
import { AllSettings, Corporation, CreatedScenario } from 'src/app/shared/models';
import { NotifyService, PlanogramStoreService, SaDashboardService } from 'src/app/shared/services';

@Component({
    selector: 'sp-create-scenario',
    templateUrl: './create-scenario.component.html',
    styleUrls: ['./create-scenario.component.scss'],
})
export class CreateScenarioComponent implements OnInit, AfterViewInit, OnDestroy {
    private getCorpListSubscription: Subscription;
    private createScenarioSubscription: Subscription;
    public corpList: Corporation;
    public scenarioForm: UntypedFormGroup;
    private todayDate: Date = new Date();
    private minimunDate: Date = new Date(this.todayDate);
    public implemenationDateDisable: string;
    constructor(
        private scenarioService: ScenarioService,
        private datePipe: DatePipe,
        private readonly notifyService: NotifyService,
        private translate: TranslateService,
        public dialogRef: MatDialogRef<CreateScenarioComponent>,
        private dashboardService: SaDashboardService,
        private readonly planogramStore: PlanogramStoreService,
    ) {}

    ngOnInit(): void {
        let endDate = new Date();
        endDate.setDate(new Date().getDate() + 14);

        this.scenarioForm = new UntypedFormGroup({
            IDCorp: new UntypedFormControl('', Validators.required),
            Name: new UntypedFormControl('', Validators.required),
            startDate: new UntypedFormControl(new Date(), Validators.required),
            endDate: new UntypedFormControl(endDate, Validators.required),
            implementationDate: new UntypedFormControl(),
        });
        this.implemenationDateDisable=this.planogramStore.implemenationDateDisable;
        this.minimunDate.setDate(this.todayDate.getDate() + 1);
    }

    ngAfterViewInit(): void {
        this.getCorpList();
    }

    public checkDates() {
        let ldStartDate = this.scenarioForm.value['startDate'];
        let ldEndDate = this.scenarioForm.value['endDate'];

        let startnew = new Date(ldStartDate.getFullYear(), ldStartDate.getMonth(), ldStartDate.getDate());
        let endnew = new Date(ldEndDate.getFullYear(), ldEndDate.getMonth(), ldEndDate.getDate());
        if (startnew > endnew) {
            this.scenarioForm.patchValue({
                endDate: '',
            });
        }
    }

    private getCorpList() {
        this.getCorpListSubscription = this.dashboardService.getCorpList().subscribe((response) => {
            if (response) {
                this.corpList = response.Data;
                this.scenarioForm.patchValue({
                    IDCorp: response.Data[0].IDCorp,
                });
            }
        });
    }

    public get Name() {
        return this.scenarioForm.get('Name');
    }

    public onSubmit = (): any => {
        const data: CreatedScenario = {
            IdCorp: this.scenarioForm.value.IDCorp,
            ProjectName: this.scenarioForm.value.Name,
            ScenarioName: this.scenarioForm.value.Name,
            startDate: this.datePipe.transform(this.scenarioForm.value.startDate, 'yyyy-MM-dd'),
            endDate: this.datePipe.transform(this.scenarioForm.value.endDate, 'yyyy-MM-dd'),
            pogImplementationDate: (this.implemenationDateDisable=='false') ? null : this.datePipe.transform(this.scenarioForm.value.implementationDate, 'yyyy-MM-dd'),
        };
        if (data.startDate <= data.endDate) {
            this.createScenarioSubscription = this.scenarioService.createScenario(data).subscribe(
                (response) => {
                    this.dialogRef.close(response);
                },
                (error) => {
                    if (error) {
                        this.notifyService.error(error, 'GOT IT!');
                    }
                },
            );
        } else {
            this.notifyService.warn('PLEASE_SELECT_PROPER_DATE', 'GOT IT!');
            return;
        }
    };

    public ngOnDestroy() {
        this.getCorpListSubscription ? this.getCorpListSubscription.unsubscribe() : null;
        this.createScenarioSubscription ? this.createScenarioSubscription.unsubscribe() : null;
        // TODO @og will create on notify service
        //this.snackBar.dismiss();
    }

    public disabledStartDate = (date: Date): boolean => {
        let minDate = new Date(this.todayDate.getFullYear(), this.todayDate.getMonth(), this.todayDate.getDate());
        return date < minDate;
    };

    public disabledEndDate = (date: Date): boolean => {
        let startDate = this.scenarioForm.value.startDate;
        let minDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        return date < minDate;
    };
}
