import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product } from '../types';
import toast from 'react-hot-toast';

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemQuantity: (productId: string) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find(item => item.productId === product.id);
          
          if (existingItem) {
            // Update quantity if item already exists
            const updatedItems = state.items.map(item =>
              item.productId === product.id
                ? {
                    ...item,
                    quantity: item.quantity + quantity,
                    totalPrice: (item.quantity + quantity) * item.unitPrice,
                  }
                : item
            );
            
            toast.success(`${product.name} actualizado en el carrito`);
            return { items: updatedItems };
          } else {
            // Add new item
            const newItem: CartItem = {
              productId: product.id,
              productName: product.name,
              colmadoId: product.colmadoId,
              colmadoName: '', // Will be filled by the calling component
              quantity,
              unitPrice: product.price,
              totalPrice: product.price * quantity,
              imageUrl: product.imageUrl,
            };
            
            toast.success(`${product.name} agregado al carrito`);
            return { items: [...state.items, newItem] };
          }
        });
      },

      removeItem: (productId: string) => {
        set((state) => {
          const item = state.items.find(item => item.productId === productId);
          if (item) {
            toast.success(`${item.productName} eliminado del carrito`);
          }
          
          return {
            items: state.items.filter(item => item.productId !== productId),
          };
        });
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set((state) => ({
          items: state.items.map(item =>
            item.productId === productId
              ? {
                  ...item,
                  quantity,
                  totalPrice: quantity * item.unitPrice,
                }
              : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
        toast.success('Carrito vaciado');
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.totalPrice, 0);
      },

      getItemQuantity: (productId: string) => {
        const item = get().items.find(item => item.productId === productId);
        return item?.quantity || 0;
      },
    }),
    {
      name: 'whatsopi-cart',
      version: 1,
    }
  )
);

// Hook to use cart functionality
export const useCart = () => {
  const store = useCartStore();
  
  return {
    cartItems: store.items,
    addToCart: store.addItem,
    removeFromCart: store.removeItem,
    updateCartQuantity: store.updateQuantity,
    clearCart: store.clearCart,
    getTotalItems: store.getTotalItems,
    getTotalPrice: store.getTotalPrice,
    getItemQuantity: store.getItemQuantity,
  };
};