import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { Product } from '../models/product';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'http://localhost:8000/api/products';

  private products$: Observable<Product[]> | null = null;

  constructor(private http: HttpClient) { }

  getProducts(): Observable<Product[]> {
    if (!this.products$) {
      this.products$ = this.http.get<Product[]>(this.apiUrl).pipe(shareReplay(1));
    }
    return this.products$;
  }
}
