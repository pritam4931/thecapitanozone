import React from 'react';
import { X, Trash2, Plus, Minus, MessageSquare, ShoppingBag } from 'lucide-react';
import { CartItem, StoreSettings } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  settings: StoreSettings;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  setCart,
  settings,
}: CartDrawerProps) {
  const updateQty = (id: string | number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return { ...item, qty: newQty };
          }
          return item;
        })
        .filter((item) => item.qty > 0)
    );
  };

  const removeItem = (id: string | number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const totalPrice = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);

  // Auto-compose and URL-encode the WhatsApp checkout message
  const handleWhatsAppCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // Compose formatted text
    const listLines = cart
      .map(
        (item, index) =>
          `${index + 1}. *${item.name}* \n   👟 Size: ${item.sz} | 📋 Qty: ${item.qty} | 💰 Price: ${settings.currencySymbol}${(item.price * item.qty).toLocaleString('en-IN')}`
      )
      .join('\n\n');

    const formattedMessage = 
`🛒 *NEW ORDER REQUEST - ${settings.storeName}* ⚽

Hello! I would like to place an order for the following gear:

${listLines}

━━━━━━━━━━━━━━━━━━━━━
💰 *Order Total: ${settings.currencySymbol}${totalPrice.toLocaleString('en-IN')}*
━━━━━━━━━━━━━━━━━━━━━

📦 *Shipping Details:*
- Name: _________________
- Shipping Address: _________________
- Contact No: _________________

Please confirm the availability, estimate delivery times and initiate cash-on-delivery steps! Thank you.`;

    // Ensure we have correct international prefix format. If number doesn't have it, default to India (+91)
    let formattedPhone = settings.whatsappNumber.replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone; // default India prefix
    }

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(formattedMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Sliding Drawer Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn"
      />

      {/* Drawer Body */}
      <div className="fixed top-0 right-0 z-50 w-full sm:w-[420px] h-full bg-white border-l shadow-2xl flex flex-col animate-slideLeft">
        {/* Header */}
        <div className="p-4 bg-zinc-950 text-white flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-yellow-400" />
            <span className="font-bold tracking-tight uppercase font-oswald text-base">
              My Shopping Cart ({totalItems})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Close Cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4 text-zinc-400 text-2xl">
                ⚽
              </div>
              <p className="font-bold text-sm text-zinc-800">Your cart is empty</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-[200px]">
                Browse our premium cleats, jerseys, and accessories to gear up!
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2 bg-[#facd15] hover:bg-yellow-500 text-black text-xs font-bold uppercase tracking-wider font-oswald rounded-lg transition-transform active:scale-95"
              >
                Go Shop Products
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-zinc-200 rounded-xl p-3 flex gap-3 shadow-xs relative group hover:border-[#facd15] transition-colors"
              >
                {/* Thumb */}
                <div className="w-20 h-20 bg-zinc-100 rounded-lg flex-shrink-0 overflow-hidden relative">
                  <img
                    src={item.image}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain p-2"
                  />
                </div>

                {/* Info and quantity controls */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-zinc-800 line-clamp-1 leading-tight mb-0.5">
                      {item.name}
                    </h4>
                    <span className="text-[10px] text-zinc-400 font-mono">Size: {item.sz}</span>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 border border-zinc-200 rounded-lg bg-zinc-50 p-1">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-5 h-5 rounded bg-white hover:bg-zinc-100 flex items-center justify-center text-zinc-650 transition-colors"
                        title="Reduce Quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-zinc-800 w-5 text-center font-mono">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-5 h-5 rounded bg-white hover:bg-zinc-100 flex items-center justify-center text-zinc-650 transition-colors"
                        title="Increase Quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-bold text-sm text-zinc-900 font-oswald">
                      {settings.currencySymbol}
                      {(item.price * item.qty).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="absolute top-2.5 right-2.5 p-1 text-zinc-300 hover:text-red-500 rounded transition-colors"
                  title="Remove Item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer with totals and WhatsApp Action */}
        {cart.length > 0 && (
          <div className="p-4 bg-white border-t border-zinc-100 shadow-lg space-y-4">
            <div className="space-y-1.5 flex flex-col text-sm border-b border-zinc-100 pb-3">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal Items ({totalItems}):</span>
                <span>{settings.currencySymbol}{totalPrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Estimated Shipping:</span>
                <span className="text-green-600 font-bold uppercase text-xs">FREE</span>
              </div>
              <div className="flex justify-between text-zinc-805 pt-1.5 font-bold text-base">
                <span>Total Amount:</span>
                <span className="text-zinc-950 text-xl font-oswald">
                  {settings.currencySymbol}
                  {totalPrice.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Submit checkout Form link/button to WhatsApp */}
            <div className="space-y-2">
              <button
                onClick={handleWhatsAppCheckout}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-xl font-oswald text-xs uppercase tracking-wider font-extrabold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                Order via WhatsApp (COD)
              </button>
              <span className="text-[10px] text-zinc-400 text-center block leading-tight">
                No credit card required. WhatsApp order composing will take care of everything, making Cash-On-Delivery quick &amp; safe!
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
