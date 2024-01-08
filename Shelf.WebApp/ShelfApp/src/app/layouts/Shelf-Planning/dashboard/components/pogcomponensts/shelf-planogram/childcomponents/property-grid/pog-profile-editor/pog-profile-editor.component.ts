import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Utils } from 'src/app/shared/constants/utils';
import { PogProfileSignatureSettings, UdpFields } from 'src/app/shared/models';
import { SharedService, PlanogramHelperService, PlanogramSaveService, NotifyService } from 'src/app/shared/services';

@Component({
    selector: 'sp-pog-profile-editor',
    templateUrl: './pog-profile-editor.component.html',
    styleUrls: ['./pog-profile-editor.component.scss'],
})
export class PogProfileEditorComponent implements OnInit {
    public isReadonly: boolean;
    public udpFields: UdpFields = {};

    constructor(
        public readonly translate: TranslateService,
        private readonly planogramHelper: PlanogramHelperService,
        private readonly notifyService: NotifyService,
        private readonly sharedService: SharedService,
        private readonly dialog: MatDialogRef<PogProfileEditorComponent>,
        private readonly planogramSaveService: PlanogramSaveService,
        @Inject(MAT_DIALOG_DATA) public readonly data,
    ) {
        //TODO @ankita will add model for this
    }

    public ngOnInit(): void {
        this.setupWithData();
        this.isReadonly = this.planogramHelper.isPOGLive(this.data.$sectionID, false);
    }

    private setupWithData(): void {
        if (!this.sharedService.pog_profile_signature_header_settings.IsUDP) {
            if (this.data.POGQualifier) {
                //Pog qualifier is there if there is udp true, need to fetch the perticular value from combination
                //but stack order may change or settings may change so breaking the combination is on hold
                this.sharedService.pog_profile_signature_detail_settings.forEach(
                    (item: PogProfileSignatureSettings) => {
                        if (!Utils.isNullOrEmpty(item.value) && item.IsUDP) {
                            this.udpFields[item.field] = String(item.value);
                        }
                    },
                );
            } else {
                this.sharedService.pog_profile_signature_detail_settings.forEach((item) => {
                    if (item.IsUDP) {
                        this.udpFields[item.field] = item.value = '';
                    }
                });
            }
        }
    }

    private validateForm(): boolean {
        let canAllow: boolean = true;
        if (!this.sharedService.pog_profile_signature_header_settings.IsUDP) {
            this.sharedService.pog_profile_signature_detail_settings.forEach((item) => {
                if (item.IsUDP) {
                    if (Utils.isNullOrEmpty(item.value) && Utils.isNullOrEmpty(eval('this.udpFields.' + item.field))) {
                        canAllow = false;
                    } else {
                        item.value = eval('this.udpFields.' + item.field);
                    }
                }
            });
        } else {
            if (Utils.isNullOrEmpty(this.data.PogProfile.Code)) {
                canAllow = false;
            }
        }
        if (Utils.isNullOrEmpty(this.data.PogProfile.Name)) {
            canAllow = false;
        }
        canAllow ? '' : this.notifyService.warn('PLEASE_ENTER_THE_MANDATORY_FILED');
        return canAllow;
    }

    public savePogQualifier(): void {
        if (this.validateForm()) {
            if (!this.sharedService.pog_profile_signature_header_settings.IsUDP) {
                this.data.POGQualifier = this.data.PogProfile.Code = this.planogramSaveService.autoGeneratePogQualifier(
                    this.data,
                );
            }
            this.dialog.close();
        }
    }

    public hasPogPrrofileSettingPrepared(): boolean {
        if (this.sharedService.iSHELF.settings.isReady_pogQualifier == 1) {
            return true;
        } else {
            return true;
        }
    }
}
