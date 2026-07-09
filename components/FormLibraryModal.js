
import React, { useState } from 'react';
import {
    View,
    ScrollView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Sheet, Text, Chip } from './ui';
import WorkoutAvatar from './WorkoutAvatar';

const SUPPORTED_EXERCISES = [
    {
        id: 'squat',
        name: 'Squats',
        icon: 'human-handsup',
        videoUrl: 'https://www.youtube.com/embed/aclHkVaku9U',
        description: 'The king of all exercises. Squats build powerful legs and a strong core.',
        tips: [
            'Keep your chest up and core tight',
            'Lower your hips until they are below your knees',
            'Drive through your heels as you stand up'
        ]
    },
    {
        id: 'pushup',
        name: 'Push-ups',
        icon: 'human-handsdown',
        videoUrl: 'https://www.youtube.com/embed/IODxDxX7oi4',
        description: 'A fundamental bodyweight move for chest, shoulders, and triceps.',
        tips: [
            'Keep your body in a straight line from head to heels',
            'Exhale as you push yourself away from the ground',
            'Lower your chest until it nearly touches the floor'
        ]
    },
    {
        id: 'bench press',
        name: 'Bench Press',
        icon: 'weight-lifter',
        videoUrl: 'https://www.youtube.com/embed/rT7DgCr-3ps',
        description: 'The ultimate upper body power movement focusing on the pectorals.',
        tips: [
            'Keep your feet planted firmly on the ground',
            'Maintain a slight arch in your lower back',
            'Lower the bar to your mid-chest level'
        ]
    },
    {
        id: 'bicep curl',
        name: 'Bicep Curls',
        icon: 'arm-flex',
        videoUrl: 'https://www.youtube.com/embed/ykJmrZ5v0Oo',
        description: 'Isolate and build the biceps for peak arm development.',
        tips: [
            'Keep your elbows tucked into your sides',
            'Avoid using momentum or swinging your body',
            'Squeeze your biceps tightly at the top of the move'
        ]
    },
    {
        id: 'shoulder press',
        name: 'Shoulder Press',
        icon: 'weight',
        videoUrl: 'https://www.youtube.com/embed/qEwKCR5JCog',
        description: 'Build broad shoulders and upper body strength.',
        tips: [
            'Press the weights vertically above your head',
            'Don\'t lock your elbows at the top',
            'Keep your core engaged to protect your back'
        ]
    },
    {
        id: 'deadlift',
        name: 'Deadlift',
        icon: 'weight-lifter',
        videoUrl: 'https://www.youtube.com/embed/op9kVnSso6Q',
        description: 'The ultimate test of total body strength and posterior chain power.',
        tips: [
            'Keep the bar close to your shins',
            'Lift with your legs, not your lower back',
            'Engage your lats before starting the pull'
        ]
    },
    {
        id: 'lunge',
        name: 'Lunges',
        icon: 'human-male-height-variant',
        videoUrl: 'https://www.youtube.com/embed/QOVaHwm-Q6U',
        description: 'Excellent for leg symmetry, balance, and glute activation.',
        tips: [
            'Step forward and lower until both knees are at 90 degrees',
            'Don\'t let your front knee go past your toes',
            'Keep your torso upright throughout the movement'
        ]
    },
    {
        id: 'plank',
        name: 'Plank',
        icon: 'human-handsdown',
        videoUrl: 'https://www.youtube.com/embed/pSHjTRCQxIw',
        description: 'A premier core stability exercise that engages your entire body.',
        tips: [
            'Hold a straight line from your head to your feet',
            'Squeeze your glutes and core as hard as possible',
            'Avoid letting your hips sag or hike upwards'
        ]
    },
    {
        id: 'pullup',
        name: 'Pullups',
        icon: 'human-handsup',
        videoUrl: 'https://www.youtube.com/embed/eGo4IYlbE5g',
        description: 'The definitive back builder and test of relative strength.',
        tips: [
            'Pull your chest towards the bar',
            'Engage your shoulder blades before pulling',
            'Control the descent to maximize muscle tension'
        ]
    }
];

