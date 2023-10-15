import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
} from '@angular/core';
import { TableSelection } from '../models/table-selection';
import { ListSelection } from '../models/list-selection';
import { Subject, takeUntil } from 'rxjs';

const constants = {
  selectableType: {
    TABLE: 'TABLE',
    DIV: 'DIV',
  },
};

@Directive({
  selector: 'table[selectable], div[selectable]',
})
export class SelectableDirective implements OnInit, OnDestroy {
  @Output() selectionChange = new EventEmitter();

  private selectableType: string;
  private selectionInstance: TableSelection | ListSelection;

  private readonly destroy$ = new Subject<void>();

  @HostListener('document:mousedown', ['$event'])
  mousedownGlobal(ev) {
    if (!this.host.nativeElement.contains(ev.target)) {
      this.selectionInstance?.selection?.remove();
    }
  }

  @HostListener('document:mouseup', ['$event'])
  mouseUpGlobal(ev) {
    this.selectionInstance.onMouseUp(ev);
  }

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2
  ) {}

  ngOnInit() {
    this.init();
  }

  private init() {
    this.selectableType = this.host.nativeElement.tagName;

    this.selectionInstance =
      this.selectableType === constants.selectableType.TABLE
        ? new TableSelection(this.host.nativeElement, this.renderer)
        : new ListSelection(this.host.nativeElement, this.renderer);

    this.selectionInstance.handleMouseDown();
    this.selectionInstance.handleMouseMove();
    this.selectionInstance.handleMouseUp();

    this.selectionInstance.selectionChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe((selection) => this.selectionChange.emit(selection));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
