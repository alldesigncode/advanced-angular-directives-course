import { Directive, ElementRef, OnInit } from '@angular/core';
import { TableSelection } from '../models/table-selection';

@Directive({
  selector: 'table[selectable]',
})
export class SelectableDirective implements OnInit {
  private selectionInstance: TableSelection;

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  ngOnInit() {
    this.init();
  }

  private init() {
    this.selectionInstance = new TableSelection(this.host.nativeElement);

    console.log(this.selectionInstance);
  }
}
