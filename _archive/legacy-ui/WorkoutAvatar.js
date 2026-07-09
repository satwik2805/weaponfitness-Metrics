import React, { useRef, Suspense, useEffect, useState, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet, Dimensions, TouchableOpacity, Text, Platform } from 'react-native';
// Explicitly importing default for general ecosystem compatibility, but the resolver in metro.config.js will prioritize .web.js files for web
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment, ContactShadows, OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { useTheme } from '../context/ThemeContext';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as THREE from 'three';

const { width, height: screenHeight } = Dimensions.get('window');

// Extended Muscle mapping for workouts with more synonyms
const WORKOUT_CONFIGS = {
    'squat': {
        keywords: ['squat', 'leg press', 'leg extension'],
        primary: ['quads', 'glutes'],
        secondary: ['hamstrings', 'calves', 'abs'],
        animationName: 'squat_anim',
        procedural: 'leg_drive'
    },
    'bench press': {
        keywords: ['bench press', 'chest press', 'dumbbell press', 'pec deck'],
        primary: ['chest'],
        secondary: ['triceps', 'shoulders'],
        animationName: 'bench_press_anim',
        procedural: 'push_drive'
    },
    'pushup': {
        keywords: ['pushup', 'push-up', 'dips'],
        primary: ['chest', 'triceps'],
        secondary: ['shoulders', 'abs'],
        animationName: 'pushup_anim',
        procedural: 'pushup'
    },
    'bicep curl': {
        keywords: ['curl', 'bicep', 'hammer'],
        primary: ['biceps'],
        secondary: ['forearms'],
        animationName: 'curl_anim',
        procedural: 'curl'
    },
    'shoulder press': {
        keywords: ['shoulder press', 'overhead press', 'military press', 'lateral raise'],
        primary: ['shoulders'],
        secondary: ['triceps'],
        animationName: 'press_anim',
        procedural: 'vertical_push'
    },
    'pullup': {
        keywords: ['pullup', 'pull-up', 'lat pulldown', 'row'],
        primary: ['back', 'biceps'],
        secondary: ['shoulders', 'forearms'],
        animationName: 'pullup_anim',
        procedural: 'vertical_pull'
    },
    'deadlift': {
        keywords: ['deadlift', 'back extension', 'good morning'],
        primary: ['back', 'glutes', 'hamstrings'],
        secondary: ['quads', 'calves', 'forearms'],
        animationName: 'deadlift_anim',
        procedural: 'bend_drive'
    },
    'plank': {
        keywords: ['plank', 'abswheel', 'leg raise', 'crunch'],
        primary: ['abs'],
        secondary: ['shoulders', 'quads'],
        animationName: 'plank_anim',
        procedural: 'static_hold'
    },
    'lunge': {
        keywords: ['lunge', 'split squat', 'step up'],
        primary: ['quads', 'glutes'],
        secondary: ['hamstrings', 'calves', 'abs'],
        animationName: 'lunge_anim',
        procedural: 'lunge'
    }
};

// Map keywords to model URLs
const MODELS = {
    man: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/man/model.gltf'
};


const MUSCLE_KEYWORDS = {
    chest: ['pectoral', 'chest', 'breast'],
    shoulders: ['deltoid', 'shoulder', 'acromial'],
    biceps: ['biceps', 'brachii'],
    triceps: ['triceps'],
    abs: ['abdominal', 'abs', 'stomach', 'rectus'],
    quads: ['quads', 'quadriceps', 'thigh', 'femoris'],
    back: ['lat', 'back', 'trapezius', 'rhomboid', 'scapula'],
    glutes: ['glute', 'butt', 'maximus'],
    hamstrings: ['hamstring', 'biceps_femoris'],
    calves: ['calf', 'calves', 'gastrocnemius'],
};

