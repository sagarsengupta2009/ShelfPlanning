import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Annotation } from 'src/app/shared/classes';

@Injectable({
  providedIn: 'root'
})
export class PanelBodyService {

  public annotationUndoRedo: BehaviorSubject<Annotation> = new BehaviorSubject<Annotation>(null);

  constructor() { }
}
