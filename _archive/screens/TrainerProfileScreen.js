import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Feather, AntDesign } from "@expo/vector-icons";
import * as WebBrowser from 'expo-web-browser'; // Import WebBrowser
import * as AuthSession from 'expo-auth-session'; // Import AuthSession
import { supabase } from "../config/supabase";
import { colors, spacing, typography } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../components/ui";

export default function TrainerProfileScreen({ navigation }) {
  const { colors, toggleTheme, isDark } = useTheme();
  const toast = useToast();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [profile, setProfile] = useState(null);
  const [branchName, setBranchName] = useState("Loading...");
  const [email, setEmail] = useState("Loading...");

  useEffect(() => {
    loadTrainerProfile();
  }, []);

  const loadTrainerProfile = async () => {
    // 1. Check Session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.log("No session found in TrainerProfile, redirecting to Login.");
      navigateOut();
      return;
    }

    const userId = session.user.id;
    setEmail(session.user.email);

    // 2. Fetch Profile
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, phone, profile_image, branch_id")
      .eq("id", userId)
      .single();

    if (error || !data) {
      console.log("Error fetching profile:", error);
      toast.show("Couldn't load your profile. Pull back and try again.", { kind: 'error' });
      // Optional: navigateOut() if you want to force re-login on profile error
      return;
    }

    setProfile(data);

    // 3. Fetch Branch Info
    if (data.branch_id) {
      const { data: b } = await supabase
        .from("branches")
        .select("branch_name")
        .eq("id", data.branch_id)
        .single();

      setBranchName(b?.branch_name || "Unknown Branch");
    } else {
      setBranchName("Not Assigned");
    }
  };

  const navigateOut = () => {
    // Helper to clear nav stack and go to Login
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
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
        toast.show(error.message || "Couldn't start Google linking.", { kind: 'error' });
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo
        );

        if (result.type === 'success') {
          // Linking happens on the backend callback mostly, verify if success
          toast.show('Gmail account linked', { kind: 'success' });
        } else if (result.type === 'cancel') {
          // User cancelled, do nothing
        } else {
          toast.show('Google linking finished with status: ' + result.type, { kind: 'info' });
        }
      }
    } catch (error) {
      toast.show(error.message || "Something went wrong while linking your Google account.", { kind: 'error' });
    }
  };




  /* ───────────── DETAIL ITEM ───────────── */
  const DetailItem = ({ icon, label, value }) => (
    <View style={styles.detailRow}>
      <Feather name={icon} size={20} color={colors.accent} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );

  if (!profile) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: colors.text }}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ position: 'absolute', right: 0, top: 0 }}>
          {/* Maybe a theme toggle here? Or stick to dashboard? 
               Instructions said "all other screens and modals". 
               Let's put one in the top right. 
           */}
        </View>
        <Image
          source={{
            uri: profile.profile_image || "https://i.imgur.com/ExdKOOz.png",
          }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{profile.full_name}</Text>
        <Text style={styles.role}>Trainer</Text>
      </View>

      {/* DETAILS CARD */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>

        <DetailItem icon="phone" label="Phone" value={profile.phone || "—"} />
        <DetailItem icon="mail" label="Email" value={email} />
        <DetailItem icon="map-pin" label="Branch" value={branchName} />
      </View>

      {/* ACTION BUTTONS */}
      <TouchableOpacity
        style={styles.buttonEdit}
        onPress={() => navigation.navigate("EditProfile")}
      >
        <Feather name="edit" size={20} color="#000" />
        <Text style={styles.buttonEditText}>Edit Profile</Text>
      </TouchableOpacity>

      {/* <TouchableOpacity
        style={styles.buttonLink}
        onPress={handleLinkGoogle}
      >
        <AntDesign name="google" size={20} color={colors.text} />
        <Text style={styles.buttonLinkText}>Link Gmail</Text>
      </TouchableOpacity> */}

      <TouchableOpacity style={styles.buttonLink} onPress={handleLinkGoogle}>
        <AntDesign name="google" size={20} color={colors.text} />
        <Text style={styles.buttonLogoutText}>Link Gmail</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonLogout} onPress={handleLogout}>
        <Feather name="log-out" size={20} color={colors.error} />
        <Text style={styles.buttonLogoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}



const createStyles = (colors) => StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },

  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },

  avatar: {
    width: 130,
    height: 130,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: colors.accent,
    marginBottom: spacing.md,
  },

  name: {
    ...typography.h1,
    fontSize: 24,
    color: colors.text,
  },

  role: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 4,
    marginBottom: 10,
  },

  /* Card Container */
  section: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    borderRadius: 14,
    marginBottom: spacing.lg,
  },

  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
    fontSize: 18,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  detailLabel: {
    color: colors.textSecondary,
    marginLeft: 12,
    width: 95,
    fontSize: 15,
  },

  detailValue: {
    color: colors.text,
    fontWeight: "600",
    flexShrink: 1,
  },

  /* Buttons */
  buttonEdit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: spacing.md,
  },

  buttonEditText: {
    color: colors.text,
    marginLeft: 8,
    fontWeight: "700",
  },

  buttonLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card, // Or a different color to distinguish
    borderWidth: 1,
    borderColor: colors.textSecondary,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: spacing.md,
  },

  buttonLinkText: {
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
    borderRadius: 12,
  },

  buttonLogoutText: {
    color: colors.text,
    marginLeft: 8,
    fontWeight: "700",
  },
});
