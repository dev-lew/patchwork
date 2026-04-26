import { CommonModule } from '@angular/common';
import { Component, DOCUMENT, ElementRef, EventEmitter, Inject, Input, OnDestroy, OnInit, Output, Renderer2, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Product } from '../../models/product';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { Subscription } from 'rxjs';

const FREE_SHIPPING_THRESHOLD = 75;

@Component({
  selector: 'app-cart-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cart-modal.component.html',
  styleUrl: './cart-modal.component.css',
})
export class CartModalComponent implements OnInit, OnDestroy {
  @Input() cartOpen = false;

  @Output() searchOpenChange = new EventEmitter<boolean>();
  @Output() close = new EventEmitter<void>();

  cartId: string = '';
  cartItems: Product[] = [];
  products: Product[] = [];
  private scrollPosition = 0;
  private addSub!: Subscription;

  @ViewChild('searchInput') CartInput!: ElementRef;

  constructor(
    private cartService: CartService,
    private productService: ProductService,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) { }


  async ngOnInit() {
    this.productService.getProducts().subscribe(data => {
      this.products = data;
      this.refreshCart();
    });

    this.addSub = this.cartService.itemAdded$.subscribe((product: Product) => {
      const existing = this.cartItems.find(i => i.id === product.id);

      if (existing) {
        existing.quantity += 1;
      } else {
        this.cartItems = [...this.cartItems, { ...product, quantity: 1 }];
      }
    });

  }

async ngOnChanges(changes: SimpleChanges) {
    if (changes['cartOpen']) {
      const body = this.document.body;

      if (this.cartOpen) {
        this.scrollPosition = window.pageYOffset;
        this.renderer.addClass(body, 'no-scroll');
        this.renderer.setStyle(body, 'top', `-${this.scrollPosition}px`);

        setTimeout(() => this.focusInput(), 0);
        await this.refreshCart();
      } else {
        this.unlockBody();
      }
    }
  }

  ngOnDestroy(): void {
    this.addSub?.unsubscribe();
    this.unlockBody();
  }

  private unlockBody() {
    const body = this.document.body;

    this.renderer.removeClass(body, 'no-scroll');
    this.renderer.removeStyle(body, 'top');
    window.scrollTo(0, this.scrollPosition);
  }

  async refreshCart() {
    const dbItems = await this.cartService.loadCartItems();
    console.log(dbItems);

    this.cartItems = dbItems.map(dbItem => {
      const fullProduct = this.products.find(p => p.id === dbItem.product_id);

      return {
        ...fullProduct,
        quantity: dbItem.quantity
      } as Product;
    }).filter(p => p.id !== undefined);
    console.log(this.cartItems);
  }

  async addToCart(product: Product): Promise<void> {
    await this.cartService.addToCart(product);
  }

  async removeFromCart(id: string) {
    this.cartItems = this.cartItems.filter(i => i.id !== id);
    await this.cartService.removeFromCart(id);
  }

  async updateQuantity(id: string, delta: number) {
    const item = this.cartItems.find(i => i.id === id);
    if (item) {
      item.quantity = Math.max(0, item.quantity + delta);

      if (item.quantity === 0) {
        this.cartItems = this.cartItems.filter(i => i.id !== id);
      }
    }

    await this.cartService.updateQuantity(id, delta);
  }

  async setQuantity(id: string, value: string) {
    const n = parseInt(value, 10);

    if (!isNaN(n) && n > 0) {
      const item = this.cartItems.find(i => i.id === id);
      if (item) item.quantity = n;
    } else if (n === 0) {
      this.cartItems = this.cartItems.filter(i => i.id !== id);
    }

    await this.cartService.setQuantity(id, value);
  }

  ngAfterViewInit() {
    if (this.cartOpen) {
      this.focusInput();
    }
  }

  focusInput() {
    this.CartInput?.nativeElement?.focus();
  }

  onBackdropClick() {
    this.closeCart();
  }

  closeCart() {
    this.cartOpen = false;
    this.unlockBody();
    this.close.emit();
  }

  currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  formatPrice(value: number): string {
    return this.currency.format(value);
  }

  checkout(): void {
    this.cartItems = [];
    this.cartOpen = false;
    this.unlockBody();
    this.cartService.clearLocalCart();
    this.close.emit();
  }

  get cartTotal(): number {
    return this.cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }

  get cartCount(): number {
    return this.cartItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
  }

  get shippingRemaining(): number {
    return Math.max(0, FREE_SHIPPING_THRESHOLD - this.cartTotal);
  }

  get shippingProgress(): number {
    return Math.min(
      100,
      (this.cartTotal / FREE_SHIPPING_THRESHOLD) * 100
    );
  }

  get upsellProducts(): Product[] {
    const inCartIds = new Set(this.cartItems.map(i => i.id));

    return this.products
      .filter(p => !inCartIds.has(p.id))
      .slice(0, 6);
  }

  getImageUrl(url: string): string {
    return url.startsWith('/')
      ? `http://localhost:8000${url}`
      : url;
  }

  trackById(index: number, item: any) {
    return item.id;
  }
}
