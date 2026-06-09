export interface Product {
  id: string | number;
  cat: 'boots' | 'jersey' | 'gloves' | 'football' | 'access' | string;
  bootType?: 'fg' | 'sg' | 'turf' | string; // Subcategory for boots: FG, SG, Turf
  jerseyType?: 'retro' | 'player' | 'fan' | 'master' | 'kids' | 'nfl' | 'ipl' | string; // Subcategory for jerseys
  name: string;
  sz: string;
  price: number;
  was: number;
  disc: number; // Discount percentage
  tag: 'new' | 'sale' | 'regular';
  image: string; // Base64 data or standard URL
  images?: string[]; // Multiple extra photos
  brand?: string;
  description?: string;
}

export interface CartItem extends Product {
  qty: number;
}

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'discount-desc' | 'name-asc';

export interface StoreSettings {
  whatsappNumber: string;
  storeName: string;
  currencySymbol: string;
}
