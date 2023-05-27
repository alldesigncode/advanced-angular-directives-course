import {
  AnimationBuilder,
  AnimationMetadata,
  AnimationPlayer,
  animate,
  style,
} from '@angular/animations';
import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  Renderer2,
} from '@angular/core';

const constants = {
  direction: {
    UP: 'up',
    DOWN: 'down',
  },
  class: {
    DRAG_PLACEHOLDER: 'drag-placeholder',
    LIST_DRAG: 'list-drag',
    DRAGGING: 'dragging',
    HOST_DRAG: 'host-drag',
    HOST_RECEIVE: 'host-receive',
  },
  attribute: {
    LIST_DRAG: 'listDrag',
  },
};

@Directive({
  selector: '[listDraggable]',
  exportAs: 'listDraggable',
})
export class ListDraggableDirective implements OnInit {
  // --- PART 1 ---
  private mouseDown = false;

  private dragItem?: HTMLElement;

  private dragPlaceholder?: HTMLElement;

  private elementSize = 0;

  // --- PART 2 ---
  private direction?: string;

  private previousTarget?: HTMLElement;

  xOffset = 0;
  yOffset = 0;

  initialX = 0;
  initialY = 0;

  isGreater = false;

  @Input() connectedTo?: ListDraggableDirective;

  // TODO - handle scenario to ignore the host-drag list when switching to the host receive
  @HostListener('document:mouseup') onMouseUp() {
    const { HOST_DRAG, HOST_RECEIVE } = constants.class;
    if (this.host.nativeElement.classList.contains(HOST_RECEIVE)) {
      return;
    }

    if (this.mouseDown) {
      this.mouseDown = false;
    }

    if (!this.dragItem) {
      return;
    }

    const index = this.getDragPlaceholderIndex();

    // Get correct child node to animate the dragged element back to its original position
    const node = this.list[index];

    if (node) {
      const animation = this.animate(
        animate(
          '200ms',
          style({
            top: node?.offsetTop,
            left: node?.offsetLeft,
          })
        ),
        this.dragItem
      );

      animation.onDone(() => {
        animation.destroy();

        this.renderer.removeAttribute(this.dragPlaceholder, 'style');
        this.renderer.removeAttribute(this.dragPlaceholder, 'class');
        this.dragPlaceholder.remove();

        // Get reference child node before which newChild is going to be inserted
        const refChild = this.list[index];

        this.renderer.removeAttribute(this.dragItem, 'style');
        this.renderer.removeAttribute(this.dragItem, 'class');

        this.renderer.insertBefore(
          this.host.nativeElement,
          this.dragItem,
          refChild,
          true
        );

        this.list.forEach(
          (item) => (
            this.renderer.removeAttribute(item, 'class'),
            this.renderer.removeAttribute(item, 'style')
          )
        );

        this.renderer.removeAttribute(this.host.nativeElement, 'style');
        this.renderer.removeClass(this.host.nativeElement, HOST_DRAG);

        this.resetConnectedTo();
      });
    }
  }

