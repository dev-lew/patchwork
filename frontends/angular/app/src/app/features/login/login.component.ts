import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  authForm: FormGroup;
  authMode: 'login' | 'register' = 'login';
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.authForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      email: ['']
    });
  }

  toggleMode(): void {
    this.authMode = this.authMode === 'login' ? 'register' : 'login';
    this.errorMessage = '';
    this.authForm.reset();

    const emailControl = this.authForm.get('email');
    if (this.authMode === 'register') {
      emailControl?.setValidators([Validators.required, Validators.email]);
    } else {
      emailControl?.clearValidators();
    }
    emailControl?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.authForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    const { username, password, email } = this.authForm.value;

    if (this.authMode === 'login') {
      this.authService.login(username, password).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.detail || 'Login failed. Please try again.';
        }
      });
    } else {
      this.authService.register({ username, password, email }).subscribe({
        next: () => {
          this.authService.login(username, password).subscribe({
            next: () => {
              this.isLoading = false;
              this.router.navigate(['/']);
            },
            error: () => {
              this.isLoading = false;
              this.authMode = 'login';
              this.errorMessage = 'Account created, but automatic login failed. Please sign in.';
            }
          });
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.detail || 'Registration failed. Please try again.';
        }
      });
    }
  }
}


