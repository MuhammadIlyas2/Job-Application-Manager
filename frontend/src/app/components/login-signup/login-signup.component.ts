import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login-signup.component.html',
  styleUrl: './login-signup.component.css'
})
export class LoginSignupComponent implements OnInit {
  isSignup = false; // Controls the toggle between login and signup
  errorMessage = '';

  userData = {
    username: '',
    email: '',
    password: '',
  };

  credentials = {
    username_or_email: '',
    password: ''
  };

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {}

  login(): void {
    this.authService.login(this.credentials).subscribe(
      res => {
        console.log('Login successful', res);
        this.router.navigate(['/jobs']);
      },
      err => {
        console.error(err);
        this.errorMessage = err.error.message || 'Login failed';
      }
    );
  }

  signup(): void {
    this.authService.signup(this.userData).subscribe(
      res => {
        console.log('Signup successful', res);
        this.isSignup = false;
      },
      err => {
        console.error(err);
        this.errorMessage = err.error.message || 'Signup failed';
      }
    );
  }

  toggleForm(signup: boolean) {
    this.isSignup = signup;
  }
}
