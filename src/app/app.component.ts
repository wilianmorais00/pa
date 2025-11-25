import { Component } from '@angular/core';
import { LoginComponent } from './Component/logComponent/logComponent'; 
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet], 
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class AppComponent {}
