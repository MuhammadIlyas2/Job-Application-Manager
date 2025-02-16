import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  credentials = { username_or_email: '', password: '' };
  errorMessage = '';
  isSignup = false; // Controls which form is visible

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {}

  login(): void {
    this.authService.login(this.credentials).subscribe(
      res => {
        console.log('Login successful', res);
        // Optionally save token/session info here
        this.router.navigate(['/jobs']);
      },
      err => {
        console.error(err);
        this.errorMessage = err.error.message || 'Login failed';
      }
    );
  }

  toggleForm() {
    this.isSignup = !this.isSignup;
  }
}
