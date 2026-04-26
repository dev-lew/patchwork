import { Component, EventEmitter, HostListener, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() searchOpen = false;
  @Output() openSearch = new EventEmitter<void>();
  @Output() openCart = new EventEmitter<void>();
  
  isSticky: boolean = false;
  cartCount$: Observable<number>;
  currentUser$: Observable<string | null>;
  private authSubscription!: Subscription;

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.cartCount$ = this.cartService.cartCount$;
  }

  ngOnInit() {
    this.cartService.loadCartItems();
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isSticky = window.pageYOffset > 40;
  }

  onSearchClick() {
    this.openSearch.emit();
  }

  onCartClick() {
    this.openCart.emit();
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/']); 
      },
      error: (err) => {
        console.error('Logout failed:', err);
      }
    });
  }
}


