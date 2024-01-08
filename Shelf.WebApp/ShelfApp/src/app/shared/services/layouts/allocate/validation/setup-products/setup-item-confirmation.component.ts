import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'shelf-setup-item-confirmation',
  templateUrl: './setup-item-confirmation.component.html',
  styleUrls: ['./setup-item-confirmation.component.scss']
})
export class SetupItemConfirmationComponent implements OnInit {

  public productList: string = "";
  constructor(
    private readonly dialog: MatDialogRef<SetupItemConfirmationComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: { productCorpDetails, invalidProducts },

  ) { }

  ngOnInit(): void {
    let upcs = [];
    this.data.invalidProducts.forEach((product) => {
      upcs.push(this.data.productCorpDetails.products.filter(e => e.productKey === product.ProductKey)[0].upc);
    })
    this.productList = upcs.toString();
  }

  public closeDialog(input: boolean): void {
    this.dialog.close(input);
  }
}
