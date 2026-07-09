import React from "react";
import { View, Image, Platform } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { WebView } from 'react-native-webview';
import { Sheet, Button, IconButton, Text, Surface } from "./ui";

export default function WorkoutModal({
  visible,
  onClose,
  data,
  isCompleted,
  checkedExercises = {},
  exerciseReps = {},
  onToggleExercise,
  onUpdateReps,
  onFinish,
  loggingWorkout
}) {
  const { colors, space, radius } = useTheme();

  if (!data) return null;

  // instructions already stored with real '\n', this just normalizes any "\\n"
  const formattedInstructions = data.instructions
    ? data.instructions.replace(/\\n/g, "\n")
    : "";

  const exercises = formattedInstructions.split('\n').filter(line => line.trim().length > 0);

  const getEmbedUrl = (url) => {
    if (!url) return null;
    let videoId = null;
    if (url.includes('youtube.com/watch?v=')) {
      const parts = url.split('v=');
      if (parts.length > 1) {
        videoId = parts[1].split('&')[0];
      }
    } else if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/');
      if (parts.length > 1) {
        videoId = parts[1].split('?')[0];
      }
    } else if (url.includes('youtube.com/embed/')) {
      const parts = url.split('embed/');
      if (parts.length > 1) {
        videoId = parts[1].split('?')[0];
      }
    }

    if (videoId) {
      return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&mute=1&controls=1&fs=0`;
    }
    return url; // fallback
  };

  const embedUrl = getEmbedUrl(data.video_url);
  const isWeb = Platform.OS === 'web';

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={data.name}
      footer={
        <Button
          title={loggingWorkout ? "Saving..." : "Save Workout"}
          icon="checkmark"
          loading={loggingWorkout}
          onPress={() => onFinish(data)}
          fullWidth
        />
      }
    >
      {/* Exercise Tracking Section */}
      <Surface level={0} style={{ padding: space[4], marginBottom: space[6] }}>
        <Text variant="label" color="accentBright" style={{ marginBottom: space[4] }}>
          {isCompleted ? "Session Completed" : "Exercise Checklist"}
        </Text>

        <View style={{ gap: space[3] }}>
          {exercises.length > 0 ? exercises.map((ex, idx) => {
            const isChecked = checkedExercises[`${data.id}_${idx}`];
            return (
              <View
                key={idx}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: space[3],
                  paddingVertical: space[2],
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <IconButton
                  icon={isChecked ? "checkbox" : "square-outline"}
                  variant="ghost"
                  color={isChecked ? "accentBright" : "textFaint"}
                  size={32}
                  iconSize={22}
                  onPress={() => onToggleExercise(data.id, idx)}
                  accessibilityLabel={isChecked ? `Mark ${ex} incomplete` : `Mark ${ex} complete`}
                />
                <Text
                  variant="body"
                  color={isChecked ? "textFaint" : "text"}
                  style={{ flex: 1 }}
                >
                  {ex}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.surfaceOverlay,
                    borderRadius: radius.sm,
                    padding: space[1],
                    gap: space[2],
                  }}
                >
                  <IconButton
                    icon="remove"
                    variant="secondary"
                    size={28}
                    iconSize={14}
                    onPress={() => onUpdateReps(data.id, idx, -1)}
                    accessibilityLabel="Decrease reps"
                  />
                  <View style={{ minWidth: 44, alignItems: 'center' }}>
                    <Text variant="statSm">{exerciseReps[`${data.id}_${idx}`] || 0}</Text>
                    <Text variant="labelSm" color="textFaint">REPS</Text>
                  </View>
                  <IconButton
                    icon="add"
                    variant="primary"
                    size={28}
                    iconSize={14}
                    onPress={() => onUpdateReps(data.id, idx, 1)}
                    accessibilityLabel="Increase reps"
                  />
                </View>
              </View>
            );
          }) : (
            <Text variant="body" color="textMuted">No instructions provided.</Text>
          )}
        </View>

        <Text variant="bodySm" color="textMuted" align="center" style={{ marginTop: space[4] }}>
          Tap Save below to capture your progress.
        </Text>
      </Surface>

      {/* Video */}
      {embedUrl ? (
        <>
          <Text variant="label" color="accentBright" style={{ marginBottom: space[3] }}>Video Guide</Text>
          <View
            style={{
              width: '100%',
              height: 230,
              borderRadius: radius.md,
              overflow: 'hidden',
              backgroundColor: colors.surfaceSunken,
              marginBottom: space[5],
            }}
          >
            {isWeb ? (
              <iframe
                width="100%"
                height="100%"
                src={embedUrl}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ borderRadius: radius.md }}
              />
            ) : (
              <WebView
                style={{ flex: 1, borderRadius: radius.md, opacity: 0.99 }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                source={{ uri: embedUrl }}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                allowsFullscreenVideo={true}
              />
            )}
          </View>
        </>
      ) : null}

      {/* Full Image */}
      {data.image_url ? (
        <>
          <Text variant="label" color="accentBright" style={{ marginBottom: space[3] }}>Reference Image</Text>
          <Image
            source={{ uri: data.image_url }}
            style={{ width: "100%", height: 250, borderRadius: radius.md, marginBottom: space[5] }}
          />
        </>
      ) : null}
    </Sheet>
  );
}
