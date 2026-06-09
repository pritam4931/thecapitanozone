import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Filter, ChevronDown, CheckCircle, Flame, 
  HelpCircle, Gift, MessageCircle, Star 
} from 'lucide-react';

import { Product, CartItem, StoreSettings, SortOption } from './types';
import { INITIAL_PRODUCTS, INITIAL_SETTINGS, CATEGORY_DEFAULTS } from './data';

import Header from './components/Header';
import ProductCard from './components/ProductCard';
import AdminPanel from './components/AdminPanel';
import CartDrawer from './components/CartDrawer';
import Logo from './components/Logo';
import { motion } from 'motion/react';

// Firebase core configuration imports
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

// @ts-ignore
import bannerImg from './assets/images/capitano_champions_banner_black_typo_1780684510996.png';
// @ts-ignore
import categoryBootsImg from './assets/images/category_boots_premium_1780750613070.png';
// @ts-ignore
import categoryJerseyImg from './assets/images/category_jersey_premium_1780750627877.png';
// @ts-ignore
import categoryGlovesImg from './assets/images/category_gloves_premium_1780750643729.png';
// @ts-ignore
import categoryFootballsImg from './assets/images/category_football_premium_1780750658041.png';
// @ts-ignore
import categoryAccessoriesImg from './assets/images/category_access_premium_1780750671726.png';
// @ts-ignore
import categoryPantsImg from './assets/images/category_pants_premium_1780750684346.png';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 16
    }
  }
};

const detectJerseyType = (name: string): string => {
  const ln = name.toLowerCase();
  if (ln.includes('retro')) return 'retro';
  if (ln.includes('player')) return 'player';
  if (ln.includes('fan')) return 'fan';
  if (ln.includes('master')) return 'master';
  if (ln.includes('kids') || ln.includes('child')) return 'kids';
  if (ln.includes('nfl')) return 'nfl';
  if (ln.includes('ipl')) return 'ipl';
  return 'fan'; // default edition
};

