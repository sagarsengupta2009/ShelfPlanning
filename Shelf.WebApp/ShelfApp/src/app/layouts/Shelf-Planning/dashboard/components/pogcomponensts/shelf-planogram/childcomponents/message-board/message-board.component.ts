import {
    Component,
    Input,
    OnChanges,
    SimpleChanges,
    OnDestroy,
    ViewChild,
    OnInit
} from '@angular/core';
import { Subscription } from 'rxjs';
import { IntlService } from '@progress/kendo-angular-intl';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash-es';
import { MessageBoardStoreList, PostMessageData } from 'src/app/shared/models';
import { DiscussionService, NotifyService, LanguageService } from 'src/app/shared/services';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';

@Component({
    selector: 'shelf-message-board',
    templateUrl: './message-board.component.html',
    styleUrls: ['./message-board.component.scss'],
})
export class MessageBoardComponent implements OnChanges, OnDestroy, OnInit {
    @Input() pogData;
    @ViewChild('selectAll') selectAll: MatSelect;
    public allChecked = false;
    private subscriptions: Subscription = new Subscription();
    private discussionData = { Stores: [], Discussions: [] };
    public Stores: MessageBoardStoreList[] = [];
    public selectedStores: string[] = [];
    public commentsArray: PostMessageData[];
    public userComment: string = '';
    public showMainCommentingField: boolean = false;
    public textAreaRows: number = 1;
    public selfile = null;
    public newAttachmentName: string;
    private newAttachmentFile = null;
    public sortKey: string = 'newest';
    public attachmentArray: PostMessageData[];
    public storeFilterTxt: string = '';
    public selectTrigger: string = '';
    public skeletonDateTimeFormat: string;

