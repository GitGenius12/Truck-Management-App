import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

interface DocPhoto {
  uri: string;
  name: string;
  type: string;
}

export default function CompleteProfileScreen() {
  const { updateUser } = useAuth();
  const [profilePhoto, setProfilePhoto] = useState<DocPhoto | null>(null);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [aadhaarPhoto, setAadhaarPhoto] = useState<DocPhoto | null>(null);
  const [panPhoto, setPanPhoto] = useState<DocPhoto | null>(null);
  const [signaturePhoto, setSignaturePhoto] = useState<DocPhoto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function pickImage(setter: (p: DocPhoto) => void) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setter({
        uri: asset.uri,
        name: asset.fileName || 'photo.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
    }
  }

  async function handleSubmit() {
    if (!aadhaarNumber.trim() || !panNumber.trim() || !dateOfBirth.trim()) {
      setError('Please fill in Aadhaar number, PAN number, and date of birth');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('aadhaarNumber', aadhaarNumber.trim());
      formData.append('panNumber', panNumber.trim().toUpperCase());
      formData.append('dateOfBirth', dateOfBirth.trim());

      if (profilePhoto) {
        formData.append('profilePhoto', {
          uri: profilePhoto.uri,
          name: profilePhoto.name,
          type: profilePhoto.type,
        } as any);
      }
      if (aadhaarPhoto) {
        formData.append('aadhaarPhoto', {
          uri: aadhaarPhoto.uri,
          name: aadhaarPhoto.name,
          type: aadhaarPhoto.type,
        } as any);
      }
      if (panPhoto) {
        formData.append('panPhoto', {
          uri: panPhoto.uri,
          name: panPhoto.name,
          type: panPhoto.type,
        } as any);
      }
      if (signaturePhoto) {
        formData.append('signaturePhoto', {
          uri: signaturePhoto.uri,
          name: signaturePhoto.name,
          type: signaturePhoto.type,
        } as any);
      }

      await api.putForm(ENDPOINTS.UPDATE_PROFILE, formData);
      updateUser({ isProfileComplete: true });
    } catch (e: any) {
      setError(e.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Complete Your Profile</Text>
        <Text style={styles.headerSub}>Required to access the system</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Profile Photo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Photo</Text>
          <Text style={styles.sectionSub}>Upload a clear photo of yourself</Text>
          <TouchableOpacity style={styles.avatarPicker} onPress={() => pickImage(setProfilePhoto)}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto.uri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={32} color={Colors.textMuted} />
              </View>
            )}
            <View style={styles.uploadBadge}>
              <Ionicons name="camera" size={14} color={Colors.white} />
              <Text style={styles.uploadBadgeText}>Upload</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* KYC Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KYC Documents</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>AADHAAR CARD NUMBER</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="XXXX XXXX XXXX"
                placeholderTextColor={Colors.textMuted}
                value={aadhaarNumber}
                onChangeText={setAadhaarNumber}
                keyboardType="numeric"
                maxLength={14}
              />
              <Ionicons name="cloud-upload-outline" size={20} color={Colors.textMuted} />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PAN CARD NUMBER</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="ABCDE1234F"
                placeholderTextColor={Colors.textMuted}
                value={panNumber}
                onChangeText={v => setPanNumber(v.toUpperCase())}
                autoCapitalize="characters"
                maxLength={10}
              />
              <Ionicons name="cloud-upload-outline" size={20} color={Colors.textMuted} />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>DATE OF BIRTH</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={Colors.textMuted}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
              />
              <Ionicons name="calendar-outline" size={20} color={Colors.textMuted} />
            </View>
          </View>
        </View>

        {/* Document Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Document Photos</Text>
          <View style={styles.photoGrid}>
            <PhotoUploadBox
              label="Aadhaar Photo"
              photo={aadhaarPhoto}
              onPress={() => pickImage(setAadhaarPhoto)}
              icon="card-outline"
            />
            <PhotoUploadBox
              label="PAN Photo"
              photo={panPhoto}
              onPress={() => pickImage(setPanPhoto)}
              icon="card-outline"
            />
            <PhotoUploadBox
              label="Signature"
              photo={signaturePhoto}
              onPress={() => pickImage(setSignaturePhoto)}
              icon="pencil-outline"
            />
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
            <Text style={styles.btnText}>Save & Complete Profile</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function PhotoUploadBox({
  label,
  photo,
  onPress,
  icon,
}: {
  label: string;
  photo: DocPhoto | null;
  onPress: () => void;
  icon: string;
}) {
  return (
    <TouchableOpacity style={styles.photoBox} onPress={onPress} activeOpacity={0.8}>
      {photo ? (
        <Image source={{ uri: photo.uri }} style={styles.photoImage} />
      ) : (
        <Ionicons name={icon as any} size={24} color={Colors.textMuted} />
      )}
      <Text style={styles.photoLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primaryDark },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.white },
  headerSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  scrollView: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    flex: 1,
  },
  scrollContent: { padding: Spacing.lg, paddingBottom: 40 },
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
  avatarPicker: { alignSelf: 'center', position: 'relative' },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.inputBg,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  uploadBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  uploadBadgeText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '600' },
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
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 52,
    gap: Spacing.sm,
  },
  input: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  photoGrid: { flexDirection: 'row', gap: Spacing.md },
  photoBox: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%', position: 'absolute' },
  photoLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center' },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '600' },
});
