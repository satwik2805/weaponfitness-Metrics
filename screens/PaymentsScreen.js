// screens/PaymentsScreen.js
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  Avatar,
  Badge,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  Reveal,
  SkeletonRow,
  Surface,
  Text,
} from '../components/ui';
import { supabase } from '../config/supabase';
import { branchService, paymentService, profileService } from '../services';

const FILTERS = ['All', 'Completed', 'Pending'];

const getModeIcon = (mode) => {
  if (mode === 'Cash') return 'cash-outline';
  if (mode === 'Card') return 'card-outline';
  return 'phone-portrait-outline';
};

export default function PaymentsScreen({ navigation }) {
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState('All'); // All, Completed, Pending

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        setPayments([]);
        return;
      }

      // Try backend API first
      try {
        // 1. Get Owner's Branches from backend
        const allBranches = await branchService.getAllBranches();
        const ownerBranches = allBranches.filter((b) => b.owner_id === userId);
        const branchIds = ownerBranches.map((b) => b.id);

        if (!branchIds.length) {
          setPayments([]);
          return;
        }

        const branchMap = {};
        ownerBranches.forEach((b) => (branchMap[b.id] = b.branch_name));

        // 2. Get Plans for these branches (still using Supabase for now as membership service may need plan_id filtering)
        const { data: plans } = await supabase
          .from('membership_plans')
          .select('id, plan_name, branch_id')
          .in('branch_id', branchIds);

        const planDetails = {};
        (plans || []).forEach((p) => {
          planDetails[p.id] = {
            name: p.plan_name,
            branchId: p.branch_id,
          };
        });

        const planIds = (plans || []).map((p) => p.id);

        // 3. Get Payments from backend
        const allPayments = await paymentService.getAllPayments();
        const ownerPayments = allPayments
          .filter((p) => planIds.includes(p.plan_id))
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        // 4. Fetch profile data for each trainee
        const formatted = await Promise.all(
          ownerPayments.map(async (p) => {
            const planInfo = planDetails[p.plan_id];
            const branchName = planInfo ? branchMap[planInfo.branchId] : 'Unknown Branch';

            let traineeName = 'Unknown';
            let traineeImage = null;

            if (p.trainee_id) {
              try {
                const profile = await profileService.getProfile(p.trainee_id);
                traineeName = profile?.full_name || 'Unknown';
                traineeImage = profile?.profile_image || null;
              } catch (err) {
                console.log('Profile fetch error:', err);
              }
            }

            return {
              ...p,
              traineeName,
              traineeImage,
              planName: planInfo?.name || 'Plan',
              branchName: branchName,
            };
          })
        );

        setPayments(formatted);
      } catch (apiError) {
        console.log('Backend API error, falling back to Supabase:', apiError);
        // Fallback to Supabase
        const { data: branches } = await supabase
          .from('branches')
          .select('id, branch_name')
          .eq('owner_id', userId);

        const branchIds = (branches || []).map((b) => b.id);
        if (!branchIds.length) {
          setPayments([]);
          return;
        }

        const branchMap = {};
        (branches || []).forEach((b) => (branchMap[b.id] = b.branch_name));

        const { data: plans } = await supabase
          .from('membership_plans')
          .select('id, plan_name, branch_id')
          .in('branch_id', branchIds);

        const planDetails = {};
        (plans || []).forEach((p) => {
          planDetails[p.id] = {
            name: p.plan_name,
            branchId: p.branch_id,
          };
        });

        const planIds = (plans || []).map((p) => p.id);

        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*, trainees(id, profiles(full_name, profile_image))')
          .in('plan_id', planIds)
          .order('date', { ascending: false });

        const formatted = (paymentsData || []).map((p) => {
          const planInfo = planDetails[p.plan_id];
          const branchName = planInfo ? branchMap[planInfo.branchId] : 'Unknown Branch';

          return {
            ...p,
            traineeName: p.trainees?.profiles?.full_name || 'Unknown',
            traineeImage: p.trainees?.profiles?.profile_image,
            planName: planInfo?.name || 'Plan',
            branchName: branchName,
          };
        });

        setPayments(formatted);
      }
    } catch (err) {
      console.log('loadPayments error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredPayments = useMemo(
    () => (filter === 'All' ? payments : payments.filter((p) => p.status === filter)),
    [filter, payments]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[3],
          paddingTop: insets.top + space[3],
          paddingHorizontal: space[4],
          paddingBottom: space[3],
        }}
      >
        <IconButton icon="arrow-back" variant="secondary" onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
        <Text variant="h2" style={{ flex: 1 }}>Payments</Text>
      </View>

      {/* Filters */}
      <View style={{ paddingHorizontal: space[4] }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space[2] }}
        >
          {FILTERS.map((f) => (
            <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={{ padding: space[4], gap: space[3] }}>
          <Surface level={1} pad={4}><SkeletonRow /></Surface>
          <Surface level={1} pad={4}><SkeletonRow /></Surface>
          <Surface level={1} pad={4}><SkeletonRow /></Surface>
        </View>
      ) : error ? (
        <View style={{ marginTop: space[8] }}>
          <ErrorState title="Couldn't load payments" detail={error.message} onRetry={loadPayments} />
        </View>
      ) : filteredPayments.length === 0 ? (
        <View style={{ marginTop: space[8] }}>
          <EmptyState
            icon="card-outline"
            title="No payments found"
            body={
              filter === 'All'
                ? "Payments will appear here as your members renew their plans."
                : `No ${filter.toLowerCase()} payments right now.`
            }
            actionTitle={filter === 'All' ? undefined : 'Show all'}
            onAction={filter === 'All' ? undefined : () => setFilter('All')}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: space[4], paddingBottom: space[10], gap: space[3], maxWidth: 760, width: '100%', alignSelf: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          {filteredPayments.map((pay, i) => (
            <Reveal key={pay.id} index={Math.min(i, 5)}>
              <Surface level={1} pad={4}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                  <Avatar name={pay.traineeName} uri={pay.traineeImage || undefined} size="md" />
                  <View style={{ flex: 1 }}>
                    <Text variant="h4" numberOfLines={1}>{pay.traineeName}</Text>
                    <Text variant="bodySm" color="textMuted" numberOfLines={1}>
                      {pay.planName} · {pay.branchName}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="stat">₹{pay.amount}</Text>
                    <Text variant="caption" color="textFaint">
                      {new Date(pay.date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: space[3] }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
                    <Ionicons name={getModeIcon(pay.payment_mode)} size={14} color={colors.textMuted} />
                    <Text variant="bodySm" color="textMuted">{pay.payment_mode}</Text>
                  </View>
                  <Badge
                    tone={pay.status === 'Completed' ? 'success' : 'warning'}
                    icon={pay.status === 'Completed' ? 'checkmark-circle' : 'time-outline'}
                  >
                    {pay.status}
                  </Badge>
                </View>
              </Surface>
            </Reveal>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
