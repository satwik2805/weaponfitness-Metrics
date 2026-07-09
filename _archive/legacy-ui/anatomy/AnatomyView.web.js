import React, { useState, Suspense, Component, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, G } from 'react-native-svg';


// Dynamically import 3D Scene so it doesn't crash the main bundle if it fails
const Anatomy3DScene = React.lazy(() => import('./Anatomy3DScene'));
import DetailedMuscleMap from './DetailedMuscleMap';

// --- ROBUST ERROR BOUNDARY ---
class AnatomyErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("AnatomyView 3D Crash:", error, errorInfo);
        if (this.props.onError) {
            this.props.onError(error);
        }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

const { width } = Dimensions.get('window');

// Muscle groups mapping
const MUSCLE_GROUPS = {
    chest: { name: 'Chest' },
    shoulders: { name: 'Shoulders' },
    biceps: { name: 'Biceps' },
    triceps: { name: 'Triceps' },
    abs: { name: 'Abs' },
    quads: { name: 'Quads' },
    back: { name: 'Back' },
    glutes: { name: 'Glutes' },
    hamstrings: { name: 'Hamstrings' },
    calves: { name: 'Calves' },
};

const MUSCLE_EXERCISES = {
    chest: [
        { id: 'bp', name: 'Bench Press', instructions: 'Lie on bench, press bar up.', video_url: 'https://www.youtube.com/watch?v=gRVjAtPip0Y' },
        { id: 'pushup', name: 'Push Ups', instructions: 'Plank position, lower chest to floor.', video_url: 'https://www.youtube.com/watch?v=FilesY4y70E' },
        { id: 'fly', name: 'Dumbbell Flys', instructions: 'Lie on bench, open arms wide.', video_url: 'https://www.youtube.com/watch?v=QENKPHhQVi4' },
    ],
    back: [
        { id: 'pullup', name: 'Pull Ups', instructions: 'Hang from bar, pull chin over bar.', video_url: 'https://www.youtube.com/watch?v=eGo4IYlbE5g' },
        { id: 'row', name: 'Barbell Row', instructions: 'Bent over, pull bar to waist.', video_url: 'https://www.youtube.com/watch?v=9efgcGunQ1o' },
        { id: 'lat', name: 'Lat Pulldown', instructions: 'Sit down, pull bar to upper chest.', video_url: 'https://www.youtube.com/watch?v=CAwf7n6Luuc' },
    ],
    shoulders: [
        { id: 'ohp', name: 'Overhead Press', instructions: 'Press bar over head.', video_url: 'https://www.youtube.com/watch?v=QAQ64hK4Xxs' },
        { id: 'latraise', name: 'Lateral Raises', instructions: 'Raise dumbbells to side.', video_url: 'https://www.youtube.com/watch?v=3VcKaXpzqRo' },
    ],
    biceps: [
        { id: 'curl', name: 'Bicep Curl', instructions: 'Curl weight up to chest.', video_url: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo' },
        { id: 'hammer', name: 'Hammer Curl', instructions: 'Curl with neutral grip.', video_url: 'https://www.youtube.com/watch?v=zC3nLlEvin4' },
    ],
    triceps: [
        { id: 'ext', name: 'Tricep Extension', instructions: 'Extend arm overhead.', video_url: 'https://www.youtube.com/watch?v=nRiJVZDpdLg' },
        { id: 'dip', name: 'Dips', instructions: 'Lower body between bars.', video_url: 'https://www.youtube.com/watch?v=2z8JmcrW-As' },
    ],
    quads: [
        { id: 'squat', name: 'Squat', instructions: 'Squat down, hips back.', video_url: 'https://www.youtube.com/watch?v=aclHkVaku9U' },
        { id: 'legext', name: 'Leg Extension', instructions: 'Sit and extend legs.', video_url: 'https://www.youtube.com/watch?v=YyvSfVjQeL0' },
    ],
    hamstrings: [
        { id: 'dl', name: 'Deadlift', instructions: 'Lift bar from floor with straight back.', video_url: 'https://www.youtube.com/watch?v=op9kVnSso6Q' },
        { id: 'legcurl', name: 'Leg Curl', instructions: 'Lie down, curl legs to butt.', video_url: 'https://www.youtube.com/watch?v=ELOCsoDSmrg' },
    ],
    glutes: [
        { id: 'hipthrust', name: 'Hip Thrust', instructions: 'Thrust hips up with weight.', video_url: 'https://www.youtube.com/watch?v=SEDQdGrandI' },
        { id: 'lunge', name: 'Walking Lunge', instructions: 'Step forward continuously.', video_url: 'https://www.youtube.com/watch?v=L8fvyb5yoTs' },
    ],
    calves: [
        { id: 'calfraise', name: 'Calf Raise', instructions: 'Raise heels off ground.', video_url: 'https://www.youtube.com/watch?v=-M4-G8p8fmc' },
    ],
    abs: [
        { id: 'plank', name: 'Plank', instructions: 'Hold body straight on elbows.', video_url: 'https://www.youtube.com/watch?v=pSHjTRCQxIw' },
        { id: 'crunch', name: 'Crunches', instructions: 'Lie back, lift shoulders.', video_url: 'https://www.youtube.com/watch?v=Xyd_fa5zoEU' },
        { id: 'legraise', name: 'Leg Raises', instructions: 'Lie back, lift legs.', video_url: 'https://www.youtube.com/watch?v=l4kQd9eWclE' },
    ],
};

// --- 2D COMPONENT REMOVED ---

// --- MAIN EXPORT ---
export default function AnatomyView({ onMusclePress, onWorkoutSelect }) {
    const { colors } = useTheme();
    const [use3D, setUse3D] = useState(false);
    const [cameraAngle, setCameraAngle] = useState('front');
    const [selectedMuscle, setSelectedMuscle] = useState(null);
    const [has3DError, setHas3DError] = useState(false);
    const [playingVideo, setPlayingVideo] = useState(null);

    const exerciseRef = useRef(null);

    const handleSelect = (muscle) => {
        setSelectedMuscle(muscle);
        if (onMusclePress) onMusclePress(muscle);

        // Auto-scroll to exercises on selection
        setTimeout(() => {
            if (exerciseRef.current) {
                exerciseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };

    const handle3DError = (err) => {
        console.warn("3D Renderer encountered an error, switching to 2D Fallback:", err);
        setHas3DError(true);
        setUse3D(false);
    };

    const recommendedExercises = selectedMuscle ? MUSCLE_EXERCISES[selectedMuscle] : [];

    return (
        <View style={styles.container}>
            {/* INJECT HOVER CSS FOR WEB - Futuristic Muscle Highlighting */}
            {typeof document !== 'undefined' && (
                <style dangerouslySetInnerHTML={{
                    __html: `
                    svg {
                        overflow: visible !important;
                    }
                    svg path {
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        cursor: pointer;
                        stroke: rgba(255,255,255,0.05);
                        stroke-width: 0.5px;
                    }
                    svg path:hover {
                        fill: ${colors.accent} !important;
                        fill-opacity: 0.6 !important;
                        filter: drop-shadow(0 0 8px ${colors.accent});
                        stroke: ${colors.accent} !important;
                        stroke-width: 1.5px !important;
                        transform: scale(1.02);
                        transform-origin: center;
                    }
                    /* Ensure selected muscle stays bright */
                    svg path[fill="${colors.accent}"] {
                        fill-opacity: 1 !important;
                        filter: drop-shadow(0 0 12px ${colors.accent});
                    }
                `}} />
            )}
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: colors.text }]}>Body Anatomy</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Select a muscle to view workouts</Text>
                </View>

                {/* 3D/2D Toggle */}
                <TouchableOpacity
                    style={[styles.modeToggle, { backgroundColor: colors.primaryLight }]}
                    onPress={() => setUse3D(!use3D)}
                >
                    <MaterialCommunityIcons name={use3D ? "axis-z-rotate-clockwise" : "vector-rectangle"} size={20} color={colors.accent} />
                    <Text style={[styles.modeToggleText, { color: colors.textSecondary }]}>{use3D ? '3D' : '2D'}</Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.viewport, { backgroundColor: '#050505', borderColor: colors.border }]}>
                {!has3DError && use3D && (
                    <View style={styles.viewBadge}>
                        <MaterialCommunityIcons name="cube-scan" size={16} color={colors.accent} />
                        <Text style={styles.viewBadgeText}>LIVE KINETIC FEED</Text>
                    </View>
                )}

                {/* VISUALIZER: 3D or 2D */}
                {/* We wrap the 3D part in ErrorBoundary to prevent White Screen of Death */}
                {use3D && !has3DError ? (
                    <AnatomyErrorBoundary
                        onError={handle3DError}
                        fallback={
                            <View style={styles.container}>
                                <DetailedMuscleMap selectedMuscle={selectedMuscle} onSelect={handleSelect} colors={colors} />
                                <View style={{ position: 'absolute', bottom: 10, alignSelf: 'center' }}>
                                    <Text style={{ color: '#ff3b30', fontSize: 10 }}>3D Failed to Load - Safe Mode Active</Text>
                                </View>
                            </View>
                        }
                    >
                        <Suspense fallback={
                            <View style={styles.center}>
                                <ActivityIndicator color={colors.accent} size="large" />
                                <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Initializing 3D Layer...</Text>
                            </View>
                        }>
                            <Anatomy3DScene
                                selectedMuscle={selectedMuscle}
                                onSelectMuscle={handleSelect}
                                cameraAngle={cameraAngle}
                                colors={colors}
                            />
                        </Suspense>
                    </AnatomyErrorBoundary>
                ) : (
                    <DetailedMuscleMap selectedMuscle={selectedMuscle} onSelect={handleSelect} colors={colors} />
                )}

                {/* View Controls (Only for 3D) */}
                {use3D && (
                    <View style={styles.viewControls}>
                        {['front', 'back'].map(angle => (
                            <TouchableOpacity
                                key={angle}
                                onPress={() => setCameraAngle(angle)}
                                style={[
                                    styles.viewBtn,
                                    { backgroundColor: colors.primaryLight },
                                    cameraAngle === angle && { borderColor: colors.accent, borderWidth: 1.5 }
                                ]}
                            >
                                <Text style={[styles.viewBtnText, { color: cameraAngle === angle ? colors.accent : colors.textSecondary }]}>
                                    {angle.charAt(0).toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* Horizontal List of Muscles for Quick Tap (Always Visible) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.muscleList}>
                {Object.keys(MUSCLE_GROUPS).map(m => (
                    <TouchableOpacity
                        key={m}
                        style={[
                            styles.muscleChip,
                            { backgroundColor: colors.primaryLight, borderColor: colors.border },
                            selectedMuscle === m && { backgroundColor: colors.accent, borderColor: colors.accent }
                        ]}
                        onPress={() => handleSelect(m)}
                    >
                        <Text style={[
                            styles.muscleChipText,
                            { color: colors.textSecondary },
                            selectedMuscle === m && { color: colors.primary }
                        ]}>
                            {m.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* RECOMMENDED FOR SELECTION */}
            {selectedMuscle && (
                <View ref={exerciseRef} style={{ marginTop: 15, paddingBottom: 50 }}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Recommended for {MUSCLE_GROUPS[selectedMuscle]?.name}</Text>
                    {recommendedExercises.map((ex, i) => {
                        const isPlaying = playingVideo === ex.id;
                        let videoId = null;
                        if (ex.video_url && ex.video_url.includes('v=')) {
                            videoId = ex.video_url.split('v=')[1].split('&')[0];
                        }
                        return (
                            <View key={i} style={[styles.exerciseCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: isPlaying ? 10 : 0 }}
                                    onPress={() => onWorkoutSelect && onWorkoutSelect(ex)}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: colors.inputBackground }]}>
                                        <MaterialCommunityIcons name="dumbbell" size={24} color={colors.accent} />
                                    </View>
                                    <View style={{ flex: 1, paddingHorizontal: 12 }}>
                                        <Text style={[styles.exTitle, { color: colors.text }]}>{ex.name}</Text>
                                        <Text style={[styles.exDesc, { color: colors.textSecondary }]}>{ex.instructions}</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setPlayingVideo(isPlaying ? null : ex.id)}
                                        style={{ padding: 8 }}
                                    >
                                        <Feather name={isPlaying ? "stop-circle" : "play-circle"} size={24} color={colors.accent} />
                                    </TouchableOpacity>
                                </TouchableOpacity>

                                {isPlaying && videoId && (
                                    <View style={{ width: '100%', height: 220, borderRadius: 12, overflow: 'hidden', marginTop: 10 }}>
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
                                            style={{ border: 'none' }}
                                            allow="autoplay; encrypted-media"
                                            allowFullScreen
                                        />
                                    </View>
                                )}
                            </View>
                        );
                    })}
                    {recommendedExercises.length === 0 && (
                        <Text style={{ color: colors.textSecondary, marginTop: 10 }}>No specific workouts listed yet.</Text>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, marginTop: 10 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 8 },
    title: { fontSize: 26, fontWeight: '900', letterSpacing: -1 },
    subtitle: { fontSize: 14, opacity: 0.8 },
    modeToggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, elevation: 5 },
    modeToggleText: { fontSize: 13, fontWeight: '800' },
    viewport: { height: width * 1.1, borderRadius: 32, overflow: 'hidden', borderWidth: 1.5, position: 'relative', backgroundColor: '#050505', shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.6, elevation: 20 },
    viewBadge: { position: 'absolute', top: 20, left: 20, zIndex: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    viewBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
    viewControls: { position: 'absolute', right: 15, top: '25%', gap: 10 },
    viewBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 5 },
    viewBtnText: { fontSize: 12, fontWeight: '900' },
    controlsOverlay: { position: 'absolute', bottom: 25, width: '100%', alignItems: 'center' },
    controlBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, elevation: 12 },
    controlBtnText: { fontSize: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    muscleList: { marginTop: 25, maxHeight: 60 },
    muscleChip: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1.5, marginRight: 12, height: 48, justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 2 },
    muscleChipText: { fontSize: 13, fontWeight: '800' },
    headerTitle: { fontSize: 20, fontWeight: '800', marginBottom: 15 },
    exerciseCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, marginBottom: 10, borderWidth: 1, gap: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 2 },
    iconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    exTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    exDesc: { fontSize: 12 },
});
