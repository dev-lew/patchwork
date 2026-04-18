export interface Product {
  id: string;
  name: string;
  description: string;
  picture: string;
  price: number;
  compare_at_price: number | null;
  quantity: number;
  handle: string;
  variant_label: string | null;
  badge_text: string | null;
  rating: number;
  review_count: number;
  categories: string[];
  hover_picture?: string;
  hover_video?: string;
}
