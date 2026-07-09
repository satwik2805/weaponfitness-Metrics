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

    // CALL EDGE FUNCTION (Gateway Pattern)
    const { data: funcData, error: funcError } = await supabase.functions.invoke('rate-limit-demo', {
      body: {
        action: 'submit_feedback',
        payload: {
          traineeId,
          trainerId: trainerInfo.id,
          rating,
          comment,
        },
      },
      headers: {
        'x-action-path': '/feedback', // Enforce rate limit
      },
    });

    setLoading(false);

    if (funcError) {
      let msg = 'Failed to submit feedback.';
      if (funcError && funcError.context && typeof funcError.context.json === 'function') {
        try {
          const body = await funcError.context.json();
          msg = body.error || msg;
        } catch (e) {}
      }
      toast.show(msg, { kind: 'error' });
      return;
    }

    if (funcData?.error) {
      toast.show(funcData.error, { kind: 'error' });
      return;
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
