import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/theme';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import AddEditProductScreen from '../screens/admin/AddEditProductScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ManageOrdersScreen from '../screens/admin/ManageOrdersScreen';
import CartScreen from '../screens/customer/CartScreen';
import CheckoutScreen from '../screens/customer/CheckoutScreen';
import HomeScreen from '../screens/customer/HomeScreen';
import OrderConfirmationScreen from '../screens/customer/OrderConfirmationScreen';
import ProductDetailScreen from '../screens/customer/ProductDetailScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';

const RootStack = createStackNavigator();
const Tab = createBottomTabNavigator();

const CUSTOMER_TAB_ICONS = {
  HomeTab: '🏠',
  CartTab: '🛒',
  ProfileTab: '👤',
};

const ADMIN_TAB_ICONS = {
  DashboardTab: '📊',
  ProductsTab: '🧁',
  OrdersTab: '📦',
  SettingsTab: '⚙️',
};

function TabIcon({ focused, icon }) {
  return (
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      {icon}
    </Text>
  );
}

function sharedTabOptions(route, icons) {
  return {
    headerShown: false,
    tabBarActiveTintColor: COLORS.primary,
    tabBarInactiveTintColor: COLORS.textMuted,
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '600',
      paddingBottom: 4,
    },
    tabBarStyle: {
      height: 72,
      paddingTop: 8,
    },
    tabBarIcon: ({ focused }) => (
      <TabIcon focused={focused} icon={icons[route.name]} />
    ),
  };
}

function CustomerTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => sharedTabOptions(route, CUSTOMER_TAB_ICONS)}>
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartScreen}
        options={{ title: 'Cart' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => sharedTabOptions(route, ADMIN_TAB_ICONS)}>
      <Tab.Screen
        name="DashboardTab"
        component={AdminDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="ProductsTab"
        component={AddEditProductScreen}
        options={{ title: 'Products' }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={ManageOrdersScreen}
        options={{ title: 'Orders' }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={ProfileScreen}
        initialParams={{ adminMode: true }}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loaderWrap}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

export default function AppNavigator() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          role === 'admin' ? (
            <RootStack.Screen name="AdminTabs" component={AdminTabs} />
          ) : (
            <>
              <RootStack.Screen name="CustomerTabs" component={CustomerTabs} />
              <RootStack.Screen name="ProductDetail" component={ProductDetailScreen} />
              <RootStack.Screen name="Checkout" component={CheckoutScreen} />
              <RootStack.Screen
                name="OrderConfirmation"
                component={OrderConfirmationScreen}
              />
            </>
          )
        ) : (
          <>
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  tabIcon: { fontSize: 18, opacity: 0.65 },
  tabIconFocused: { opacity: 1 },
});
