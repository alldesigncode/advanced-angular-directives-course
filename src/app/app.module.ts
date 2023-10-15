import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { ListDraggableDirective } from './directives/list-draggable.directive';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SelectableDirective } from './directives/selectable.directive';

@NgModule({
  declarations: [AppComponent, ListDraggableDirective, SelectableDirective],
  imports: [BrowserModule, BrowserAnimationsModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
