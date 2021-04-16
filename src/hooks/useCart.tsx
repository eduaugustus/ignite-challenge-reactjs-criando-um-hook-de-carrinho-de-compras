import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get<Stock>(`stock/${productId}`);

      const productStockAmount = stockResponse.data.amount;
      const productExistsInCart = cart.find(product => product.id === productId);
      const amountOfProductInCart = productExistsInCart ? productExistsInCart.amount : 0;
      const amount = amountOfProductInCart + 1; 

      if (amount > productStockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      let updatedCart: Product[];

      if (productExistsInCart) {
        updatedCart = cart.map(cartProduct => cartProduct.id === productId ?
          { ...cartProduct, amount } :
          cartProduct
        );
      } else {
        const productResponse = await api.get<Product>(`products/${productId}`);
        const product = productResponse.data;
        const newProduct = {
          ...product,
            amount: 1
        };

        updatedCart = [...cart, newProduct];
      }

      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify(updatedCart)
      );

      setCart(updatedCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const foundProductInCart = cart.find(productInCart => productInCart.id === productId);

      if (foundProductInCart) {
        const updatedCartState = cart.filter(productInCart => productInCart.id !== productId);
  
        localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify(updatedCartState)
        );
  
        setCart(updatedCartState);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data } = await api.get<Product>(`stock/${productId}`);
      const productAmountInStock = data.amount;
      const foundItemInCart = cart.find(itemInCart => itemInCart.id === productId);

      if (amount <= 0) {
        return;
      }
      
      if (amount > productAmountInStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (foundItemInCart) {
        const updatedCartState = cart.map(itemInCart => itemInCart.id === productId ?
          { ...itemInCart, amount } :
          itemInCart  
        );

        localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify(updatedCartState)
        );

        setCart(updatedCartState);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
