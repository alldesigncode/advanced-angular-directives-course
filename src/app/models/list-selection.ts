import { Renderer2 } from '@angular/core';
import { Subject } from 'rxjs';

export class ListSelection {
  selection = null;

  private mouseDown = false;
  private start: HTMLElement = null;
  private end: HTMLElement = null;
  private positions = {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  };

  private listChildren = [];
  private selected = new Set();

  private readonly selectionChangeSubject = new Subject();
  readonly selectionChange$ = this.selectionChangeSubject.asObservable();

  constructor(readonly list: HTMLElement, readonly renderer: Renderer2) {}

  handleMouseDown() {
    this.listChildren = Array.from(this.list.children);
    this.list.addEventListener('mousedown', (ev) => {
      this.selected.clear();

      const newTarget = <HTMLElement>(
        document
          .elementsFromPoint(ev.clientX, ev.clientY)
          .find((ev) => ev.hasAttribute('selectableItem'))
      );

      if (!newTarget.closest('[selectableItem]')) {
        return;
      }

      this.mouseDown = true;

      if (!this.list.contains(this.selection)) {
        this.selection = this.renderer.createElement('div');
        this.renderer.addClass(this.selection, 'selection');
        this.renderer.appendChild(this.list, this.selection);
      }

      this.start = newTarget;
      const rect = newTarget.getBoundingClientRect();
      const rectList = this.list.getBoundingClientRect();

      this.renderer.setStyle(this.list, 'userSelect', 'none');

      const top = this.start.offsetTop;
      const left = this.start.offsetLeft;
      const bottom = this.list.clientHeight - rect.bottom + 1 + rectList.top;
      const right =
        this.list.clientWidth - rect.left - rect.width + 1 + rectList.left;
      this.renderer.setStyle(this.selection, 'top', top + 'px');
      this.renderer.setStyle(this.selection, 'left', left + 'px');
      this.renderer.setStyle(this.selection, 'bottom', bottom + 'px');
      this.renderer.setStyle(this.selection, 'right', right + 'px');

      this.positions = {
        top,
        left,
        bottom,
        right,
      };

      this.selected.add(this.start);
      this.selectionChangeSubject.next([...this.selected]);
    });
  }

  handleMouseMove() {
    this.list.addEventListener('mousemove', (ev) => {
      const newTarget = <HTMLElement>(
        document
          .elementsFromPoint(ev.clientX, ev.clientY)
          .find((ev) => ev.hasAttribute('selectableItem'))
      );

      if (!newTarget) {
        return;
      }

      if (!this.mouseDown) {
        return;
      }

      if (newTarget === this.end) {
        return;
      }

      if (this.start) {
        this.end = newTarget;
        this.apply(this.start, this.end);
        this.selectionChangeSubject.next([...this.selected]);
      }
    });
  }

  handleMouseUp() {
    this.list.addEventListener('mouseup', (ev) => this.onMouseUp(ev));
  }

  onMouseUp(ev) {
    const newTarget = document
      .elementsFromPoint(ev.clientX, ev.clientY)
      .find((ev) => ev.hasAttribute('selectableItem'));

    if (this.mouseDown) {
      this.mouseDown = false;
    }

    if (newTarget?.closest('div').hasAttribute('selectableItem')) {
      return;
    }

    if (this.start) {
      this.start = null;
      this.end = null;
    }
  }

  private apply(start: HTMLElement, end: HTMLElement) {
    const rectEnd = end.getBoundingClientRect();
    const rectList = this.list.getBoundingClientRect();
    if (start.isEqualNode(end)) {
      const top = this.start.offsetTop + 'px';
      const left = this.start.offsetLeft + 'px';
      const bottom =
        this.list.clientHeight - rectEnd.bottom + 1 + rectList.top + 'px';
      const right =
        this.list.clientWidth -
        rectEnd.left -
        rectEnd.width +
        1 +
        rectList.left +
        'px';
      this.renderer.setStyle(this.selection, 'top', top);
      this.renderer.setStyle(this.selection, 'left', left);
      this.renderer.setStyle(this.selection, 'bottom', bottom);
      this.renderer.setStyle(this.selection, 'right', right);
      return;
    }

    let startIndex = this.listChildren.indexOf(start);
    let endIndex = this.listChildren.indexOf(end);

    if (startIndex > endIndex) {
      const temp = startIndex;
      startIndex = endIndex;
      endIndex = temp;

      const top = end.offsetTop + 'px';
      const bottom = this.positions.bottom + 1 + 'px';

      this.renderer.setStyle(this.selection, 'top', top);
      this.renderer.setStyle(this.selection, 'bottom', bottom);
    } else {
      const top = this.positions.top + 'px';
      const bottom =
        this.list.clientHeight - rectEnd.bottom + 1 + rectList.top + 'px';

      this.renderer.setStyle(this.selection, 'bottom', bottom);
      this.renderer.setStyle(this.selection, 'top', top);
    }

    for (let i = startIndex; i <= endIndex; i++) {
      const item = this.listChildren[i];
      this.selected.add(item);
    }
  }
}
