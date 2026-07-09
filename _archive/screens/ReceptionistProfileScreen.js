import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../config/supabase";
import { colors, spacing } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { Feather, AntDesign } from "@expo/vector-icons";
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useToast } from "../components/ui";

export default function ReceptionistProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [branchName, setBranchName] = useState("Loading...");
  const [email, setEmail] = useState("Loading...");   // ← NEW

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    // Save Email
    setEmail(session.user.email ?? "-");   // ← FIXED

    // Fetch profile
    const { data } = await supabase
      .from("profiles")
      .select("full_name, phone, profile_image, branch_id")
      .eq("id", userId)
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
        toast.show(error.message || "Couldn't link your Google account.", { kind: 'error' });
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo
        );

        if (result.type === 'success') {
          toast.show("Gmail account linked successfully!", { kind: 'success' });
        }
      }
    } catch (error) {
      toast.show(error.message || "Couldn't link your Google account.", { kind: 'error' });
    }
  };

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const DetailItem = ({ icon, label, value }) => (
    <View style={styles.detailRow}>
      <Feather name={icon} size={20} color={colors.accent} />
      <Text style={styles.detailLabel}>{String(label)}</Text>
      <Text style={styles.detailValue}>{String(value)}</Text>
    </View>
  );

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
        <Text style={styles.role}>Receptionist</Text>
      </View>

      {/* DETAILS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>

        <DetailItem icon="phone" label="Phone" value={String(profile.phone || "-")} />
        <DetailItem icon="map-pin" label="Branch" value={String(branchName)} />
        <DetailItem icon="mail" label="Email" value={String(email || "-")} />
      </View>

      {/* EDIT PROFILE BUTTON */}
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

      {/* LOGOUT */}
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
    padding: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },

  header: {
    alignItems: "center",
    marginBottom: 20,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.accent,
    marginBottom: 15,
  },

  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },

  role: {
    color: colors.textSecondary,
    marginBottom: 20,
  },

  section: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    marginBottom: 15,
    fontWeight: "700",
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
    marginBottom: 15,
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
