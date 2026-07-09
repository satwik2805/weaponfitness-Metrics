// screens/AdminProfileScreen.js
import React, { useEffect, useState } from "react";
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
import { Feather, AntDesign } from "@expo/vector-icons";
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useToast, useConfirm } from "../components/ui";

export default function AdminProfileScreen({ navigation }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [profile, setProfile] = useState(null);
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    loadAdminProfile();
  }, []);

  const loadAdminProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const adminId = session?.user?.id;
      const email = session?.user?.email;

      setAdminEmail(email || "");

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, profile_image, role")
        .eq("id", adminId)
        .single();

      if (!error && data) {
        setProfile(data);
      }
    } catch (err) {
      console.log("loadAdminProfile error:", err);
    }
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Logout",
      message: "Are you sure?",
      confirmTitle: "Logout",
      destructive: true,
    });
    if (ok) {
      await supabase.auth.signOut();
      navigation.replace("Login");
    }
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
      <View style={styles.container}>
        <Text style={{ color: "#fff" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 160 }}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Image
          source={{
            uri: profile.profile_image || "https://i.imgur.com/ExdKOOz.png",
          }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{profile.full_name}</Text>
        <Text style={styles.role}>Administrator</Text>
      </View>

      {/* DETAILS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Details</Text>

        <DetailItem icon="mail" label="Email" value={adminEmail} />
        <DetailItem icon="phone" label="Phone" value={profile.phone || "-"} />
        <DetailItem icon="shield" label="Role" value="Admin" />
      </View>

      {/* PERMISSIONS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissions</Text>
        <PermissionItem icon="users" label="Manage Users" />
        <PermissionItem icon="credit-card" label="View Payments" />
        <PermissionItem icon="map-pin" label="Manage Branches" />
        <PermissionItem icon="bar-chart-2" label="View Analytics" />
        <PermissionItem icon="settings" label="System Settings" />
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
        <AntDesign name="google" size={18} color="#000" />
        <Text style={styles.buttonLinkText}>Link Gmail</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonLogout} onPress={handleLogout}>
        <Feather name="log-out" size={18} color="#fff" />
        <Text style={styles.buttonLogoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const DetailItem = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <Feather name={icon} size={20} color="#bbb" />
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

const PermissionItem = ({ icon, label }) => (
  <View style={styles.permissionRow}>
    <Feather name={icon} size={18} color={colors.accent} />
    <Text style={styles.permissionLabel}>{label}</Text>
    <Feather name="check-circle" size={18} color={colors.accent} />
  </View>
);

const styles = StyleSheet.create({
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
    color: colors.accent,
    fontSize: 14,
    marginTop: 4,
  },

  section: {
    backgroundColor: colors.primaryLight,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.md,
    color: "#fff",
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  detailContent: {
    marginLeft: 12,
    flex: 1,
  },

  detailLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },

  detailValue: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },

  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },

  permissionLabel: {
    color: "#fff",
    marginLeft: 12,
    flex: 1,
    fontWeight: "500",
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
    color: "#000",
    marginLeft: 8,
    fontWeight: "600",
  },

  buttonLogout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d9534f",
    paddingVertical: 12,
    borderRadius: 10,
  },

  buttonLogoutText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "600",
  },

  buttonLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: spacing.md,
  },
  buttonLinkText: {
    color: "#000",
    marginLeft: 8,
    fontWeight: "600",
  },
});