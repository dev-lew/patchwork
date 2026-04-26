import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../models/product';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Input() baseUrl: string = 'http://localhost:8000';
  
  @ViewChild('hoverVideo') videoRef?: ElementRef<HTMLVideoElement>;
  
  isHovered = false;

  constructor(private cartService: CartService) { }

  toggleHover(state: boolean) {
    this.isHovered = state;
    
    if (this.videoRef) {
      const video = this.videoRef.nativeElement;
      state ? video.play() : video.pause();
    }
  }

  async addToCart(product: Product): Promise<void> {
    await this.cartService.addToCart(product);
  }
}