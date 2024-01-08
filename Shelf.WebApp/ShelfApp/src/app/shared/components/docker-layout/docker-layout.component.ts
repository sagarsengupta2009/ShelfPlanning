import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'sp-docker-layout',
  templateUrl: './docker-layout.component.html',
  styleUrls: ['./docker-layout.component.scss']
})
export class DockerLayoutComponent implements OnInit {
  @Input() dock?: string = 'RIGHT';
  constructor() { }

  ngOnInit(): void {
  }

}
