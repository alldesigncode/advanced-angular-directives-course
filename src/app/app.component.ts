import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'advanced-angular-directives';

  onTableSelectionChange(selection) {
    console.log(selection);
  }

  onListSelectionChange(selection) {
    console.log(selection);
  }
}
