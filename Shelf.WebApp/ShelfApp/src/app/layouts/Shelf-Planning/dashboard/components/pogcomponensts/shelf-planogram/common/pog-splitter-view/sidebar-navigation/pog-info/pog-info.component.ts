import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { PogList } from 'src/app/shared/models/planogram-library/planogram-list';
import { SharedService, LanguageService } from '../../../../../../../../../../shared/services';
@Component({
  selector: 'app-pog-info',
  templateUrl: './pog-info.component.html',
  styleUrls: ['./pog-info.component.scss']
})
export class PogInfoComponent implements OnChanges {
  @Input() selectedPogObj: PogList;
  public skeletonDateTimeFormat: string;
  constructor(
    public sharedService: SharedService,
    private readonly languageService: LanguageService,
  ) {
    this.skeletonDateTimeFormat = this.languageService.getDateFormat() + ' ' + this.languageService.getTimeFormat();
}

  ngOnChanges(changes: SimpleChanges) {

    setTimeout(() => {
      this.sharedService.updatematTab.next(true);
    }, 100);

  }
}
