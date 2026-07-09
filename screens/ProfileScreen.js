import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useTheme } from '../context/ThemeContext';
import {
  Avatar,
  Badge,
  Button,
  HeroBackdrop,
  ListItem,
  Skeleton,
  Surface,
  Text,
  Input,
  useConfirm,
  useToast,
} from '../components/ui';
import { supabase } from '../config/supabase';
import VerticalScrollableScale from '../components/VerticalScrollableScale';

const ROLE_TONE = {
  Owner: 'accent',
  Admin: 'accent',
  Trainer: 'info',
  Receptionist: 'warning',
  Trainee: 'success',
};

export default function ProfileScreen({ navigation }) {
  const { colors, space, radius, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const confirm = useConfirm();

  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [branchName, setBranchName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);

  // Expanded accordion item state: 'phone' | 'gender' | 'age' | 'height' | 'weight' | null
  const [expandedItem, setExpandedItem] = useState(null);

  // Metrics
  const [height, setHeight] = useState(null); // cm
  const [weight, setWeight] = useState(null); // kg
  const [age, setAge] = useState(null);
  const [gender, setGender] = useState(null);
  const [editingPhone, setEditingPhone] = useState('');

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    setEmail(session.user.email || '');

    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, profile_image, role, branch_id, height, weight, age, gender')
        .eq('id', userId)
        .single();
      setProfile(data);
      setEditingPhone(data?.phone || '');

      if (data?.branch_id) {
        const { data: branch } = await supabase
          .from('branches')
          .select('branch_name')
          .eq('id', data.branch_id)
          .single();
        setBranchName(branch?.branch_name || null);
      }

      // Prioritize Database values, fallback to AsyncStorage
      if (data?.height !== undefined && data?.height !== null) {
        setHeight(data.height);
      }
      if (data?.weight !== undefined && data?.weight !== null) {
        setWeight(data.weight);
      }
      if (data?.age !== undefined && data?.age !== null) {
        setAge(data.age);
      }
      if (data?.gender !== undefined && data?.gender !== null) {
        setGender(data.gender);
      }

      if (
        (data?.height === null || data?.height === undefined) &&
        (data?.weight === null || data?.weight === undefined) &&
        (data?.age === null || data?.age === undefined) &&
        (data?.gender === null || data?.gender === undefined)
      ) {
        const savedMetrics = await AsyncStorage.getItem(`@profile_metrics_${userId}`);
        if (savedMetrics) {
          const parsed = JSON.parse(savedMetrics);
          setHeight(parsed.height || null);
          setWeight(parsed.weight || null);
          setAge(parsed.age || null);
          setGender(parsed.gender || null);
        }
      }
    } catch (err) {
      console.log('Error loading profile/metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reload data when focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      load();
    });
    return unsubscribe;
  }, [navigation, load]);

  const toggleExpand = async (item) => {
    if (expandedItem !== item) {
      await load();
      setExpandedItem(item);
    } else {
      setExpandedItem(null);
    }
  };

  const saveMetrics = async (hVal, wVal, aVal, gVal) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (userId) {
        const metrics = {
          height: hVal || 170,
          weight: wVal || 70,
          age: aVal || 25,
          gender: gVal || 'Male',
        };

        // Update database (will ignore columns if they don't exist yet, but works once user runs SQL)
        const { error } = await supabase
          .from('profiles')
          .update(metrics)
          .eq('id', userId);

        if (error) {
          console.log('Supabase sync notice:', error.message);
        }

        await AsyncStorage.setItem(`@profile_metrics_${userId}`, JSON.stringify(metrics));
        toast.show('Measurements updated.', { kind: 'success' });
        setExpandedItem(null);
      }
    } catch (err) {
      console.log('Error saving metrics:', err);
      toast.show('Failed to save measurements.', { kind: 'error' });
    }
  };

  const handleLinkGoogle = async () => {
    setLinking(true);
    try {
      const redirectTo = AuthSession.makeRedirectUri({ scheme: 'weaponfitness', path: 'auth/callback' });
      const { data, error } = await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo } });
      if (error) {
        toast.show(error.message || "Couldn't start Google linking.", { kind: 'error' });
        return;
      }
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success') {
          toast.show('Gmail account linked.', { kind: 'success' });
        }
      }
    } catch (err) {
      toast.show(err.message || 'Linking failed. Please try again.', { kind: 'error' });
    } finally {
      setLinking(false);
    }
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Sign out?',
      message: "You'll need to sign in again to get back to your dashboard.",
      confirmTitle: 'Sign out',
      destructive: true,
      icon: 'log-out-outline',
    });
    if (!ok) return;
    await supabase.auth.signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const role = profile?.role || 'Member';

  // Helper for Height in Inches conversion
  const cmToInchesLabel = (cmVal) => {
    if (!cmVal) return '—';
    const totalInches = cmVal * 0.393701;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* identity hero */}
        <HeroBackdrop source={require('../assets/photos/gym_hero.jpg')} height={264} darkness={0.6} kenBurns={false} imageStyle={{ top: 0, bottom: 'auto' }} maxWidth={760}>
          <View
            style={{
              flex: 1,
              paddingHorizontal: space[5],
              maxWidth: 760,
              width: '100%',
              alignSelf: 'center',
            }}
          >
            {/* Theme switcher absolute positioned in the top-right corner */}
            <View style={{ position: 'absolute', top: insets.top + space[4], right: space[5], zIndex: 10 }}>
              <Button
                title={isDark ? 'Light' : 'Dark'}
                variant="ghost"
                size="sm"
                icon={isDark ? 'sunny-outline' : 'moon-outline'}
                onPress={toggleTheme}
              />
            </View>

            {/* Centered container for details */}
            <View style={{ flex: 1, justifyContent: 'center', alignSelf: 'flex-end', width: '50%', alignItems: 'center', marginTop: insets.top + space[5] }}>
              {loading ? (
                <Skeleton circle size={88} />
              ) : (
                <Avatar name={profile?.full_name} uri={profile?.profile_image} size="xl" />
              )}
              <Text variant="h2" style={{ color: '#FFFFFF', marginTop: space[3], textAlign: 'center' }}>
                {profile?.full_name || ' '}
              </Text>
              <Badge tone={ROLE_TONE[role] || 'neutral'} style={{ marginTop: space[2], alignSelf: 'center' }}>
                {role}
              </Badge>
            </View>
          </View>
        </HeroBackdrop>

        <View style={{ paddingHorizontal: space[5], maxWidth: 760, width: '100%', alignSelf: 'center' }}>
          {/* details */}
          <Text variant="labelSm" color="textMuted" style={{ marginTop: space[6], marginBottom: space[3] }}>
            DETAILS
          </Text>
          <Surface level={1} pad={3}>
            <ListItem icon="mail-outline" title="Email" value={email || '—'} separator />
            
            {/* Phone */}
            <ListItem 
              icon="call-outline" 
              title="Phone" 
              value={profile?.phone || '—'} 
              onPress={() => toggleExpand('phone')}
              trailing={<Ionicons name={expandedItem === 'phone' ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textFaint} />}
              separator 
            />
            {expandedItem === 'phone' && (
              <View style={{ paddingVertical: space[3], paddingHorizontal: space[3], flexDirection: 'row', gap: space[3], alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Input
                  placeholder="Enter phone number"
                  value={editingPhone}
                  onChangeText={setEditingPhone}
                  keyboardType="phone-pad"
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save"
                  size="sm"
                  onPress={async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    const userId = session?.user?.id;
                    if (userId) {
                      await supabase.from('profiles').update({ phone: editingPhone.trim() }).eq('id', userId);
                      setProfile(p => ({ ...p, phone: editingPhone.trim() }));
                      setExpandedItem(null);
                      toast.show('Phone number updated.', { kind: 'success' });
                    }
                  }}
                />
              </View>
            )}

            {/* Gender */}
            <ListItem 
              icon="transgender-outline" 
              title="Gender" 
              value={gender || '—'} 
              onPress={() => toggleExpand('gender')}
              trailing={<Ionicons name={expandedItem === 'gender' ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textFaint} />}
              separator 
            />
            {expandedItem === 'gender' && (
              <View style={{ paddingVertical: space[3], paddingHorizontal: space[3], flexDirection: 'row', gap: space[2], borderBottomWidth: 1, borderBottomColor: colors.border }}>
                {['Male', 'Female', 'Other'].map((g) => (
                  <Pressable
                    key={g}
                    onPress={async () => {
                      setGender(g);
                      const { data: { session } } = await supabase.auth.getSession();
                      const userId = session?.user?.id;
                      if (userId) {
                        const metrics = { height: height || 170, weight: weight || 70, age: age || 25, gender: g };
                        
                        const { error } = await supabase
                          .from('profiles')
                          .update({ gender: g })
                          .eq('id', userId);
                        
                        if (error) {
                          console.log('Gender DB sync notice:', error.message);
                        }

                        await AsyncStorage.setItem(`@profile_metrics_${userId}`, JSON.stringify(metrics));
                      }
                      setExpandedItem(null);
                      toast.show('Gender updated.', { kind: 'success' });
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: radius.md,
                      backgroundColor: gender === g ? colors.accentSoft : colors.inputBg,
                      borderWidth: 1,
                      borderColor: gender === g ? colors.accentBright : colors.border,
                      alignItems: 'center',
                    }}
                  >
                    <Text variant="body" color={gender === g ? 'accentBright' : 'textMuted'} style={{ fontWeight: gender === g ? 'bold' : 'normal' }}>
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Age */}
            <ListItem 
              icon="calendar-outline" 
              title="Age" 
              value={age ? `${age} years` : '—'} 
              onPress={() => toggleExpand('age')}
              trailing={<Ionicons name={expandedItem === 'age' ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textFaint} />}
              separator={!!branchName} 
            />
            {expandedItem === 'age' && (
              <View style={{ paddingVertical: space[3], paddingHorizontal: space[3], borderBottomWidth: !!branchName ? 1 : 0, borderBottomColor: colors.border }}>
                <VerticalScrollableScale
                  value={age || 25}
                  onChange={(newAge) => setAge(newAge)}
                  onSave={() => saveMetrics(height, weight, age || 25, gender)}
                  min={10}
                  max={100}
                  unit="years"
                />
              </View>
            )}

            {branchName ? <ListItem icon="business-outline" title="Branch" value={branchName} /> : null}
          </Surface>

          {/* measurements */}
          <Text variant="labelSm" color="textMuted" style={{ marginTop: space[6], marginBottom: space[3] }}>
            MEASUREMENTS
          </Text>
          <Surface level={1} pad={3}>
            {/* Height */}
            <ListItem 
              icon="resize-outline" 
              title="Height" 
              value={height ? `${height} cm (${cmToInchesLabel(height)})` : '—'} 
              onPress={() => toggleExpand('height')}
              trailing={<Ionicons name={expandedItem === 'height' ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textFaint} />}
              separator 
            />
            {expandedItem === 'height' && (
              <View style={{ paddingVertical: space[3], paddingHorizontal: space[3], borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <VerticalScrollableScale
                  value={height || 170}
                  onChange={(newHeight) => setHeight(newHeight)}
                  onSave={() => saveMetrics(height || 170, weight, age, gender)}
                  min={100}
                  max={250}
                  unit="cm"
                  secondaryConverter={cmToInchesLabel}
                />
              </View>
            )}

            {/* Weight */}
            <ListItem 
              icon="speedometer-outline" 
              title="Weight" 
              value={weight ? `${weight} kg` : '—'} 
              onPress={() => toggleExpand('weight')}
              trailing={<Ionicons name={expandedItem === 'weight' ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textFaint} />}
            />
            {expandedItem === 'weight' && (
              <View style={{ paddingVertical: space[3], paddingHorizontal: space[3] }}>
                <VerticalScrollableScale
                  value={weight || 70}
                  onChange={(newWeight) => setWeight(newWeight)}
                  onSave={() => saveMetrics(height, weight || 70, age, gender)}
                  min={30}
                  max={200}
                  unit="kg"
                />
              </View>
            )}
          </Surface>

          {/* account actions */}
          <Text variant="labelSm" color="textMuted" style={{ marginTop: space[6], marginBottom: space[3] }}>
            ACCOUNT
          </Text>
          <View style={{ gap: space[3] }}>
            <Button title="Edit name & photo" icon="create-outline" variant="secondary" onPress={() => navigation.navigate('EditProfile')} />
            <Button title="Link Gmail" icon="logo-google" variant="outline" loading={linking} onPress={handleLinkGoogle} />
            <Button title="Sign out" icon="log-out-outline" variant="ghost" onPress={handleLogout} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
