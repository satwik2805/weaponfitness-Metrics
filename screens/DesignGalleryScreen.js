import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import {
  Avatar,
  Badge,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  Input,
  ListItem,
  ProgressBar,
  ProgressRing,
  SegmentedControl,
  Sheet,
  Skeleton,
  SkeletonRow,
  StatTile,
  Surface,
  Text,
  useToast,
} from '../components/ui';

/**
 * The living design system — every primitive, every variant, every state.
 * Dev-only route ("Gallery"). If a screen needs something not on this page,
 * the primitive gets added here first.
 */

function Section({ title, hint, children }) {
  const { space } = useTheme();
  return (
    <View style={{ marginTop: space[7] }}>
      <Text variant="labelSm" color="accentBright">{title}</Text>
      {hint ? (
        <Text variant="bodySm" color="textFaint" style={{ marginTop: 2 }}>{hint}</Text>
      ) : null}
      <View style={{ marginTop: space[4], gap: space[4] }}>{children}</View>
    </View>
  );
}

function Row({ children, wrap = true }) {
  const { space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: wrap ? 'wrap' : 'nowrap', gap: space[3], alignItems: 'center' }}>
      {children}
    </View>
  );
}

function SwatchGrid() {
  const { colors, radius, space } = useTheme();
  const roles = [
    'bg', 'surface', 'surfaceRaised', 'surfaceOverlay',
    'accent', 'accentSoft', 'success', 'successSoft',
    'warning', 'warningSoft', 'danger', 'dangerSoft',
    'info', 'infoSoft', 'text', 'textMuted',
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
      {roles.map((role) => (
        <View key={role} style={{ width: 74 }}>
          <View
            style={{
              height: 44,
              borderRadius: radius.sm,
              backgroundColor: colors[role],
              borderWidth: 1,
              borderColor: colors.borderStrong,
            }}
          />
          <Text variant="caption" color="textFaint" numberOfLines={1} style={{ marginTop: 4 }}>
            {role}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function DesignGalleryScreen() {
  const { colors, space, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [segment, setSegment] = useState(0);
  const [days, setDays] = useState(['Mon', 'Wed', 'Fri']);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');

  const toggleDay = (d) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space[5],
          paddingBottom: space[10],
          paddingHorizontal: space[5],
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View>
            <Text variant="h1">Design system</Text>
            <Text variant="body" color="textMuted" style={{ marginTop: space[1] }}>
              Weapon Fitness · every primitive, every state
            </Text>
          </View>
          <IconButton
            icon={isDark ? 'sunny-outline' : 'moon-outline'}
            accessibilityLabel="Toggle theme"
            onPress={toggleTheme}
          />
        </View>

        <Section title="Typography" hint="Space Grotesk for display & numerals · Inter for text">
          <Text variant="display">Display 40</Text>
          <Text variant="h1">Heading one</Text>
          <Text variant="h2">Heading two</Text>
          <Text variant="h3">Heading three</Text>
          <Text variant="h4">Heading four</Text>
          <Text variant="bodyLg">Body large — readable at arm's length on a treadmill.</Text>
          <Text variant="body" color="textMuted">Body — the workhorse for descriptions and copy.</Text>
          <Text variant="bodySm" color="textFaint">Body small — metadata, timestamps, helper text.</Text>
          <Text variant="labelSm" color="textMuted">Overline label</Text>
          <Row>
            <Text variant="statLg">1,284</Text>
            <Text variant="stat">86%</Text>
            <Text variant="statSm">12:45</Text>
          </Row>
        </Section>

        <Section title="Color roles" hint="semantic — every value answers “what is it for”">
          <SwatchGrid />
        </Section>

        <Section title="Buttons" hint="5 variants · 3 sizes · loading & disabled designed">
          <Row>
            <Button title="Start workout" icon="barbell-outline" />
            <Button title="Secondary" variant="secondary" />
            <Button title="Outline" variant="outline" />
          </Row>
          <Row>
            <Button title="Ghost" variant="ghost" />
            <Button title="Delete plan" variant="danger" icon="trash-outline" size="sm" />
            <Button title="Loading" loading />
            <Button title="Disabled" disabled />
          </Row>
          <Row>
            <Button title="Large call to action" size="lg" fullWidth iconRight="arrow-forward" style={{ flex: 1 }} />
          </Row>
          <Row>
            <IconButton icon="qr-code-outline" accessibilityLabel="Scan QR" variant="primary" />
            <IconButton icon="notifications-outline" accessibilityLabel="Notifications" />
            <IconButton icon="heart-outline" accessibilityLabel="Favourite" variant="soft" />
            <IconButton icon="ellipsis-horizontal" accessibilityLabel="More" variant="ghost" />
          </Row>
        </Section>

        <Section title="Inputs" hint="focus ring · validation with human copy · secure toggle">
          <Input
            label="Email"
            icon="mail-outline"
            placeholder="you@gym.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Password"
            icon="lock-closed-outline"
            placeholder="••••••••"
            value={pw}
            onChangeText={setPw}
            secureTextEntry
            helper="At least 8 characters."
          />
          <Input
            label="Member ID"
            icon="card-outline"
            value="WF-0042"
            error="We couldn't find this member. Double-check the ID on their card."
          />
        </Section>

        <Section title="Selection" hint="chips for multi-select · segments for views">
          <Row>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <Chip key={d} label={d} selected={days.includes(d)} onPress={() => toggleDay(d)} />
            ))}
          </Row>
          <Row>
            <Chip label="Strength" icon="barbell-outline" selected />
            <Chip label="Cardio" icon="heart-outline" />
            <Chip label="Disabled" disabled />
          </Row>
          <SegmentedControl
            segments={['Week', 'Month', 'Year']}
            selectedIndex={segment}
            onChange={setSegment}
          />
        </Section>

        <Section title="Status" hint="badges + toasts — feedback with a pulse">
          <Row>
            <Badge tone="success" icon="checkmark-circle">Active</Badge>
            <Badge tone="warning" icon="time">Expiring</Badge>
            <Badge tone="danger" icon="close-circle">Overdue</Badge>
            <Badge tone="info" icon="sparkles">New</Badge>
            <Badge tone="accent" icon="flame">Streak ×12</Badge>
            <Badge>Neutral</Badge>
          </Row>
          <Row>
            <Button title="Success toast" variant="secondary" size="sm" onPress={() => toast.show('Workout saved. 412 kcal logged.', { kind: 'success' })} />
            <Button title="Error toast" variant="secondary" size="sm" onPress={() => toast.show("Couldn't reach the server. Your log is saved offline.", { kind: 'error' })} />
            <Button title="Info toast" variant="secondary" size="sm" onPress={() => toast.show('Trainer Priya added a note to your plan.', { kind: 'info' })} />
          </Row>
        </Section>

        <Section title="Stats" hint="the numbers are the product — tabular, confident">
          <Row wrap={false}>
            <StatTile label="Members" value="284" delta={12} icon="people" />
            <StatTile label="Check-ins" value="61" unit="today" delta={-4} icon="finger-print" tone="info" />
          </Row>
          <Row wrap={false}>
            <StatTile label="Revenue" value="₹2.4L" delta={8} icon="trending-up" tone="success" />
            <StatTile label="At risk" value="9" unit="members" icon="alert" tone="warning" />
          </Row>
          <Row>
            <ProgressRing progress={0.78} label="Gym" />
            <ProgressRing progress={0.54} label="Diet" color="success" />
            <ProgressRing progress={0.91} label="Sleep" color="info" />
          </Row>
          <View style={{ gap: space[3] }}>
            <ProgressBar progress={0.72} />
            <ProgressBar progress={0.45} color="success" />
            <ProgressBar progress={0.18} color="warning" />
          </View>
        </Section>

        <Section title="Lists & identity">
          <Surface level={1} pad={3}>
            <ListItem
              icon="barbell"
              title="Push Day A"
              subtitle="8 exercises · 45–60 min"
              chevron
              separator
              onPress={() => {}}
            />
            <ListItem
              leading={<Avatar name="Arjun Mehta" size="md" status="online" />}
              title="Arjun Mehta"
              subtitle="Checked in 9:14 AM"
              trailing={<Badge tone="success">Paid</Badge>}
              separator
              onPress={() => {}}
            />
            <ListItem
              icon="flame"
              iconTone="warning"
              title="Streak protection"
              subtitle="1 rest day left this week"
              value="6/7"
            />
          </Surface>
          <Row>
            <Avatar name="Arjun Mehta" size="sm" />
            <Avatar name="Priya K" size="md" status="online" />
            <Avatar name="S" size="lg" />
            <Avatar name="Weapon Fitness" size="xl" />
          </Row>
          <Surface level={1} pad={4}>
            <SkeletonRow />
            <View style={{ height: space[3] }} />
            <Skeleton height={12} width="80%" />
            <View style={{ height: space[2] }} />
            <Skeleton height={12} width="40%" />
          </Surface>
        </Section>

        <Section title="Surfaces" hint="tone steps with elevation — depth without noise">
          <Surface level={0} pad={4}><Text variant="bodySm" color="textMuted">Level 0 · sunken</Text></Surface>
          <Surface level={1} pad={4}><Text variant="bodySm" color="textMuted">Level 1 · resting card</Text></Surface>
          <Surface level={2} pad={4}><Text variant="bodySm" color="textMuted">Level 2 · raised</Text></Surface>
          <Surface level={3} pad={4}><Text variant="bodySm" color="textMuted">Level 3 · overlay</Text></Surface>
        </Section>

        <Section title="Empty & error states" hint="every dead end has a next move">
          <Surface level={1} pad={2}>
            <EmptyState
              compact
              icon="barbell-outline"
              title="No workouts yet"
              body="Your trainer hasn't assigned a plan. Nudge them, or build your own from the library."
              actionTitle="Browse library"
              onAction={() => toast.show('This would open the exercise library.', { kind: 'info' })}
            />
          </Surface>
          <Surface level={1} pad={2}>
            <ErrorState
              compact
              title="Couldn't load attendance"
              detail="The server didn't respond. Check your connection and try again."
              onRetry={() => toast.show('Retrying…', { kind: 'info' })}
            />
          </Surface>
        </Section>

        <Section title="Overlay">
          <Button title="Open sheet" variant="secondary" icon="albums-outline" onPress={() => setSheetOpen(true)} />
        </Section>
      </ScrollView>

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Assign workout"
        subtitle="Push Day A → 3 members"
        footer={
          <>
            <Button title="Cancel" variant="ghost" onPress={() => setSheetOpen(false)} style={{ flex: 1 }} />
            <Button
              title="Assign"
              icon="checkmark"
              onPress={() => {
                setSheetOpen(false);
                toast.show('Push Day A assigned to 3 members.', { kind: 'success' });
              }}
              style={{ flex: 2 }}
            />
          </>
        }
      >
        <View style={{ gap: space[2] }}>
          {['Arjun Mehta', 'Priya Kapoor', 'Sahil Verma'].map((n) => (
            <ListItem
              key={n}
              leading={<Avatar name={n} size="md" />}
              title={n}
              subtitle="Strength · intermediate"
              trailing={<Badge tone="accent">Selected</Badge>}
            />
          ))}
        </View>
      </Sheet>
    </View>
  );
}
