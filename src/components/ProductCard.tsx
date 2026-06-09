import React from 'react';
import { ShoppingCart, Heart, MessageCircle } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  key?: string | number;
  product: Product;
  onAddToCart: (id: string | number) => void;
  onInstantBuy: (product: Product) => void;
  isLiked: boolean;
  onToggleLike: (id: string | number) => void;
  currencySymbol: string;
}

export default function ProductCard({
  product,
  onAddToCart,
  onInstantBuy,
  isLiked,
  onToggleLike,
  currencySymbol,
}: ProductCardProps) {
  const { id, cat, name, sz, price, was, disc, tag, image, images, brand } = product;

  // Track active image from multiple images list
  const [activeImgIndex, setActiveImgIndex] = React.useState(0);

  // Safely gather all images
  const allImages = React.useMemo(() => {
    const list = [image];
    if (images && Array.isArray(images)) {
      images.forEach(img => {
        if (img && img.trim()) {
          list.push(img);
        }
      });
    }
    return list;
  }, [image, images]);

  // Adjust activeImgIndex if it goes out of bounds when images change
  const safeImgIndex = activeImgIndex >= allImages.length ? 0 : activeImgIndex;
  const currentImage = allImages[safeImgIndex] || image;

  return (
    <div
      id={`product-card-${id}`}
      className="bg-white rounded-[24px] border border-zinc-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col hover:shadow-[0_12px_30px_rgba(0,0,0,0.05)] hover:border-zinc-300 transition-all duration-300 group"
    >
      {/* Product Image Container */}
      <div className="relative pt-[100%] bg-zinc-50/50 overflow-hidden select-none border-b border-zinc-100/50">
        {/* Main Product Image */}
        <img
          src={currentImage}
          alt={name}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-contain p-6 transform group-hover:scale-102 transition-transform duration-300"
          loading="lazy"
        />

        {/* Wishlist Button */}
        <button
          onClick={() => onToggleLike(id)}
          className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center border shadow-sm transition-all duration-150 cursor-pointer z-10 ${
            isLiked
              ? 'bg-black border-black text-white scale-105'
              : 'bg-white border-zinc-200 text-zinc-400 hover:text-black hover:border-zinc-300'
          }`}
          title="Add to Wishlist"
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        </button>

        {/* Promo Bags / Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
          {disc > 0 && (
            <span className="bg-red-50 text-red-600 border border-red-100 font-sans text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide uppercase shadow-2xs">
              {disc}% OFF
            </span>
          )}
          {tag === 'new' && (
            <span className="bg-zinc-900 text-white font-sans text-[9px] font-bold px-2.5 py-1 rounded-full tracking-wide uppercase shadow-2xs">
              New In
            </span>
          )}
          {tag === 'sale' && (
            <span className="bg-amber-50 text-amber-700 border border-amber-100 font-sans text-[9px] font-bold px-2.5 py-1 rounded-full tracking-wide uppercase shadow-2xs">
              Clearance
            </span>
          )}
        </div>

        {/* Boot/Wear Size Overlay */}
        <div className="absolute bottom-3 left-4 bg-white/90 text-zinc-850 text-[10px] font-semibold py-1 px-2.5 rounded-full backdrop-blur-xs font-mono border border-zinc-200 shadow-2xs z-10">
          Size: {sz}
        </div>

        {/* Additional Images Switchers */}
        {allImages.length > 1 && (
          <div 
            className="absolute bottom-3 right-4 flex items-center gap-1.5 z-20 bg-white/70 backdrop-blur-xs p-1 rounded-full border border-zinc-200/50 shadow-3xs" 
            onClick={(e) => e.stopPropagation()}
          >
            {allImages.map((img, idx) => (
              <button
                key={idx}
                onMouseEnter={() => setActiveImgIndex(idx)}
                onClick={() => setActiveImgIndex(idx)}
                className={`w-5 h-5 rounded-full border bg-white overflow-hidden transition-all duration-150 p-0.5 cursor-pointer ${
                  safeImgIndex === idx
                    ? 'border-zinc-950 ring-1 ring-zinc-950/30 scale-110'
                    : 'border-zinc-200 opacity-60 hover:opacity-100 hover:scale-105'
                }`}
                title={`View variant photo ${idx + 1}`}
              >
                <img src={img} alt="" className="w-full h-full object-contain rounded-full" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="p-5 flex-1 flex flex-col justify-between bg-white">
        <div>
          {/* Brand & Category */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[9px] font-extrabold uppercase text-zinc-400 tracking-widest font-sans">
              {cat === 'boots' 
                ? 'Football Boots' 
                : cat === 'jersey' 
                  ? `${(product.jerseyType || 'fan').toUpperCase()} EDITION` 
                  : cat === 'gloves' 
                    ? 'Goalkeeper Gloves' 
                    : cat === 'football' 
                      ? 'Match Ball' 
                      : 'Accessory'}
            </span>
            {brand && (
              <span className="text-[9px] bg-zinc-50 border border-zinc-100 text-zinc-500 font-bold px-2.5 py-0.5 rounded-full uppercase">
                {brand}
              </span>
            )}
          </div>

          {/* Product Name */}
          <h3 className="text-zinc-850 font-bold text-sm leading-snug group-hover:text-black transition-colors line-clamp-2 mb-2">
            {name}
          </h3>
        </div>

        {/* Price and Instant Purchase */}
        <div className="mt-3">
          {/* Prices Row */}
          <div className="flex items-baseline gap-2 mb-3.5">
            <span className="text-lg font-black text-zinc-950 font-sans">
              {currencySymbol}{price.toLocaleString('en-IN')}
            </span>
            {was > price && (
              <span className="text-xs text-zinc-400 line-through">
                {currencySymbol}{was.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {/* Add To Cart */}
            <button
              onClick={() => onAddToCart(id)}
              className="flex items-center justify-center gap-1.5 bg-black hover:bg-zinc-800 text-white py-2.5 px-3 rounded-xl text-xs font-bold font-sans uppercase tracking-wider transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Add Cart
            </button>

            {/* Instant WhatsApp Buy */}
            <button
              onClick={() => onInstantBuy(product)}
              className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-3 rounded-xl text-xs font-bold font-sans uppercase tracking-wider transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs"
              title="Buy instantly on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
