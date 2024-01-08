
import { Component, OnChanges, Input } from '@angular/core';
import { LabelNumber } from 'src/app/shared/models/planogram-enums';
import { PlanogramCommonService} from 'src/app/shared/services';
@Component({
    selector: 'sp-label-preview',
    templateUrl: './label-preview-component.html',
    styleUrls: ['./label-preview-component.scss'],
  })
  export class LabelPreviewComponent implements OnChanges{
    constructor( private readonly planogramCommonService: PlanogramCommonService,) {}
    @Input() public width: number;
    @Input() public minHeight: number;
    @Input() public maxHeight: number;
    @Input() public selectedLabelExpression:string;
    @Input() public labelFilters;
    @Input() public LablePreviewCls:string;

    //text  property
    @Input() private fontSize: number;
    @Input() private fontcolor: string;
    @Input() private fontstyle: string;
    @Input() private fonttype: string;
    public textProperties:{[key: string]: string| number} = {
      fontType:"Roboto",
      fontSize:10,
      fontStyle:"Italic",
      fontColor:"green"
    }

    // alignment property
    @Input() private justify: number;
    @Input() private textOrientaion: number;
    @Input() private position: number;
    @Input() private stretchToFacing: boolean;
    @Input() private wrapText: boolean;
    @Input() private shrinkToFit: boolean;
    public alignment:{[key: string]: string| number | boolean} = {
      justify:"left",
      textOrientaion:3,
      position:"end",
      stretchToFacing:true,
      wrapText:true,
      shrinkToFit:true
    }

    //borders property
    @Input() public transparency: number;
    @Input() public strokeColor: string;
    @Input() public fillColor: string;
    public labelBackground:{[key: string]: string| number}= {
      fillColor:"yellow",
      strokeColor:'1px solid #000',
      transparency:0
    }

    public horizontalScroll = {};
    public verticalScroll = {};

    public labelNo:number;
    public labelExpr:string;
    public shrinkFitFontsize;
    @Input() showTitle: boolean;

    public get getLabelStyle():{[key: string]: string | number }{ //styles for label in preview
      let paddingSize = this.textProperties.fontSize == 0.3 ? 1 : this.textProperties.fontSize as number * 0.125;
      let styles = {
        'transform': this.updateLabelOrientation().transform,
        'writing-mode': this.updateLabelOrientation().writingmode,
        'color': this.textProperties.fontColor ? this.textProperties.fontColor : '#000',
        'font-family': this.textProperties.fontType ? this.textProperties.fontType : 'Roboto',
        'font-size': (this.textProperties.fontSize == 0.3)? this.textProperties.fontSize +"vw" : this.textProperties.fontSize+"px",
        'font-style': this.textProperties.fontStyle=='italic' ? 'italic' : "normal",
        'font-weight': this.textProperties.fontStyle=='bold' ? this.textProperties.fontStyle : "normal",
        'padding-top': this.position == 0 || (this.position == 2 && this.textOrientaion == 1) ? (paddingSize * 1.2) + 'px' : '0px',
        'padding-right': this.justify == 2 || (this.justify == 0 && this.textOrientaion == 1) ? paddingSize + 'px' : '0px',
        'padding-bottom': this.position == 2 || (this.position == 0 && this.textOrientaion == 1) ? paddingSize + 'px' : '0px',
        'padding-left': this.justify == 0 ? paddingSize + 'px' : '0px',
        'margin': (this.alignment.justify== "center") ? "2px":'0px',
        'height': 'fit-content',
        'display':'inline-table',
        'white-space': !this.wrapText ? "nowrap" : "",
        'overflow': !this.wrapText ? "hidden": ""
      };
      return styles;
    }

  public get spanTagStyle(): { [key: string]: string | number } { //styles for label in preview
    let size = this.textProperties.fontSize == 0.3 ? 0.003 * window.innerWidth * 0.2 : this.textProperties.fontSize as number * 0.2;
    let styles = {
      'background': this.labelBackground.fillColor ? this.labelBackground.fillColor : "#FFF",
      'border': this.labelBackground.fillColor ? `${size}px solid ${this.labelBackground.fillColor}` :  `${size}px solid #FFF`,
      'outline': this.labelBackground.strokeColor ? this.labelBackground.strokeColor : "1px solid green",
      'opacity':this.labelBackground.transparency as number/100
    };
    return styles;
  }

    public get stylePositionDiv():{[key: string]: string| number| boolean}{ //styles for positiondiv in preview
      const styleDiv = {
        'display': 'grid',
        "justify-content": this.alignment.justify ? this.alignment.justify : "left",
        "word-break": this.alignment.wrapText ? 'break-word' : 'initial',
        "overflow": this.alignment.wrapText ? "scroll" : "hidden",
        "flex-wrap": "nowrap",
        "align-items": this.alignment.position ? this.alignment.position : "top",
        "border":"1px solid darkgrey",
        "margin-bottom":"15px"
      }
      return styleDiv;
    }
    public get modifyLabelExpressionWithTitle():string {
      this.labelExpr = this.selectedLabelExpression;
      this.labelExpr=this.labelExpr.replaceAll('~|~','');
      if(this.showTitle){
        this.labelFilters?.forEach((value) => {
          this.labelExpr = this.labelExpr.indexOf(value.IDDictionary) != -1
              ? this.labelExpr.replace('~' + value.IDDictionary + '~', 'XXX',)
              : this.labelExpr.replace('~' + value.value + '~', "'" + value.value + "'");
      });
      } else {
        this.labelExpr = this.labelExpr? this.planogramCommonService.filterIdDictionaries(this.labelExpr):'';
        this.labelFilters?.forEach((value) => {
          this.labelExpr = this.labelExpr.indexOf(value.IDDictionary) != -1
              ? this.labelExpr.replace(value.IDDictionary, '&lt;'+ value.DictionaryName + '&gt;')
              : this.labelExpr.replace('~' + value.value + '~', "'" + value.value + "'");
      });

      }
      this.labelExpr = this.labelExpr
                .replaceAll('\\\\\\n', '<br>')
                .replaceAll('\\\\n', '<br>')
                .replaceAll('\\n', '<br>')
                .replaceAll('\n', '<br>')

      if(!this.wrapText && this.labelExpr.includes("<br>")){
        this.labelExpr =  this.labelExpr
        .replaceAll('<br>', '');
      }
      return this.labelExpr;

    }
    private updateLabelOrientation():{[key: string]: string}{

      if(this.alignment.textOrientaion == -1){//best to fit
        if(this.horizontalScroll[this.labelNo] && !this.verticalScroll[this.labelNo]){
          this.alignment.textOrientaion = 1;
        }else if(!this.horizontalScroll[this.labelNo] && this.verticalScroll[this.labelNo]){
          this.alignment.textOrientaion = 0;
        }else if(this.horizontalScroll[this.labelNo] && this.verticalScroll[this.labelNo]){
          this.alignment.textOrientaion = -1;
        }
      }
      return this.alignment.textOrientaion == -1 ? {'transform':'','writingmode':''}:{'transform': !this.alignment.textOrientaion ? 'rotate(0deg)' : 'rotate(-180deg)',
        'writingmode': !this.alignment.textOrientaion ? '' : 'tb-rl'}
    }
    public checkForScrollBar(LablePReviewCls):boolean{ //check the preview has scrollbars
      this.horizontalScroll[this.labelNo] = false;
      this.verticalScroll[this.labelNo] = false;
        var div = document.getElementById(LablePReviewCls) as HTMLElement;
        this.horizontalScroll[this.labelNo] = div?.scrollWidth > div?.clientWidth;
        this.verticalScroll[this.labelNo] = div?.scrollHeight > div?.clientHeight;
       if(this.horizontalScroll[this.labelNo] ||this.verticalScroll[this.labelNo]){
        return true;
       }else{
        return false;
       }
    }


  private updateCSSProperty(): void {

    this.LablePreviewCls = this.LablePreviewCls;
    this.labelNo =  this.LablePreviewCls =="Lable1PreviewCls" ? LabelNumber.LABEL1:LabelNumber.LABEL2;
    this.textProperties.fontColor = this.fontcolor;
    this.textProperties.fontStyle = this.fontstyle;
    this.textProperties.fontType = this.fonttype;
    this.alignment.justify = this.justify == 0 ? 'left':this.justify == 1? 'center' : this.labelNo == LabelNumber.LABEL1?'right':'end';
    this.alignment.position = this.position == 0 ? 'start':this.position == 1? 'center' : 'end';
    this.alignment.shrinkToFit = this.shrinkToFit;
    this.alignment.stretchToFacing = this.stretchToFacing;
    this.alignment.textOrientaion = this.textOrientaion;
    this.alignment.wrapText = this.wrapText;
    this.labelBackground.fillColor = this.fillColor;
    this.labelBackground.strokeColor = `1px solid${this.strokeColor}`;
    this.labelBackground.transparency = this.transparency;
    this.textProperties.fontSize = this.fontSize;//this.setFontForShrinkFit();
    this.checkForScrollBar(this.LablePreviewCls);
  }

  public ngOnChanges(): void {
    this.updateCSSProperty();

  }
  }
