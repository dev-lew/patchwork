import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { CartModalComponent } from '../cart-modal/cart-modal.component';
import { FooterComponent } from '../footer/footer.component';
import { HeaderComponent } from '../header/header.component';
import { HeroComponent } from '../hero/hero.component';
import { ProductsComponent } from '../products/products.component';
import { SearchModalComponent } from '../search-modal/search-modal.component';

@Component({
  selector: 'app-homepage',
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    ProductsComponent,
    HeroComponent,
    SearchModalComponent,
    CartModalComponent,
    FooterComponent
  ],
  templateUrl: './homepage.component.html',
  styleUrl: './homepage.component.css'
})
export class HomeComponent {
  searchOpen = false;
  cartOpen = false;

  openSearch() {
    this.searchOpen = true;
  }

  closeSearch() {
    this.searchOpen = false;
  }

  openCart() {
    this.cartOpen = true;
  }

  closeCart() {
    this.cartOpen = false;
  }
}