import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { ProductService } from '../../services/product.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../models/product';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-search-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-modal.component.html',
  styleUrls: ['./search-modal.component.css']
})
export class SearchModalComponent implements AfterViewInit, OnInit {
  @Input() cartCount = 0;
  @Input() searchOpen = false;
  @Output() close = new EventEmitter<void>();

  @ViewChild('searchInput') searchInput!: ElementRef;

  searchQuery = '';
  searchResults: Product[] = [];
  products: Product[] = [];
  popularSearches: Product[] = [];
  cartItems: any[] = [];
  addingProductId: number | null = null;

  accountOpen = false;

  constructor(
    private productService: ProductService,
    private cartService: CartService
  ) { }

  ngOnInit() {
    this.productService.getProducts().subscribe(products => {
      this.products = products;
      this.popularSearches = this.getRandomProducts(this.products, 3);
    });
  }

  ngAfterViewInit() {
    if (this.searchOpen) {
      this.focusInput();
    }
  }

  ngOnChanges() {
    if (this.searchOpen) {
      setTimeout(() => this.focusInput(), 0);
    }
  }

  focusInput() {
    this.searchInput?.nativeElement?.focus();
  }

  onCloseClick() {
    this.close.emit();
  }

  onBackdropClick() {
    this.onCloseClick();
  }

  onSearchChange(value: string) {
    this.searchQuery = value;
    this.applyFilter(value);
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
  }

  getRandomProducts(products: Product[], count: number = 3): Product[] {
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  trackById(index: number, item: any) {
    return item.id;
  }

  private applyFilter(query: string) {
    const q = query.trim().toLowerCase();

    if (!q) {
      this.searchResults = [];
      return;
    }

    this.searchResults = this.products.filter(product => {
      const nameMatch = product.name?.toLowerCase().includes(q);

      const categoryMatch = product.categories?.some(category =>
        category?.toLowerCase().includes(q)
      );

      return nameMatch || categoryMatch;
    });
  }

  async addToCart(product: Product): Promise<void> {
    await this.cartService.addToCart(product);
  }

  onAddClick(event: Event, product: any) {
    event.stopPropagation();
    this.addToCart(product);
  }

  setSearchQuery(term: string): void {
    this.searchQuery = term;
    this.applyFilter(term);
  }

  getImageUrl(url: string): string {
    return url.startsWith('/')
      ? `http://localhost:8000${url}`
      : url;
  }

  formatPrice(value: number): string {
    return this.currency.format(value);
  }
}