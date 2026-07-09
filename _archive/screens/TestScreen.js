import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import BASE_URL from "../config/api";
import { api } from "../config/apiClient";
import { profileService, branchService, traineeService, trainerService } from "../services";

export default function TestScreen() {
  const [status, setStatus] = useState("Testing...");
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    testBackendConnection();
  }, []);

  const testBackendConnection = async () => {
    try {
      setLoading(true);
      setStatus("Testing backend connection...");
      
      // Test ping endpoint
      const pingResponse = await api.get("/ping");
      setResults(prev => ({ ...prev, ping: pingResponse }));
      setStatus("✓ Backend connected!");
      
      // Test root endpoint
      const rootResponse = await api.get("/");
      setResults(prev => ({ ...prev, root: rootResponse }));
      
    } catch (err) {
      setStatus(`✗ Backend connection failed: ${err.message}`);
      console.log("Backend connection error:", err);
    } finally {
      setLoading(false);
    }
  };

  const testGetProfiles = async () => {
    try {
      setLoading(true);
      const profiles = await profileService.getAllProfiles();
      setResults(prev => ({ ...prev, profiles: `Found ${profiles.length} profiles` }));
      Alert.alert("Success", `Found ${profiles.length} profiles`);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const testGetBranches = async () => {
    try {
      setLoading(true);
      const branches = await branchService.getAllBranches();
      setResults(prev => ({ ...prev, branches: `Found ${branches.length} branches` }));
      Alert.alert("Success", `Found ${branches.length} branches`);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Backend API Test</Text>
      <Text style={styles.subtitle}>Base URL: {BASE_URL}</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.status}>{status}</Text>
        {loading && <ActivityIndicator size="small" color="#007AFF" />}
      </View>

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {Object.entries(results).map(([key, value]) => (
          <Text key={key} style={styles.resultItem}>
            {key}: {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
          </Text>
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={testBackendConnection}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Connection</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={testGetProfiles}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Get Profiles</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={testGetBranches}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Get Branches</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Available API Services:</Text>
        <Text style={styles.infoText}>• profileService</Text>
        <Text style={styles.infoText}>• traineeService</Text>
        <Text style={styles.infoText}>• trainerService</Text>
        <Text style={styles.infoText}>• branchService</Text>
        <Text style={styles.infoText}>• paymentService</Text>
        <Text style={styles.infoText}>• membershipService</Text>
        <Text style={styles.infoText}>• attendanceService</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  status: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 10,
    color: "#333",
  },
  resultsContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  resultItem: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
    fontFamily: "monospace",
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoContainer: {
    backgroundColor: "#e8f4f8",
    padding: 15,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
});
