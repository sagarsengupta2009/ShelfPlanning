import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotifyService } from 'src/app/shared/services';
@Component({
    selector: 'sp-save-template',
    templateUrl: './dialog-template.component.html',
    styleUrls: ['./dialog-template.component.scss']
  })
  export class SaveTemplateDialog {
    public templateSave :boolean=false;
    public templateDelete :boolean=false;
    public templateClone :boolean=false;
    public headerValue:string;
    public labelTemplateName:string='';
    private currentTemplate;
    constructor(
      public dialog: MatDialogRef<SaveTemplateDialog>,
      @Inject(MAT_DIALOG_DATA) private readonly data:any,
      private readonly notify: NotifyService,) {}
    public ngOnInit():void{
      this.currentTemplate=Object.assign({}, this.data.template);

      switch (this.data.feature) {
        case `Save`:
          this.templateSave=true;
          this.headerValue="ENTER_LABEL_TEMPLATE_NAME";
          break;
        case `Delete`:
          this.templateDelete=true;
          this.headerValue="DELETE_TEMPLATE";
          break;
        case `Clone`:
          this.templateClone=true;
          this.headerValue="CLONE_LABEL_TEMPLATE" ;
          break;
        default:
          break;
    }
    }
    public closeDialog(): void {
      this.dialog.close();
    }
    public closeLabelTemplate(): void {
      this.templateSave = false;
    }
    public saveLabelTemplate(): void {
      if(this.templateSave){

      }
      if(this.templateDelete){
        if(this.data.template['TEMPLATE_NAME']!='DefaultTemplate'){
          let index=this.data.templatesData.findIndex(x => x.TEMPLATE_NAME === this.currentTemplate['TEMPLATE_NAME']);
          if(index!=-1){
            this.dialog.close({templateName:this.currentTemplate['TEMPLATE_NAME'], feature: this.data.feature});
          }
        }
        else
          this.notify.warn('CANNOT_DELETE_DEFAULT_TEMPLATE')
      }
      if(this.templateClone || this.templateSave){
        let index=this.data.templatesData.findIndex(x => x.TEMPLATE_NAME?.toLowerCase() === this.data.template['TEMPLATE_NAME']?.toLowerCase());
        if(index!=-1){
          let labelindex=this.data.templatesData.findIndex(x => x.TEMPLATE_NAME?.toLowerCase() === this.labelTemplateName?.toLowerCase());
            if(labelindex==-1){
              this.currentTemplate['TEMPLATE_NAME']=this.labelTemplateName;
              this.dialog.close({templateName:this.labelTemplateName, feature: this.data.feature});
            }
            else{
              this.notify.warn('TEMPLATE_NAME_SHOULD_BE_UNIQUE')
            }
        }
      }
    }
  }
