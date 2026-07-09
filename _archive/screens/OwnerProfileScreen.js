import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { supabase } from "../config/supabase";
import { colors, spacing, typography } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { Feather, AntDesign } from "@expo/vector-icons";
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useToast } from "../components/ui";

export default function OwnerProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const toast = useToast();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [profile, setProfile] = useState(null);
  const [branchName, setBranchName] = useState("Loading...");

  useEffect(() => {
    loadOwnerProfile();
  }, []);

  const loadOwnerProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const ownerId = session?.user?.id;

    // Fetch owner profile
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, phone, profile_image, branch_id")
      .eq("id", ownerId)
      .single();

    if (!data) return;

    setProfile(data);

    // Fetch branch name
    if (data.branch_id) {
      const { data: branch } = await supabase
        .from("branches")
        .select("branch_name")
        .eq("id", data.branch_id)
        .single();
      if (branch) setBranchName(branch.branch_name);
    } else {
      setBranchName("Not Assigned");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.replace("Login");
  };

  const handleLinkGoogle = async () => {
    try {
      const redirectTo = AuthSession.makeRedirectUri({
        scheme: 'weaponfitness',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        toast.show(error.message || 'Could not start Google linking.', { kind: 'error' });
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo
        );

        if (result.type === 'success') {
          toast.show('Gmail account linked successfully!', { kind: 'success' });
        }
      }
    } catch (error) {
      toast.show(error.message || 'Linking failed. Please try again.', { kind: 'error' });
    }
  };

  /* ───────────── DETAIL ITEM ───────────── */
  const DetailItem = ({ icon, label, value }) => (
    <View style={styles.detailRow}>
      <Feather name={icon} size={20} color={colors.textSecondary} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: colors.text }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View style={styles.header}>
        <Image
          source={{
            uri: profile.profile_image || "https://i.imgur.com/ExdKOOz.png",
          }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{profile.full_name}</Text>
        <Text style={styles.role}>Owner</Text>
      </View>

      {/* DETAILS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>

        <DetailItem icon="phone" label="Phone" value={profile.phone || "-"} />
        <DetailItem icon="map-pin" label="Branch" value={branchName} />
        <DetailItem icon="mail" label="Email" value={supabase.auth.getSession().then(r => r.data.session.user.email)} />
      </View>

      {/* ACTIONS */}
      <TouchableOpacity
        style={styles.buttonEdit}
        onPress={() => navigation.navigate("EditProfile")}
      >
        <Feather name="edit" size={18} color="#000" />
        <Text style={styles.buttonEditText}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonLink} onPress={handleLinkGoogle}>
        <AntDesign name="google" size={18} color={colors.text} />
        <Text style={styles.buttonLinkText}>Link Gmail</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonLogout} onPress={handleLogout}>
        <Feather name="log-out" size={18} color={colors.error} />
        <Text style={styles.buttonLogoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}



const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.accent,
    marginBottom: spacing.md,
  },

  name: {
    ...typography.h1,
    fontSize: 24,
  },

  role: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 16,
  },

  section: {
    backgroundColor: colors.primaryLight,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.md,
    color: colors.text,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },

  detailLabel: {
    color: colors.textSecondary,
    marginLeft: 10,
    width: 110,
  },

  detailValue: {
    color: colors.text,
    fontWeight: "600",
  },

  buttonEdit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: spacing.md,
  },

  buttonEditText: {
    color: colors.text,
    marginLeft: 8,
    fontWeight: "600",
  },

  buttonLogout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.error,
    paddingVertical: 12,
    borderRadius: 10,
  },

  buttonLogoutText: {
    color: colors.text,
    marginLeft: 8,
    fontWeight: "600",
  },

  buttonLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: spacing.md,
  },
  buttonLinkText: {
    marginLeft: 8,
    fontSize: 16,
    color: colors.text,
    fontWeight: "600",
  },
});
