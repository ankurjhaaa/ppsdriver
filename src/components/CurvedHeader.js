import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CaretLeft } from 'phosphor-react-native';

const { width } = Dimensions.get('window');

export default function CurvedHeader({ title, subtitle, showBack, onBack, rightComponent, isHome }) {
  return (
    <View style={styles.container}>
      <View style={styles.headerContent}>
        {showBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
            <CaretLeft color="#fff" size={22} weight="bold" />
          </TouchableOpacity>
        )}
        
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/ppspurnea.png')} style={isHome ? styles.logo : styles.smallLogo} resizeMode="contain" />
          {isHome ? (
            <View>
              <Text style={styles.schoolNameTitle}>PURNEA PUBLIC SCHOOL</Text>
              <Text style={styles.driverAppText}>Driver App</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.pageTitle}>{title}</Text>
              {subtitle && <Text style={styles.pageSubtitle}>{subtitle}</Text>}
            </View>
          )}
        </View>
        
        <View style={styles.rightComponentContainer}>
          {rightComponent}
        </View>
      </View>
      
      {/* Curved SVG at the bottom */}
      <View style={styles.svgContainer}>
        <Svg width={width} height="30" viewBox={`0 0 ${width} 30`} preserveAspectRatio="none">
          {/* Navy fill background */}
          <Path
            d={`M0,0 L${width},0 L${width},8 Q${width * 0.75},30 ${width * 0.5},18 Q${width * 0.25},6 0,20 L0,0 Z`}
            fill="#0A1931"
          />
          {/* Yellow accent stroke */}
          <Path
            d={`M${width},8 Q${width * 0.75},30 ${width * 0.5},18 Q${width * 0.25},6 0,20`}
            fill="none"
            stroke="#FDB813"
            strokeWidth="3"
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f4f6f9',
    width: '100%',
  },
  headerContent: {
    backgroundColor: '#0A1931',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 56,
  },
  backButton: {
    marginRight: 12,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 42,
    height: 42,
    marginRight: 10,
  },
  smallLogo: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  schoolNameTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  driverAppText: {
    color: '#FDB813',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
    letterSpacing: 0.5,
  },
  pageTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  pageSubtitle: {
    color: '#FDB813',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  rightComponentContainer: {
    marginLeft: 'auto',
  },
  svgContainer: {
    width: '100%',
    height: 30,
    backgroundColor: '#f4f6f9',
    marginTop: -1,
  }
});
