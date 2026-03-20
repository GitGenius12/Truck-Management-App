import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

interface DocField {
  key: string;
  label: string;
  icon: string;
}

const DOC_FIELDS: DocField[] = [
  { key: 'rcPhoto', label: 'RC (Registration Certificate)', icon: 'document-outline' },
  { key: 'insurancePhoto', label: 'Insurance', icon: 'shield-checkmark-outline' },
  { key: 'fitnessPhoto', label: 'Fitness Certificate', icon: 'fitness-outline' },
  { key: 'roadTaxPhoto', label: 'Road Tax', icon: 'receipt-outline' },
  { key: 'permitPhoto', label: 'Permit', icon: 'card-outline' },
  { key: 'pollutionPhoto', label: 'Pollution Certificate', icon: 'leaf-outline' },
  { key: 'carrierLegalLiabilityPhoto', label: 'Carrier Liability', icon: 'briefcase-outline' },
];

export default function AddTruckScreen() {
  const [regNumber, setRegNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [capacity, setCapacity] = useState('');
  const [docs, setDocs] = useState<Record<string, { uri: string; name: string; type: string }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function pickDoc(key: string) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setDocs(prev => ({
        ...prev,
        [key]: {
          uri: asset.uri,
          name: asset.fileName || `${key}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        },
      }));
    }
  }

  async function handleSubmit() {
    if (!regNumber.trim()) {
      setError('Registration number is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('truckNumber', regNumber.trim().toUpperCase());
      if (make.trim()) formData.append('make', make.trim());
      if (model.trim()) formData.append('model', model.trim());
      if (year.trim()) formData.append('year', year.trim());
      if (capacity.trim()) formData.append('capacity', capacity.trim());

      for (const [key, file] of Object.entries(docs)) {
        formData.append(key, { uri: file.uri, name: file.name, type: file.type } as any);
      }

      await api.postForm(ENDPOINTS.TRUCKS, formData);
      Alert.alert('Success', 'Truck added successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      setError(e.message || 'Failed to add truck');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>

        <Field label="REGISTRATION NUMBER *" icon="car-outline">
          <TextInput
            style={styles.input}
            placeholder="MH-12-AB-1234"
            placeholderTextColor={Colors.textMuted}
            value={regNumber}
            onChangeText={v => setRegNumber(v.toUpperCase())}
            autoCapitalize="characters"
          />
        </Field>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="MAKE" icon="business-outline">
              <TextInput
                style={styles.input}
                placeholder="Tata"
                placeholderTextColor={Colors.textMuted}
                value={make}
                onChangeText={setMake}
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="MODEL" icon="construct-outline">
              <TextInput
                style={styles.input}
                placeholder="407"
                placeholderTextColor={Colors.textMuted}
                value={model}
                onChangeText={setModel}
              />
            </Field>
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="YEAR" icon="calendar-outline">
              <TextInput
                style={styles.input}
                placeholder="2020"
                placeholderTextColor={Colors.textMuted}
                value={year}
                onChangeText={setYear}
                keyboardType="numeric"
                maxLength={4}
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="CAPACITY (tons)" icon="scale-outline">
              <TextInput
                style={styles.input}
                placeholder="10"
                placeholderTextColor={Colors.textMuted}
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="numeric"
              />
            </Field>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Documents</Text>
        <Text style={styles.sectionSub}>Upload vehicle documents (optional)</Text>

        <View style={styles.docsGrid}>
          {DOC_FIELDS.map(field => (
            <TouchableOpacity
              key={field.key}
              style={styles.docBox}
              onPress={() => pickDoc(field.key)}
              activeOpacity={0.8}
            >
              {docs[field.key] ? (
                <>
                  <Image source={{ uri: docs[field.key].uri }} style={styles.docImage} />
                  <View style={styles.docOverlay}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                  </View>
                </>
              ) : (
                <>
                  <Ionicons name={field.icon as any} size={22} color={Colors.textMuted} />
                </>
              )}
              <Text style={styles.docLabel} numberOfLines={2}>{field.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
            <Text style={styles.btnText}>Add Truck</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name={icon as any} size={18} color={Colors.textMuted} style={styles.inputIcon} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  errorText: { color: Colors.error, fontSize: FontSize.sm, flex: 1 },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  sectionSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.sm },
  fieldGroup: { marginBottom: Spacing.md },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 50,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  docsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  docBox: {
    width: '30%',
    aspectRatio: 0.9,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    gap: Spacing.xs,
    overflow: 'hidden',
  },
  docImage: { position: 'absolute', width: '100%', height: '100%' },
  docOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
  },
  docLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    zIndex: 1,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '600' },
});