  // --- PART 2 ---
  @HostListener('document:mousemove', ['$event']) onMove(ev: MouseEvent) {
    const { DRAG_PLACEHOLDER, LIST_DRAG, HOST_DRAG, HOST_RECEIVE } =
      constants.class;

    if (this.host.nativeElement.classList.contains(HOST_RECEIVE)) {
      return;
    }

    if (!this.mouseDown) {
      return;
    }

    if (!this.dragItem) {
      return;
    }

    // Calculate the new position of the drag item based on the mouse position and the initial offset
    const newY = ev.clientY - this.yOffset - window.scrollY;
    const newX = ev.clientX - this.xOffset - window.scrollX;

    // Update position
    this.dragItem.style.top = newY + 'px';
    this.dragItem.style.left = newX + 'px';

    const newTarget = document
      .elementsFromPoint(ev.clientX, ev.clientY)
      .find(
        (ev) =>
          ev.hasAttribute(constants.attribute.LIST_DRAG) &&
          !ev.classList.contains(constants.class.DRAGGING)
      ) as HTMLDivElement;

    if (newTarget !== this.previousTarget) {
      this.previousTarget = newTarget;

      if (newTarget) {
        const placeholderIndex = this.getDragPlaceholderIndex();
        const targetIndex = this.getIndex(newTarget);

        if (newTarget.closest('.host-receive')) {
          // RESET THE HOST DRAG + remove the element, then take care host receive
          this.renderer.removeAttribute(this.dragPlaceholder, 'style');
          this.renderer.removeAttribute(this.dragPlaceholder, 'class');
          this.dragPlaceholder.remove();
          this.renderer.removeAttribute(this.host.nativeElement, 'style');
          this.renderer.removeClass(this.host.nativeElement, HOST_DRAG);
          this.renderer.addClass(this.host.nativeElement, HOST_RECEIVE);
          this.list.forEach(
            (item) => (
              this.renderer.removeAttribute(item, 'class'),
              this.renderer.removeAttribute(item, 'style')
            )
          );

          // ----- PART 2

          const parent = this.connectedTo.host.nativeElement;
          parent.style.userSelect = 'none';
          this.renderer.removeClass(parent, HOST_RECEIVE);
          this.renderer.addClass(parent, HOST_DRAG);
          this.connectedTo.list.forEach((item) =>
            this.renderer.addClass(item, LIST_DRAG)
          );

          this.connectedTo.initialX = this.initialX;
          this.connectedTo.initialY = this.initialY;
          this.connectedTo.yOffset = this.yOffset;
          this.connectedTo.xOffset = this.xOffset;
          const dragItemRect = this.dragItem.getBoundingClientRect();
          const startHeight = dragItemRect.height;
          const startWidth = dragItemRect.width;
          this.connectedTo.dragPlaceholder = document.createElement('div');
          this.connectedTo.dragPlaceholder.style.width = startWidth + 'px';
          this.connectedTo.dragPlaceholder.style.height = startHeight + 'px';
          this.connectedTo.dragPlaceholder.classList.add(DRAG_PLACEHOLDER);
          this.renderer.insertBefore(
            parent,
            this.connectedTo.dragPlaceholder,
            newTarget,
            true
          );

          this.connectedTo.elementSize = this.elementSize;
          this.connectedTo.dragItem = this.dragItem;
          this.connectedTo.mouseDown = true;
        } else {
          const direction =
            placeholderIndex > targetIndex
              ? constants.direction.UP
              : constants.direction.DOWN;

          this.direction = direction;

          this.dragOperation(targetIndex, placeholderIndex);
        }
      }
    }
  }

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
    private readonly builder: AnimationBuilder
  ) {}

  ngOnInit() {
    this.init();
  }

  private get list(): HTMLElement[] {
    return Array.from(this.host.nativeElement.children) as HTMLElement[];
  }

  // --- PART 1 ---
  private init() {
    const {
      class: { DRAG_PLACEHOLDER, LIST_DRAG, DRAGGING, HOST_DRAG },
    } = constants;
    const parent = this.host.nativeElement;

    parent.addEventListener('mousedown', (ev) => {
      const target = document.elementFromPoint(
        ev.clientX,
        ev.clientY
      ) as HTMLElement;

      this.initialY = target.offsetTop;
      this.initialX = target.offsetLeft;
      this.mouseDown = true;
      this.elementSize = target.getBoundingClientRect().height;
      this.dragItem = target;

      if (this.dragItem) {
        parent.style.userSelect = 'none';
        this.dragItem.style.userSelect = 'none';

        const dragItemRect = this.dragItem.getBoundingClientRect();
        const startHeight = dragItemRect.height;
        const startWidth = dragItemRect.width;

        this.dragPlaceholder = document.createElement('div');
        this.dragPlaceholder.style.width = startWidth + 'px';
        this.dragPlaceholder.style.height = startHeight + 'px';
        this.dragPlaceholder.classList.add(DRAG_PLACEHOLDER);
        parent.insertBefore(this.dragPlaceholder, this.dragItem);
        parent.removeChild(this.dragItem);

        this.dragItem.classList.remove(LIST_DRAG);
        this.dragItem.classList.add(DRAGGING);
        this.host.nativeElement.classList.add(HOST_DRAG);
        if (this.connectedTo) {
          this.connectedTo.host.nativeElement.classList.add('host-receive');
        }

        /* Calculate the offset between the mouse click and the item's position.
         (also take into account the possibility of scrolling) */
        this.xOffset = ev.clientX - this.initialX - window.scrollX;
        this.yOffset = ev.clientY - this.initialY - window.scrollY;

        this.dragItem.style.position = 'absolute';
        this.dragItem.style.top = this.initialY + 'px';
        this.dragItem.style.left = this.initialX + 'px';
        this.dragItem.style.width = startWidth + 'px';
        this.dragItem.style.height = startHeight + 'px';

        document.body.appendChild(this.dragItem);

        this.list.forEach((item) => item.classList.add(LIST_DRAG));
      }
    });
  }

  private dragOperation(targetIndex: number, placeholderIndex: number) {
    const {
      class: { DRAG_PLACEHOLDER },
      direction: { UP },
    } = constants;

    const filtered = this.list.filter((item) => {
      const isDragPlaceholder = item.classList.contains(DRAG_PLACEHOLDER);

      const currentIndex = isDragPlaceholder
        ? this.getDragPlaceholderIndex()
        : this.getIndex(item);

      if (this.direction === UP) {
        return (
          currentIndex >= targetIndex &&
          currentIndex <= placeholderIndex &&
          !isDragPlaceholder
        );
      } else {
        return (
          currentIndex <= targetIndex &&
          currentIndex >= placeholderIndex &&
          !isDragPlaceholder
        );
      }
    });
    filtered.forEach((item) => {
      this.updateElementPosition(item, this.direction);
      this.updateDragPlaceholderPosition(this.direction);
    });
  }

  // --- PART 3 ---
  /**
   * Adjust the index of the drag placeholder based on its position within a list of elements.
   * Gets correct placeholder index based on its translate position
   */
  private getDragPlaceholderIndex(): number {
    const currentY = this.getTransform(this.dragPlaceholder);

    let idx = this.list.indexOf(this.dragPlaceholder);

    if (currentY <= -this.elementSize) {
      idx = idx - Math.abs(currentY) / this.elementSize;
    }

    if (currentY >= this.elementSize) {
      idx = idx + currentY / this.elementSize;
    }

    return idx;
  }

  // --- PART 3 ---
  /**
   * Gets element index based on its translate position
   * @param element HTMLElement
   */
  private getIndex(element: HTMLElement): number {
    const currentY = this.getTransform(element);

    let idx = this.list.indexOf(element);

    if (currentY === -this.elementSize) {
      idx--;
    }

    if (currentY === this.elementSize) {
      idx++;
    }

    return idx;
  }

  private updateElementPosition(element: HTMLElement, direction: string) {
    const currentY = this.getTransform(element);

    if (currentY === -this.elementSize) {
      element.style.transform = 'translateY(0px)';
    }

    if (currentY === 0) {
      element.style.transform = `translateY(${
        direction === 'down' ? -this.elementSize : this.elementSize
      }px)`;
    }

    if (currentY === this.elementSize) {
      element.style.transform = 'translateY(0px)';
    }
  }

  private updateDragPlaceholderPosition(direction: string) {
    const currentY = this.getTransform(this.dragPlaceholder);

    if (Math.abs(currentY) > 0) {
      this.dragPlaceholder.style.transform = `translateY(${
        direction === 'down'
          ? currentY + this.elementSize
          : currentY - this.elementSize
      }px)`;
    } else {
      this.dragPlaceholder.style.transform = `translateY(${
        direction === 'down' ? this.elementSize : -this.elementSize
      }px)`;
    }
  }

  private animate(
    animationMetaData: AnimationMetadata | AnimationMetadata[],
    el: HTMLElement
  ): AnimationPlayer {
    const animation = this.builder.build(animationMetaData);
    const player = animation.create(el);
    player.play();

    return player;
  }

  private getTransform(element: HTMLElement): number {
    return Number(
      element.style.getPropertyValue('transform').replace(/[^0-9\-]/g, '')
    );
  }

  private resetConnectedTo() {
    const connectedHost = this.connectedTo?.host?.nativeElement;
    const { HOST_RECEIVE, HOST_DRAG } = constants.class;
    if (this.connectedTo) {
      this.renderer.removeClass(connectedHost, HOST_RECEIVE);
    }

    if (this.connectedTo && this.connectedTo.mouseDown) {
      this.connectedTo.mouseDown = false;
      this.renderer.removeClass(connectedHost, HOST_RECEIVE);
      this.renderer.removeAttribute(this.connectedTo.dragPlaceholder, 'style');
      this.renderer.removeAttribute(this.connectedTo.dragPlaceholder, 'class');
      this.connectedTo.dragPlaceholder.remove();
      this.renderer.removeAttribute(this.connectedTo.dragItem, 'style');
      this.renderer.removeAttribute(this.connectedTo.dragItem, 'class');
      this.connectedTo.list.forEach(
        (item) => (
          this.renderer.removeAttribute(item, 'class'),
          this.renderer.removeAttribute(item, 'style')
        )
      );
      this.renderer.removeAttribute(connectedHost, 'style');
      this.renderer.removeClass(connectedHost, HOST_DRAG);
      this.renderer.removeClass(connectedHost, HOST_RECEIVE);
    }
  }
}
