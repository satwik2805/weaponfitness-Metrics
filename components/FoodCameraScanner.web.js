import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Platform, ScrollView } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { nutritionService } from '../services/nutritionService';
import { useToast } from './ui';

// Detect if we are correctly running in a web environment where DOM is available
const isWeb = Platform.OS === 'web';

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
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isScanning, setIsScanning] = useState(false);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);
    const [targetFood, setTargetFood] = useState("all");

    useEffect(() => {
        let currentStream = null;

        const startCamera = async () => {
            if (isWeb && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const s = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'environment' }
                    });
                    setStream(s);
                    currentStream = s;
                    if (videoRef.current) {
                        videoRef.current.srcObject = s;
                    }
                } catch (err) {
                    console.error("Camera Error:", err);
                    setError("Could not access camera. Please allow permissions.");
                }
            } else {
                setError("Web Camera API not supported on this device.");
            }
        };

        startCamera();

        return () => {
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const takePictureAndProcess = async () => {
        if (!videoRef.current || !canvasRef.current || isScanning) return;

        try {
            setIsScanning(true);
            const video = videoRef.current;
            const canvas = canvasRef.current;

            // Set canvas dimensions to match video
            if (video.readyState < 2) { // HAVE_CURRENT_DATA
                console.warn("⚠️ Video not ready yet");
                toast.show("Camera is still starting — give it a second.", { kind: "info" });
                setIsScanning(false);
                return;
            }

            if (video.videoWidth === 0 || video.videoHeight === 0) {
                console.error("❌ Video dimensions are 0");
                toast.show("The camera stream looks wrong — check permissions and retry.", { kind: "error" });
                setIsScanning(false);
                return;
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw video frame to canvas
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to blob
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    console.error("❌ Canvas to Blob failed");
                    toast.show("Couldn't capture the image. Try again.", { kind: "error" });
                    setIsScanning(false);
                    return;
                }

                console.log(`📸 Image captured! Size: ${blob.size} bytes, Type: ${blob.type}`);

                // Show a quick alert if the image is suspicously small
                if (blob.size < 1000) {
                    toast.show("That looked like a black screen — check camera permissions.", { kind: "warning" });
                }

                const formData = new FormData();
                const filename = targetFood === "all" ? "scan.jpg" : `${targetFood}_scan.jpg`;
                formData.append('file', blob, filename);

                try {
                    console.log("🚀 Sending image to AI service...");
                    const result = await nutritionService.detectFood(formData);
                    console.log("✅ AI Response:", result);

                    if (result.items && result.items.length > 0) {
                        onResult(result.items);
                    } else {
                        toast.show("No food detected — try a clearer, closer shot.", { kind: "warning" });
                    }
                } catch (err) {
                    console.error("❌ Analysis Error:", err);
                    toast.show(err.message || "Couldn't analyze the photo. Add the meal manually instead.", { kind: "error" });
                } finally {
                    setIsScanning(false);
                }
            }, 'image/jpeg', 1.0); // Increased quality to 1.0

        } catch (err) {
            console.error(err);
            setIsScanning(false);
        }
    };

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={{ color: 'white', marginBottom: 20 }}>{error}</Text>
                <TouchableOpacity onPress={onClose} style={[styles.btn, { backgroundColor: '#FF3B30' }]}>
                    <Text style={styles.btnText}>Close</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* HTML5 Video Element for Web */}
            {isWeb ? (
                <div style={{ width: '100%', height: '100%', position: 'absolute', overflow: 'hidden', borderRadius: 24 }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
            ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: 'white' }}>Native Camera Not Loaded</Text>
                </View>
            )}

            {/* Overlay UI */}
            <View style={styles.overlay}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                        <Feather name="x" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerText}>AI Food Scanner</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.viewfinderContainer}>
                    <View style={styles.viewfinder}>
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                    </View>
                    <Text style={styles.hintText}>Position food inside the frame</Text>
                </View>

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

                <View style={styles.footer}>
                    {isScanning ? (
                        <View style={styles.scanningContainer}>
                            <ActivityIndicator size="large" color={colors.accent || '#5856D6'} />
                            <Text style={styles.scanningText}>Analyzing Nutrition...</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.shutterBtn, { borderColor: colors.accent || '#5856D6' }]}
                            onPress={takePictureAndProcess}
                        >
                            <View style={[styles.shutterInner, { backgroundColor: colors.accent || '#5856D6' }]} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        borderRadius: 24,
        overflow: 'hidden',
        height: 550,
        marginVertical: 10,
        position: 'relative'
    },
    overlay: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 20,
        zIndex: 10, // Ensure overlay is above video
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    iconBtn: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    viewfinderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewfinder: {
        width: 250,
        height: 250,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: '#FFF',
        borderWidth: 4,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    topRight: {
        top: 0,
        right: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    hintText: {
        color: '#FFF',
        fontSize: 14,
        marginTop: 20,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    footer: {
        alignItems: 'center',
        paddingBottom: 10,
    },
    shutterBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    shutterInner: {
        width: 54,
        height: 54,
        borderRadius: 27,
    },
    scanningContainer: {
        alignItems: 'center',
    },
    scanningText: {
        color: '#FFF',
        marginTop: 10,
        fontWeight: '800',
    },
    btn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
        marginVertical: 20,
    },
    btnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    title: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 100,
    },
    closeBtn: {
        padding: 10,
    },
    closeText: {
        color: '#CCC',
    }
});
