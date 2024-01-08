import { Injectable } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';

@Injectable({
  providedIn: 'root'
})
export class SpinnerService {

  public isShown = false;

  constructor(
    private spinner: NgxSpinnerService,
  ) {

  }

  public show() {
    this.isShown = true;
    this.spinner.show();
  }

  public hide() {
    this.isShown = false;
    this.spinner.hide();
  }
  
}

interface Config {
  presistent?: boolean;
}