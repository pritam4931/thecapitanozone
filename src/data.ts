import { Product } from './types';

// Let's set premium, curated high-resolution soccer gear images for maximum fidelity!
export const CATEGORY_DEFAULTS: Record<string, { title: string; image: string; icon: string }> = {
  boots: {
    title: 'Football Boots',
    image: 'https://images.unsplash.com/photo-1542362567-b07eac790947?w=600&auto=format&fit=crop&q=80',
    icon: 'Footprints'
  },
  jersey: {
    title: 'Club & National Jerseys',
    image: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=600&auto=format&fit=crop&q=80',
    icon: 'Shirt'
  },
  gloves: {
    title: 'Goalkeeper Gloves',
    image: 'https://images.unsplash.com/photo-1600250395178-40fe752e5189?w=600&auto=format&fit=crop&q=80',
    icon: 'HandMetal' // We will use a reliable lucide icon or generic Hand
  },
  football: {
    title: 'Footballs',
    image: 'https://images.unsplash.com/photo-1543326137-f363668c5821?w=600&auto=format&fit=crop&q=80',
    icon: 'CircleDot'
  },
  access: {
    title: 'Gear Bags & Accessories',
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&auto=format&fit=crop&q=80',
    icon: 'Dribbble' // For accessories
  },
  pants: {
    title: 'Track Pants',
    image: 'https://images.unsplash.com/photo-1552664180-819ad7ec1142?w=600&auto=format&fit=crop&q=80',
    icon: 'Footprints'
  },
};

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_SETTINGS = {
  whatsappNumber: '9474693877', // Default updated to user choice
  storeName: 'THE CAPITANO ZONE',
  currencySymbol: '₹',
};
