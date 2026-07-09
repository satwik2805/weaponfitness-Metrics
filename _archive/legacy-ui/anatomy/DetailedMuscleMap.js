import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Body from 'react-native-body-highlighter';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const MUSCLE_MAPPING = {
    chest: 'chest',
    shoulders: ['front-deltoids', 'back-deltoids', 'front-deltoid', 'back-deltoid', 'shoulders', 'deltoid'],
    biceps: 'biceps',
    triceps: 'triceps',
    abs: 'abs',
    quads: 'quadriceps',
    back: ['trapezius', 'latissimus_dorsi', 'upper-back', 'lower-back'],
    glutes: 'gluteal',
    hamstrings: 'hamstring',
    calves: 'calves',
};

// Reverse mapping for callbacks
const REVERSE_MAPPING = {
    chest: 'chest',
    'front-deltoids': 'shoulders',
    'back-deltoids': 'shoulders',
    'front-deltoid': 'shoulders',
    'back-deltoid': 'shoulders',
    'shoulders': 'shoulders',
    'deltoid': 'shoulders',
    biceps: 'biceps',
    triceps: 'triceps',
    abs: 'abs',
    quadriceps: 'quads',
    trapezius: 'back',
    'upper-back': 'back',
    'lower-back': 'back',
    latissimus_dorsi: 'back',
    gluteal: 'glutes',
    hamstring: 'hamstrings',
    calves: 'calves',
};

const DetailedMuscleMap = ({ selectedMuscle, onSelect, colors }) => {
    // Determine which slugs to highlight based on selection
    const librarySlugs = selectedMuscle ? (MUSCLE_MAPPING[selectedMuscle] || [selectedMuscle]) : [];
    const data = Array.isArray(librarySlugs)
        ? librarySlugs.map(slug => ({ slug, intensity: 2 }))
        : (librarySlugs ? [{ slug: librarySlugs, intensity: 2 }] : []);

    return (
        <View style={styles.container}>
            <View style={styles.sideBySide}>
                <View style={[styles.bodyWrapper, selectedMuscle === 'shoulders' && { borderColor: colors.accent, borderWidth: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                    <Body
                        data={data}
                        onMusclePress={(muscle) => onSelect(REVERSE_MAPPING[muscle.slug] || muscle.slug)}
                        gender="male"
                        side="front"
                        scale={0.9}
                        colors={[colors.primaryLight, colors.accent]}
                        backgroundColor="transparent"
                    />
                </View>
                <View style={[styles.bodyWrapper, (selectedMuscle === 'shoulders' || selectedMuscle === 'back') && { borderColor: colors.accent, borderWidth: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                    <Body
                        data={data}
                        onMusclePress={(muscle) => onSelect(REVERSE_MAPPING[muscle.slug] || muscle.slug)}
                        gender="male"
                        side="back"
                        scale={0.9}
                        colors={[colors.primaryLight, colors.accent]}
                        backgroundColor="transparent"
                    />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sideBySide: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 10,
    },
    bodyWrapper: {
        flex: 1,
        height: width * 1.0,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 20,
    },
});

export default DetailedMuscleMap;