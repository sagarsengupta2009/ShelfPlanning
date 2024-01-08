import { Component, Input, OnInit } from '@angular/core';
import { filter } from 'lodash-es';
import { PogProfileSignatureSettings } from 'src/app/shared/models';
import { SharedService } from 'src/app/shared/services/common/shared/shared.service';
@Component({
  selector: 'sp-pogqualifier-editor',
  templateUrl: './pogqualifier-editor.component.html',
  styleUrls: ['./pogqualifier-editor.component.scss']
})

export class PogqualifierEditorComponent implements OnInit {
  @Input('data') data;
  @Input('isReadonly') isReadonly;
  public settingsArray: PogProfileSignatureSettings[] = [];
  public qualifierMaxLength: number = 1;


  constructor(public readonly sharedService: SharedService) { }

  public ngOnInit(): void {
    this.settingsArray = this.sharedService.pog_profile_signature_detail_settings;
    this.settingsArray.forEach((fObj) => {
      let value = this.sharedService.getObjectField(undefined, fObj.field, undefined, this.data);
      if(fObj.type === 'float'){
        value = Math.round(value as number * 100) / 100;
      }
      fObj[fObj.field] = value;
    });
    this.qualifierMaxLength = this.sharedService.pog_profile_signature_header_settings.Length;
  }

  public fieldObjOnChange(fObj: PogProfileSignatureSettings): void {
    this.sharedService.getObjectField(undefined, fObj.field, undefined, this.data)
    let fieldObj = filter(this.sharedService.pog_profile_signature_detail_settings, { 'field': fObj.name })[0];
    fieldObj.value = eval('this.data.' + fObj.field);
  }

  public isPOGQualifierUDP(): boolean {
    return !this.sharedService.pog_profile_signature_header_settings.IsUDP;
  }
}

