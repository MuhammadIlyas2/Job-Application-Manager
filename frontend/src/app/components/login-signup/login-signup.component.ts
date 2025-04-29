import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login-signup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-signup.component.html',
  styleUrl: './login-signup.component.css'
})
export class LoginSignupComponent implements OnInit {
  isSignup = false;
  errorMessage = '';

  userData = {
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  formErrors = {
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
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
    this.formErrors = {
      fullName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    };

    let isValid = true;

    if (!this.userData.fullName) {
      this.formErrors.fullName = 'Full name is required';
      isValid = false;
    }

    if (!this.userData.username) {
      this.formErrors.username = 'Username is required';
      isValid = false;
    }

    if (!this.userData.email) {
      this.formErrors.email = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.userData.email)) {
      this.formErrors.email = 'Invalid email format';
      isValid = false;
    }

    if (!this.userData.password) {
      this.formErrors.password = 'Password is required';
      isValid = false;
    } else if (this.userData.password.length < 8) {
      this.formErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }

    if (this.userData.password !== this.userData.confirmPassword) {
      this.formErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    if (!isValid) return;

    const payload = {
      fullname: this.userData.fullName,
      username: this.userData.username,
      email: this.userData.email,
      password: this.userData.password
    };

    this.authService.signup(payload).subscribe(
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