export default function App() {
  // ─── STATE INITIALIZATION ───
  
  // Firebase Google Authorized User session tracker state
  const [user, setUser] = useState<User | null>(null);

  // Products State synchronized with Firestore collection in subscriber effect
  const [products, setProducts] = useState<Product[]>([]);

  // Cart State with LocalStorage Persistence
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('capitano_cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CartItem[];
        return parsed.filter(item => typeof item.id === 'string' || item.id > 16);
      } catch (e) {
        console.error('Failed to parse saved cart', e);
      }
    }
    return [];
  });

  // Wishlist State with LocalStorage Persistence
  const [wishlist, setWishlist] = useState<(string | number)[]>(() => {
    const saved = localStorage.getItem('capitano_wishlist');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as (string | number)[];
        return parsed.filter(id => typeof id === 'string' || id > 16);
      } catch (e) {
        console.error('Failed to parse saved wishlist', e);
      }
    }
    return [];
  });

  // Global Store Settings synchronized with Firestore general document in subscriber effect
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);

  // Filter/Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBootType, setSelectedBootType] = useState<'all' | 'fg' | 'sg' | 'turf'>('all');
  const [selectedJerseyType, setSelectedJerseyType] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<'all' | 'new' | 'sale'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  const handleSetCategory = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedBootType('all');
    setSelectedJerseyType('all');
  };

  // UI state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // ─── SIDE EFFECTS (FIRESTORE & GOOGLE AUTH COORD) ───

  // 1. Subscribe to Google Auth Authentication changes
  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
  }, []);

  // 2. Real-Time Products Collection Subscription from Firebase Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          cat: data.cat || 'boots',
          bootType: data.bootType || '',
          jerseyType: data.jerseyType || '',
          name: data.name || '',
          sz: data.sz || '',
          price: Number(data.price) || 0,
          was: Number(data.was) || 0,
          disc: Number(data.disc) || 0,
          tag: data.tag || 'regular',
          image: data.image || '',
          brand: data.brand || '',
          description: data.description || '',
          images: data.images || []
        } as Product);
      });
      setProducts(items);
    }, (error) => {
      console.error("Firestore database product sync failed:", error);
    });
    return () => unsub();
  }, []);

  // 3. Real-Time General Settings Subscription from Firebase Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({
          whatsappNumber: data.whatsappNumber || INITIAL_SETTINGS.whatsappNumber,
          storeName: data.storeName || INITIAL_SETTINGS.storeName,
          currencySymbol: data.currencySymbol || INITIAL_SETTINGS.currencySymbol,
        });
      } else {
        // If settings doc doesn't exist yet on backend, default to INITIAL_SETTINGS
        setSettings(INITIAL_SETTINGS);
      }
    }, (error) => {
      console.error("Firestore database general settings sync failed:", error);
    });
    return () => unsub();
  }, []);

  // 4. Cart LocalStorage persistence
  useEffect(() => {
    localStorage.setItem('capitano_cart', JSON.stringify(cart));
  }, [cart]);

  // 5. Wishlist LocalStorage persistence
  useEffect(() => {
    localStorage.setItem('capitano_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // ─── NOTIFICATION TOASTER ───
  const triggerNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // ─── INTERACTION HANDLERS ───

  // Add Item to Cart
  const handleAddToCart = (id: string | number) => {
    const targetProduct = products.find(p => p.id === id);
    if (!targetProduct) return;

    setCart((prev) => {
      const existing = prev.find(item => item.id === id);
      if (existing) {
        triggerNotification(`Increased quantity of "${targetProduct.name}" in your cart! ⚽`);
        return prev.map(item => item.id === id ? { ...item, qty: item.qty + 1 } : item);
      }
      triggerNotification(`"${targetProduct.name}" added to cart! 🛒`);
      return [...prev, { ...targetProduct, qty: 1 }];
    });
  };

  // Toggle Wishlist Like
  const handleToggleLike = (id: string | number) => {
    const isAlreadyLiked = wishlist.includes(id);
    const targetProduct = products.find(p => p.id === id);
    if (isAlreadyLiked) {
      setWishlist(prev => prev.filter(item => item !== id));
      if (targetProduct) triggerNotification(`Removed "${targetProduct.name}" from wishlist.`);
    } else {
      setWishlist(prev => [...prev, id]);
      if (targetProduct) triggerNotification(`Added "${targetProduct.name}" to wishlist. ❤️`);
    }
  };

  // Immediate Single-Item WhatsApp Checkout (Direct Purchase)
  const handleInstantBuy = (product: Product) => {
    const formattedMessage = 
`⚽ *INSTANT PURCHASE REQUEST - ${settings.storeName}* ⚽

Hello! I want to order this specific item immediately:
- *Product:* ${product.name}
- 📏 *Size/Spec:* ${product.sz}
- 💰 *Price:* ${settings.currencySymbol}${product.price.toLocaleString('en-IN')}

📦 *My Shipping Details:*
- Name: _________________
- Shipping Address: _________________
- Contact No: _________________

Please verify stock so I can complete Cash-On-Delivery steps. Thanks!`;

    let formattedPhone = settings.whatsappNumber.replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(formattedMessage)}`;
    window.open(url, '_blank');
  };

  // Reset to Factory/Defaults (gated dynamically for administrator in Firestore)
  const handleResetToDefaults = async () => {
    if (!user || user.email?.toLowerCase().trim() !== 'pdey4931@gmail.com') {
      alert('Error: Only the bootstrapped administrator can perform this task.');
      return;
    }
    if (confirm('Warning: This will ERASE ALL PRODUCTS in the Firebase Shared Database and reset general settings. Wish to proceed?')) {
      try {
        const { deleteDoc } = await import('firebase/firestore');
        for (const product of products) {
          await deleteDoc(doc(db, 'products', String(product.id)));
        }
        await setDoc(doc(db, 'settings', 'general'), INITIAL_SETTINGS);
        setCart([]);
        setWishlist([]);
        triggerNotification('Cloud Database cleared and initial configuration reset! 🧼');
      } catch (err: any) {
        console.error(err);
        alert('Cloud reset failed: ' + err.message);
      }
    }
  };

  // ─── FILTER & SORT SYSTEM ───

  // List of unique active categories
  const categoryKeys = Object.keys(CATEGORY_DEFAULTS);

  // Dynamic products filtered list
  const filteredProducts = products.filter(product => {
    // Search match (name, description, brand, category)
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const matchesSearch = normalizedQuery === '' ||
      product.name.toLowerCase().includes(normalizedQuery) ||
      (product.brand && product.brand.toLowerCase().includes(normalizedQuery)) ||
      (product.description && product.description.toLowerCase().includes(normalizedQuery)) ||
      product.cat.toLowerCase().includes(normalizedQuery);

    // Category Match
    const matchesCategory = selectedCategory === 'all' || product.cat === selectedCategory;

    // Boot sole / ground subtype match
    const matchesBootType = selectedCategory !== 'boots' || selectedBootType === 'all' || (product.bootType === selectedBootType || (!product.bootType && selectedBootType === 'fg'));

    // Jersey subcategory match
    const pJerseyType = product.jerseyType || (product.cat === 'jersey' ? detectJerseyType(product.name) : 'fan');
    const matchesJerseyType = selectedCategory !== 'jersey' || selectedJerseyType === 'all' || pJerseyType === selectedJerseyType;

    // Segment Tag Match
    const matchesTag = selectedTag === 'all' || product.tag === selectedTag;

    return matchesSearch && matchesCategory && matchesBootType && matchesJerseyType && matchesTag;
  });

  // Sort Filtered Collection
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'discount-desc':
        return b.disc - a.disc;
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'featured':
      default:
        // Featured default ordering: 'new' and 'sale' items first
        if (a.tag === 'sale' && b.tag !== 'sale') return -1;
        if (b.tag === 'sale' && a.tag !== 'sale') return 1;
        if (a.tag === 'new' && b.tag !== 'new') return -1;
        if (b.tag === 'new' && a.tag !== 'new') return 1;
        return Number(b.id) - Number(a.id);
    }
  });

  // Dynamic counter of items in each category
  const getCategoryCount = (categoryKey: string) => {
    return products.filter(p => p.cat === categoryKey).length;
  };

  return (
    <div className="font-sans min-h-screen bg-[#f5f5f5] text-[#1a1a1a] flex flex-col justify-between selection:bg-black selection:text-white">
      {/* Dynamic Pop-up Notification Toaster */}
      {notification && (
        <div className="fixed bottom-6 left-6 z-50 bg-black text-white px-5 py-3.5 rounded-full shadow-xl flex items-center gap-3 animate-fadeIn border border-white/10">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
          <span className="text-xs font-semibold uppercase tracking-wider font-sans">{notification}</span>
        </div>
      )}

      {/* Main Global Header */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        cart={cart}
        setIsCartOpen={setIsCartOpen}
        isAdminOpen={isAdminOpen}
        setIsAdminOpen={setIsAdminOpen}
        settings={settings}
        selectedCategory={selectedCategory}
        setSelectedCategory={handleSetCategory}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
        user={user}
      />

      {/* Main Page Layout */}
      <main className="flex-grow pb-12">
        {isAdminOpen ? (
          /* Render Admin Panel / Upload Tool to fulfill 'this is my web i want to upload some product on it' */
          <div className="animate-fadeIn">
            <AdminPanel
              products={products}
              setProducts={setProducts}
              settings={settings}
              setSettings={setSettings}
              resetToDefaults={handleResetToDefaults}
              categoryKeys={categoryKeys}
              categoryDefaults={CATEGORY_DEFAULTS}
              user={user}
            />
          </div>
        ) : (
          /* Render Storefront View */
          <div>
            {/* Immersive Hero Header Concept Banner */}
            {!searchQuery && selectedCategory === 'all' && selectedTag === 'all' && (
              <>
                {/* Sports Hero Banner - Customized Capitano Zone Champions Graphic */}
                <section className="relative w-full overflow-hidden rounded-b-[32px] md:rounded-b-[48px] border-b border-zinc-200 bg-zinc-900 shadow-xs hover:shadow-md transition-shadow">
                  <div className="relative w-full aspect-[21/9] min-h-[200px] sm:min-h-[280px] md:min-h-[380px] lg:min-h-[460px]">
                    <img 
                      src={bannerImg}
                      alt="Capitano Champions Banner"
                      className="w-full h-full object-cover select-none pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Subtle aesthetic overlay to enrich contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

                    {/* Highly interactive click anchor for the entire banner */}
                    <a
                      href="#store-products"
                      onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById('store-products');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="absolute inset-0 cursor-pointer z-10"
                      title="Explore Champions Gear"
                    />

                    {/* Precise, responsive HTML Hotspot Button placed directly over the image button */}
                    <a
                      href="#store-products"
                      onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById('store-products');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="absolute bottom-[23%] left-[4.8%] md:bottom-[23.5%] md:left-[4.5%] lg:bottom-[24%] lg:left-[4.5%] w-[12.8%] h-[9.6%] min-w-[96px] min-h-[30px] sm:min-w-[124px] sm:min-h-[42px] max-w-[190px] flex items-center justify-center rounded-none cursor-pointer transform -skew-x-[11deg] bg-black hover:bg-[#121212] text-[#facd15] text-[7px] sm:text-[9px] md:text-xs font-black tracking-widest uppercase transition-all hover:scale-105 active:scale-95 shadow-lg select-none border border-black z-20 flex items-center gap-1 sm:gap-2"
                    >
                      <span className="transform skew-x-[11deg] font-black">SHOP NOW</span>
                      <span className="transform skew-x-[11deg] font-bold text-[8px] sm:text-xs">→</span>
                    </a>
                  </div>
                </section>

                {/* Trust Badges Strip (Directly Below Hero) */}
                <section className="bg-[#0a0a0a] border-b border-zinc-900 py-6 select-none mt-4 rounded-3xl">
                  <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-2 lg:grid-cols-5 gap-y-4 gap-x-2 divide-x-0 lg:divide-x divide-zinc-800 text-zinc-300">
                    <div className="flex items-center gap-3 justify-center px-4">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-[#facd15]">
                        🛡️
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] md:text-xs font-black uppercase text-white tracking-wider">100% ORIGINAL</span>
                        <span className="text-[8px] md:text-[9px] text-zinc-500 uppercase tracking-widest font-semibold">AUTHENTIC PRODUCTS</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 justify-center px-4">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-[#facd15]">
                        🔄
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] md:text-xs font-black uppercase text-white tracking-wider">EASY RETURNS</span>
                        <span className="text-[8px] md:text-[9px] text-zinc-500 uppercase tracking-widest font-semibold">HASSLE FREE RETURNS</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 justify-center px-4">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-[#facd15]">
                        🚚
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] md:text-xs font-black uppercase text-white tracking-wider">COD AVAILABLE</span>
                        <span className="text-[8px] md:text-[9px] text-zinc-500 uppercase tracking-widest font-semibold">PAY ON DELIVERY</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 justify-center px-4">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-[#facd15]">
                        🔒
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] md:text-xs font-black uppercase text-white tracking-wider">SECURE PAYMENTS</span>
                        <span className="text-[8px] md:text-[9px] text-zinc-500 uppercase tracking-widest font-semibold">100% SAFE CHECKOUT</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 justify-center px-4">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-[#facd15]">
                        ⚡
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] md:text-xs font-black uppercase text-white tracking-wider">FAST DELIVERY</span>
                        <span className="text-[8px] md:text-[9px] text-zinc-500 uppercase tracking-widest font-semibold">QUICK & RELIABLE</span>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            <div id="store-products" className="max-w-7xl mx-auto px-4 md:px-6 py-3">
              {/* Premium athletic category divider with dual horizontal gradients and a central glowing active star */}
              <div className="flex items-center justify-center gap-5 w-full max-w-2xl mx-auto mb-10 mt-12 px-4 select-none">
                <div className="h-[1px] bg-gradient-to-r from-transparent via-zinc-400/30 to-[#facd15] flex-1"></div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-550 text-[10px] font-black tracking-widest font-sans uppercase">CHAMPIONS SELECTOR</span>
                  <span className="text-[#facd15] text-sm animate-pulse">★</span>
                </div>
                <div className="h-[1px] bg-gradient-to-l from-transparent via-zinc-400/30 to-[#facd15] flex-1"></div>
              </div>

              {/* Gallery category selection grid - Deep Obsidian Luxury Theme */}
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 mb-12 px-1"
              >
                {[
                  { key: 'boots', title: 'FOOTBALL BOOTS', image: categoryBootsImg },
                  { key: 'jersey', title: 'JERSEYS', image: categoryJerseyImg },
                  { key: 'gloves', title: 'GLOVES', image: categoryGlovesImg },
                  { key: 'football', title: 'FOOTBALLS', image: categoryFootballsImg },
                  { key: 'access', title: 'ACCESSORIES', image: categoryAccessoriesImg },
                  { key: 'pants', title: 'TRACK PANTS', image: categoryPantsImg },
                ].map((item) => {
                  const isActive = selectedCategory === item.key;
                  return (
                    <motion.button
                      variants={itemVariants}
                      key={item.key}
                      onClick={() => {
                        handleSetCategory(item.key);
                        setSelectedTag('all');
                        const el = document.getElementById('store-products');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="group flex flex-col items-center bg-transparent cursor-pointer select-none focus:outline-none w-full"
                    >
                      {/* Deep Obsidian Matte-Black Card Aspect Box with Golden Borders */}
                      <div className={`w-full aspect-square bg-[#0c0c0d] border rounded-[28px] p-4.5 flex items-center justify-center transition-all duration-300 relative overflow-hidden ${
                        isActive
                          ? 'border-[#facd15] ring-[3px] ring-[#facd15]/25 shadow-[0_12px_35px_rgba(250,205,21,0.22)] scale-102 translate-y-[-3px]'
                          : 'border-zinc-800 hover:border-zinc-700 hover:bg-[#121214] hover:shadow-[0_10px_25px_rgba(0,0,0,0.4)] hover:translate-y-[-2px]'
                      }`}>
                        {/* Dynamic atmospheric metallic gold light glow/aura inside card */}
                        <div className={`absolute rounded-full blur-[35px] pointer-events-none transition-all duration-500 ${
                          isActive 
                            ? 'w-24 h-24 bg-[#facd15]/14 -right-2 -bottom-2' 
                            : 'w-20 h-20 bg-[#facd15]/4 group-hover:bg-[#facd15]/10 -right-5 -bottom-5'
                        }`} />
                        
                        {/* Soft visual circle behind the render image */}
                        <div className="absolute w-24 h-24 rounded-full bg-gradient-to-t from-zinc-800/20 to-transparent blur-md pointer-events-none group-hover:scale-115 transition-transform" />

                        {/* Top action indicator badge for the selected category */}
                        {isActive && (
                          <div className="absolute top-2.5 right-2.5 bg-[#facd15]/15 border border-[#facd15]/30 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <span className="text-[#facd15] text-[7.5px] font-black tracking-wider uppercase font-sans">ACTIVE</span>
                            <span className="text-[#facd15] text-[7px] leading-none">★</span>
                          </div>
                        )}

                        {/* Inventory Count Badge on Footer of image box */}
                        <div className="absolute bottom-2 inset-x-0 mx-auto w-fit bg-black/60 backdrop-blur-xs border border-zinc-800 px-2 py-0.5 rounded-full text-[8.5px] font-bold text-zinc-400 tracking-wider group-hover:text-zinc-200 group-hover:border-zinc-700 transition-all">
                          {getCategoryCount(item.key)} ITEMS
                        </div>

                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-contain max-h-[135px] transition-transform duration-300 transform group-hover:scale-108 group-hover:rotate-1"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Title display located strictly BELOW the illustration block with rich Gold/White accents */}
                      <span className={`mt-3.5 text-[10.5px] md:text-[11px] font-black tracking-widest uppercase transition-all duration-200 text-center px-1 font-sans truncate max-w-full leading-tight ${
                        isActive 
                          ? 'text-[#facd15] font-black scale-102 font-sans' 
                          : 'text-zinc-800 group-hover:text-amber-600'
                      }`}>
                        {item.title}
                      </span>
                    </motion.button>
                  );
                })}
              </motion.div>

              {/* Optional subcategory filter for Football Boots */}
              {selectedCategory === 'boots' && (
                <div className="mb-10 p-6 bg-zinc-900 text-white rounded-[32px] border border-zinc-800 shadow-sm relative overflow-hidden animate-fadeIn">
                  {/* Decorative background visual elements */}
                  <div className="absolute -right-24 -bottom-24 w-80 h-80 bg-[#facd15] rounded-full blur-[140px] opacity-15 pointer-events-none" />
                  <div className="absolute -left-24 -top-24 w-64 h-64 bg-zinc-700 rounded-full blur-[120px] opacity-10 pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#facd15] flex items-center gap-1.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#facd15] animate-ping" />
                          Soleplate Classifications
                        </span>
                        <h3 className="text-lg md:text-xl font-black font-sans uppercase tracking-wider mt-1">
                          SELECT SOLE &amp; STUD TYPE
                        </h3>
                        <p className="text-zinc-400 text-xs mt-0.5">
                          Premium match-grade boots customized to your pitch surface.
                        </p>
                      </div>

                      {/* Back / All selector button */}
                      <button
                        onClick={() => setSelectedBootType('all')}
                        className={`px-4.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                          selectedBootType === 'all'
                            ? 'bg-[#facd15] text-black shadow-sm scale-102'
                            : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700'
                        }`}
                      >
                        🔥 VIEW ALL BOOTS ({products.filter(p => p.cat === 'boots').length})
                      </button>
                    </div>

                    {/* Subtype Choice Cards Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        {
                          key: 'fg',
                          title: 'FG BOOTS',
                          subtitle: 'Firm Ground Cleats',
                          desc: 'Equipped with blade & conical plastic studs. Best match-play speed and traction on natural grass fields.',
                          badge: 'Pro Grass Sole',
                          bgGradient: 'from-amber-500/10 to-transparent hover:border-[#facd15]/50',
                          badgeBg: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                          borderActive: 'border-[#facd15] ring-2 ring-[#facd15]/20',
                          count: products.filter(p => p.cat === 'boots' && (p.bootType === 'fg' || !p.bootType)).length
                        },
                        {
                          key: 'sg',
                          title: 'SG BOOTS',
                          subtitle: 'Soft Ground Metal Studs',
                          desc: 'Equipped with screw-in metal studs. Delivers high grip on damp, wet, muddy field conditions so you never slip.',
                          badge: 'Wet/Wet Grass field',
                          bgGradient: 'from-blue-500/10 to-transparent hover:border-blue-500/50',
                          badgeBg: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                          borderActive: 'border-blue-500 ring-2 ring-blue-500/20',
                          count: products.filter(p => p.cat === 'boots' && p.bootType === 'sg').length
                        },
                        {
                          key: 'turf',
                          title: 'TURF BOOTS',
                          subtitle: 'TF / Artificial Grass',
                          desc: 'Fitted with dozens of low-profile rubber studs. Optimized comfort for five-a-side cages, turf, or hard courts.',
                          badge: 'Turf & Hard Ground',
                          bgGradient: 'from-emerald-500/10 to-transparent hover:border-emerald-500/50',
                          badgeBg: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                          borderActive: 'border-emerald-500 ring-2 ring-emerald-500/20',
                          count: products.filter(p => p.cat === 'boots' && p.bootType === 'turf').length
                        }
                      ].map((sub) => {
                        const isSelected = selectedBootType === sub.key;
                        return (
                          <button
                            key={sub.key}
                            onClick={() => setSelectedBootType(sub.key as any)}
                            className={`p-5 rounded-2xl bg-[#0e0e0e] text-left border transition-all duration-300 relative overflow-hidden group cursor-pointer ${
                              isSelected
                                ? sub.borderActive + ' bg-black'
                                : 'border-zinc-800 hover:bg-zinc-900/60'
                            }`}
                          >
                            <div className={`absolute inset-0 bg-gradient-to-br ${sub.bgGradient} opacity-30 group-hover:opacity-60 transition-opacity`} />
                            
                            <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                              <div className="flex items-start justify-between">
                                <span className="font-sans font-black tracking-widest text-[#facd15] text-[10px] uppercase">
                                  {sub.count} items live
                                </span>
                                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${sub.badgeBg}`}>
                                  {sub.badge}
                                </span>
                              </div>

                              <div>
                                <h4 className="text-sm font-black tracking-wide text-white uppercase group-hover:text-[#facd15] transition-colors flex items-center gap-2">
                                  <span>{sub.title}</span>
                                  {isSelected && <span className="text-xs text-[#facd15]">★</span>}
                                </h4>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                                  {sub.subtitle}
                                </p>
                                <p className="text-[11px] text-zinc-400 leading-snug font-medium mt-2">
                                  {sub.desc}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#facd15] self-end mt-1">
                                <span>{isSelected ? 'ACTIVE CATEGORY' : 'FILTER BOOTS'}</span>
                                <span className="text-xs group-hover:translate-x-1 transition-transform">→</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Optional subcategory filter for Soccer Jerseys */}
              {selectedCategory === 'jersey' && (
                <div className="mb-10 p-5 bg-zinc-900 text-white rounded-[32px] border border-zinc-800 shadow-sm relative overflow-hidden animate-fadeIn">
                  {/* Decorative background visual elements */}
                  <div className="absolute -right-24 -bottom-24 w-80 h-80 bg-[#facd15] rounded-full blur-[140px] opacity-15 pointer-events-none" />
                  <div className="absolute -left-24 -top-24 w-64 h-64 bg-zinc-700 rounded-full blur-[120px] opacity-10 pointer-events-none" />

                  <div className="relative z-10 w-full">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#facd15] flex items-center gap-1.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#facd15] animate-ping" />
                          Jersey Classifications
                        </span>
                        <h3 className="text-lg md:text-xl font-black font-sans uppercase tracking-wider mt-1">
                          SELECT JERSEY EDITION
                        </h3>
                        <p className="text-zinc-400 text-xs mt-0.5">
                          Premium club, national, retro archives, and specialty sports wear.
                        </p>
                      </div>

                      {/* Back / All selector button */}
                      <button
                        onClick={() => setSelectedJerseyType('all')}
                        className={`px-4.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                          selectedJerseyType === 'all'
                            ? 'bg-[#facd15] text-black shadow-sm scale-102'
                            : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700'
                        }`}
                      >
                        🔥 ALL EDITIONS ({products.filter(p => p.cat === 'jersey').length})
                      </button>
                    </div>

                    {/* Subtype Choice Cards Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {[
                        {
                          key: 'retro',
                          title: 'RETRO',
                          badge: 'Retro Arch.',
                          bgGradient: 'from-amber-500/10 to-transparent hover:border-[#facd15]/50',
                          badgeBg: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                          borderActive: 'border-[#facd15] ring-2 ring-[#facd15]/20',
                        },
                        {
                          key: 'player',
                          title: 'PLAYER ED.',
                          badge: 'Slim / Match',
                          bgGradient: 'from-blue-500/10 to-transparent hover:border-blue-500/50',
                          badgeBg: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                          borderActive: 'border-blue-500 ring-2 ring-blue-500/20',
                        },
                        {
                          key: 'fan',
                          title: 'FAN ED.',
                          badge: 'Regular Stadium',
                          bgGradient: 'from-emerald-500/10 to-transparent hover:border-emerald-500/50',
                          badgeBg: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                          borderActive: 'border-emerald-500 ring-2 ring-emerald-500/20',
                        },
                        {
                          key: 'master',
                          title: 'MASTER ED.',
                          badge: 'Premium Quality',
                          bgGradient: 'from-purple-500/10 to-transparent hover:border-purple-500/50',
                          badgeBg: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
                          borderActive: 'border-purple-500 ring-2 ring-purple-500/20',
                        },
                        {
                          key: 'kids',
                          title: 'KIDS SET',
                          badge: 'Youth Kit',
                          bgGradient: 'from-pink-500/10 to-transparent hover:border-pink-500/50',
                          badgeBg: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
                          borderActive: 'border-pink-500 ring-2 ring-pink-500/20',
                        },
                        {
                          key: 'nfl',
                          title: 'NFL',
                          badge: 'Gridiron Gear',
                          bgGradient: 'from-red-500/10 to-transparent hover:border-red-500/50',
                          badgeBg: 'text-red-400 bg-red-500/10 border-red-500/20',
                          borderActive: 'border-red-500 ring-2 ring-red-500/20',
                        },
                        {
                          key: 'ipl',
                          title: 'IPL',
                          badge: 'T20 Cricket',
                          bgGradient: 'from-cyan-500/10 to-transparent hover:border-cyan-500/50',
                          badgeBg: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
                          borderActive: 'border-cyan-500 ring-2 ring-cyan-500/20',
                        }
                      ].map((sub) => {
                        const isSelected = selectedJerseyType === sub.key;
                        const count = products.filter(p => {
                          if (p.cat !== 'jersey') return false;
                          const resolvedType = p.jerseyType || detectJerseyType(p.name);
                          return resolvedType === sub.key;
                        }).length;

                        return (
                          <button
                            key={sub.key}
                            onClick={() => setSelectedJerseyType(sub.key)}
                            className={`p-3.5 rounded-2xl bg-[#0e0e0e] text-left border transition-all duration-300 relative overflow-hidden group cursor-pointer flex flex-col justify-between h-28 ${
                              isSelected
                                ? sub.borderActive + ' bg-black shadow-lg scale-102'
                                : 'border-zinc-800 hover:bg-zinc-900/60'
                            }`}
                          >
                            <div className={`absolute inset-0 bg-gradient-to-br ${sub.bgGradient} opacity-30 group-hover:opacity-60 transition-opacity`} />
                            
                            <div className="relative z-10 flex flex-col h-full justify-between items-stretch w-full">
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-sans font-black tracking-wider text-[#facd15] text-[9px] uppercase">
                                  {count} Live
                                </span>
                              </div>

                              <div>
                                <h4 className="text-[11px] font-black tracking-wide text-white uppercase group-hover:text-[#facd15] transition-colors flex items-center justify-between gap-1 w-full">
                                  <span className="truncate">{sub.title}</span>
                                  {isSelected && <span className="text-[#facd15] text-[9px]">★</span>}
                                </h4>
                                <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border inline-block mt-1 ${sub.badgeBg}`}>
                                  {sub.badge}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-[#facd15] mt-1 self-end">
                                <span>{isSelected ? 'ACTIVE' : 'FILTER'}</span>
                                <span className="text-[10px] group-hover:translate-x-0.5 transition-transform">→</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Tag Filters of segment (New / Sale) & Sort controls */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-zinc-200 pb-5 mb-6">
                {/* Left controls - Segment tag selections */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                   {(['all', 'new', 'sale'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTag(t)}
                      className={`flex-1 md:flex-initial px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all border cursor-pointer ${
                        selectedTag === t
                          ? 'bg-black border-black text-white shadow-xs'
                          : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      {t === 'all' ? 'All Items' : t === 'new' ? '🔥 New In' : '🏷️ Clearance Sale'}
                    </button>
                  ))}
                </div>

                {/* Right controls - Sort By dropdown */}
                <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
                  <span className="text-zinc-500 text-xs">Sort products by:</span>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="appearance-none bg-white text-zinc-800 border border-zinc-200 hover:border-zinc-300 rounded-xl pl-4 pr-10 py-2.5 text-xs font-semibold outline-none cursor-pointer focus:border-black font-sans tracking-wide"
                    >
                      <option value="featured">🔥 Popular / Best Selling</option>
                      <option value="price-asc">💵 Price: Low to High</option>
                      <option value="price-desc">💵 Price: High to Low</option>
                      <option value="discount-desc">🏷️ Biggest Discount %</option>
                      <option value="name-asc">🔤 Alphabetical: A-Z</option>
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-zinc-500">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Wishlist Header Indicator - if liked items exist */}
              {wishlist.length > 0 && selectedCategory === 'all' && !searchQuery && (
                <div className="mb-6 p-4 bg-zinc-100/50 border border-zinc-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-800">❤️</span>
                    <span className="text-xs font-extrabold text-zinc-800 uppercase tracking-wide">
                      My Football Wishlist Favorites ({wishlist.length} item{wishlist.length > 1 ? 's' : ''})
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      // Filter catalog to show only favorited items
                      const favoritedItems = products.filter(p => wishlist.includes(p.id));
                      handleSetCategory('all');
                      setSearchQuery('');
                      // Open notifications
                      triggerNotification('Showing wishlisted club favorites!');
                    }}
                    className="text-xs font-bold text-zinc-800 hover:underline cursor-pointer"
                  >
                    Quick-view list
                  </button>
                </div>
              )}

              {/* Main Products Grid */}
              {sortedProducts.length === 0 ? (
                /* No Results fallback state */
                <div className="py-20 text-center max-w-md mx-auto">
                  <div className="text-4xl mb-4 text-zinc-300">⚽</div>
                  <h3 className="text-lg font-bold text-zinc-800 font-sans">No matching gear found</h3>
                  <p className="text-zinc-500 text-xs mt-2 leading-relaxed">
                    We couldn't find any premium soccer gear matching your terms. Try adjusting your search query, selecting another category, or reset filters to explore!
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      handleSetCategory('all');
                      setSelectedTag('all');
                    }}
                    className="mt-6 px-6 py-3 bg-black hover:bg-zinc-805 text-white text-xs font-bold uppercase tracking-wider font-sans rounded-xl transition-all active:scale-95 cursor-pointer"
                  >
                    Show All Inventory
                  </button>
                </div>
              ) : (
                /* Catalog Grid */
                <motion.div 
                  key={`${selectedCategory}-${selectedTag}-${sortBy}-${searchQuery}`}
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
                >
                  {sortedProducts.map((p) => (
                    <motion.div key={p.id} variants={itemVariants}>
                      <ProductCard
                        product={p}
                        onAddToCart={handleAddToCart}
                        onInstantBuy={handleInstantBuy}
                        isLiked={wishlist.includes(p.id)}
                        onToggleLike={handleToggleLike}
                        currencySymbol={settings.currencySymbol}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Cart Drawer sliding overlay helper */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        setCart={setCart}
        settings={settings}
      />



      {/* Global Interactive Footer */}
      <footer className="bg-zinc-950 text-zinc-455 border-t border-zinc-800 pt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center">
              <Logo className="h-16 w-auto -ml-3" />
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
              Your premium destination for elite football boots, national jerseys, goalkeeper gloves, and field accessories. We supply high-end gear to passionate players across India.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono">We Share on:</span>
              <a href="#" className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 hover:text-white flex items-center justify-center text-xs transition-colors">📸</a>
              <a href={`https://wa.me/91${settings.whatsappNumber}`} target="_blank" className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 hover:text-white flex items-center justify-center text-xs transition-colors">💬</a>
            </div>
          </div>

          {/* Quick Categories */}
          <div className="space-y-3 col-span-1">
            <h4 className="text-white font-bold text-xs uppercase tracking-widest">Store Quick Links</h4>
            <ul className="text-xs space-y-2 text-zinc-400">
              {categoryKeys.slice(0, 5).map((key) => (
                <li key={key}>
                  <button
                    onClick={() => {
                      setSelectedCategory(key);
                      setIsAdminOpen(false);
                      const el = document.getElementById('store-products');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    ⭐ {CATEGORY_DEFAULTS[key]?.title || key}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies */}
          <div className="space-y-3 col-span-1">
            <h4 className="text-white font-bold text-xs uppercase tracking-widest">Buyer Protections</h4>
            <ul className="text-xs space-y-2 text-zinc-400">
              <li><a href="#" className="hover:text-white transition-colors">Return &amp; Refund Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Shipping &amp; Courier Details</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cash On Delivery (COD) Guidelines</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Security &amp; Cookie Consent</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Athletic Service</a></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3 col-span-1">
            <h4 className="text-white font-bold text-xs uppercase tracking-widest">Get in Touch</h4>
            <ul className="text-xs space-y-2 text-zinc-400">
              <li className="flex items-center gap-2">
                <span className="text-zinc-500 font-semibold">WhatsApp:</span>
                <a href={`https://wa.me/91${settings.whatsappNumber}`} target="_blank" className="hover:text-white font-bold text-white transition-colors">
                  +91 {settings.whatsappNumber}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-zinc-500 font-semibold">Email:</span>
                <a href="mailto:capitanozone@gmail.com" className="hover:text-white transition-colors">capitanozone@gmail.com</a>
              </li>
              <li className="text-zinc-500 pt-2 leading-relaxed text-[11px]">
                📍 Head office hub distribution: Kolkata, West Bengal, India. Fast, insured dispatch nationwide.
              </li>
            </ul>
          </div>
        </div>

        {/* Outer copyrights */}
        <div className="bg-zinc-950 py-6 text-center text-[10px] text-zinc-600 border-t border-zinc-900">
          <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-2">
            <span>© 2026 {settings.storeName}. All high-fidelity athletic assets reserved. Crafted for Football Champions.</span>
            <span>Made in partnership with Google AI Studio &bull; Real WhatsApp Direct Connect</span>
          </div>
        </div>
      </footer>

      {/* ─── FLOATING SOCIAL DOCK ─── */}
      <div className="fixed bottom-6 right-6 z-55 flex flex-col gap-3">
        {/* Instagram Floating Action Button */}
        <a
          href="https://www.instagram.com/thecapitano.zone?igsh=ZzFlbTFrbm42NGl2&utm_source=qr"
          target="_blank"
          rel="noreferrer"
          className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white shadow-[0_6px_20px_rgba(238,42,123,0.35)] hover:shadow-[0_8px_24px_rgba(238,42,123,0.55)] transition-all duration-300 hover:scale-110 cursor-pointer"
          title="Follow us on Instagram"
        >
          {/* Tooltip Label */}
          <span className="absolute right-16 scale-0 group-hover:scale-100 transition-all duration-200 bg-zinc-900 text-white font-sans text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap uppercase tracking-wider border border-zinc-800 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none">
            Instagram Feed
          </span>
          <svg className="w-6 h-6 transition-transform group-hover:rotate-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        </a>

        {/* Dynamic WhatsApp Floating Action Button */}
        <a
          href="https://wa.me/message/D67EAL3CJGENA1"
          target="_blank"
          rel="noreferrer"
          className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-[0_6px_20px_rgba(37,211,102,0.35)] hover:shadow-[0_8px_24px_rgba(37,211,102,0.55)] transition-all duration-300 hover:scale-110 cursor-pointer"
          title="Direct WhatsApp Helpline"
        >
          {/* Tooltip Label */}
          <span className="absolute right-16 scale-0 group-hover:scale-100 transition-all duration-200 bg-zinc-900 text-white font-sans text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap uppercase tracking-wider border border-zinc-800 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none">
            WhatsApp Chat
          </span>
          <svg className="w-7 h-7 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </a>
      </div>
    </div>
  );
}
