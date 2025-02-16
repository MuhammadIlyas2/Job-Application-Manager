import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  userData = { username: '', email: '', password: '' };
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {}

  signup(): void {
    this.authService.signup(this.userData).subscribe(
      res => {
        console.log('Signup successful', res);
        this.router.navigate(['/login']);
      },
      err => {
        console.error(err);
        this.errorMessage = err.error.message || 'Signup failed';
      }
    );
  }
}
