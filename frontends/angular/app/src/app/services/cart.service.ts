import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, Subject } from 'rxjs';
import { Product } from '../models/product';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CartService {
    private readonly STORAGE_KEY = 'app_cart_id';

    private cartId: string | null = null;
    private cartItems: Product[] = [];
    public itemAdded$ = new Subject<Product>();
    private cartCountSubject = new BehaviorSubject<number>(0);
    public cartCount$ = this.cartCountSubject.asObservable()

    constructor(private http: HttpClient) {
        if (typeof window !== 'undefined') {
            this.cartId = localStorage.getItem(this.STORAGE_KEY);
        }
    }

    private calculateCount() {
        const total = this.cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        this.cartCountSubject.next(total);
    }


    async getOrCreateCartId(username?: string): Promise<string> {
        if (this.cartId) return this.cartId;

        this.cartId = crypto.randomUUID();

        if (typeof window !== 'undefined') {
            localStorage.setItem(this.STORAGE_KEY, this.cartId);
        }

        let url = `${environment.apiUrl}/api/carts?id=${this.cartId}`;

        if (username) {
            url += `&username=${encodeURIComponent(username)}`;
        }

        try {
            await firstValueFrom(
                this.http.post(url, null, {
                    withCredentials: true,
                    headers: {
                        'api-key': environment.apiKey
                    }
                })
            );
        } catch (e: any) {
            if (e.status === 401) {
                console.log('No session found. Generating guest session...');
                await firstValueFrom(
                    this.http.post(`${environment.apiUrl}/api/sessions/guest`, null, {
                        withCredentials: true,
                        headers: {
                            'api-key': environment.apiKey
                        }
                    })
                );
                await firstValueFrom(
                    this.http.post(url, null, {
                        withCredentials: true,
                        headers: {
                            'api-key': environment.apiKey
                        }
                    })
                );
            } else {
                console.error('Error creating cart:', e);
            }
        }

        return this.cartId;
    }

    async addToCart(product: Product): Promise<void> {
        this.itemAdded$.next(product);
        const existing = this.cartItems.find(i => i.id === product.id);

        if (existing) {
            this.cartItems = this.cartItems.map(i =>
                i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
            );
        } else {
            this.cartItems = [...this.cartItems, { ...product, quantity: 1 }];
        }

        const cid = await this.getOrCreateCartId();
        this.calculateCount();

        try {
            await firstValueFrom(
                this.http.post(`/api/carts/${cid}/items`,
                    { product_id: product.id, quantity: 1 },
                    {
                        withCredentials: true, headers: {
                            'api-key': environment.apiKey
                        }
                    }
                )
            );
        } catch (e) {
            console.error('Error adding item to cart API', e);
        }
    }

    async removeFromCart(productId: string): Promise<void> {
        this.cartItems = this.cartItems.filter(i => {
            const itemId = (i as any).id || (i as any).product_id;
            return itemId !== productId;
        });


        if (!this.cartId) return;
        this.calculateCount();

        try {
            await firstValueFrom(
                this.http.delete(`/api/carts/${this.cartId}/items/${productId}`, {
                    withCredentials: true,
                    headers: {
                        'api-key': environment.apiKey
                    }
                })
            );
        } catch (e) {
            console.error('Error removing item from cart API', e);
        }
    }

    async updateQuantity(productId: string, delta: number): Promise<void> {
        const item = this.cartItems.find(i => {
            const itemId = (i as any).id || (i as any).product_id;
            return itemId === productId;
        });

        if (!item) return;

        const newQty = Math.max(0, item.quantity + delta);

        if (newQty === 0) {
            await this.removeFromCart(productId);
            return;
        }

        this.cartItems = this.cartItems.map(i =>
            i.id === productId ? { ...i, quantity: newQty } : i
        );

        if (!this.cartId) return;
        this.calculateCount();

        try {
            await firstValueFrom(
                this.http.patch(`/api/carts/${this.cartId}/items/${productId}?quantity=${newQty}`, null, {
                    withCredentials: true,
                    headers: {
                        'api-key': environment.apiKey
                    }
                })
            );
        } catch (e) {
            console.error('Error updating quantity API', e);
        }
    }

    async setQuantity(productId: string, val: string): Promise<void> {
        const n = parseInt(val, 10);

        if (isNaN(n) || n <= 0) {
            await this.removeFromCart(productId);
            return;
        }

        const item = this.cartItems.find(i => {
            const itemId = (i as any).id || (i as any).product_id;
            return itemId === productId;
        });
        if (item) {
            const delta = n - item.quantity;
            await this.updateQuantity(productId, delta);
        }
    }

    async loadCartItems(): Promise<any[]> {
        const cid = await this.getOrCreateCartId();
        if (!cid) return [];

        try {
            const items = await firstValueFrom(
                this.http.get<any[]>(`${environment.apiUrl}/api/carts/${cid}/items`, {
                    withCredentials: true,
                    headers: { 'api-key': environment.apiKey }
                })
            );

            this.cartItems = items.map(item => ({
                ...item,
                id: item.id || item.product_id
            }));

            this.calculateCount();
            return this.cartItems;

        } catch (e: any) {
            if (e.status === 404) {
                console.warn('Stale Cart ID detected. Clearing and resetting...');
                this.clearLocalCart();
                return [];
            }

            console.error('Error fetching cart items:', e);
            return this.cartItems;
        }
    }

    getItems() {
        return this.cartItems;
    }

    getCartId() {
        return this.cartId;
    }

    clearLocalCart() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(this.STORAGE_KEY);
        }
        this.cartId = null;
        this.cartItems = [];
        this.calculateCount();
    }
}