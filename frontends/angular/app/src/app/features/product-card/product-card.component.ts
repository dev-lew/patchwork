import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../models/product';

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

  toggleHover(state: boolean) {
    this.isHovered = state;
    
    // Play/Pause video logic
    if (this.videoRef) {
      const video = this.videoRef.nativeElement;
      state ? video.play() : video.pause();
    }
  }

  // playVideo(video: HTMLVideoElement) {
  //   if (!video) return;

  //   const playPromise = video.play();

  //   // important: avoid uncaught promise errors in some browsers
  //   if (playPromise !== undefined) {
  //     playPromise.catch(() => {});
  //   }
  // }

  // pauseVideo(video: HTMLVideoElement) {
  //   if (!video) return;
  //   video.pause();
  //   video.currentTime = 0; // optional: reset for consistent hover UX
  // }
}