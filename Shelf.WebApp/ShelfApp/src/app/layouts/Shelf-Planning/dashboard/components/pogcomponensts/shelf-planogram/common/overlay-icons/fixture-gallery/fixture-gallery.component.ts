import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { IDragDrop, DragOrigins, DragDropEventsService } from 'src/app/shared/drag-drop.module';
import { SearchTypeName, UserSearchMode } from 'src/app/shared/models';
import { SharedService, FixtureGallaryService, SearchSettingService } from 'src/app/shared/services/';
import { AppConstantSpace } from 'src/app/shared/constants';
import { SearchComponent } from 'src/app/shared/components/search/search.component';
import { GalleryFixture, SearchSettingVM } from 'src/app/shared/models/fixture-gallary';

@Component({
  selector: 'sp-fixture-gallery',
  templateUrl: './fixture-gallery.component.html',
  styleUrls: ['./fixture-gallery.component.scss']
})
export class FixtureGalleryComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(`searchDetail`) searchDetail: SearchComponent;

  public searchProductsData: GalleryFixture[] = [];
  public searchSettingVisibility: boolean;
  private filterGalleryText: string = ''
  private searchText: string = '';
  private fixture: SearchSettingVM =
    { id: 'fixture', searchType: 'Fixture', itemVisibility: true, searchVisibility: true, selectedField: '', isAzSearch: true, selectedType: '' }
  private isLoaded: boolean;

  private searchTextChanged = new Subject<string>();
  private subscriptions: Subscription = new Subscription();

  constructor(private readonly fixtureGallaryService: FixtureGallaryService,
    private readonly translate: TranslateService,
    private readonly searchSetting: SearchSettingService,
    private readonly sharedService: SharedService,
    private readonly dragDropEventsService: DragDropEventsService,
    private readonly dialogRef: MatDialogRef<FixtureGalleryComponent>,
  ) { }


  ngOnInit(): void {
    this.getSearchData();
    this.isLoaded = this.fixtureGallaryService.isLoaded;
    if (this.fixtureGallaryService.searchProductsData.length > 0 && this.fixtureGallaryService.searchText != '') {
      this.searchProductsData = this.fixtureGallaryService.searchProductsData;
    } else if (this.fixtureGallaryService.allProductsData.length > 0) {
      this.searchProductsData = this.fixtureGallaryService.allProductsData;
    } else {
      this.getGalleryItems(this.filterGalleryText);
    }

    this.subscriptions.add(
      this.dragDropEventsService.beginDrag.subscribe(() => this.toggleFixtureLib(true)));

    this.subscriptions.add(
      this.dragDropEventsService.endDrag.subscribe(() => this.toggleFixtureLib(false)));

    this.subscriptions.add(this.searchTextChanged
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe(filterQuery => {
        this.keySearchFunction(filterQuery);
      }));
  }

  ngAfterViewInit(): void {
    this.searchDetail.searchText = this.fixtureGallaryService.searchText;
  }


  public childSearchItems(response: string): void {
    this.searchText = response;
    this.onFilterTextChanged(this.searchText);
  }

  public getDragDropData(fixture: GalleryFixture): IDragDrop {
    const dropData: IDragDrop = {
      $id: `fixtureLib|${fixture.IDPOG}`,
      ObjectDerivedType: AppConstantSpace.FIXTUREOBJ,
      $sectionID: this.sharedService.getActiveSectionId(),
      dragOriginatedFrom: DragOrigins.FixtureGallary,
      dragDropSettings: { drag: true, drop: false },
    };
    return dropData;
  }

  public refreshFixtures(): void {
    this.isLoaded = false;
    if (this.filterGalleryText !== '') {
      this.getGalleryItems(this.filterGalleryText, true);
    } else {
      this.getGalleryItems('*', true);
    }
  }

  public onSetting(): void {
    this.searchSettingVisibility = true;
  }

  public cancelSearchSetting(selectedFixtureObj: SearchSettingVM): void {
    this.fixture = {
      id: selectedFixtureObj.id,
      searchType: selectedFixtureObj.searchType,
      itemVisibility: selectedFixtureObj.itemVisibility,
      searchVisibility: selectedFixtureObj.searchVisibility,
      selectedField: selectedFixtureObj.selectedField,
      isAzSearch: selectedFixtureObj.isAzSearch,
      selectedType: selectedFixtureObj.selectedType
    }
    this.searchSettingVisibility = false;
  }

  private getSearchData(): void {
    const keys = this.searchSetting.getSearchSettingsNames(SearchTypeName.FIXTURE);
    const mode = this.searchSetting.getSearchSetting<'Enterprise' | 'DB'>(keys.ModeKey);
    const field = this.searchSetting.getSearchSetting<string>(keys.FieldKey);

    this.fixture.isAzSearch = mode === UserSearchMode.ENTERPRISE;
    this.fixture.selectedType = field;

    if (field === '*') {
      this.fixture.selectedField = this.translate.instant('PLANOGRAM_LIBRARY_SEARCH');
    } else {
      const fieldDesc = this.translate.instant(this.searchSetting.getFieldDescription(SearchTypeName.FIXTURE, field));
      this.fixture.selectedField = `${this.translate.instant('SEARCH_BY')} <${fieldDesc}>`;
    }
  }

  private getGalleryItems(filterGalleryText: string, refreshLibrary: boolean = false): void {
    if (this.fixture.selectedType === '') {
      this.fixture.selectedType = '*';
    }
    if (filterGalleryText === '' || filterGalleryText === '*') {
      filterGalleryText = '*';
      this.fixtureGallaryService
        .fetchFixtureGalleryResult(filterGalleryText, this.fixture.selectedType, this.fixture.isAzSearch)
        .subscribe((result) => {
          this.searchProductsData = this.initPrepapreData(result.Data);
          this.initPrepareGallery(this.searchProductsData, refreshLibrary);
          this.fixtureGallaryService.allProductsData = this.searchProductsData;
        });
    } else {
      this.keySearchFunction('');
    }
  }

  private keySearchFunction(searchText: string): void {
    if (searchText === '') {
      this.clearFixtureSearch();
    } else {
      this.isLoaded = false;
      this.filterGalleryText = searchText;
      this.fixtureGallaryService
        .fetchFixtureGalleryResult(this.filterGalleryText, this.fixture.selectedType, this.fixture.isAzSearch)
        .pipe(debounceTime(200))
        .subscribe((result) => {
          if (result.Data.length > 0) {
            this.searchProductsData = this.initPrepapreData(result.Data);
            this.initPrepareGallery(this.searchProductsData, true);
          } else {
            this.searchProductsData.length = 0;
          }
        });
    }
  }

  private initPrepapreData(galleryIdPogList: GalleryFixture[]): GalleryFixture[] {
    const galleryIdPogFixtureList: GalleryFixture[] = [];
    for (const [i, gIdPog] of galleryIdPogList.entries()) {
      galleryIdPogFixtureList.push(gIdPog);
      galleryIdPogFixtureList[i].isLoaded = false;
      galleryIdPogFixtureList[i].isDraggable = false;
      galleryIdPogFixtureList[i].isPOGDataReturnFail = true;
    }
    return galleryIdPogFixtureList;
  }

  private initGalleryItems(): void {
    if (this.fixtureGallaryService.allProductsData.length > 0) {
      this.searchProductsData = this.fixtureGallaryService.allProductsData;
    } else {
      this.getGalleryItems(this.filterGalleryText);
    }
    this.initPrepareGallery(this.searchProductsData);
    this.searchProductsData.forEach(fixture => {
      fixture.isPOGDataReturnFail = false;
    })
    this.isLoaded = true;
  }

  private toggleFixtureLib(toogle: boolean): void {
    const dialogRef = this.dialogRef;
    if (toogle) {
      setTimeout(() => {
        document.querySelector(`#${dialogRef.id}`).parentElement.classList.add('hidden-dialog');
      });
      document.querySelector<HTMLElement>('.cdk-overlay-backdrop').style.visibility = "hidden";
    } else {
      document.querySelector(`#${dialogRef.id}`).parentElement.classList.remove('hidden-dialog');
      document.querySelector<HTMLElement>('.cdk-overlay-backdrop').style.visibility = "visible";
    }
  }

  //Prepare this Init to add isLoaded and preparedData
  private initPrepareGallery(galleryIdPogList: GalleryFixture[], refreshLibrary: boolean = false): void {
    if (galleryIdPogList.length > 0) {
      const pogIdList = galleryIdPogList.map(ele => ele.IDPOG);
      this.getNewPlanogramById(pogIdList, refreshLibrary);
    }
  }

  private getNewPlanogramById(pogList: number[], refreshLibrary: boolean = false): void {
    this.fixtureGallaryService.getFixturesByIds(pogList, refreshLibrary).subscribe(data => {
      //single result
      if (!Array.isArray(data)) {
        data = [data];
      }
      this.fixtureGallaryService.setupFixtureMixin(data, this.searchProductsData);
      this.isLoaded = true;
    }, (error) => {
      console.error('Error while retriveing all the fixture components');
      this.isLoaded = true;
      this.searchProductsData.forEach((fixture) => {
          fixture.isPOGDataReturnFail = true;
          fixture.isLoaded = true;
      });
    })
  }

  private onFilterTextChanged(filterText: string): void {
    this.searchTextChanged.next(filterText);
  }

  // Clear the product search
  private clearFixtureSearch(): void {
    this.filterGalleryText = '';
    this.initGalleryItems();
  }

  public ngOnDestroy() {
    if (this.subscriptions) { this.subscriptions.unsubscribe(); }
    this.fixtureGallaryService.searchText = this.searchText;
    this.fixtureGallaryService.searchProductsData = this.searchProductsData;
    this.fixtureGallaryService.isLoaded = this.isLoaded;
  }
}
