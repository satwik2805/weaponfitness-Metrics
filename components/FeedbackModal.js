import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useTheme } from '../context/ThemeContext';
import { Button, Input, Sheet, Text, useToast } from './ui';

export default function FeedbackModal({ visible, onClose, trainerInfo }) {
  const { colors, space } = useTheme();
  const toast = useToast();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const submitFeedback = async () => {
    if (rating === 0) {
      toast.show('Please select a star rating.', { kind: 'error' });
      return;
    }

    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const traineeId = session?.user?.id;
    if (!traineeId) {
      toast.show('You need to be signed in to leave feedback.', { kind: 'error' });
      setLoading(false);
      return;
    }

    // Insert feedback directly via Supabase
    const { error: insertError } = await supabase.from('feedback').insert({
      trainee_id: traineeId,
      trainer_id: trainerInfo.id,
      rating,
      comment,
    });

    setLoading(false);

    if (insertError) {
      toast.show(insertError.message || 'Failed to submit feedback.', { kind: 'error' });
      return;
    }

    // Update trainer average rating
    const { data: allFeedback } = await supabase
      .from('feedback')
      .select('rating')
      .eq('trainer_id', trainerInfo.id);

    if (allFeedback && allFeedback.length > 0) {
      const avg = allFeedback.reduce((sum, f) => sum + f.rating, 0) / allFeedback.length;
      await supabase
        .from('trainers')
        .update({ rating_avg: Math.round(avg * 100) / 100 })
        .eq('id', trainerInfo.id);
    }

    toast.show('Thanks! Your feedback has been submitted.', { kind: 'success' });
    setRating(0);
    setComment('');
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`Feedback for ${trainerInfo?.name || 'your trainer'}`}
      subtitle="Your rating stays anonymous to other members."
      footer={
        <Button title="Submit feedback" icon="checkmark" loading={loading} onPress={submitFeedback} fullWidth />
      }
    >
      {/* Stars */}
      <Text variant="label" color="textMuted" style={{ marginBottom: space[2] }}>
        Rate your trainer
      </Text>
      <View style={{ flexDirection: 'row', marginBottom: space[5] }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`${i} star${i > 1 ? 's' : ''}`}
            onPress={() => setRating(i)}
            hitSlop={6}
            style={{ paddingHorizontal: space[1] }}
          >
            <Ionicons name={i <= rating ? 'star' : 'star-outline'} size={34} color={i <= rating ? colors.warning : colors.textFaint} />
          </Pressable>
        ))}
      </View>

      {/* Comment */}
      <Input
        label="Comment"
        placeholder="Write your feedback..."
        value={comment}
        onChangeText={setComment}
        multiline
        inputStyle={{ height: 120 }}
        style={{ marginBottom: space[2] }}
      />
    </Sheet>
  );
}
