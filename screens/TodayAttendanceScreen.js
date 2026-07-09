// screens/TodayAttendanceScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';
import { supabase } from '../config/supabase';
import { useTheme } from '../context/ThemeContext';
import {
  Avatar,
  EmptyState,
  ErrorState,
  ListItem,
  Screen,
  SkeletonRow,
  Surface,
  Text,
} from '../components/ui';
import { attendanceService, profileService } from '../services';

export default function TodayAttendanceScreen() {
  const { space } = useTheme();
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadToday();
  }, []);

  const formatTime = (t) => {
    if (!t) return '--';

    // t = "14:32:10"
    const [hour, minute] = t.split(':');
    let h = parseInt(hour, 10);
    const m = minute;
    const ampm = h >= 12 ? 'PM' : 'AM';

    h = h % 12;
    h = h === 0 ? 12 : h;

    return `${h}:${m} ${ampm}`;
  };

  const loadToday = useCallback(async () => {
    setLoading(true);
    setError(null);
    const today = new Date().toISOString().split('T')[0];

    try {
      // Try backend API first
      try {
        const allAttendance = await attendanceService.getAllAttendance();
        const todayAttendance = allAttendance
          .filter((a) => a.date === today)
          .sort((a, b) => {
            if (!a.time_in || !b.time_in) return 0;
            return b.time_in.localeCompare(a.time_in);
          });

        // Fetch profile data for each trainee
        const attendanceWithProfiles = await Promise.all(
          todayAttendance.map(async (att) => {
            try {
              const profile = await profileService.getProfile(att.trainee_id);
              return {
                id: att.id,
                time_in: att.time_in,
                trainee_id: att.trainee_id,
                trainees: {
                  id: att.trainee_id,
                  profiles: {
                    full_name: profile?.full_name || 'Unknown',
                    profile_image: profile?.profile_image || null,
                  },
                },
              };
            } catch (err) {
              return {
                id: att.id,
                time_in: att.time_in,
                trainee_id: att.trainee_id,
                trainees: {
                  id: att.trainee_id,
                  profiles: {
                    full_name: 'Unknown',
                    profile_image: null,
                  },
                },
              };
            }
          })
        );

        setAttendance(attendanceWithProfiles);
      } catch (apiError) {
        console.log('Backend API error, falling back to Supabase:', apiError);
        // Fallback to Supabase
        const { data, error: dbError } = await supabase
          .from('attendance')
          .select(`
            id,
            time_in,
            trainee_id,
            trainees (
              id,
              profiles(full_name, profile_image)
            )
          `)
          .eq('date', today)
          .order('time_in', { ascending: false });

        if (dbError) throw dbError;
        setAttendance(data || []);
      }
    } catch (err) {
      console.log('loadToday error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Screen scroll contentContainerStyle={{ paddingTop: space[4], paddingBottom: space[10], maxWidth: 760, width: '100%', alignSelf: 'center' }}>
      <Text variant="h1">Today's attendance</Text>
      <Text variant="body" color="textMuted" style={{ marginTop: 2 }}>
        Everyone who's checked in today.
      </Text>

      <View style={{ marginTop: space[5], gap: space[3] }}>
        {loading ? (
          <Surface level={1} pad={4} style={{ gap: space[4] }}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </Surface>
        ) : error ? (
          <ErrorState
            title="Couldn't load attendance"
            detail={error.message}
            onRetry={loadToday}
          />
        ) : attendance.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No check-ins yet"
            body="Nobody has marked attendance today. Members appear here the moment they scan in."
          />
        ) : (
          <Surface level={1} pad={2}>
            {attendance.map((a, i) => (
              <ListItem
                key={a.id}
                leading={
                  <Avatar
                    name={a.trainees?.profiles?.full_name}
                    uri={a.trainees?.profiles?.profile_image || undefined}
                    size="md"
                  />
                }
                title={a.trainees?.profiles?.full_name || 'Unknown'}
                subtitle={`Checked in at ${formatTime(a.time_in)}`}
                separator={i < attendance.length - 1}
              />
            ))}
          </Surface>
        )}
      </View>
    </Screen>
  );
}
