import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
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
const Tab = createMaterialTopTabNavigator();

const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarShowLabel: true,
        tabBarStyle: { 
          height: 60 + insets.bottom, 
          paddingBottom: insets.bottom,
          backgroundColor: '#fff',
          justifyContent: 'center',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        tabBarIndicatorStyle: {
          height: 0, // hide the underline or set > 0 if you want an active indicator
        },
        tabBarLabelStyle: {
          fontSize: 10,
          textTransform: 'none',
          margin: 0,
          padding: 0
        },
        tabBarIconStyle: {
          width: 24,
          height: 24,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{ tabBarLabel: 'Home', tabBarIcon: ({ color }) => <CaretCircleDoubleUp color={color} size={24} weight="fill" /> }} 
      />
      <Tab.Screen 
        name="RoutesTab" 
        component={RoutesScreen} 
        options={{ tabBarLabel: 'Routes', tabBarIcon: ({ color }) => <MapTrifold color={color} size={24} weight="fill" /> }} 
      />
      <Tab.Screen 
        name="WalletTab" 
        component={WalletScreen} 
        options={{ tabBarLabel: 'Wallet', tabBarIcon: ({ color }) => <Wallet color={color} size={24} weight="fill" /> }} 
      />
      <Tab.Screen 
        name="HistoryTab" 
        component={JobHistoryScreen} 
        options={{ tabBarLabel: 'History', tabBarIcon: ({ color }) => <ClockCounterClockwise color={color} size={24} weight="fill" /> }} 
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color }) => <UserCircle color={color} size={24} weight="fill" /> }} 
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
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
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
