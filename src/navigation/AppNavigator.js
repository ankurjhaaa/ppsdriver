import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CaretCircleDoubleUp, ClockCounterClockwise, MapTrifold, UserCircle, Wallet } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthContext } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ActiveJobScreen from '../screens/ActiveJobScreen';
import WalletScreen from '../screens/WalletScreen';
import RoutesScreen from '../screens/RoutesScreen';
import JobHistoryScreen from '../screens/JobHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import JobDetailsScreen from '../screens/JobDetailsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
          height: 60 + insets.bottom, 
          paddingBottom: 10 + insets.bottom, 
          paddingTop: 5, 
          backgroundColor: '#fff' 
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{ tabBarLabel: 'Home', tabBarIcon: ({ color, size }) => <CaretCircleDoubleUp color={color} size={size} weight="fill" /> }} 
      />
      <Tab.Screen 
        name="RoutesTab" 
        component={RoutesScreen} 
        options={{ tabBarLabel: 'Routes', tabBarIcon: ({ color, size }) => <MapTrifold color={color} size={size} weight="fill" /> }} 
      />
      <Tab.Screen 
        name="WalletTab" 
        component={WalletScreen} 
        options={{ tabBarLabel: 'Wallet', tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} weight="fill" /> }} 
      />
      <Tab.Screen 
        name="HistoryTab" 
        component={JobHistoryScreen} 
        options={{ tabBarLabel: 'History', tabBarIcon: ({ color, size }) => <ClockCounterClockwise color={color} size={size} weight="fill" /> }} 
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color, size }) => <UserCircle color={color} size={size} weight="fill" /> }} 
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return null; // or a loading splash screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="ActiveJob" component={ActiveJobScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
