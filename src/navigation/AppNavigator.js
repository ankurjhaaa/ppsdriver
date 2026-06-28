import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { House, MapTrifold, Wallet, ClockCounterClockwise, UserCircle, Bank } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

import { AuthContext } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ActiveJobScreen from '../screens/ActiveJobScreen';
import WalletScreen from '../screens/WalletScreen';
import SalaryScreen from '../screens/SalaryScreen';
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
        swipeEnabled: false,
        animationEnabled: false,
        tabBarActiveTintColor: '#0A1931',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarShowLabel: true,
        tabBarShowIcon: true,
        tabBarStyle: { 
          height: 68 + insets.bottom, 
          paddingBottom: insets.bottom,
          backgroundColor: '#fff',
          justifyContent: 'center',
          elevation: 10,
          shadowColor: '#0A1931',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
          borderTopWidth: 0,
        },
        tabBarIndicatorStyle: {
          backgroundColor: '#FDB813',
          height: 3,
          top: 0,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          textTransform: 'none',
          margin: 0,
          padding: 0,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
        tabBarIconStyle: {
          width: 28,
          height: 28,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{ tabBarLabel: 'Home', tabBarIcon: ({ color }) => <House color={color} size={26} weight="fill" /> }} 
      />
      <Tab.Screen 
        name="RoutesTab" 
        component={RoutesScreen} 
        options={{ tabBarLabel: 'Routes', tabBarIcon: ({ color }) => <MapTrifold color={color} size={26} weight="fill" /> }} 
      />
      <Tab.Screen
        name="SalaryTab"
        component={SalaryScreen}
        options={{ tabBarLabel: 'Salary', tabBarIcon: ({ color }) => <Bank color={color} size={26} weight="fill" /> }}
      />
      <Tab.Screen
        name="WalletTab" 
        component={WalletScreen} 
        options={{ tabBarLabel: 'Wallet', tabBarIcon: ({ color }) => <Wallet color={color} size={26} weight="fill" /> }} 
      />
      <Tab.Screen 
        name="HistoryTab" 
        component={JobHistoryScreen} 
        options={{ tabBarLabel: 'History', tabBarIcon: ({ color }) => <ClockCounterClockwise color={color} size={26} weight="fill" /> }} 
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color }) => <UserCircle color={color} size={26} weight="fill" /> }} 
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, isBootstrapping } = useContext(AuthContext);

  if (isBootstrapping) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FDB813" />
        <Text style={styles.loadingText}>PPS Purnea Connecting...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none', gestureEnabled: false }}>
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A1931',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