export default function FormLibraryModal({ visible, onClose }) {
    const { colors, radius, space } = useTheme();
    const [selectedExercise, setSelectedExercise] = useState(SUPPORTED_EXERCISES[0]);

    const videoUri = (url) =>
        `${url}${url.includes('?') ? '&' : '?'}rel=0&autoplay=1&mute=1&controls=1&playsinline=1&enablejsapi=1`;

    return (
        <Sheet
            visible={visible}
            onClose={onClose}
            title="Form Library"
            subtitle="Anatomical Movement Guide"
        >
            <View style={{ gap: space[5] }}>
                {/* Exercise selector */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: space[2] }}
                >
                    {SUPPORTED_EXERCISES.map((ex) => (
                        <Chip
                            key={ex.id}
                            label={ex.name}
                            selected={selectedExercise.id === ex.id}
                            onPress={() => setSelectedExercise(ex)}
                        />
                    ))}
                </ScrollView>

                {/* Anatomical muscle map (2D, renders on web + native) */}
                <WorkoutAvatar workoutType={selectedExercise.id} />

                {/* 3D Video Guide Section */}
                {selectedExercise.videoUrl && (
                    <View style={{ gap: space[3] }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: space[2],
                                backgroundColor: colors.surfaceOverlay,
                                paddingHorizontal: space[3],
                                paddingVertical: space[2],
                                borderRadius: radius.sm,
                                alignSelf: 'flex-start',
                            }}
                        >
                            <MaterialCommunityIcons name="video-outline" size={18} color={colors.accentBright} />
                            <Text variant="labelSm">FORM GUIDE</Text>
                        </View>
                        <View
                            style={{
                                height: 250,
                                width: '100%',
                                borderRadius: radius.md,
                                overflow: 'hidden',
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.surfaceSunken,
                            }}
                        >
                            {Platform.OS === 'web' ? (
                                <iframe
                                    src={videoUri(selectedExercise.videoUrl)}
                                    style={{
                                        border: 0,
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: radius.md,
                                        backgroundColor: colors.surfaceSunken,
                                    }}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                    title="Exercise Video"
                                />
                            ) : (
                                <WebView
                                    key={selectedExercise.videoUrl}
                                    source={{
                                        uri: videoUri(selectedExercise.videoUrl),
                                        headers: {
                                            'Referer': 'https://www.youtube.com'
                                        }
                                    }}
                                    style={{ flex: 1, backgroundColor: 'transparent' }}
                                    allowsFullscreenVideo={true}
                                    javaScriptEnabled={true}
                                    domStorageEnabled={true}
                                    originWhitelist={['*']}
                                    mediaPlaybackRequiresUserAction={false}
                                    allowsInlineMediaPlayback={true}
                                    userAgent="Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Mobile Safari/537.3"
                                    startInLoadingState={true}
                                    mixedContentMode="always"
                                    renderLoading={() => (
                                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceSunken }}>
                                            <ActivityIndicator color={colors.accent} />
                                        </View>
                                    )}
                                />
                            )}
                        </View>
                    </View>
                )}

                {/* Description */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: space[3],
                        backgroundColor: colors.surface,
                        padding: space[4],
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: colors.border,
                    }}
                >
                    <MaterialCommunityIcons name="information-outline" size={16} color={colors.accentBright} />
                    <Text variant="bodySm" color="textMuted" style={{ flex: 1 }}>
                        {selectedExercise.description}
                    </Text>
                </View>

                {/* Coaching tips */}
                <View
                    style={{
                        padding: space[3],
                        backgroundColor: colors.surface,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: colors.border,
                        gap: space[2],
                    }}
                >
                    <Text variant="labelSm" color="textMuted">COACHING TIPS</Text>
                    {selectedExercise.tips.map((tip, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                            <MaterialCommunityIcons name="check-circle-outline" size={14} color={colors.accentBright} />
                            <Text variant="bodySm" color="textMuted" style={{ flex: 1 }}>{tip}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </Sheet>
    );
}
