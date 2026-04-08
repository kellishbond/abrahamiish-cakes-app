import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { CustomerProvider } from './src/context/CustomerContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <CustomerProvider>
        <CartProvider>
          <AppNavigator />
        </CartProvider>
      </CustomerProvider>
    </AuthProvider>
  );
}
