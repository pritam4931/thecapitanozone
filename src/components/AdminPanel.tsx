import React, { useState, useRef } from 'react';
import { 
  PlusCircle, Trash2, RotateCcw, Settings, Check, Upload, 
  Sparkles, ListCollapse, Edit3, Image as ImageIcon, Save, PhoneCall, Info, LogIn 
} from 'lucide-react';
import { Product, StoreSettings } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, loginWithGoogle, handleFirestoreError, OperationType } from '../firebase';

interface AdminPanelProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: StoreSettings;
  setSettings: (settings: StoreSettings) => void;
  resetToDefaults: () => void;
  categoryKeys: string[];
  categoryDefaults: Record<string, { title: string; image: string; icon: string }>;
  user: FirebaseUser | null;
}

export default function AdminPanel({
  products,
  setProducts,
  settings,
  setSettings,
  resetToDefaults,
  categoryKeys,
  categoryDefaults,
  user,
}: AdminPanelProps) {
  // Form State
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [cat, setCat] = useState('boots');
  const [bootType, setBootType] = useState<'fg' | 'sg' | 'turf'>('fg');
  const [jerseyType, setJerseyType] = useState<string>('fan');
  const [sz, setSz] = useState('UK 8');
  const [price, setPrice] = useState(1999);
  const [was, setWas] = useState(2499);
  const [disc, setDisc] = useState(20); // Interactive Offer / Discount % State
  const [tag, setTag] = useState<'new' | 'sale' | 'regular'>('new');
  const [description, setDescription] = useState('');
  
  // Unified single-choice image selection state
  const [imageType, setImageType] = useState<'upload' | 'url' | 'sample'>('sample');
  const [imageUrl, setImageUrl] = useState(''); // Textarea containing raw URLs (supports multiple)
  const [uploadedImagesList, setUploadedImagesList] = useState<string[]>([]); // Base64 images uploaded together
  const [sampleKey, setSampleKey] = useState('boots');
  
  // Real-time synchronization handlers for Old Price, Sale Price, and Offer Percentage
  const handlePriceChange = (val: number) => {
    setPrice(val);
    if (was > 0) {
      const computedDisc = Math.round(((was - val) / was) * 100);
      setDisc(Math.max(0, computedDisc));
    }
  };

  const handleWasChange = (val: number) => {
    setWas(val);
    if (val > 0) {
      const computedPrice = Math.round(val * (1 - disc / 100));
      setPrice(Math.max(1, computedPrice));
    }
  };

  const handleDiscChange = (val: number) => {
    const clampedDisc = Math.min(100, Math.max(0, val));
    setDisc(clampedDisc);
    if (was > 0) {
      const computedPrice = Math.round(was * (1 - clampedDisc / 100));
      setPrice(Math.max(1, computedPrice));
    }
  };
  
  // Settings State
  const [waNum, setWaNum] = useState(settings.whatsappNumber);
  const [storeName, setStoreName] = useState(settings.storeName);
  const [currency, setCurrency] = useState(settings.currencySymbol);

  // Comprehensive Edit Modal Mode states
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editImageType, setEditImageType] = useState<'upload' | 'url' | 'sample'>('sample');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editUploadedImagesList, setEditUploadedImagesList] = useState<string[]>([]);
  const [editSampleKey, setEditSampleKey] = useState('boots');
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const startEditing = (product: Product) => {
    setEditProduct(product);
    
    // Decide imageType based on current image
    if (product.image && product.image.startsWith('data:image')) {
      setEditImageType('upload');
      setEditUploadedImagesList([product.image, ...(product.images || [])]);
      setEditImageUrl('');
    } else if (product.image && (product.image.startsWith('http') || product.image.includes('/') || product.image.includes('.'))) {
      setEditImageType('url');
      const allUrls = [product.image, ...(product.images || [])].join('\n');
      setEditImageUrl(allUrls);
      setEditUploadedImagesList([]);
    } else {
      setEditImageType('sample');
      setEditSampleKey(product.cat || 'boots');
      setEditImageUrl('');
      setEditUploadedImagesList([]);
    }
  };

  const handleEditPriceChange = (val: number) => {
    if (!editProduct) return;
    const wasPrice = editProduct.was || 0;
    let discPercent = editProduct.disc;
    if (wasPrice > 0) {
      discPercent = Math.max(0, Math.round(((wasPrice - val) / wasPrice) * 100));
    }
    setEditProduct({
      ...editProduct,
      price: val,
      disc: discPercent
    });
  };

  const handleEditWasChange = (val: number) => {
    if (!editProduct) return;
    const discPercent = editProduct.disc || 0;
    const computedPrice = Math.max(1, Math.round(val * (1 - discPercent / 100)));
    setEditProduct({
      ...editProduct,
      was: val,
      price: computedPrice
    });
  };

  const handleEditDiscChange = (val: number) => {
    if (!editProduct) return;
    const clampedDisc = Math.min(100, Math.max(0, val));
    const wasPrice = editProduct.was || 0;
    const computedPrice = wasPrice > 0 ? Math.max(1, Math.round(wasPrice * (1 - clampedDisc / 100))) : editProduct.price;
    setEditProduct({
      ...editProduct,
      disc: clampedDisc,
      price: computedPrice
    });
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;
    const tooLarge = files.some(file => file.size > 2 * 1024 * 1024);
    if (tooLarge) {
      alert('One or more selected image files are too large! Please upload files under 2MB.');
      return;
    }
    const loadedBase64s: string[] = [];
    let processed = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        loadedBase64s.push(reader.result as string);
        processed++;
        if (processed === files.length) {
          setEditUploadedImagesList(prev => [...prev, ...loadedBase64s]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveEditUploadedImage = (indexToRemove: number) => {
    setEditUploadedImagesList(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;
    if (!editProduct.name.trim()) {
      alert('Product Name is required.');
      return;
    }

    let finalImage = '';
    let finalImages: string[] | undefined = undefined;

    if (editImageType === 'upload') {
      if (editUploadedImagesList.length === 0) {
        alert('Please select at least one file to upload.');
        return;
      }
      finalImage = editUploadedImagesList[0];
      if (editUploadedImagesList.length > 1) {
        finalImages = editUploadedImagesList.slice(1);
      }
    } else if (editImageType === 'url') {
      if (!editImageUrl.trim()) {
        alert('Please paste a direct image URL.');
        return;
      }
      const urls = editImageUrl.split(/[\n,]+/).map(u => u.trim()).filter(Boolean);
      finalImage = urls[0] || '';
      if (urls.length > 1) {
        finalImages = urls.slice(1);
      }
    } else {
      const defaultTheme = categoryDefaults[editSampleKey] || categoryDefaults['boots'];
      finalImage = defaultTheme.image;
    }

    const updatedProduct: Product = {
      ...editProduct,
      image: finalImage,
      images: finalImages,
      brand: editProduct.brand?.trim() || undefined,
      description: editProduct.description?.trim() || undefined
    };

    if (!user || user.email?.toLowerCase().trim() !== 'pdey4931@gmail.com') {
      alert('Error: You must be signed in as the authorized administrator (pdey4931@gmail.com) to edit products.');
      return;
    }

    const docId = String(editProduct.id);
    const path = `products/${docId}`;
    setDoc(doc(db, 'products', docId), {
      cat: updatedProduct.cat,
      bootType: updatedProduct.bootType || '',
      jerseyType: updatedProduct.jerseyType || '',
      name: updatedProduct.name,
      sz: updatedProduct.sz,
      price: Number(updatedProduct.price),
      was: Number(updatedProduct.was) || 0,
      disc: Number(updatedProduct.disc) || 0,
      tag: updatedProduct.tag || 'regular',
      image: updatedProduct.image || '',
      brand: updatedProduct.brand || '',
      description: updatedProduct.description || '',
      images: updatedProduct.images || []
    })
      .then(() => {
        setEditProduct(null);
        setFormSuccess(`"${updatedProduct.name}" updated successfully in the Cloud Database!`);
        setTimeout(() => setFormSuccess(''), 4000);
      })
      .catch((err) => {
        console.error(err);
        try {
          handleFirestoreError(err, OperationType.UPDATE, path);
        } catch (formattedErr: any) {
          setFormError('Firebase Edit Failed: ' + formattedErr.message);
        }
        alert('Firebase Edit Failed: ' + err.message);
      });
  };

  // Helpers
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // Encode file to Base64 (handles multiple file selections simultaneously into a single array)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;
    
    // Check files size limit (max 2MB each)
    const tooLarge = files.some(file => file.size > 2 * 1024 * 1024);
    if (tooLarge) {
      setFormError('One or more selected image files are too large! Please upload files under 2MB.');
      return;
    }

    setFormError('');
    const loadedBase64s: string[] = [];
    let processed = 0;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        loadedBase64s.push(reader.result as string);
        processed++;
        if (processed === files.length) {
          setUploadedImagesList(prev => [...prev, ...loadedBase64s]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveUploadedImage = (indexToRemove: number) => {
    setUploadedImagesList(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!name.trim()) {
      setFormError('Product Name is required.');
      return;
    }

    let finalImage = '';
    let finalImages: string[] | undefined = undefined;

    if (imageType === 'upload') {
      if (uploadedImagesList.length === 0) {
        setFormError('Please select at least one file to upload.');
        return;
      }
      finalImage = uploadedImagesList[0];
      if (uploadedImagesList.length > 1) {
        finalImages = uploadedImagesList.slice(1);
      }
    } else if (imageType === 'url') {
      if (!imageUrl.trim()) {
        setFormError('Please paste a direct image URL.');
        return;
      }
      // Split multiple URLs separated by commas or newlines
      const urls = imageUrl.split(/[\n,]+/).map(u => u.trim()).filter(Boolean);
      finalImage = urls[0] || '';
      if (urls.length > 1) {
        finalImages = urls.slice(1);
      }
    } else {
      // Use fallback
      const defaultTheme = categoryDefaults[sampleKey] || categoryDefaults['boots'];
      finalImage = defaultTheme.image;
    }

    if (!user || user.email?.toLowerCase().trim() !== 'pdey4931@gmail.com') {
      setFormError('Error: You must be signed in with Google as the authorized administrator (pdey4931@gmail.com) to upload products.');
      return;
    }

    const docId = String(Date.now());
    const path = `products/${docId}`;
    const newProduct = {
      cat,
      bootType: (cat === 'boots' ? bootType : ''),
      jerseyType: (cat === 'jersey' ? jerseyType : ''),
      name,
      sz,
      price: Number(price),
      was: Number(was),
      disc: Number(disc),
      tag,
      image: finalImage,
      images: finalImages || [],
      brand: brand.trim() || '',
      description: description.trim() || ''
    };

    setDoc(doc(db, 'products', docId), newProduct)
      .then(() => {
        setFormSuccess(`"${name}" is now uploaded directly to the Cloud Firebase catalog!`);
        
        // Reset Form
        setName('');
        setBrand('');
        setSz('UK 8');
        setDescription('');
        setUploadedImagesList([]);
        setImageUrl('');
        setPrice(1999);
        setWas(2499);
        setDisc(20);
        if (fileInputRef.current) fileInputRef.current.value = '';
      })
      .catch((err) => {
        console.error(err);
        try {
          handleFirestoreError(err, OperationType.CREATE, path);
        } catch (formattedErr: any) {
          setFormError('Firestore upload failed with details: ' + formattedErr.message);
        }
        setFormError('Firestore upload failed: ' + err.message);
      });
  };

  const handleDeleteProduct = (id: string | number) => {
    if (!user || user.email?.toLowerCase().trim() !== 'pdey4931@gmail.com') {
      alert('Error: You must be signed in as the authorized administrator (pdey4931@gmail.com) to delete products.');
      return;
    }

    if (confirm('Are you sure you want to delete this product from the Cloud Shared Catalog?')) {
      const docId = String(id);
      const path = `products/${docId}`;
      deleteDoc(doc(db, 'products', docId))
        .then(() => {
          setFormSuccess('Product successfully deleted from Cloud Database!');
          setTimeout(() => setFormSuccess(''), 4000);
        })
        .catch(err => {
          console.error(err);
          try {
            handleFirestoreError(err, OperationType.DELETE, path);
          } catch (formattedErr: any) {
            alert('Delete failed with details: ' + formattedErr.message);
          }
          alert('Delete from Cloud failed: ' + err.message);
        });
    }
  };

  const handleUpdateSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess('');
    
    if (!user || user.email?.toLowerCase().trim() !== 'pdey4931@gmail.com') {
      alert('Error: You must be signed in as the authorized administrator (pdey4931@gmail.com) to update settings.');
      return;
    }

    const cleanNum = waNum.replace(/\D/g, ''); // strip spaces, plus sign, etc
    if (cleanNum.length < 8) {
      alert('Please enter a valid phone number (minimum 8 digits, preferably with country code like 91)');
      return;
    }

    const updatedSettings = {
      whatsappNumber: cleanNum,
      storeName: storeName.trim() || 'THE CAPITANO ZONE',
      currencySymbol: currency || '₹'
    };

    const path = 'settings/general';
    setDoc(doc(db, 'settings', 'general'), updatedSettings)
      .then(() => {
        setSettingsSuccess('Store settings updated in Cloud Database successfully.');
        setTimeout(() => setSettingsSuccess(''), 4000);
      })
      .catch((err) => {
        console.error(err);
        alert('Updating Cloud Settings failed: ' + err.message);
      });
  };

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  if (!user) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-black text-white border border-zinc-900 rounded-[32px] shadow-2xl text-center space-y-6 font-sans">
        <div className="w-16 h-16 bg-[#facd15]/10 border border-[#facd15]/20 text-[#facd15] rounded-full flex items-center justify-center text-3xl mx-auto animate-pulse">
          🔐
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black uppercase tracking-tight text-white">AUTHENTICATION REQUIRED</h2>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            Please sign in with Google to access your Capitano Seller Room and synchronize the product catalog.
          </p>
        </div>

        {isIframe && (
          <div className="bg-[#facd15]/10 border border-[#facd15]/20 p-4 rounded-2xl text-[11px] text-zinc-300 max-w-sm mx-auto leading-relaxed text-left space-y-2.5">
            <span className="font-bold text-[#facd15] block uppercase tracking-wide">💻 Preview Frame Detected</span>
            <p>
              Your browser restricts or blocks Google Sign-In popups when loaded inside previews or secure iframes on laptops.
            </p>
            <p className="text-zinc-400">
              Please click below to open the application in a <strong>New Browser Tab</strong> where Google Sign-In, uploads, and deletions work cleanly on laptop!
            </p>
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="w-full py-2.5 bg-[#facd15] text-black hover:bg-yellow-400 text-[10px] rounded-xl font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Open in a New Tab 🚀
            </button>
          </div>
        )}

        <button
          onClick={() => loginWithGoogle()}
          className="w-full bg-[#facd15] text-black hover:bg-yellow-400 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] transition-all cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          SIGN IN WITH GOOGLE
        </button>
      </div>
    );
  }

  const isUserAdmin = user.email?.toLowerCase().trim() === 'pdey4931@gmail.com';

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 text-zinc-950 font-sans">
      {/* Read-Only Banner Warning for Guests */}
      {!isUserAdmin && (
        <div className="bg-red-500/10 border border-red-500/25 p-5 rounded-[24px] mb-8 flex flex-col gap-4 text-center md:text-left select-none animate-fadeIn">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-red-500 text-2xl">⚠️</span>
              <div>
                <p className="text-red-400 text-xs font-bold uppercase tracking-wider">ReadOnly Guest View Mode</p>
                <p className="text-zinc-400 text-[11px] mt-1 leading-relaxed">
                  You are signed in as <strong className="text-zinc-300">{user.email}</strong>. Only the bootstrapped administrator (<strong className="text-zinc-300">pdey4931@gmail.com</strong>) has permissions to upload, edit, or delete items. Feel free to explore the panel controls.
                </p>
              </div>
            </div>
            <button 
              onClick={() => loginWithGoogle()} 
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap"
            >
              Switch to Admin
            </button>
          </div>

          {isIframe && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3.5 rounded-xl text-[10.5px] text-zinc-300">
              <span className="font-bold text-yellow-400 block mb-1">💡 Facing Sign-In or Write issues?</span>
              Browser security rules block Google login popups inside previews or iframes. Click 
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="mx-1 text-[#facd15] underline hover:text-yellow-400 font-bold"
              >
                Open in a New Tab
              </button>
              to sign in cleanly as your administrator account!
            </div>
          )}
        </div>
      )}

      {/* Intro Header */}
      <div className="bg-zinc-950 text-white rounded-[24px] p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-zinc-900 shadow-sm">
        <div>
          <span className="bg-white/10 text-white border border-white/15 font-sans font-bold text-[10px] uppercase px-3 py-1 rounded-full tracking-wider">
            Seller Dashboard {isUserAdmin ? '★ ADMIN' : '☆ GUEST'}
          </span>
          <h1 className="text-xl md:text-2xl font-bold mt-4 tracking-tight uppercase">
            Product &amp; Store Management Panel
          </h1>
          <p className="text-zinc-400 text-xs md:text-sm mt-2 max-w-xl leading-relaxed">
            Welcome to your Capitano seller room. Add new cleats, update jerseys, tweak pricing, customize your WhatsApp order number, or delete items instantly.
          </p>
        </div>
        <div className="flex gap-2">
          {isUserAdmin && (
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all uppercase tracking-wider"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-400" />
              Reset Initial Catalog
            </button>
          )}
        </div>
      </div>      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form Column */}
        <div className="lg:col-span-1 bg-white border border-zinc-150 rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] h-fit">
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-100 pb-3">
            <PlusCircle className="w-5 h-5 text-black" />
            <h2 className="text-base font-bold text-zinc-900 uppercase tracking-wide">Upload New Product</h2>
          </div>

          <form onSubmit={handleAddProduct} className="space-y-4 text-xs">
            {formError && (
              <div className="p-3 bg-red-50 text-red-700 border-l-4 border-red-550 rounded-r text-xs font-medium">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border-l-4 border-emerald-555 rounded-r text-xs font-medium">
                {formSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Product Name *</label>
              <input
                type="text"
                required
                className="w-full bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl p-3 outline-none focus:border-black focus:bg-white text-zinc-800 transition-all font-sans"
                placeholder="e.g. Nike Tiempo Legend 10 FG"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Brand</label>
                <input
                  type="text"
                  className="w-full bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl p-3 outline-none focus:border-black focus:bg-white text-zinc-800 transition-all font-sans"
                  placeholder="e.g. Nike"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Category</label>
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl p-3 outline-none focus:border-black focus:bg-white text-zinc-800 transition-all font-sans"
                >
                  {categoryKeys.map((key) => (
                    <option key={key} value={key}>
                      {categoryDefaults[key]?.title || key}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {cat === 'boots' && (
              <div className="bg-yellow-500/10 border border-yellow-400/20 p-3.5 rounded-xl shadow-xs">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>👟 Boot Sole / Ground Type</span>
                </label>
                <select
                  value={bootType}
                  onChange={(e) => setBootType(e.target.value as 'fg' | 'sg' | 'turf')}
                  className="w-full bg-white border border-zinc-200 hover:border-zinc-350 rounded-lg p-2.5 outline-none focus:border-yellow-500 text-zinc-800 transition-all font-sans text-xs font-bold"
                >
                  <option value="fg">FG (Firm Ground / Professional cleats)</option>
                  <option value="sg">SG (Soft Ground / Wet, muddy field metal studs)</option>
                  <option value="turf">Turf (TF / Artificial turf multi-ground rubber studs)</option>
                </select>
                <span className="text-[10px] text-zinc-500 block mt-1 leading-snug">This places your boot under the corresponding Firm Ground, Soft Ground, or Turf option in the store.</span>
              </div>
            )}

            {cat === 'jersey' && (
              <div className="bg-amber-500/10 border border-amber-400/20 p-3.5 rounded-xl shadow-xs">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>👕 Jersey Type / Edition</span>
                </label>
                <select
                  value={jerseyType}
                  onChange={(e) => setJerseyType(e.target.value)}
                  className="w-full bg-white border border-zinc-200 hover:border-zinc-350 rounded-lg p-2.5 outline-none focus:border-amber-500 text-zinc-800 transition-all font-sans text-xs font-bold"
                >
                  <option value="retro">Retro Jersey</option>
                  <option value="player">Player Edition</option>
                  <option value="fan">Fan Edition</option>
                  <option value="master">Master Edition</option>
                  <option value="kids">Kids Set</option>
                  <option value="nfl">NFL</option>
                  <option value="ipl">IPL</option>
                </select>
                <span className="text-[10px] text-zinc-500 block mt-1 leading-snug">Select the jersey edition so it appears in the right subcategory filters.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Size/Qty *</label>
                <input
                  type="text"
                  required
                  placeholder="UK 8"
                  className="w-full bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl p-3 outline-none focus:border-black focus:bg-white text-zinc-800 transition-all font-sans"
                  value={sz}
                  onChange={(e) => setSz(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Item Tag / Segment</label>
                <div className="flex gap-2">
                  {(['regular', 'new', 'sale'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTag(t)}
                      className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        tag === t
                          ? 'bg-black text-white border-black'
                          : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      {t === 'new' ? '🔥 New' : t === 'sale' ? '🏷️ Sale' : '⚽ Regular'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Pricing Column highlighting the Offer Percent (disc) */}
            <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-xl space-y-3 shadow-3xs">
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                🏷️ Discount &amp; Pricing Setup
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Old Price ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full bg-white border border-zinc-200 hover:border-zinc-350 rounded-lg p-2.5 outline-none focus:border-yellow-500 text-xs text-zinc-800 font-mono"
                    value={was}
                    onChange={(e) => handleWasChange(Math.max(1, Number(e.target.value)))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-700 uppercase tracking-wide mb-1.5">Offer %</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    className="w-full bg-yellow-50 border border-yellow-250 hover:border-yellow-400 rounded-lg p-2.5 outline-none focus:border-yellow-600 text-xs font-bold text-yellow-800 font-mono text-center"
                    value={disc}
                    onChange={(e) => handleDiscChange(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Sale Price ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full bg-white border border-zinc-200 hover:border-zinc-350 rounded-lg p-2.5 outline-none focus:border-yellow-500 text-xs text-zinc-800 font-mono"
                    value={price}
                    onChange={(e) => handlePriceChange(Math.max(1, Number(e.target.value)))}
                  />
                </div>
              </div>
              <p className="text-[10px] text-zinc-550 leading-normal">
                Entering an <span className="font-bold">Offer %</span> auto-calculates Sale Price. Modifying prices auto-calculates the corresponding discount percentage. Feel free to tweak any field!
              </p>
            </div>

            {/* Consolidated Product Images Selector */}
            <div className="border border-zinc-200 bg-zinc-50/50 p-4 rounded-xl space-y-4 shadow-3xs">
              <div className="flex justify-between items-center border-b border-zinc-200/50 pb-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Consolidated Product Image(s)</label>
                <span className="text-[9px] font-bold bg-black text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {imageType === 'sample' ? 'Sample Preset' : imageType === 'url' ? 'Direct URL Input' : 'Device Upload File(s)'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['sample', 'url', 'upload'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setImageType(type)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                      imageType === type
                        ? 'bg-black border-black text-white'
                        : 'bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50'
                    }`}
                  >
                    {type === 'sample' ? 'Sample Preset' : type === 'url' ? 'URL Link(s)' : 'Upload Files'}
                  </button>
                ))}
              </div>

              {imageType === 'sample' && (
                <div className="space-y-1.5">
                  <label className="block text-[9px] text-zinc-400 uppercase tracking-wide">Pre-curated category preset photo:</label>
                  <select
                    value={sampleKey}
                    onChange={(e) => setSampleKey(e.target.value)}
                    className="w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg p-2.5 text-xs outline-none focus:border-black font-sans text-zinc-800"
                  >
                    {categoryKeys.map((key) => (
                      <option key={key} value={key}>
                        Quality Preset {categoryDefaults[key]?.title || key} Pic
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {imageType === 'url' && (
                <div className="space-y-1.5">
                  <label className="block text-[9px] text-zinc-400 uppercase tracking-wide">Pasted Direct Image Web URLs:</label>
                  <textarea
                    rows={3}
                    placeholder="Paste one or multiple web URLs separated by commas or lines...
e.g. 
https://link-one.jpg,
https://link-two.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg p-2.5 text-xs outline-none focus:border-black font-sans text-zinc-850 line-clamp-3 leading-snug"
                  />
                  <p className="text-[9px] text-zinc-500 leading-tight">
                    💡 The first URL is the main product photo, any subsequent URLs are automatically added as scrollable variant images!
                  </p>
                </div>
              )}

              {imageType === 'upload' && (
                <div className="space-y-2.5">
                  <span className="block text-[9px] text-zinc-400 uppercase tracking-wide">Pick photos from device (Single or Multiple, max 2MB):</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-lg text-[10px] cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Browse & Select Image(s)
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <span className="text-[10px] text-zinc-500 font-semibold truncate">
                      {uploadedImagesList.length > 0 ? `✓ ${uploadedImagesList.length} files chosen` : 'No files picked'}
                    </span>
                  </div>

                  {uploadedImagesList.length > 0 && (
                    <div className="space-y-1.5 border-t border-dashed border-zinc-200 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold">Selected Files Previews:</span>
                        <button
                          type="button"
                          onClick={() => setUploadedImagesList([])}
                          className="text-[9px] text-red-500 hover:underline font-bold"
                        >
                          Clear Selection
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 p-2 bg-white border border-zinc-100 rounded-lg max-h-36 overflow-y-auto">
                        {uploadedImagesList.map((img, idx) => (
                          <div key={idx} className="relative w-12 h-12 rounded border border-zinc-150 p-0.5 bg-zinc-50 flex items-center justify-center">
                            <img src={img} alt="" className="max-w-full max-h-full object-contain rounded" referrerPolicy="no-referrer" />
                            <button
                              type="button"
                              onClick={() => handleRemoveUploadedImage(idx)}
                              className="absolute -top-1.5 -right-1.5 bg-zinc-950 border border-zinc-800 text-white hover:bg-zinc-800 rounded-full w-4.5 h-4.5 flex items-center justify-center text-[9px] font-bold shadow-2xs cursor-pointer z-10"
                              title="Delete file"
                            >
                              ×
                            </button>
                            {idx === 0 && (
                              <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[6px] text-white font-bold p-0.5 text-center leading-none rounded-b uppercase">
                                MAIN
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Short Description</label>
              <textarea
                placeholder="Briefly state features, fabric quality, weight class..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl p-3 outline-none focus:border-black focus:bg-white text-xs font-sans"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-black hover:bg-zinc-800 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider font-sans flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Upload &amp; Set Live
            </button>
          </form>
        </div>

        {/* Global Settings & Direct Update Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Settings */}
          <div className="bg-white border border-zinc-150 rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
            <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 pb-3">
              <Settings className="w-5 h-5 text-black" />
              <h2 className="text-base font-bold text-zinc-900 uppercase tracking-wide">Store &amp; WhatsApp Settings</h2>
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-4 text-xs">
              {settingsSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 rounded-r text-xs font-medium">
                  {settingsSuccess}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">WhatsApp Order Number</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500 text-xs font-semibold">
                      +91
                    </span>
                    <input
                      type="text"
                      placeholder="9474693877"
                      value={waNum}
                      onChange={(e) => setWaNum(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl pl-12 pr-3 py-3 text-xs outline-none focus:border-black focus:bg-white text-zinc-800 transition-all font-sans"
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1.5 block">Indian code (+91) prepended automatically</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Store Name Banner</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl px-3.5 py-3 text-xs outline-none focus:border-black focus:bg-white text-zinc-800 transition-all font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Currency Symbol</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl px-3.5 py-3 text-xs outline-none focus:border-black focus:bg-white text-zinc-800 transition-all font-sans"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-black hover:bg-zinc-800 text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider font-sans transition-all flex items-center gap-1.5 outline-none cursor-pointer"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                Save Store Settings
              </button>
            </form>
          </div>

          {/* Edit / Catalog Management Table */}
          <div className="bg-white border border-zinc-150 rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <ListCollapse className="w-5 h-5 text-black" />
                <h2 className="text-base font-bold text-zinc-900 uppercase tracking-wide">Manage Inventory ({products.length})</h2>
              </div>
              <span className="text-[10px] text-zinc-505 bg-zinc-50 border border-zinc-150 px-2.5 py-0.5 rounded-full font-sans font-medium">
                LocalStorage Live
              </span>
            </div>

            {/* Scrollable Catalog List */}
            <div className="overflow-x-auto max-h-[460px] overflow-y-auto border border-zinc-100 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 font-sans font-extrabold uppercase tracking-widest text-[9px]">
                    <th className="py-3 px-3.5">Item</th>
                    <th className="py-3 px-3.5">Category</th>
                    <th className="py-3 px-3.5 text-right">Price</th>
                    <th className="py-3 px-3.5 text-center">Offer %</th>
                    <th className="py-3 px-3.5 text-right">Original</th>
                    <th className="py-3 px-3.5">Size</th>
                    <th className="py-3 px-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-zinc-400 font-medium font-sans">
                        Inventory is empty. Use the form to upload your first football gear!
                      </td>
                    </tr>
                  ) : (
                    products.map((item) => {
                      return (
                        <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2 max-w-xs md:max-w-md">
                              <img
                                src={item.image}
                                alt=""
                                className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 object-contain p-0.5"
                                referrerPolicy="no-referrer"
                              />
                              <div className="truncate">
                                <p className="font-bold text-zinc-800 truncate" title={item.name}>
                                  {item.name}
                                </p>
                                <span className="text-[10px] text-zinc-400 capitalize font-medium">{item.brand || 'No Brand'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 capitalize text-zinc-500 font-medium">
                            <div>{categoryDefaults[item.cat]?.title || item.cat}</div>
                            {item.cat === 'boots' && (
                              <div className="mt-1">
                                <span className="text-[9px] font-black uppercase text-yellow-600 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 animate-pulse">
                                  {item.bootType || 'fg'} Sole
                                </span>
                              </div>
                            )}
                            {item.cat === 'jersey' && (
                              <div className="mt-1">
                                <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                  {item.jerseyType || 'fan'} Edition
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right font-bold text-zinc-950">
                            {settings.currencySymbol}{item.price}
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-extrabold text-[10.5px] text-red-650 bg-red-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider block w-fit mx-auto">
                              {item.disc || 0}% OFF
                            </span>
                          </td>
                          <td className="p-3 text-right text-zinc-400 font-medium line-through opacity-80 decoration-red-500/30">
                            {settings.currencySymbol}{item.was}
                          </td>
                          <td className="p-3 font-semibold text-zinc-650">
                            {item.sz}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => startEditing(item)}
                                className="p-1.5 bg-zinc-50 border border-zinc-150 hover:bg-zinc-150 text-zinc-650 rounded-lg transition-all cursor-pointer hover:border-zinc-350"
                                title="Edit Product Info"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(item.id)}
                                className="p-1.5 bg-red-50 border border-red-100 hover:bg-red-100 text-red-650 rounded-lg transition-all cursor-pointer hover:border-red-200"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Info notice about file uploads */}
            <div className="mt-4 p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex gap-3.5 items-start text-xs text-zinc-650 leading-relaxed">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-zinc-500" />
              <div>
                <span className="font-bold text-zinc-850">Pro Tip :</span> Uploaded image files are encoded into highly responsive Base64 strings. Because these are saved directly in your browser's LocalStorage, any product you add or edit will safely persist even if you reload or close the tab!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Edit overlay Modal */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in animate-duration-200">
          <div className="bg-white border border-zinc-150 rounded-[24px] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl relative space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-zinc-900" />
                <h2 className="text-base font-extrabold text-zinc-900 uppercase tracking-wide">
                  Comprehensive Product Editor
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditProduct(null)}
                className="p-1 px-2.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-all cursor-pointer font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {/* Form content */}
            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Product Name *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl p-3 outline-none focus:border-black focus:bg-white text-zinc-850 transition-all font-sans text-xs"
                  value={editProduct.name}
                  onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Brand</label>
                  <input
                    type="text"
                    className="w-full bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl p-3 outline-none focus:border-black focus:bg-white text-zinc-850 transition-all font-sans text-xs"
                    placeholder="e.g. Nike"
                    value={editProduct.brand || ''}
                    onChange={(e) => setEditProduct({ ...editProduct, brand: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Category</label>
                  <select
                    value={editProduct.cat}
                    onChange={(e) => {
                      const nextCategory = e.target.value;
                      setEditProduct({ 
                        ...editProduct, 
                        cat: nextCategory,
                        bootType: nextCategory === 'boots' ? (editProduct.bootType || 'fg') : undefined,
                        jerseyType: nextCategory === 'jersey' ? (editProduct.jerseyType || 'fan') : undefined
                      });
                    }}
                    className="w-full bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl p-3 outline-none focus:border-black focus:bg-white text-zinc-855 transition-all font-sans text-xs"
                  >
                    {categoryKeys.map((key) => (
                      <option key={key} value={key}>
                        {categoryDefaults[key]?.title || key}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {editProduct.cat === 'boots' && (
                <div className="bg-yellow-500/10 border border-yellow-400/20 p-3.5 rounded-xl shadow-xs">
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>👟 Boot Sole / Ground Type</span>
                  </label>
                  <select
                    value={editProduct.bootType || 'fg'}
                    onChange={(e) => setEditProduct({ ...editProduct, bootType: e.target.value })}
                    className="w-full bg-white border border-zinc-200 hover:border-zinc-350 rounded-lg p-2.5 outline-none focus:border-yellow-500 text-zinc-850 transition-all font-sans text-xs font-bold"
                  >
                    <option value="fg">FG (Firm Ground / Professional cleats)</option>
                    <option value="sg">SG (Soft Ground / Wet, muddy field metal studs)</option>
                    <option value="turf">Turf (TF / Artificial turf multi-ground rubber studs)</option>
                  </select>
                  <span className="text-[10px] text-zinc-500 block mt-1 leading-snug">This places your boot under the corresponding Firm Ground, Soft Ground, or Turf option in the store.</span>
                </div>
              )}

              {editProduct.cat === 'jersey' && (
                <div className="bg-amber-500/10 border border-amber-400/20 p-3.5 rounded-xl shadow-xs">
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>👕 Jersey Type / Edition</span>
                  </label>
                  <select
                    value={editProduct.jerseyType || 'fan'}
                    onChange={(e) => setEditProduct({ ...editProduct, jerseyType: e.target.value })}
                    className="w-full bg-white border border-zinc-200 hover:border-zinc-350 rounded-lg p-2.5 outline-none focus:border-amber-500 text-zinc-850 transition-all font-sans text-xs font-bold"
                  >
                    <option value="retro">Retro Jersey</option>
                    <option value="player">Player Edition</option>
                    <option value="fan">Fan Edition</option>
                    <option value="master">Master Edition</option>
                    <option value="kids">Kids Set</option>
                    <option value="nfl">NFL</option>
                    <option value="ipl">IPL</option>
                  </select>
                  <span className="text-[10px] text-zinc-500 block mt-1 leading-snug">Select the jersey edition so it appears in the right subcategory filters.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Size/Qty *</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl p-3 outline-none focus:border-black focus:bg-white text-zinc-850 transition-all font-sans text-xs"
                    value={editProduct.sz}
                    onChange={(e) => setEditProduct({ ...editProduct, sz: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Item Tag / Segment</label>
                  <div className="flex gap-2">
                    {(['regular', 'new', 'sale'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEditProduct({ ...editProduct, tag: t })}
                        className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          editProduct.tag === t
                            ? 'bg-black text-white border-black'
                            : 'bg-zinc-50 text-zinc-650 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        {t === 'new' ? '🔥 New' : t === 'sale' ? '🏷️ Sale' : '⚽ Regular'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interactive Pricing Column highlighting the Offer Percent (disc) */}
              <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-xl space-y-3 shadow-3xs">
                <span className="block text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                  🏷️ Live Price &amp; Discount Calculator
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Original Price ({settings.currencySymbol})</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full bg-white border border-zinc-200 hover:border-zinc-350 rounded-lg p-2.5 outline-none focus:border-yellow-500 text-xs text-zinc-850 font-mono"
                      value={editProduct.was}
                      onChange={(e) => handleEditWasChange(Math.max(1, Number(e.target.value)))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-700 uppercase tracking-wide mb-1.5">Offer %</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      className="w-full bg-yellow-50 border border-yellow-250 hover:border-yellow-450 rounded-lg p-2.5 outline-none focus:border-yellow-600 text-xs font-bold text-yellow-800 font-mono text-center"
                      value={editProduct.disc}
                      onChange={(e) => handleEditDiscChange(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Sale Price ({settings.currencySymbol})</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full bg-white border border-zinc-200 hover:border-zinc-350 rounded-lg p-2.5 outline-none focus:border-yellow-500 text-xs text-zinc-850 font-mono"
                      value={editProduct.price}
                      onChange={(e) => handleEditPriceChange(Math.max(1, Number(e.target.value)))}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal">
                  Adjusting <span className="font-bold">Offer %</span> updates the Sale Price. Adjusting pricing automatically recalculates the discount percentage.
                </p>
              </div>

              {/* Consolidated Product Images Selector */}
              <div className="border border-zinc-200 bg-zinc-50/50 p-4 rounded-xl space-y-4 shadow-3xs">
                <div className="flex justify-between items-center border-b border-zinc-200/50 pb-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Products Main &amp; Secondary Images</label>
                  <span className="text-[9px] font-bold bg-black text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {editImageType === 'sample' ? 'Sample Preset' : editImageType === 'url' ? 'Direct URL Input' : 'Device Upload File(s)'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(['sample', 'url', 'upload'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEditImageType(type)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        editImageType === type
                          ? 'bg-black border-black text-white'
                          : 'bg-white border-zinc-200 text-zinc-655 hover:bg-zinc-50'
                      }`}
                    >
                      {type === 'sample' ? 'Sample Preset' : type === 'url' ? 'URL Link(s)' : 'Upload Files'}
                    </button>
                  ))}
                </div>

                {editImageType === 'sample' && (
                  <div className="space-y-1.5">
                    <label className="block text-[9px] text-zinc-400 uppercase tracking-wide">Category default photo:</label>
                    <select
                      value={editSampleKey}
                      onChange={(e) => setEditSampleKey(e.target.value)}
                      className="w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg p-2.5 text-xs outline-none focus:border-black font-sans text-zinc-800"
                    >
                      {categoryKeys.map((key) => (
                        <option key={key} value={key}>
                          Quality Preset {categoryDefaults[key]?.title || key} Pic
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {editImageType === 'url' && (
                  <div className="space-y-1.5">
                    <label className="block text-[9px] text-zinc-400 uppercase tracking-wide">Pasted Direct Web URLs (separated by newlines/commas):</label>
                    <textarea
                      rows={3}
                      placeholder="https://link-one.jpg&#10;https://link-two.jpg"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      className="w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg p-2.5 text-xs outline-none focus:border-black font-sans text-zinc-850 leading-snug"
                    />
                    <p className="text-[9px] text-zinc-500 leading-tight">
                      💡 The first URL is main photo, remaining are variant images.
                    </p>
                  </div>
                )}

                {editImageType === 'upload' && (
                  <div className="space-y-2.5">
                    <span className="block text-[9px] text-zinc-400 uppercase tracking-wide">Device photos (Single or Multiple, max 2MB each):</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-lg text-[10px] cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Select File(s)
                      </button>
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleEditFileChange}
                        className="hidden"
                      />
                      <span className="text-[10px] text-zinc-500 font-semibold truncate">
                        {editUploadedImagesList.length > 0 ? `✓ ${editUploadedImagesList.length} files chosen` : 'No files picked'}
                      </span>
                    </div>

                    {editUploadedImagesList.length > 0 && (
                      <div className="space-y-1.5 border-t border-dashed border-zinc-200 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold">Previews:</span>
                          <button
                            type="button"
                            onClick={() => setEditUploadedImagesList([])}
                            className="text-[9px] text-red-500 hover:underline font-bold"
                          >
                            Clear All
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 p-2 bg-white border border-zinc-150 rounded-lg max-h-36 overflow-y-auto">
                          {editUploadedImagesList.map((img, idx) => (
                            <div key={idx} className="relative w-12 h-12 rounded border border-zinc-150 p-0.5 bg-zinc-50 flex items-center justify-center">
                              <img src={img} alt="" className="max-w-full max-h-full object-contain rounded" referrerPolicy="no-referrer" />
                              <button
                                type="button"
                                onClick={() => handleRemoveEditUploadedImage(idx)}
                                className="absolute -top-1.5 -right-1.5 bg-zinc-950 border border-zinc-805 text-white hover:bg-zinc-800 rounded-full w-4.5 h-4.5 flex items-center justify-center text-[9px] font-bold shadow-2xs cursor-pointer z-10"
                                title="Delete file"
                              >
                                &times;
                              </button>
                              {idx === 0 && (
                                <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[6px] text-white font-bold p-0.5 text-center leading-none rounded-b uppercase font-sans">
                                  MAIN
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Short Description</label>
                <textarea
                  value={editProduct.description || ''}
                  onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })}
                  rows={2}
                  className="w-full bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl p-3 outline-none focus:border-black focus:bg-white text-xs font-sans text-zinc-850"
                  placeholder="Item details..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditProduct(null)}
                  className="flex-1 border border-zinc-200 hover:bg-zinc-100 text-zinc-700 py-3 rounded-xl text-xs font-bold uppercase tracking-wider font-sans transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-black hover:bg-zinc-800 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider font-sans flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Save Changes Live
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
