import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../config/supabase';
import { useTheme } from '../context/ThemeContext';
import {
  Avatar,
  Button,
  ErrorState,
  IconButton,
  Input,
  Screen,
  Skeleton,
  Text,
  useToast,
} from '../components/ui';
import { profileService } from '../services';

export default function EditProfileScreen({ navigation }) {
  const { colors, space, radius } = useTheme();
  const toast = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session.user.id;

      // Try backend API first for profile
      try {
        const profile = await profileService.getProfile(userId);
        if (profile) {
          setFullName(profile.full_name || '');
          setPhone(profile.phone || '');
          setAvatar(profile.profile_image || null);
        }
      } catch (apiError) {
        console.log('Backend API error, falling back to Supabase:', apiError);
        // Fallback to Supabase
        const { data } = await supabase
          .from('profiles')
          .select('full_name, phone, profile_image')
          .eq('id', userId)
          .single();

        if (data) {
          setFullName(data.full_name || '');
          setPhone(data.phone || '');
          setAvatar(data.profile_image || null);
        }
      }
    } catch (err) {
      console.log('loadData error:', err);
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAvatar(uri);
      await uploadAvatar(uri);
    }
  };

  const uploadAvatar = async (uri) => {
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session.user.id;

      const ext = uri.split('.').pop();
      const filePath = `avatars/${userId}.${ext}`;

      const img = await fetch(uri);
      const bytes = await img.blob();

      const { error: uploadError } = await supabase.storage
        .from('profile_images')
        .upload(filePath, bytes, { upsert: true });

      if (uploadError) {
        console.log(uploadError);
        toast.show("Couldn't upload your photo. Please try again.", { kind: 'error' });
        return;
      }

      const { data: publicUrl } = supabase.storage
        .from('profile_images')
        .getPublicUrl(filePath);

      await supabase
        .from('profiles')
        .update({ profile_image: publicUrl.publicUrl })
        .eq('id', userId);

      setAvatar(publicUrl.publicUrl);
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    const next = {};
    if (!fullName.trim()) next.fullName = 'Please enter your name.';
    if (phone.trim() && !/^[0-9+\-\s]{6,}$/.test(phone.trim())) {
      next.phone = 'Enter a valid phone number.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveChanges = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session.user.id;

      const updateData = { full_name: fullName.trim(), phone: phone.trim() };
      if (avatar && avatar.startsWith('http')) {
        updateData.profile_image = avatar;
      }

      // Update via Supabase (primary method)
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        toast.show(error.message || 'Failed to update profile.', { kind: 'error' });
        return;
      }

      // Try to sync to backend API (optional, non-blocking)
      try {
        await profileService.updateProfile(userId, updateData);
        console.log('Backend sync successful');
      } catch (apiError) {
        console.log('Backend sync failed (non-critical):', apiError.message);
      }

      toast.show('Profile name and photo updated.', { kind: 'success' });
      navigation.goBack();
    } catch (err) {
      console.log('saveChanges error:', err);
      toast.show(err.message || 'Failed to update profile.', { kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <Screen scroll>
        <View style={{ marginTop: space[8] }}>
          <ErrorState
            title="Couldn't load your profile"
            detail={loadError.message}
            onRetry={loadData}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll keyboard contentContainerStyle={{ paddingTop: space[4], maxWidth: 560, width: '100%', alignSelf: 'center', paddingBottom: space[8] }}>
      <Text variant="h1">Edit name & photo</Text>
      <Text variant="body" color="textMuted" style={{ marginTop: 2 }}>
        Update how you show up across the app.
      </Text>

      {/* Avatar */}
      <View style={{ alignItems: 'center', marginTop: space[6], marginBottom: space[6] }}>
        {loading ? (
          <Skeleton circle size={120} />
        ) : (
          <View>
            <Avatar name={fullName} uri={avatar} size="xl" style={{ width: 120, height: 120 }} />
            <IconButton
              icon="camera"
              variant="primary"
              size={40}
              iconSize={18}
              onPress={pickAvatar}
              disabled={uploading}
              accessibilityLabel="Change photo"
              style={{ position: 'absolute', right: -2, bottom: -2, borderRadius: radius.full, borderWidth: 2, borderColor: colors.bg }}
            />
          </View>
        )}
        {!loading ? (
          <Button title="Change photo" variant="ghost" size="sm" icon="image-outline" loading={uploading} onPress={pickAvatar} style={{ marginTop: space[3] }} />
        ) : null}
      </View>

      {loading ? (
        <View style={{ gap: space[5] }}>
          <Skeleton height={52} radius={14} />
          <Skeleton height={52} radius={14} />
        </View>
      ) : (
        <View style={{ gap: space[5] }}>
          <Input
            label="Full name"
            icon="person-outline"
            value={fullName}
            onChangeText={(t) => { setFullName(t); if (errors.fullName) setErrors((e) => ({ ...e, fullName: undefined })); }}
            placeholder="Enter name"
            error={errors.fullName}
            autoCapitalize="words"
          />
          <Input
            label="Phone"
            icon="call-outline"
            value={phone}
            onChangeText={(t) => { setPhone(t); if (errors.phone) setErrors((e) => ({ ...e, phone: undefined })); }}
            placeholder="Enter phone"
            keyboardType="phone-pad"
            error={errors.phone}
          />
        </View>
      )}

      {!loading ? (
        <Button
          title="Save changes"
          icon="checkmark"
          loading={saving}
          onPress={saveChanges}
          fullWidth
          style={{ marginTop: space[7] }}
        />
      ) : null}
    </Screen>
  );
}
