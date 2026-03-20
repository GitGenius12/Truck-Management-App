import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

interface Truck {
  _id: string;
  truckNumber: string;
}

export default function AddTripScreen() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [showTruckPicker, setShowTruckPicker] = useState(false);

  // Backend fields: tripDate, tripNumber, previousKm, currentKm, diesel, cash
  const [tripDate, setTripDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [tripNumber, setTripNumber] = useState('');
  const [previousKm, setPreviousKm] = useState('');
  const [currentKm, setCurrentKm] = useState('');
  const [diesel, setDiesel] = useState('');
  const [cash, setCash] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<any>(ENDPOINTS.TRUCKS)
      .then(data => setTrucks(Array.isArray(data) ? data : (data.trucks ?? [])))
      .catch(() => {});
  }, []);

  const kmDriven = previousKm && currentKm && Number(currentKm) > Number(previousKm)
    ? Number(currentKm) - Number(previousKm)
    : null;
  const mileage = kmDriven && diesel && Number(diesel) > 0
    ? (kmDriven / Number(diesel)).toFixed(2)
    : null;

  async function handleSubmit() {
    if (!selectedTruck) { setError('Please select a truck'); return; }
    if (!tripDate.trim()) { setError('Please enter a date'); return; }
    if (!tripNumber.trim()) { setError('Please enter a trip number'); return; }
    if (!previousKm.trim()) { setError('Please enter previous KM'); return; }
    if (!currentKm.trim()) { setError('Please enter current KM'); return; }
    if (!diesel.trim()) { setError('Please enter diesel filled'); return; }
    if (Number(currentKm) <= Number(previousKm)) {
      setError('Current KM must be greater than Previous KM');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const payload: Record<string, any> = {
        truckId: selectedTruck._id,
        tripDate,
        tripNumber: Number(tripNumber),
        previousKm: Number(previousKm),
        currentKm: Number(currentKm),
        diesel: Number(diesel),
      };
      if (cash.trim()) payload.cash = Number(cash);

      await api.post(ENDPOINTS.TRIPS, payload);
      Alert.alert('Success', 'Trip added successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      setError(e.message || 'Failed to add trip');
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

      {/* Truck Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Truck</Text>
        <Text style={styles.label}>SELECT TRUCK *</Text>
        <TouchableOpacity
          style={styles.inputRow}
          onPress={() => setShowTruckPicker(!showTruckPicker)}
          activeOpacity={0.8}
        >
          <Ionicons name="car-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
          <Text style={[styles.input, { color: selectedTruck ? Colors.text : Colors.textMuted }]}>
            {selectedTruck ? selectedTruck.truckNumber : 'Select a truck'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
        {showTruckPicker && (
          <View style={styles.dropdown}>
            {trucks.length === 0 ? (
              <Text style={styles.dropdownEmpty}>No trucks available</Text>
            ) : (
              trucks.map(truck => (
                <TouchableOpacity
                  key={truck._id}
                  style={[styles.dropdownItem, selectedTruck?._id === truck._id && styles.dropdownItemActive]}
                  onPress={() => { setSelectedTruck(truck); setShowTruckPicker(false); }}
                >
                  <Text style={[styles.dropdownText, selectedTruck?._id === truck._id && styles.dropdownTextActive]}>
                    {truck.truckNumber}
                  </Text>
                  {selectedTruck?._id === truck._id && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>

      {/* Trip Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trip Details</Text>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>DATE *</Text>
            <View style={styles.inputRow}>
              <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
                value={tripDate}
                onChangeText={setTripDate}
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>TRIP NUMBER *</Text>
            <View style={styles.inputRow}>
              <Ionicons name="list-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor={Colors.textMuted}
                value={tripNumber}
                onChangeText={setTripNumber}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      </View>

      {/* Odometer */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Odometer Reading</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>PREVIOUS KM *</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                value={previousKm}
                onChangeText={setPreviousKm}
                keyboardType="numeric"
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>CURRENT KM *</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                value={currentKm}
                onChangeText={setCurrentKm}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
        {kmDriven !== null && (
          <View style={styles.calcBox}>
            <Ionicons name="speedometer-outline" size={16} color={Colors.primary} />
            <Text style={styles.calcText}>Distance: <Text style={styles.calcValue}>{kmDriven} km</Text></Text>
          </View>
        )}
      </View>

      {/* Diesel & Cash */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diesel & Cash</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>DIESEL (litres) *</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                value={diesel}
                onChangeText={setDiesel}
                keyboardType="numeric"
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>CASH (₹)</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                value={cash}
                onChangeText={setCash}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
        {mileage && (
          <View style={styles.calcBox}>
            <Ionicons name="flash-outline" size={16} color={Colors.success} />
            <Text style={styles.calcText}>Mileage: <Text style={[styles.calcValue, { color: Colors.success }]}>{mileage} km/L</Text></Text>
          </View>
        )}
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
            <Text style={styles.btnText}>Add Trip</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
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
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm },
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
    marginBottom: Spacing.md,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  dropdown: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 200,
  },
  dropdownEmpty: { padding: Spacing.md, color: Colors.textMuted, textAlign: 'center' },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemActive: { backgroundColor: Colors.tealBg },
  dropdownText: { fontSize: FontSize.md, color: Colors.text },
  dropdownTextActive: { color: Colors.primary, fontWeight: '600' },
  calcBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.tealBg,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  calcText: { fontSize: FontSize.sm, color: Colors.text },
  calcValue: { fontWeight: '700', color: Colors.primary },
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
