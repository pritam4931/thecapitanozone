import React from 'react';
import { Search, ShoppingCart, ShieldAlert, ArrowLeft, Instagram, MessageCircle, Globe, User, LogOut } from 'lucide-react';
import { CartItem, StoreSettings } from '../types';
import Logo from './Logo';
import { User as FirebaseUser } from 'firebase/auth';
import { loginWithGoogle, logout } from '../firebase';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  cart: CartItem[];
  setIsCartOpen: (open: boolean) => void;
  isAdminOpen: boolean;
  setIsAdminOpen: (open: boolean) => void;
  settings: StoreSettings;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedTag: 'all' | 'new' | 'sale';
  setSelectedTag: (tag: 'all' | 'new' | 'sale') => void;
  user: FirebaseUser | null;
}

export default function Header({
  searchQuery,
  setSearchQuery,
  cart,
  setIsCartOpen,
  isAdminOpen,
  setIsAdminOpen,
  settings,
  selectedCategory,
  setSelectedCategory,
  selectedTag,
  setSelectedTag,
  user,
}: HeaderProps) {
  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);
  const totalPrice = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

  const navItems = [
    { label: 'HOME', cat: 'all', tag: 'all' as const },
    { label: 'FOOTBALL BOOTS', cat: 'boots', tag: 'all' as const },
    { label: 'JERSEYS', cat: 'jersey', tag: 'all' as const },
    { label: 'GLOVES', cat: 'gloves', tag: 'all' as const },
    { label: 'ACCESSORIES', cat: 'access', tag: 'all' as const },
    { label: 'FOOTBALLS', cat: 'football', tag: 'all' as const },
    { label: 'OFFERS', cat: 'all', tag: 'sale' as const },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#050505] text-white shadow-md border-b border-zinc-900 font-sans">
      {/* 1. Upper Brilliant Yellow Announcement Bar */}
      <div className="bg-[#facd15] text-black px-4 py-2 text-[10px] sm:text-xs font-extrabold tracking-wider select-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 uppercase">
          <div className="flex items-center gap-1.5">
            <span>⚡ FREE SHIPPING ON ORDERS ABOVE ₹1499</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 font-extrabold">
            <span>⚽ 100% ORIGINAL PRODUCTS</span>
            <span className="text-black/30">|</span>
            <span>EASY RETURNS</span>
            <span className="text-black/30">|</span>
            <span>COD AVAILABLE</span>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:scale-110 transition-transform">
              <Instagram className="w-3.5 h-3.5" />
            </a>
            <a href={`https://wa.me/91${settings.whatsappNumber}`} target="_blank" rel="noreferrer" className="hover:scale-110 transition-transform">
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
            </a>
            <a href="#" className="hover:scale-110 transition-transform">
              <Globe className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* 2. Main Premium Dark Header Row */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo and Brand Section */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setSelectedCategory('all');
              setSelectedTag('all');
              setSearchQuery('');
              setIsAdminOpen(false);
            }}
            className="flex items-center gap-3 group"
          >
            <Logo className="h-14 sm:h-20 w-auto transition-transform hover:scale-[1.03] duration-200" />
          </a>

          {/* Controls - Mobile Only */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setIsAdminOpen(!isAdminOpen)}
              className={`p-2 rounded-full transition-all flex items-center justify-center ${
                isAdminOpen ? 'bg-yellow-400 text-black' : 'bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-850'
              }`}
              title="Seller Portal"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
            <div
              onClick={() => setIsCartOpen(true)}
              className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-[#facd15] flex items-center justify-center relative cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-white" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-yellow-400 text-black font-extrabold text-[10px] rounded-full flex items-center justify-center shadow-sm">
                  {totalItems}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar - Center aligned */}
        <div className="w-full md:max-w-md relative flex items-center">
          <input
            id="searchProducts"
            type="text"
            placeholder="Search for products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111] border border-zinc-800 text-white placeholder-zinc-500 rounded-full py-2.5 pl-6 pr-12 text-xs outline-none focus:border-[#facd15] focus:bg-[#161616] transition-all font-sans"
          />
          <div className="absolute right-4 text-zinc-400 flex items-center gap-2 pointer-events-none">
            <Search className="w-4 h-4 text-[#facd15]" />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-10 text-[9px] text-zinc-500 hover:text-white cursor-pointer mr-1 font-semibold uppercase tracking-wider"
            >
              Clear
            </button>
          )}
        </div>

        {/* Action Widgets - Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {/* Seller Toggle Panel Button */}
          <button
            onClick={() => setIsAdminOpen(!isAdminOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-200 border cursor-pointer ${
              isAdminOpen
                ? 'bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700'
                : 'bg-yellow-400 text-black border-transparent hover:bg-yellow-300'
            }`}
          >
            {isAdminOpen ? (
              <>
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Store ⚽
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5" />
                Seller Room
              </>
            )}
          </button>

          {/* Login / Auth Indicator Widget */}
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    className="w-6 h-6 rounded-full border border-[#facd15]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#facd15] text-black font-extrabold flex items-center justify-center text-[10px]">
                    {user.email?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col items-start leading-none">
                  <span className="font-bold text-[10px] text-white truncate max-w-[100px]" title={user.displayName || user.email || ''}>
                    {user.displayName || 'Store manager'}
                  </span>
                  {user.email?.toLowerCase().trim() === 'pdey4931@gmail.com' ? (
                    <span className="text-[7.5px] font-black tracking-widest text-[#facd15] uppercase mt-0.5">Admin Badge ★</span>
                  ) : (
                    <span className="text-[7.5px] font-semibold text-zinc-400 mt-0.5">Customer</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="p-1 px-2 border border-zinc-800 text-zinc-400 hover:text-white rounded-md text-[10px] uppercase font-black tracking-wide flex items-center gap-1 hover:border-red-500 hover:bg-red-500/10 cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-3 h-3 text-red-550" />
                OFF
              </button>
            </div>
          ) : (
            <div
              onClick={() => loginWithGoogle()}
              className="flex items-center gap-2 text-xs text-zinc-300 hover:text-[#facd15] cursor-pointer transition-colors"
              title="Sign In with Google"
            >
              <User className="w-4 h-4 text-[#facd15]" />
              <span className="font-bold text-[10px] uppercase tracking-wider">Sign In</span>
            </div>
          )}

          {/* Shopping Cart Drawer Trigger Widget */}
          <div
            id="desktopCartWidget"
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-3 text-white cursor-pointer group transition-all"
          >
            <div className="relative bg-[#111] border border-zinc-800 p-2.5 rounded-full group-hover:border-[#facd15] transition-colors">
              <ShoppingCart className="w-4 h-4 text-white" />
              <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-yellow-400 text-black font-extrabold text-[9px] rounded-full flex items-center justify-center leading-none shadow-md">
                {totalItems}
              </span>
            </div>
            <div className="flex flex-col text-left leading-tight font-sans">
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold">My Cart</span>
              <span className="text-[#facd15] text-xs font-black mt-0.5">{settings.currencySymbol}{totalPrice.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Underneath Filter Buttons Row */}
      <div className="border-t border-zinc-900 bg-[#050505] overflow-x-auto select-none">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-center gap-1 md:gap-2 py-2">
          {navItems.map((item) => {
            const isHome = item.label === 'HOME';
            const isActiveCategory = selectedCategory === item.cat && selectedTag === item.tag && !isAdminOpen;
            const isOffersActive = item.label === 'OFFERS' && selectedTag === 'sale' && !isAdminOpen;
            const isHomeActive = isHome && selectedCategory === 'all' && selectedTag === 'all' && !isAdminOpen;
            const itemActive = isHomeActive || (isOffersActive && item.label === 'OFFERS') || (!isHome && isActiveCategory && item.label !== 'OFFERS');

            return (
              <button
                key={item.label}
                onClick={() => {
                  setSelectedCategory(item.cat);
                  setSelectedTag(item.tag);
                  setSearchQuery('');
                  setIsAdminOpen(false);
                  const el = document.getElementById('store-products');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`py-2 px-3 md:px-5 text-[10px] md:text-[11px] font-extrabold tracking-widest transition-all relative whitespace-nowrap cursor-pointer uppercase ${
                  itemActive
                    ? 'text-[#facd15]'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {itemActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#facd15] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