function AvatarModel({ workoutType, isPaused, speed, progress }) {
    const { config, workoutNameKey } = useMemo(() => {
        const type = workoutType?.toLowerCase() || '';
        for (const [key, cfg] of Object.entries(WORKOUT_CONFIGS)) {
            if (cfg.keywords.some(kw => type.includes(kw))) {
                return { config: cfg, workoutNameKey: key };
            }
        }
        return { config: WORKOUT_CONFIGS['squat'], workoutNameKey: 'squat' };
    }, [workoutType]);

    const modelUrl = MODELS.man;
    const { scene, animations } = useGLTF(modelUrl);
    const groupRef = useRef();
    const { actions, mixer } = useAnimations(animations, groupRef);
    const { colors } = useTheme();

    const emissivePulseRef = useRef(0);


    // Initial Engine Setup: Mixer and Action Controller
    useEffect(() => {
        if (!actions) return;

        if (isPaused) {
            Object.values(actions).forEach(action => action?.pause());
        } else {
            const animName = config.animationName;
            const action = actions[animName] || actions[Object.keys(actions)[0]];

            if (action) {
                action.reset().setEffectiveTimeScale(speed).play();
                action.paused = false;
            }
        }
    }, [actions, config.animationName, isPaused, speed]);

    useFrame((state) => {
        if (!groupRef.current) return;

        // FORCE PROCEDURAL: For these models, mathematical movement is more reliable than missing animations
        const animName = config.animationName;
        const activeAction = actions ? actions[animName] : null;

        // If we don't have the specific animation, OR we're forcing procedural for realism
        const useProcedural = !activeAction || !activeAction.isRunning();

        if (useProcedural) {
            const t = progress !== undefined ? progress * 5 : state.clock.getElapsedTime() * speed;
            emissivePulseRef.current = Math.sin(t * 8) * 0.4 + 0.6;

            // Sync material pulse to movement rhythm
            scene.traverse((obj) => {
                if (obj.isMesh && obj.material && obj.material.emissiveIntensity !== undefined) {
                    const partName = obj.name.toLowerCase();
                    const isHighlit = config.primary.some(m => MUSCLE_KEYWORDS[m]?.some(kw => partName.includes(kw)));
                    if (isHighlit) {
                        obj.material.emissiveIntensity = 0.8 * emissivePulseRef.current;
                    }
                }
            });

            // Base reset for procedural movement
            groupRef.current.position.set(0, -2.5, 0);
            groupRef.current.rotation.set(0, 0, 0);

            const anim = config.procedural;

            if (anim === 'leg_drive') {
                const cycle = Math.sin(t * 3.5) * 0.5 + 0.5;
                groupRef.current.position.y = -2.5 - (cycle * 2.5); // Deep squat
                groupRef.current.rotation.x = cycle * 0.6; // Forward lean
            } else if (anim === 'pushup' || anim === 'push_drive') {
                groupRef.current.rotation.x = -Math.PI / 2.2;
                groupRef.current.position.y = -1.5;
                const cycle = Math.sin(t * 4.5) * 0.5 + 0.5;
                groupRef.current.position.z = -1.0 - (cycle * 2.5); // Push rhythm
            } else if (anim === 'vertical_push') {
                const cycle = Math.sin(t * 5) * 0.5 + 0.5;
                groupRef.current.position.y = -2.5 + (cycle * 0.8);
                groupRef.current.scale.set(2.5, 2.5 + (cycle * 0.3), 2.5); // Shoulder shrug feel
            } else if (anim === 'vertical_pull') {
                const cycle = Math.sin(t * 3.5) * 0.5 + 0.5;
                groupRef.current.position.y = -2.5 + (cycle * 1.8); // High pull
                groupRef.current.rotation.x = -cycle * 0.2;
            } else if (anim === 'curl') {
                const cycle = Math.sin(t * 5) * 0.5 + 0.5;
                groupRef.current.rotation.x = -cycle * 0.6; // Stronger arm curl
                groupRef.current.position.y = -2.5 + (cycle * 0.2);
                groupRef.current.position.z = cycle * 0.5;
            } else if (anim === 'bend_drive') {
                const cycle = Math.sin(t * 3) * 0.5 + 0.5;
                groupRef.current.rotation.x = cycle * 1.2; // Hinged deadlift
                groupRef.current.position.y = -2.5 - (cycle * 0.5);
            } else if (anim === 'static_hold') {
                groupRef.current.rotation.x = -Math.PI / 2.5;
                groupRef.current.position.y = -2.2;
                groupRef.current.position.x = Math.sin(t * 50) * 0.015; // Trembling effect
            } else if (anim === 'lunge') {
                const cycle = Math.sin(t * 3.5) * 0.5 + 0.5;
                groupRef.current.position.y = -2.5 - (cycle * 1.5);
                groupRef.current.position.z = cycle * 1.2;
                groupRef.current.rotation.x = cycle * 0.4;
            } else {
                groupRef.current.rotation.y = Math.sin(t * 1.5) * 0.3;
                groupRef.current.position.y = -2.5 + Math.sin(t * 2.5) * 0.1;
            }
        } else if (progress !== undefined && mixer && isPaused) {
            // Manual scrub logic for baked animations when paused
            const action = actions[config.animationName] || actions[Object.keys(actions)[0]];
            if (action) {
                mixer.setTime(progress * action.getClip().duration);
            }
        }
    });

    // Material Engine Initialization (Muscle Highlighting)
    useEffect(() => {
        if (!scene) return;
        scene.traverse((obj) => {
            if (obj.isMesh && obj.material) {
                obj.castShadow = true;
                obj.receiveShadow = true;

                const partName = obj.name.toLowerCase();
                let isPrimary = false;
                let isSecondary = false;

                for (const [muscle, keywords] of Object.entries(MUSCLE_KEYWORDS)) {
                    if (keywords.some(kw => partName.includes(kw))) {
                        if (config.primary.includes(muscle)) isPrimary = true;
                        if (config.secondary.includes(muscle)) isSecondary = true;
                        break;
                    }
                }

                const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
                materials.forEach(mat => {
                    if (isPrimary || isSecondary) {
                        mat.color.set(isPrimary ? colors.accent : (colors.secondary || '#4444ff'));
                        mat.emissive.set(isPrimary ? colors.accent : (colors.secondary || '#4444ff'));
                        mat.emissiveIntensity = isPrimary ? 0.8 : 0.4;
                        mat.roughness = 0.1;
                        mat.metalness = 0.9;
                    } else {
                        mat.color.set('#222222');
                        mat.emissive.set('#000000');
                        mat.emissiveIntensity = 0;
                        mat.roughness = 0.5;
                        mat.metalness = 0.2;
                    }
                });
            }
        });
    }, [scene, workoutType, colors, config]);

    return (
        <primitive
            ref={groupRef}
            object={scene}
            scale={2.5}
            position={[0, -2.5, 0]}
        />
    );
}

