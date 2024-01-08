import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'shelf-image-preview',
    templateUrl: './image-preview.component.html',
    styleUrls: ['./image-preview.component.scss'],
})
export class ImagePreviewComponent implements OnInit {
    public pegImage: any;
    public isImageAvailable: boolean = true;
    constructor(@Inject(MAT_DIALOG_DATA) private data: any) { }

    ngOnInit(): void {
        if (this.data.PegImage === null) {
            this.isImageAvailable = false;
            this.pegImage = `./Areas/iShelf/ClientApplication/appMaterial/css/themes/default/img/no-img.png`;
        } else if (this.data.PegImage?.content) {
            this.isImageAvailable = true;
            this.pegImage = this.data.PegImage?.content;
        } else {
            this.isImageAvailable = true;
            this.pegImage = this.data.PegImage;
        }
    }
}
