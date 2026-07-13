import React, { useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';
import { supabase } from '../config/supabase';
import { useTheme } from '../context/ThemeContext';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Input,
  ListItem,
  Sheet,
  Skeleton,
  Surface,
  Text,
  useToast,
  useConfirm,
} from './ui';

export default function ManagePlansModal({ visible, onClose, branchId }) {
  const { space } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [plans, setPlans] = useState([]);
  const [view, setView] = useState('list'); // list, add, edit

  // Form State
  const [formId, setFormId] = useState(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: dbError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('branch_id', branchId)
      .order('price', { ascending: true });

    if (dbError) {
      setError(dbError);
    }
    setPlans(data || []);
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    if (visible && branchId) {
      loadPlans();
      setView('list');
    }
  }, [visible, branchId, loadPlans]);

  const startAdd = () => {
    setFormId(null);
    setName('');
    setPrice('');
    setDuration('');
    setDesc('');
    setErrors({});
    setView('add');
  };

  const startEdit = (plan) => {
    setFormId(plan.id);
    setName(plan.plan_name);
    setPrice(String(plan.price));
    setDuration(String(plan.duration_months));
    setDesc(plan.description || '');
    setErrors({});
    setView('edit');
  };

  const validate = () => {
    const next = {};
    if (!price || isNaN(parseFloat(price))) next.price = 'Enter a valid price.';
    if (!duration || isNaN(parseInt(duration))) next.duration = 'Enter the duration in months.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payloadData = {
        branch_id: branchId,
        plan_name: name,
        price: parseFloat(price),
        duration_months: parseInt(duration),
        description: desc,
      };

      if (view === 'add') {
        const { error: insertErr } = await supabase
          .from('membership_plans')
          .insert(payloadData);
        if (insertErr) throw new Error(insertErr.message);
      } else {
        const { error: updateErr } = await supabase
          .from('membership_plans')
          .update(payloadData)
          .eq('id', formId);
        if (updateErr) throw new Error(updateErr.message);
      }

      await loadPlans();
      setView('list');
    } catch (err) {
      toast.show(err.message || 'Failed to save plan.', { kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete plan',
      message: 'Are you sure you want to delete this plan?',
      confirmTitle: 'Delete',
      destructive: true,
      icon: 'trash-outline',
    });
    if (!ok) return;

    setLoading(true);
    const { error: delErr } = await supabase
      .from('membership_plans')
      .delete()
      .eq('id', id);

    if (delErr) {
      toast.show(delErr.message || 'Failed to delete plan.', { kind: 'error' });
    } else {
      loadPlans();
    }
    setLoading(false);
  };

  if (!visible) return null;

  const isForm = view === 'add' || view === 'edit';
  const title = view === 'list' ? 'Manage plans' : view === 'add' ? 'New plan' : 'Edit plan';

  const footer = isForm ? (
    <>
      <Button title="Back" variant="ghost" onPress={() => setView('list')} style={{ flex: 1 }} />
      <Button title="Save plan" icon="checkmark" loading={saving} onPress={handleSave} style={{ flex: 2 }} />
    </>
  ) : (
    <Button title="Add new plan" icon="add" onPress={startAdd} fullWidth />
  );

  return (
    <Sheet visible={visible} onClose={onClose} title={title} footer={footer}>
      {/* LIST VIEW */}
      {view === 'list' &&
        (loading ? (
          <View style={{ gap: space[3] }}>
            <Skeleton height={80} radius={14} />
            <Skeleton height={80} radius={14} />
            <Skeleton height={80} radius={14} />
          </View>
        ) : error ? (
          <ErrorState compact title="Couldn't load plans" detail={error.message} onRetry={loadPlans} />
        ) : plans.length === 0 ? (
          <EmptyState
            icon="pricetags-outline"
            title="No plans yet"
            body="Create your first membership plan so members have something to subscribe to."
            actionTitle="Add a plan"
            onAction={startAdd}
          />
        ) : (
          <View style={{ gap: space[3] }}>
            {plans.map((p) => (
              <Surface key={p.id} level={2} pad={4}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space[3] }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="h4">{p.plan_name}</Text>
                    <Badge tone="accent" style={{ marginTop: space[1] }}>
                      {`₹${p.price} / ${p.duration_months} mo`}
                    </Badge>
                    {p.description ? (
                      <Text variant="bodySm" color="textMuted" style={{ marginTop: space[2] }}>
                        {p.description}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', gap: space[1] }}>
                    <IconButton icon="create-outline" variant="ghost" onPress={() => startEdit(p)} accessibilityLabel={`Edit ${p.plan_name}`} />
                    <IconButton icon="trash-outline" variant="ghost" color="danger" onPress={() => handleDelete(p.id)} accessibilityLabel={`Delete ${p.plan_name}`} />
                  </View>
                </View>
              </Surface>
            ))}
          </View>
        ))}

      {/* ADD/EDIT VIEW */}
      {isForm && (
        <View style={{ gap: space[5] }}>
          <Input
            label="Plan name"
            icon="bookmark-outline"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Gold, Platinum, HIIT Special"
          />
          <Input
            label="Price (₹)"
            icon="cash-outline"
            value={price}
            onChangeText={(t) => { setPrice(t); if (errors.price) setErrors((e) => ({ ...e, price: undefined })); }}
            keyboardType="numeric"
            placeholder="e.g. 1500"
            error={errors.price}
          />
          <Input
            label="Duration (months)"
            icon="calendar-outline"
            value={duration}
            onChangeText={(t) => { setDuration(t); if (errors.duration) setErrors((e) => ({ ...e, duration: undefined })); }}
            keyboardType="numeric"
            placeholder="e.g. 3"
            error={errors.duration}
          />
          <Input
            label="Description"
            value={desc}
            onChangeText={setDesc}
            multiline
            inputStyle={{ height: 80 }}
            placeholder="Short description..."
          />
        </View>
      )}
    </Sheet>
  );
}