function CameraHandler({ position }) {
    const { camera } = useThree();
    useEffect(() => {
        if (camera) {
            camera.position.set(...position);
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();
        }
    }, [position, camera]);
    return null;
}

class WorkoutErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) { return { hasError: true }; }
    componentDidCatch(error, info) { console.error("3D Engine Fault:", error, info); }
    render() {
        if (this.state.hasError) return this.props.fallback || null;
        return this.props.children;
    }
}

export default function WorkoutAvatar({ workoutType }) {
    const { colors } = useTheme();
    const [isPaused, setIsPaused] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [cameraAngle, setCameraAngle] = useState('front');
    const [progress, setProgress] = useState(0);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const controlsRef = useRef();

    // Verify Asset Support & Trigger Logic
    const isSupported = useMemo(() => {
        if (!workoutType) return false;
        const type = workoutType.toLowerCase();
        return Object.values(WORKOUT_CONFIGS).some(cfg =>
            cfg.keywords.some(kw => type.includes(kw))
        );
    }, [workoutType]);


    if (!isSupported) {
        return (
            <View style={[styles.canvasWrapper, styles.loader, { backgroundColor: '#111' }]}>
                <Feather name="info" size={32} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, marginTop: 10 }}>3D Demo not available for this exercise</Text>
            </View>
        );
    }

    // Auto-progress Engine
    useEffect(() => {
        if (isPaused || isScrubbing) return;
        const interval = setInterval(() => {
            setProgress(prev => (prev + 0.005 * speed) % 1);
        }, 16);
        return () => clearInterval(interval);
    }, [isPaused, speed, isScrubbing]);

    const getCameraPos = () => {
        if (cameraAngle === 'side') return [4.5, 1, 0];
        if (cameraAngle === 'back') return [0, 1, -4.5];
        return [0, 1, 5];
    };

    const handleScrub = (e) => {
        const x = e.nativeEvent.locationX;
        const trackWidth = width - 80;
        const newProgress = Math.max(0, Math.min(1, x / trackWidth));
        setProgress(newProgress);
    };

    return (
        <View style={styles.mainContainer}>
            <View style={[styles.canvasWrapper, { backgroundColor: '#050505', borderColor: colors.border }]}>
                <WorkoutErrorBoundary fallback={
                    <View style={styles.loader}>
                        <Feather name="alert-circle" size={32} color={colors.error} />
                        <Text style={{ color: colors.textSecondary, marginTop: 10 }}>GL Engine Failure</Text>
                    </View>
                }>
                    <Suspense fallback={
                        <View style={styles.loader}>
                            <ActivityIndicator size="large" color={colors.accent} />
                            <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Initializing Core Engine...</Text>
                        </View>
                    }>
                        <Canvas
                            shadows
                            style={{ flex: 1 }}
                            gl={{
                                antialias: true,
                                alpha: true,
                                powerPreference: 'high-performance'
                            }}
                            camera={{ fov: 35, position: getCameraPos() }}
                            onCreated={({ gl }) => {
                                gl.setClearColor('#050505', 1);
                            }}
                        >
                            <PerspectiveCamera makeDefault position={getCameraPos()} fov={35} />
                            <CameraHandler position={getCameraPos()} />

                            <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
                            <color attach="background" args={['#050505']} />
                            <fog attach="fog" args={['#050505', 5, 15]} />

                            <ambientLight intensity={0.5} />
                            <spotLight
                                position={[10, 20, 10]}
                                angle={0.2}
                                penumbra={1}
                                intensity={3}
                                castShadow
                            />

                            <pointLight position={[5, 10, -10]} intensity={2} color="#ffffff" />
                            <pointLight position={[-5, 10, -10]} intensity={2} color={colors.accent} />

                            <AvatarModel
                                workoutType={workoutType}
                                isPaused={isPaused || isScrubbing}
                                speed={speed}
                                progress={progress}
                            />

                            <gridHelper args={[20, 20, colors.accent, 'rgba(255,255,255,0.05)']} position={[0, -2.5, 0]} />

                            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.51, 0]} receiveShadow>
                                <circleGeometry args={[4.5, 64]} />
                                <meshStandardMaterial color="#0a0a0a" roughness={0.1} metalness={0.8} />
                            </mesh>

                            <OrbitControls
                                ref={controlsRef}
                                enablePan={false}
                                enableZoom={true}
                                minDistance={3}
                                maxDistance={10}
                            />
                            <Environment preset="studio" />
                            <ContactShadows
                                position={[0, -2.5, 0]}
                                opacity={0.6}
                                scale={10}
                                blur={2}
                                far={4.5}
                            />
                        </Canvas>
                    </Suspense>
                </WorkoutErrorBoundary>

                <View style={styles.topControls}>
                    <View style={[styles.glassBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                        <MaterialCommunityIcons name="engine-outline" size={14} color={colors.accent} />
                        <Text style={[styles.badgeText, { color: colors.textSecondary }]}>3D ENGINE ACTIVE</Text>
                    </View>
                </View>

                <View style={styles.viewControls}>
                    {['front', 'side', 'back'].map(angle => (
                        <TouchableOpacity
                            key={angle}
                            onPress={() => setCameraAngle(angle)}
                            style={[
                                styles.viewBtn,
                                { backgroundColor: colors.card },
                                cameraAngle === angle && { borderColor: colors.accent, borderWidth: 2 }
                            ]}
                        >
                            <Text style={[styles.viewBtnText, { color: cameraAngle === angle ? colors.accent : colors.textSecondary }]}>
                                {angle.charAt(0).toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.timelineContainer}>
                    <View
                        style={[styles.timelineTrack, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                        onTouchStart={() => setIsScrubbing(true)}
                        onTouchMove={handleScrub}
                        onTouchEnd={() => setIsScrubbing(false)}
                    >
                        <View style={[styles.timelineProgress, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
                        <View style={[styles.scrubberNode, { left: `${progress * 100}%`, backgroundColor: '#fff' }]} />
                    </View>
                </View>

                <View style={styles.playbackControls}>
                    <TouchableOpacity
                        onPress={() => setIsPaused(!isPaused)}
                        style={[styles.playBtn, { backgroundColor: colors.accent }]}
                    >
                        <Feather name={isPaused ? "play" : "pause"} size={22} color="#000" />
                    </TouchableOpacity>

                    <View style={[styles.speedSelector, { backgroundColor: colors.card }]}>
                        {[0.5, 1, 1.5].map(s => (
                            <TouchableOpacity
                                key={s}
                                onPress={() => setSpeed(s)}
                                style={[styles.speedBtn, speed === s && { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                            >
                                <Text style={[styles.speedText, { color: speed === s ? colors.accent : colors.textSecondary }]}>{s}x</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        width: '100%',
        marginVertical: 15,
        zIndex: 10,
    },
    canvasWrapper: {
        height: Platform.OS === 'web' ? 500 : 420,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    loader: {
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    topControls: {
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 20,
    },
    glassBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
    },
    viewControls: {
        position: 'absolute',
        right: 15,
        top: '20%',
        gap: 12,
        zIndex: 20,
    },
    viewBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    viewBtnText: {
        fontSize: 14,
        fontWeight: '900',
    },
    playbackControls: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        zIndex: 20,
    },
    timelineContainer: {
        position: 'absolute',
        bottom: 90,
        left: 25,
        right: 25,
        height: 20,
        justifyContent: 'center',
        zIndex: 20,
    },
    timelineTrack: {
        height: 5,
        borderRadius: 3,
        width: '100%',
        position: 'relative',
    },
    timelineProgress: {
        height: '100%',
        borderRadius: 3,
    },
    scrubberNode: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        top: -5.5,
        marginLeft: -8,
        elevation: 5,
    },
    playBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
    },
    speedSelector: {
        flex: 1,
        flexDirection: 'row',
        borderRadius: 28,
        height: 56,
        padding: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    speedBtn: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 24,
    },
    speedText: {
        fontSize: 13,
        fontWeight: '900',
    },
});