    constructor(
        public discussion: DiscussionService,
        private readonly translate: TranslateService,
        public readonly intl: IntlService,
        private readonly notifyService: NotifyService,
        private readonly languageService: LanguageService,
    ) {
        this.skeletonDateTimeFormat = this.languageService.getDateFormat() + ' ' + this.languageService.getTimeFormat();
    }
    public ngOnInit(): void {
      this.discussion.rootFlags[this.pogData.idpog].isApiCalled = false;
      this.initData();
    }
    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.pogData && changes.pogData.currentValue) {
            let backdrop: HTMLElement = document.querySelector<HTMLElement>('.mat-drawer-backdrop');
            if (backdrop && backdrop.style && backdrop.style.display) {
                backdrop.style.display = 'block';
            }
            this.initData();
        }
    }

    public ngOnDestroy(): void {
        this.subscriptions?.unsubscribe();
    }

    //To stop panning when typing on add comment textarea
    public onAddComment(event: KeyboardEvent): void {
        event.stopPropagation();
    }

    public onDataBound(searchTxt: string): void {
      if (searchTxt && searchTxt.length > 2) {
        let index = this.Stores.findIndex((item) => item.StoreName.includes('Add New'));
        if (index > -1) {
          this.Stores.splice(index, 1);
        }
        if (!(this.Stores.findIndex((item) => item.StoreName.toLowerCase() === searchTxt.toLowerCase()) > -1)) {
          let storeobj = {
            StoreName: `${searchTxt} (Add New)`,
            IDStore: searchTxt,
          };
          this.Stores.push(storeobj);
        }
      }
  }

    public onFileChange(files: FileList): void {
        this.newAttachmentName = files[0].name;
        this.newAttachmentFile = files[0];
    }

    public openAttachment(url: string, type: string): void {
        if (type != 'file') {
            window.open(url, '_blank');
        } else {
            this._commandOpenHandler(url);
        }
    }

    public upvoteComment(commentRow: PostMessageData): void {
        commentRow.user_has_upvoted = !commentRow.user_has_upvoted;
        let tempObj = {
            id: commentRow.id,
            user_has_upvoted: commentRow.user_has_upvoted,
        };
        this.subscriptions.add(
            this.discussion.updateDiscussionThread(tempObj).subscribe((res) => {
                if (res.Log.Summary.Error > 0) {
                    this.notifyService.error(res.Log.Details[0].Message);
                } else {
                    if (commentRow.user_has_upvoted) {
                        commentRow.upvote_count = commentRow.upvote_count - (-1);
                    } else {
                        commentRow.upvote_count = commentRow.upvote_count - 1;
                    }
                }
            }),
        );
    }

    public toggleAllSelection(): void {
        if (this.allChecked) {
          this.selectAll.options.forEach((item: MatOption) => item.select());
        } else {
          this.selectAll.options.forEach((item: MatOption) => item.deselect());
        }
    }
    public optionClick(): void {
        let resetSelectAll = true;
        try {
            this.selectAll.options.forEach((item: MatOption) => {
                if (this.selectAll.options.length == 2 && this.selectAll.options?.last?.selected && this.selectAll.options?.last?.value && this.selectAll.options?.last?.value.includes('(Add New)')) {
                    resetSelectAll = false;
                    throw new Error();
                }
                if (!item.selected && item.value) {
                    resetSelectAll = false;
                    return resetSelectAll;
                }
            });
        }
        catch(e) { console.log(e) }
        if (this.selectedStores.filter(value => value).length !== this.Stores.length) { resetSelectAll = false; }
        this.allChecked = resetSelectAll;
        this.selectTrigger = this.selectedStores.filter(value => value).toString();
    }

    private _commandOpenHandler(url: string): void {
        let AttachmentURL = url;
        let isHttpUrl = AttachmentURL.indexOf('file');
        if (isHttpUrl == -1) {
            let win = window.open(url, '_blank');
            win.focus();
        } else {
            this.forceDownloadAttachment(url);
        }
    }

    private forceDownloadAttachment(link: string): void {
        let ua = window.navigator.userAgent;
        let msie = ua.indexOf('MSIE ');

        if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
            window.open(link, 'Download');
        } else {
            window.open(link, '_self');
        }
    }

    public getFileName(url: string): string {
        let fileurl: string[] = url.split('/');
        return fileurl[fileurl.length - 1];
    }

    public getFormatedDate(date: string): string {
        return this.intl.formatDate(new Date(Date.parse(date + ' UTC')), this.skeletonDateTimeFormat);
    }

    public hideMainCommentingField(): void {
        this.userComment = '';
        this.textAreaRows = 1;
        this.showMainCommentingField = false;
        this.newAttachmentName = '';
        this.newAttachmentFile = null;
        this.selfile = undefined;
    }

    private displaycomments(sortKey?: string): void {
        this.discussionData = this.discussion.rootFlags[this.pogData.idpog].commentData;
        if (this.discussionData?.Stores.length) {
            this.Stores = this.discussionData.Stores.filter((element) =>  {  //@Sagar: removing the object containing value = 'All', IDStore = 0 because in html placed mat-checkbox with innerText 'All' seperately. Not taking from the Stores array.
                return element.IDStore != '0';
            })
        }
        let data: PostMessageData[] = _.cloneDeep(this.discussionData.Discussions);
        let parentArray = data.filter((item) => !item.parent);
        for (let disscuion of parentArray) {
            disscuion.Children = [];
            disscuion.ChildrenDisplayLength = 2;
        }
        let childrenArray = data.filter((item) => item.parent);
        this.commentsArray = this.prepareArray(parentArray, childrenArray);
        this.sortArrange(sortKey || 'newest');
    }

    private prepareArray(parentArray: PostMessageData[], childArray?: PostMessageData[]): PostMessageData[] {
        for (let messageObj of childArray) {
            if (messageObj.parent) {
                let outermostParent = this.getOutermostParent(messageObj.parent);
                let index = parentArray.findIndex((item) => item.id == outermostParent.id);
                if (index > -1) {
                    parentArray[index].ChildrenDisplayLength = 2;
                    if (!parentArray[index].Children) {
                        parentArray[index].Children = [];
                        parentArray[index].Children.push(messageObj);
                    } else {
                        parentArray[index].Children.push(messageObj);
                    }
                }
            }
        }
        return parentArray;
    }

    private getOutermostParent(directParentId: number): PostMessageData {
        let array: PostMessageData[] = _.cloneDeep(this.discussionData.Discussions);
        let parentId = directParentId;
        let parentComment: PostMessageData;
        do {
            parentComment = array.find((item) => parseInt(item.id) == parentId);
            parentId = parentComment.parent;
        } while (parentComment.parent != null);
        return parentComment;
    }

    private initData(): void {
        if (this.discussion.rootFlags[this.pogData.idpog] === undefined) {
            this.discussion.initByPogId(this.pogData.idpog);
        }
        if (this.discussion.rootFlags[this.pogData.idpog].isApiCalled) {
            this.displaycomments();
        } else {
            this.subscriptions.add(
                this.discussion.getDiscussionThread(this.pogData.idpog).subscribe((response) => {
                    if (response && response.Log.Summary.Error) {
                        this.notifyService.error(response.Log.Details[0].Message);
                    } else {
                        if (response.Data) {
                            this.discussion.rootFlags[this.pogData.idpog].isApiCalled = true;
                            this.discussion.rootFlags[this.pogData.idpog].commentData = response.Data;
                            this.displaycomments();
                        }
                    }
                }),
            );
        }
    }

    public postComment(parentComment?: PostMessageData): void {
      let tagItems: string[];
      if(!this.allChecked) {
          tagItems = this.Stores.filter((ele) => this.selectedStores.includes(ele.StoreName)).map(
              (ele) => {
                  if (ele.StoreName.includes('(Add New)')){
                      let storeName = ele.StoreName.replace(' (Add New)', '');
                      let index = this.Stores.findIndex(s => s.IDStore === ele.IDStore);
                      this.Stores[index].StoreName = storeName;
                      return storeName;
                  }
                  else return ele.StoreName
              }
          );
      } else {
          tagItems = [this.translate.instant('ALL')];
      }
        const postApiData = {
            parent: parentComment ? parentComment.id : null,
            content: parentComment ? parentComment.userComment : this.userComment,
            upvote_count: 0,
            user_has_upvoted: false,
            IdPog: this.pogData.idpog,
            storeIdentifier: tagItems.join(', ')
        };
        const fd = new FormData();
        fd.append('json', JSON.stringify(postApiData));
        if (this.selfile) {
            fd.append('file', this.newAttachmentFile);
        }
        this.subscriptions.add(
            this.discussion.createDiscussionThread(fd).subscribe((res) => {
                if (res && res.Log.Summary.Error) {
                    this.notifyService.error(res.Log.Details[0].Message);
                } else {
                    this.newAttachmentName = '';
                    this.newAttachmentFile = null;
                    this.selfile = undefined;
                    if (parentComment) {
                        parentComment.userComment = '';
                    } else {
                        this.userComment = '';
                    }
                    this.refreshData(null, this.sortKey);
                }
            }),
        );
    }

    public sortArrange(id: string): void {
        this.sortKey = id;
        switch (id) {
            case 'newest':
                this.sortByDate(id);
                break;
            case 'oldest':
                this.sortByDate(id);
                break;
            case 'popular':
                this.sortByDate(id);
                break;
            case 'attachments':
                let data: PostMessageData[] = _.cloneDeep(this.discussionData.Discussions);
                this.attachmentArray = data.filter((item) => item.file_url);
                this.attachmentArray.sort(function (commentA, commentB) {
                    let createdA = new Date(commentA.created).getTime();
                    let createdB = new Date(commentB.created).getTime();
                    return createdB - createdA;
                });
                break;
            default:
                this.sortByDate('newest');
                break;
        }
    }

    private sortByDate(sortKey: string): void {
        if (sortKey == 'popular') {
            this.commentsArray.sort(function (commentA, commentB) {
                let pointsOfA = commentA.Children.length;
                let pointsOfB = commentB.Children.length;
                let enableUpvoting = true;
                if (enableUpvoting) {
                    pointsOfA += commentA.upvote_count;
                    pointsOfB += commentB.upvote_count;
                }

                if (pointsOfB != pointsOfA) {
                    return pointsOfB - pointsOfA;
                } else {
                    // Return newer if popularity is the same
                    let createdA = new Date(commentA.created).getTime();
                    let createdB = new Date(commentB.created).getTime();
                    return createdB - createdA;
                }
            });
        } else {
            this.commentsArray.sort(function (commentA, commentB) {
                let createdA = new Date(commentA.created).getTime();
                let createdB = new Date(commentB.created).getTime();
                if (sortKey == 'oldest') {
                    return createdA - createdB;
                } else {
                    return createdB - createdA;
                }
            });
        }
    }

    public refreshData(storeRefresh?: boolean, retainedSort?: string): void {
        this.subscriptions.add(
            this.discussion.getDiscussionThread(this.pogData.idpog).subscribe((response) => {
                this.discussion.rootFlags[this.pogData.idpog].commentData = response.Data;
                this.Stores = response.Data.Stores;
                this.displaycomments(retainedSort);
            }),
        );
      if (storeRefresh) { this.selectedStores = []; this.allChecked = false }
    }
}
