import React, { useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';
import { supabase } from '../config/supabase';
import { useTheme } from '../context/ThemeContext';
import {
  ErrorState,
  IconButton,
  Sheet,
  Skeleton,
  Text,
} from './ui';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AttendanceCalendarModal({ visible, onClose }) {
  const { colors, space, radius } = useTheme();

  const [attendanceDates, setAttendanceDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const traineeId = session?.user?.id;

      const { data, error: dbError } = await supabase
        .from('attendance')
        .select('attendance_date')
        .eq('trainee_id', traineeId);

      if (dbError) throw dbError;
      setAttendanceDates((data || []).map((d) => d.attendance_date));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) fetchAttendance();
  }, [visible, fetchAttendance]);

  const isPresent = (day) => {
    const dateString = `${year}-${(month + 1)
      .toString()
      .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return attendanceDates.includes(dateString);
  };

  const isToday = (day) => {
    const d = new Date();
    return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
  };

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const daysArray = [];

  for (let i = 0; i < firstDay; i++) daysArray.push(null);
  for (let d = 1; d <= totalDays; d++) daysArray.push(d);
  while (daysArray.length % 7 !== 0) daysArray.push(null);

  const goPrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };

  const goNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const boxSize = 40;

  return (
    <Sheet visible={visible} onClose={onClose} title="Attendance calendar">
      {/* Month navigation */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: space[4],
        }}
      >
        <IconButton icon="chevron-back" variant="secondary" size={40} onPress={goPrevMonth} accessibilityLabel="Previous month" />
        <Text variant="h3">
          {new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <IconButton icon="chevron-forward" variant="secondary" size={40} onPress={goNextMonth} accessibilityLabel="Next month" />
      </View>

      {error ? (
        <ErrorState compact title="Couldn't load attendance" detail={error.message} onRetry={fetchAttendance} />
      ) : (
        <>
          {/* Weekday header */}
          <View style={{ flexDirection: 'row', marginBottom: space[2] }}>
            {WEEKDAYS.map((d) => (
              <Text key={d} variant="labelSm" color="textFaint" align="center" style={{ width: '14.28%', textAlign: 'center' }}>
                {d}
              </Text>
            ))}
          </View>

          {/* Calendar grid */}
          {loading ? (
            <View style={{ gap: space[2] }}>
              {[0, 1, 2, 3, 4].map((r) => (
                <Skeleton key={r} height={boxSize} radius={radius.sm} />
              ))}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: space[2] }}>
              {daysArray.map((day, idx) => (
                <View key={idx} style={{ width: '14.28%', alignItems: 'center', justifyContent: 'center' }}>
                  {day === null ? (
                    <View style={{ width: boxSize, height: boxSize }} />
                  ) : (
                    <View
                      style={{
                        width: boxSize,
                        height: boxSize,
                        borderRadius: radius.sm,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isPresent(day) ? colors.accent : colors.surfaceOverlay,
                        borderWidth: isToday(day) ? 2.5 : (isPresent(day) ? 0 : 1),
                        borderColor: isToday(day) ? (colors.accentBright || '#2B7FE8') : colors.border,
                      }}
                    >
                      <Text
                        variant="bodySm"
                        color={isPresent(day) ? 'onAccent' : 'textMuted'}
                        style={isToday(day) ? { fontWeight: 'bold', color: isPresent(day) ? 'onAccent' : (colors.accentBright || '#2B7FE8') } : undefined}
                      >
                        {day}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Legend */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[5] }}>
            <View style={{ width: 12, height: 12, borderRadius: radius.full, backgroundColor: colors.accent }} />
            <Text variant="bodySm" color="textMuted">Present</Text>
            <View style={{ width: 12, height: 12, borderRadius: radius.full, backgroundColor: colors.surfaceOverlay, borderWidth: 1, borderColor: colors.border, marginLeft: space[3] }} />
            <Text variant="bodySm" color="textMuted">Absent</Text>
          </View>
        </>
      )}
    </Sheet>
  );
}
