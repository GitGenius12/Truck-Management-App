import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/services/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

const todayISO = () => new Date().toISOString().split('T')[0];

export default function MiscSpendScreen() {
  const [amount, setAmount] = useState('');
  const [dateOfSpend, setDateOfSpend] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [whoDidTrx, setWhoDidTrx] = useState('');
  const [transactionUtr, setTransactionUtr] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library to attach proof.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const name = asset.uri.split('/').pop() ?? 'photo.jpg';
      const type = asset.mimeType ?? 'image/jpeg';
      setPhoto({ uri: asset.uri, name, type });
    }
  }

  async function handleSubmit() {
    if (!amount || !reason || !whoDidTrx) {
      setError('Amount, Reason, and Who Did Transaction are required.');
      return;
    }
    if (!photo) {
      setError('Proof photo is required.');
      return;
    }

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('amount', amount);
      formData.append('dateOfSpend', dateOfSpend);
      formData.append('reason', reason);
      formData.append('whoDidTrx', whoDidTrx);
      if (transactionUtr) formData.append('transactionUtr', transactionUtr);
      formData.append('transactionDonePhoto', {
        uri: photo.uri,
        name: photo.name,
        type: photo.type,
      } as any);

      await api.postForm('/driver/transactions/misc', formData);

      setSuccess('Miscellaneous spend recorded successfully! You can view it in the Transactions tab.');
      setAmount('');
      setReason('');
      setWhoDidTrx('');
      setTransactionUtr('');
      setPhoto(null);
      setDateOfSpend(todayISO());
    } catch (e: any) {
      setError(e.message ?? 'Failed to submit. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setAmount('');
    setReason('');
    setWhoDidTrx('');
    setTransactionUtr('');
    setPhoto(null);
    setDateOfSpend(todayISO());
    setError('');
    setSuccess('');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Page header */}
          <View style={styles.pageHeader}>
            <View style={styles.iconBox}>
              <Ionicons name="receipt-outline" size={22} color={Colors.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>New Misc Spend</Text>
              <Text style={styles.pageSubtitle}>Record a miscellaneous transaction</Text>
            </View>
          </View>

          {/* Error / Success banners */}
          {!!error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {!!success && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
              <Text style={styles.successText}>{success}</Text>
            </View>
          )}

          {/* ── Financial Details ── */}
          <Text style={styles.sectionTitle}>Financial Details</Text>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Amount (₹) <Text style={styles.req}>*</Text></Text>
              <View style={styles.prefixInput}>
                <Text style={styles.prefix}>₹</Text>
                <TextInput
                  style={styles.prefixTextInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Date of Spend</Text>
              <TextInput
                style={styles.input}
                value={dateOfSpend}
                onChangeText={setDateOfSpend}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Reason for Spend <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={reason}
              onChangeText={setReason}
              placeholder="Describe the purpose of this transaction…"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* ── Entity & Verification ── */}
          <Text style={styles.sectionTitle}>Entity & Verification</Text>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Who Did Transaction <Text style={styles.req}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={whoDidTrx}
                onChangeText={setWhoDidTrx}
                placeholder="Name"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>UTR / Ref No.</Text>
              <TextInput
                style={styles.input}
                value={transactionUtr}
                onChangeText={setTransactionUtr}
                placeholder="Ref #"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          {/* ── Proof Photo ── */}
          <View style={styles.field}>
            <Text style={styles.label}>Proof Photo <Text style={styles.req}>*</Text></Text>
            <TouchableOpacity style={styles.uploadBox} onPress={pickPhoto} activeOpacity={0.7}>
              {photo ? (
                <View style={styles.photoPreview}>
                  <Image source={{ uri: photo.uri }} style={styles.thumbImage} />
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <Text style={styles.photoName} numberOfLines={2}>{photo.name}</Text>
                    <Text style={styles.photoChange}>Tap to change</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="cloud-upload-outline" size={32} color={Colors.textMuted} />
                  <Text style={styles.uploadText}>Tap to select photo</Text>
                  <Text style={styles.uploadSub}>PNG, JPG supported</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Actions ── */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset} disabled={saving}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, saving && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color={Colors.white} />
                  <Text style={styles.submitBtnText}>Submit Transaction</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg },

  pageHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.lg,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center',
  },
  pageTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  pageSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.errorBg, borderRadius: Radius.sm, padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: { flex: 1, fontSize: FontSize.sm, color: Colors.error },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.successBg, borderRadius: Radius.sm, padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  successText: { flex: 1, fontSize: FontSize.sm, color: Colors.success },

  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: Spacing.sm, marginTop: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.xs,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },
  field: { marginBottom: Spacing.sm },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  req: { color: Colors.error },
  input: {
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 10,
    fontSize: FontSize.sm, color: Colors.text,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top', paddingTop: Spacing.sm },
  prefixInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, overflow: 'hidden',
  },
  prefix: {
    paddingHorizontal: Spacing.sm, paddingVertical: 10,
    fontSize: FontSize.md, color: Colors.textSecondary,
    borderRightWidth: 1, borderRightColor: Colors.border,
    backgroundColor: Colors.inputBg,
  },
  prefixTextInput: {
    flex: 1, paddingHorizontal: Spacing.sm, paddingVertical: 10,
    fontSize: FontSize.sm, color: Colors.text,
  },

  uploadBox: {
    borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed',
    borderRadius: Radius.sm, backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  uploadPlaceholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl, gap: Spacing.xs },
  uploadText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  uploadSub: { fontSize: FontSize.xs, color: Colors.textMuted },
  photoPreview: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  thumbImage: { width: 56, height: 56, borderRadius: Radius.sm, backgroundColor: Colors.border },
  photoName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  photoChange: { fontSize: FontSize.xs, color: Colors.primary, marginTop: 2 },

  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  resetBtn: {
    flex: 1, paddingVertical: 12, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  resetBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  submitBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, paddingVertical: 12, borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
});
