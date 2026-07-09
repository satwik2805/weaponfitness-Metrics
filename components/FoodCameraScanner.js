import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { nutritionService } from '../services/nutritionService';
import { useToast } from './ui';

const TARGET_FOODS = [
    { key: "all", label: "Scan All 🔍" },
    { key: "egg", label: "Egg 🥚" },
    { key: "banana", label: "Banana 🍌" },
    { key: "chicken", label: "Chicken 🍗" },
    { key: "rice", label: "Rice 🍚" },
    { key: "bread", label: "Bread 🍞" },
    { key: "milk", label: "Milk 🥛" },
    { key: "apple", label: "Apple 🍎" },
    { key: "oats", label: "Oats 🥣" },
    { key: "whey", label: "Shake 🥛" },
];

export default function FoodCameraScanner({ onResult, onClose, colors }) {
    const toast = useToast();
    const [permission, requestPermission] = useCameraPermissions();
    const [isScanning, setIsScanning] = useState(false);
    const [targetFood, setTargetFood] = useState("all");
    const cameraRef = useRef(null);

    useEffect(() => {
        if (!permission) {
            requestPermission();
        }
    }, [permission]);

    if (!permission) {
        return <View style={styles.container}><ActivityIndicator size="large" color="#FFF" /></View>;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ color: '#FFF', textAlign: 'center', marginBottom: 20 }}>Camera permission is required.</Text>
                <TouchableOpacity style={styles.btn} onPress={requestPermission}>
                    <Text style={styles.btnText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const takePicture = async () => {
        if (!cameraRef.current || isScanning) return;

        try {
            setIsScanning(true);
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.5,
                base64: false,
            });

            const uri = photo.uri;
            const originalFilename = uri.split('/').pop() || 'scan.jpg';
            const filename = targetFood === "all" ? originalFilename : `${targetFood}_${originalFilename}`;
            const mimeType = 'image/jpeg';

            const formData = new FormData();
            formData.append('file', {
                uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
                name: filename,
                type: mimeType
            });

            const response = await nutritionService.detectFood(formData);
            if (response.items && response.items.length > 0) {
                onResult(response.items);
            } else {
                toast.show("No food detected — try a clearer, closer shot.", { kind: "warning" });
            }
        } catch (err) {
            console.error("Scan Error:", err);
            toast.show(err.message || "Couldn't analyze the photo. Add the meal manually instead.", { kind: "error" });
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} ref={cameraRef}>
                <View style={styles.overlay}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Feather name="x" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>AI FOOD SCANNER</Text>
                    </View>

                    {/* Guide Box */}
                    <View style={styles.guideBox} />

                    {/* Target Food Selector */}
                    <View style={{ paddingVertical: 10, alignSelf: 'center', width: '100%', alignItems: 'center' }}>
                        <Text style={{ color: '#FFF', fontSize: 11, marginBottom: 8, fontWeight: '700', opacity: 0.8, letterSpacing: 1 }}>
                            SELECT TARGET FOOD TO DETECT
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}
                            style={{ maxHeight: 36, width: '100%' }}
                        >
                            {TARGET_FOODS.map((food) => {
                                const isSelected = targetFood === food.key;
                                return (
                                    <TouchableOpacity
                                        key={food.key}
                                        onPress={() => setTargetFood(food.key)}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 16,
                                            backgroundColor: isSelected ? (colors.accent || '#5856D6') : 'rgba(255,255,255,0.15)',
                                            borderWidth: 1,
                                            borderColor: isSelected ? 'transparent' : 'rgba(255,255,255,0.25)',
                                        }}
                                    >
                                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>
                                            {food.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        {isScanning ? (
                            <ActivityIndicator size="large" color="#FFF" />
                        ) : (
                            <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                                <View style={styles.captureInner} />
                            </TouchableOpacity>
                        )}
                        <Text style={styles.footerText}>Place food within the frame</Text>
                    </View>
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#000',
        borderRadius: 20,
        overflow: 'hidden',
        height: 450,
        marginVertical: 10,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'space-between',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        flex: 1,
        textAlign: 'center',
        marginRight: 24,
    },
    closeBtn: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    guideBox: {
        width: '80%',
        aspectRatio: 1,
        alignSelf: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
        borderRadius: 20,
        borderStyle: 'dashed',
    },
    footer: {
        alignItems: 'center',
        marginBottom: 10,
    },
    captureBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 4,
        borderColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    captureInner: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#FFF',
    },
    footerText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        opacity: 0.8,
    },
    btn: {
        backgroundColor: '#5856D6',
        padding: 15,
        borderRadius: 12,
    },
    btnText: {
        color: '#FFF',
        fontWeight: '800',
    }
});
