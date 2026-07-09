import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  PhotoCard,
  Reveal,
  Sheet,
  SkeletonRow,
  Text,
  useConfirm,
  useToast,
} from '../../components/ui';
import { classService, formatTime, nextDateFor, weekdayName } from '../../services/classService';

/**
 * Member class schedule: browse the week, see live availability, book or
 * cancel in two taps. Booking identity comes from the session server-side.
 */

const DAY_CHIPS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// every class gets a cinematic still — matched by name, sane default
const CLASS_PHOTOS = [
  { match: /yoga|mobility|stretch|flow/i, src: require('../../assets/photos/yoga.jpg') },
  { match: /spin|cycle|ride|cardio/i, src: require('../../assets/photos/spin.jpg') },
  { match: /hiit|burn|circuit|conditioning/i, src: require('../../assets/photos/training.jpg') },
  { match: /power|lift|barbell|squat|deadlift/i, src: require('../../assets/photos/barbell.jpg') },
  { match: /strength|weights/i, src: require('../../assets/photos/strength.jpg') },
];
const photoFor = (title = '') =>
  (CLASS_PHOTOS.find((p) => p.match.test(title)) || { src: require('../../assets/photos/kettlebell.jpg') }).src;

export default function ClassesScreen() {
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const confirm = useConfirm();

  const [classes, setClasses] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dayFilter, setDayFilter] = useState(null); // 0-6 or null = all
  const [detail, setDetail] = useState(null); // class shown in the sheet
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cls, mine] = await Promise.all([classService.list(), classService.myBookings()]);
      setClasses(cls);
      setBookings(mine);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bookingFor = useCallback(
    (cls) => bookings.find((b) => b.class_id === cls.id && b.class_date === nextDateFor(cls.weekday)),
    [bookings]
  );

  const visible = useMemo(() => {
    if (!classes) return [];
    return dayFilter === null ? classes : classes.filter((c) => c.weekday === dayFilter);
  }, [classes, dayFilter]);

  const handleBook = async (cls) => {
    const when = nextDateFor(cls.weekday);
    setActing(true);
    try {
      await classService.book(cls.id, when);
      toast.show(`Booked — ${cls.title}, ${weekdayName(cls.weekday)} ${formatTime(cls.start_time)}.`, { kind: 'success' });
      setDetail(null);
      await load();
    } catch (err) {
      toast.show(err.message || "Couldn't book that class.", { kind: 'error' });
    } finally {
      setActing(false);
    }
  };

  const handleCancel = async (cls, booking) => {
    const ok = await confirm({
      title: `Cancel ${cls.title}?`,
      message: 'Your spot opens up for someone else — you can rebook if there\'s still room.',
      confirmTitle: 'Cancel booking',
      destructive: true,
      icon: 'calendar-outline',
    });
    if (!ok) return;
    setActing(true);
    try {
      await classService.cancelBooking(booking.id);
      toast.show('Booking cancelled.', { kind: 'info' });
      setDetail(null);
      await load();
    } catch (err) {
      toast.show(err.message || "Couldn't cancel the booking.", { kind: 'error' });
    } finally {
      setActing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space[4],
          paddingHorizontal: space[5],
          paddingBottom: 140,
          maxWidth: 760,
          width: '100%',
          alignSelf: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="h1">Classes</Text>
        <Text variant="body" color="textMuted" style={{ marginTop: 2 }}>
          Book your spot — capacity is live.
        </Text>

        {/* day filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: space[4], flexGrow: 0 }}
          contentContainerStyle={{ gap: space[2] }}
        >
          <Chip label="All week" selected={dayFilter === null} onPress={() => setDayFilter(null)} />
          {DAY_CHIPS.map((d, i) => (
            <Chip key={d} label={d} selected={dayFilter === i} onPress={() => setDayFilter(i)} />
          ))}
        </ScrollView>

        <View style={{ marginTop: space[5], gap: space[3] }}>
          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : error ? (
            <ErrorState
              title="Couldn't load the schedule"
              detail={error.message}
              onRetry={() => {
                setLoading(true);
                load();
              }}
            />
          ) : visible.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title={dayFilter === null ? 'No classes scheduled' : `Nothing on ${DAY_CHIPS[dayFilter]}`}
              body={
                dayFilter === null
                  ? "Your gym hasn't published a class schedule yet."
                  : 'Try another day — the full week is one tap away.'
              }
              actionTitle={dayFilter === null ? undefined : 'Show all week'}
              onAction={dayFilter === null ? undefined : () => setDayFilter(null)}
            />
          ) : (
            visible.map((cls, i) => {
              const mine = bookingFor(cls);
              const full = cls.spots_left === 0 && !mine;
              return (
                <Reveal key={cls.id} index={Math.min(i, 5)}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${cls.title}, ${weekdayName(cls.weekday)} ${formatTime(cls.start_time)}`}
                    onPress={() => setDetail(cls)}
                  >
                    {({ pressed }) => (
                      <View style={{ transform: [{ scale: pressed ? 0.985 : 1 }] }}>
                        <PhotoCard source={photoFor(cls.title)} height={150} darkness={0.42}>
                          <View style={{ padding: space[4] }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                              <View style={{ flex: 1, paddingRight: space[3] }}>
                                <Text
                                  variant="h2"
                                  numberOfLines={1}
                                  style={{ color: '#FFFFFF' }}
                                >
                                  {cls.title}
                                </Text>
                                <Text variant="bodySm" style={{ color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                                  {weekdayName(cls.weekday)} · {formatTime(cls.start_time)} · {cls.duration_minutes} min
                                </Text>
                              </View>
                              {mine ? (
                                <Badge tone="success" icon="checkmark-circle">Booked</Badge>
                              ) : full ? (
                                <Badge tone="warning" icon="people">Full</Badge>
                              ) : (
                                <Badge tone="accent" icon="people">{`${cls.spots_left} left`}</Badge>
                              )}
                            </View>
                          </View>
                        </PhotoCard>
                      </View>
                    )}
                  </Pressable>
                </Reveal>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* class detail + booking sheet */}
      <Sheet
        visible={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.title}
        subtitle={detail ? `${weekdayName(detail.weekday)} · ${formatTime(detail.start_time)} · ${detail.duration_minutes} min` : undefined}
        footer={
          detail &&
          (() => {
            const mine = bookingFor(detail);
            if (mine) {
              return (
                <>
                  <Button title="Close" variant="ghost" onPress={() => setDetail(null)} style={{ flex: 1 }} />
                  <Button
                    title="Cancel booking"
                    variant="danger"
                    loading={acting}
                    onPress={() => handleCancel(detail, mine)}
                    style={{ flex: 2 }}
                  />
                </>
              );
            }
            if (detail.spots_left === 0) {
              return <Button title="Class is full" disabled fullWidth style={{ flex: 1 }} />;
            }
            return (
              <>
                <Button title="Not now" variant="ghost" onPress={() => setDetail(null)} style={{ flex: 1 }} />
                <Button
                  title={`Book for ${new Date(nextDateFor(detail.weekday)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                  icon="checkmark"
                  loading={acting}
                  onPress={() => handleBook(detail)}
                  style={{ flex: 2 }}
                />
              </>
            );
          })()
        }
      >
        {detail ? (
          <View style={{ gap: space[4] }}>
            {detail.description ? (
              <Text variant="body" color="textMuted">{detail.description}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: space[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="people-outline" size={16} color={colors.textMuted} />
                <Text variant="bodySm" color="textMuted">
                  {detail.booked}/{detail.capacity} booked
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                <Text variant="bodySm" color="textMuted">{detail.duration_minutes} minutes</Text>
              </View>
            </View>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}
