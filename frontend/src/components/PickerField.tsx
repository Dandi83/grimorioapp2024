import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/src/theme";

interface Props {
  label: string;
  value: string;
  placeholder?: string;
  options: string[];
  onChange: (v: string) => void;
  testID?: string;
  allowCustom?: boolean; // shows "Altro..." to type freely
}

/**
 * Dropdown-style picker with a modal list.
 * Shows selected value as a button. On tap, opens a modal with search + options,
 * plus an "Altro..." row for free text input.
 */
export function PickerField({
  label,
  value,
  placeholder,
  options,
  onChange,
  testID,
  allowCustom = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState("");
  const insets = useSafeAreaInsets();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const openModal = () => {
    setQuery("");
    setCustomMode(false);
    setCustomText(value && !options.includes(value) ? value : "");
    setOpen(true);
  };

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const applyCustom = () => {
    if (customText.trim()) {
      onChange(customText.trim());
      setOpen(false);
    }
  };

  return (
    <>
      <Pressable
        testID={testID}
        onPress={openModal}
        style={({ pressed }) => [styles.trigger, pressed && { opacity: 0.7 }]}
      >
        <Text
          style={[
            styles.triggerText,
            !value && styles.triggerPlaceholder,
          ]}
          numberOfLines={2}
        >
          {value || placeholder || "Scegli..."}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color={theme.colors.onSurfaceTertiary}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          testID={`${testID}-backdrop`}
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + theme.spacing.md },
          ]}
        >
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>{label}</Text>

          {customMode ? (
            <View style={styles.customWrap}>
              <TextInput
                testID={`${testID}-custom-input`}
                value={customText}
                onChangeText={setCustomText}
                placeholder="Scrivi il tuo valore..."
                placeholderTextColor={theme.colors.onSurfaceTertiary}
                style={styles.customInput}
                autoFocus
                autoCorrect
                multiline
              />
              <View style={styles.customActions}>
                <Pressable
                  testID={`${testID}-custom-cancel`}
                  onPress={() => setCustomMode(false)}
                  style={[styles.customBtn, styles.customBtnGhost]}
                >
                  <Text style={styles.customBtnGhostText}>Indietro</Text>
                </Pressable>
                <Pressable
                  testID={`${testID}-custom-apply`}
                  onPress={applyCustom}
                  style={[styles.customBtn, styles.customBtnPrimary]}
                >
                  <Text style={styles.customBtnPrimaryText}>Conferma</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.searchWrap}>
                <Ionicons
                  name="search"
                  size={16}
                  color={theme.colors.onSurfaceTertiary}
                />
                <TextInput
                  testID={`${testID}-search`}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Cerca..."
                  placeholderTextColor={theme.colors.onSurfaceTertiary}
                  style={styles.searchInput}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
              </View>

              <FlatList
                data={filtered}
                keyExtractor={(item, idx) => `${item}-${idx}`}
                style={{ maxHeight: 420 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const selected = item === value;
                  return (
                    <Pressable
                      testID={`${testID}-option-${item}`}
                      onPress={() => pick(item)}
                      style={({ pressed }) => [
                        styles.option,
                        selected && styles.optionSelected,
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.optionTextSelected,
                        ]}
                      >
                        {item}
                      </Text>
                      {selected && (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={theme.colors.brand}
                        />
                      )}
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Nessuna opzione trovata.</Text>
                }
              />

              {allowCustom && (
                <Pressable
                  testID={`${testID}-other`}
                  onPress={() => setCustomMode(true)}
                  style={styles.otherBtn}
                >
                  <Ionicons
                    name="create-outline"
                    size={16}
                    color={theme.colors.brand}
                  />
                  <Text style={styles.otherBtnText}>Altro... (scrivi tu)</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    minHeight: 48,
  },
  triggerText: {
    flex: 1,
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.serif,
    fontSize: 16,
  },
  triggerPlaceholder: {
    color: theme.colors.onSurfaceTertiary,
    fontStyle: "italic",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surfaceSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    maxHeight: "85%",
  },
  grabber: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    marginBottom: theme.spacing.md,
  },
  sheetTitle: {
    color: theme.colors.brand,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: theme.spacing.md,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    height: 44,
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    padding: 0,
  },
  option: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  optionSelected: {
    backgroundColor: theme.colors.brandTertiary,
  },
  optionText: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.serif,
    fontSize: 15,
    flex: 1,
  },
  optionTextSelected: {
    color: theme.colors.brand,
    fontWeight: "600",
  },
  emptyText: {
    color: theme.colors.onSurfaceTertiary,
    fontFamily: theme.fonts.serif,
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    padding: theme.spacing.xl,
  },
  otherBtn: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  otherBtnText: {
    color: theme.colors.brand,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: "600",
  },
  customWrap: {
    gap: theme.spacing.md,
  },
  customInput: {
    backgroundColor: theme.colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    minHeight: 80,
  },
  customActions: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  customBtn: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: "center",
  },
  customBtnGhost: {
    backgroundColor: theme.colors.surfaceTertiary,
  },
  customBtnGhostText: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: "600",
  },
  customBtnPrimary: {
    backgroundColor: theme.colors.brand,
  },
  customBtnPrimaryText: {
    color: theme.colors.onBrand,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: "700",
  },
});
