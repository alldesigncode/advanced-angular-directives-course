import { Renderer2 } from '@angular/core';
import { Subject } from 'rxjs';

export class TableSelection {
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
  private rows = [];
  private selected = new Set();

  private readonly selectionChangeSubject = new Subject();
  readonly selectionChange$ = this.selectionChangeSubject.asObservable();

  constructor(readonly table: HTMLElement, readonly renderer: Renderer2) {}

  handleMouseDown() {
    this.rows = Array.from(this.table.querySelectorAll('tr'));

    this.table.addEventListener('mousedown', (ev) => {
      this.selected.clear();

      const newTarget = <HTMLElement>(
        document
          .elementsFromPoint(ev.clientX, ev.clientY)
          .find((ev) => ev.tagName === 'TD')
      );

      if (!newTarget.closest('td')) {
        return;
      }

      this.mouseDown = true;

      if (!this.table.contains(this.selection)) {
        this.selection = this.renderer.createElement('div');
        this.renderer.addClass(this.selection, 'selection');
        this.renderer.appendChild(this.table, this.selection);
      }

      this.start = newTarget;
      const rect = newTarget.getBoundingClientRect();
      const rectTable = this.table.getBoundingClientRect();

      this.renderer.setStyle(this.table, 'userSelect', 'none');

      const top = this.start.offsetTop;
      const left = this.start.offsetLeft;
      const bottom = this.table.clientHeight - rect.bottom + rectTable.top;
      const right =
        this.table.clientWidth - rect.left - rect.width + rectTable.left;

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
    this.table.addEventListener('mousemove', (ev) => {
      const newTarget = <HTMLElement>(
        document
          .elementsFromPoint(ev.clientX, ev.clientY)
          .find((ev) => ev.tagName === 'TD')
      );

      if (!newTarget) {
        return;
      }

      if (!this.mouseDown) {
        return;
      }

      if (newTarget.tagName !== 'TD') {
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
    this.table.addEventListener('mouseup', (ev) => this.onMouseUp(ev));
  }

  onMouseUp(ev) {
    const newTarget = document
      .elementsFromPoint(ev.clientX, ev.clientY)
      .find((ev) => ev.tagName === 'TD');

    if (this.mouseDown) {
      this.mouseDown = false;
    }

    if (newTarget?.closest('td')) {
      return;
    }

    if (this.start) {
      this.start = null;
      this.end = null;
    }
  }

  private apply(start: HTMLElement, end: HTMLElement) {
    const rectEnd = end.getBoundingClientRect();
    const rectTable = this.table.getBoundingClientRect();

    if (start.isEqualNode(end)) {
      const top = this.start.offsetTop + 'px';
      const left = this.start.offsetLeft + 'px';
      const bottom =
        this.table.clientHeight - rectEnd.bottom + rectTable.top + 'px';
      const right =
        this.table.clientWidth -
        rectEnd.left -
        rectEnd.width +
        rectTable.left +
        'px';
      this.renderer.setStyle(this.selection, 'top', top);
      this.renderer.setStyle(this.selection, 'left', left);
      this.renderer.setStyle(this.selection, 'bottom', bottom);
      this.renderer.setStyle(this.selection, 'right', right);
      this.selected.add(start);
      return;
    }

    const startParentRow = start?.closest('tr');
    const endParentRow = end?.closest('tr');

    let startRowIndex = this.rows.indexOf(startParentRow);
    let endRowIndex = this.rows.indexOf(endParentRow);

    let startColIndex = -1;
    let endColIndex = -1;

    this.rows.forEach((row) => {
      const arr = Array.from(row.querySelectorAll('td'));
      const idx1 = arr.indexOf(start);
      const idx2 = arr.indexOf(end);
      if (idx1 > -1) {
        startColIndex = idx1;
      }

      if (idx2 > -1) {
        endColIndex = idx2;
      }
    });

    if (startRowIndex > endRowIndex) {
      // Up
      const temp = startRowIndex;
      startRowIndex = endRowIndex;
      endRowIndex = temp;

      const top = end.offsetTop + 'px';
      const bottom = this.positions.bottom + 'px';

      this.renderer.setStyle(this.selection, 'top', top);
      this.renderer.setStyle(this.selection, 'bottom', bottom);
    } else {
      // Down
      const top = this.positions.top + 'px';
      const bottom =
        this.table.clientHeight - rectEnd.bottom + rectTable.top + 'px';

      this.renderer.setStyle(this.selection, 'bottom', bottom);
      this.renderer.setStyle(this.selection, 'top', top);
    }

    if (startColIndex > endColIndex) {
      // Left
      const temp = startColIndex;
      startColIndex = endColIndex;
      endColIndex = temp;

      const left = end.offsetLeft + 'px';
      const right = this.positions.right + 'px';
      this.renderer.setStyle(this.selection, 'left', left);
      this.renderer.setStyle(this.selection, 'right', right);
    } else {
      // Right
      const right =
        this.table.clientWidth -
        rectEnd.left -
        rectEnd.width +
        rectTable.left +
        'px';
      const left = this.positions.left + 'px';
      this.renderer.setStyle(this.selection, 'right', right);
      this.renderer.setStyle(this.selection, 'left', left);
    }

    for (let i = startRowIndex; i <= endRowIndex; i++) {
      for (let j = startColIndex; j <= endColIndex; j++) {
        const item = this.rows[i].children[j];
        this.selected.add(item);
      }
    }
  }
}
