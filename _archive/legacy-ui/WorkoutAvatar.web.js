import React, { Suspense, useRef, useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

export default function WorkoutAvatar({ workoutType }) {
    return (
        <View style={{ height: 300, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white' }}>3D Avatar Disabled for Checking</Text>
        </View>
    );
}

const styles = StyleSheet.create({});
