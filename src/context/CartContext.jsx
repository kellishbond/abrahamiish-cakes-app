import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (product, size) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === product.id && i.size === size);
      if (existing) {
        return prev.map(i =>
          i.id === product.id && i.size === size
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...product, size, quantity: 1 }];
    });
  };

  const addItemsToCart = items => {
    items.forEach(item => {
      const quantity = Math.max(1, Number(item.quantity || 1));
      for (let count = 0; count < quantity; count += 1) {
        addToCart(
          {
            ...item,
            id: item.productId || item.id,
            price: Number(item.price || 0),
          },
          item.size || 'Regular'
        );
      }
    });
  };

  const removeFromCart = (productId, size) => {
    setCartItems(prev => prev.filter(i => !(i.id === productId && i.size === size)));
  };

  const updateQuantity = (productId, size, quantity) => {
    if (quantity < 1) return removeFromCart(productId, size);
    setCartItems(prev =>
      prev.map(i =>
        i.id === productId && i.size === size ? { ...i, quantity } : i
      )
    );
  };

  const clearCart = () => setCartItems([]);

  const total = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems, addToCart, addItemsToCart, removeFromCart, updateQuantity, clearCart, total, itemCount
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
