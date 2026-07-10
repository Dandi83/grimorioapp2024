import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  deleteSpell,
  fetchSpell,
  fetchSuggestions,
  Spell,
  Suggestions,
  updateSpell,
} from "@/src/api";
import { PickerField } from "@/src/components/PickerField";
import { theme } from "@/src/theme";

type Values = {
  livello: string;
  tempo_di_lancio: string;
  gittata: string;
  componenti: string;
  durata: string;
  descrizione: string;
};

export default function EditSpellScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [spell, setSpell] = useState<Spell | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [values, setValues] = useState<Values>({
    livello: "",
    tempo_di_lancio: "",
    gittata: "",
    componenti: "",
    durata: "",
    descrizione: "",
  });

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchSpell(id), fetchSuggestions()])
      .then(([s, sug]) => {
        setSpell(s);
        setSuggestions(sug);
        setValues({
          livello: s.livello,
          tempo_di_lancio: s.tempo_di_lancio,
          gittata: s.gittata,
          componenti: s.componenti,
          durata: s.durata,
          descrizione: s.descrizione,
        });
      })
      .catch((e) => console.warn("edit fetch", e))
      .finally(() => setLoading(false));
  }, [id]);

  const setField = (k: keyof Values, v: string) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const onSave = async () => {
    if (!spell) return;
    setSaving(true);
    try {
      await updateSpell(spell.id, values);
      router.back();
    } catch (e) {
      console.warn("update failed", e);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!spell) return;
    setDeleting(true);
    try {
      await deleteSpell(spell.id);
      router.replace("/(tabs)/spells");
    } catch (e) {
      console.warn("delete failed", e);
      setDeleting(false);
    }
  };

  if (loading || !spell) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  const titolo = spell.nome_italiano
    .toLowerCase()
    .replace(/(^|\s)\S/g, (t) => t.toUpperCase());

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <Pressable
          testID="edit-back"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.iconBtn}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Modifica</Text>
          <Text style={styles.title} numberOfLines={1}>
            {titolo}
          </Text>
        </View>
        <Pressable
          testID="edit-save"
          onPress={onSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            (pressed || saving) && { opacity: 0.7 },
          ]}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.onBrand} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Salva</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.xl,
          paddingBottom: insets.bottom + theme.spacing.xxxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Livello */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Livello</Text>
          <PickerField
            testID="edit-livello"
            label="Livello dell'incantesimo"
            value={values.livello}
            placeholder="Scegli livello, scuola e classi..."
            options={suggestions?.livello ?? []}
            onChange={(v) => setField("livello", v)}
          />
          <Text style={styles.hint}>
            Formato: &ldquo;Evocazione di 3° livello (mago, stregone)&rdquo;
          </Text>
        </View>

        {/* Tempo di lancio */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Tempo di lancio</Text>
          <PickerField
            testID="edit-tempo_di_lancio"
            label="Tempo di lancio"
            value={values.tempo_di_lancio}
            placeholder='Es. "azione", "1 minuto"...'
            options={suggestions?.tempo_di_lancio ?? []}
            onChange={(v) => setField("tempo_di_lancio", v)}
          />
        </View>

        {/* Gittata */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Gittata</Text>
          <PickerField
            testID="edit-gittata"
            label="Gittata"
            value={values.gittata}
            placeholder='Es. "9 metri", "contatto"...'
            options={suggestions?.gittata ?? []}
            onChange={(v) => setField("gittata", v)}
          />
        </View>

        {/* Componenti */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Componenti</Text>
          <PickerField
            testID="edit-componenti"
            label="Componenti"
            value={values.componenti}
            placeholder='Es. "V, S"...'
            options={suggestions?.componenti ?? []}
            onChange={(v) => setField("componenti", v)}
          />
        </View>

        {/* Durata */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Durata</Text>
          <PickerField
            testID="edit-durata"
            label="Durata"
            value={values.durata}
            placeholder='Es. "istantanea"...'
            options={suggestions?.durata ?? []}
            onChange={(v) => setField("durata", v)}
          />
        </View>

        {/* Descrizione — free text multiline */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Descrizione</Text>
          <TextInput
            testID="edit-descrizione"
            value={values.descrizione}
            onChangeText={(t) => setField("descrizione", t)}
            placeholder="Trascrivi la descrizione dal Manuale del Giocatore. Puoi usare <b>grassetto</b> e <br> per andare a capo."
            placeholderTextColor={theme.colors.onSurfaceTertiary}
            style={[styles.input, styles.inputMulti]}
            multiline
            autoCorrect
            autoCapitalize="sentences"
            textAlignVertical="top"
          />
        </View>

        {/* Delete area */}
        <View style={styles.dangerZone}>
          {!showConfirmDelete ? (
            <Pressable
              testID="edit-delete-btn"
              onPress={() => setShowConfirmDelete(true)}
              style={({ pressed }) => [
                styles.deleteBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={theme.colors.onError}
              />
              <Text style={styles.deleteBtnText}>Elimina incantesimo</Text>
            </Pressable>
          ) : (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmText}>
                Sicuro di voler eliminare &ldquo;{spell.nome_italiano}&rdquo;?
                L&apos;azione è irreversibile.
              </Text>
              <View style={styles.confirmActions}>
                <Pressable
                  testID="edit-delete-cancel"
                  onPress={() => setShowConfirmDelete(false)}
                  style={styles.confirmCancel}
                >
                  <Text style={styles.confirmCancelText}>Annulla</Text>
                </Pressable>
                <Pressable
                  testID="edit-delete-confirm"
                  onPress={onDelete}
                  disabled={deleting}
                  style={[styles.confirmDelete, deleting && { opacity: 0.7 }]}
                >
                  {deleting ? (
                    <ActivityIndicator color={theme.colors.onError} size="small" />
                  ) : (
                    <Text style={styles.confirmDeleteText}>Elimina</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    color: theme.colors.brand,
    fontFamily: theme.fonts.sans,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  title: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.serif,
    fontSize: 20,
    fontWeight: "700",
  },
  saveBtn: {
    backgroundColor: theme.colors.brand,
    paddingHorizontal: theme.spacing.lg,
    height: 40,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 76,
  },
  saveBtnText: {
    color: theme.colors.onBrand,
    fontFamily: theme.fonts.sans,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  fieldGroup: {
    marginBottom: theme.spacing.xl,
  },
  fieldLabel: {
    color: theme.colors.brand,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  hint: {
    color: theme.colors.onSurfaceTertiary,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: theme.spacing.xs,
    lineHeight: 15,
  },
  input: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    minHeight: 48,
  },
  inputMulti: {
    minHeight: 220,
    lineHeight: 24,
  },
  dangerZone: {
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
    backgroundColor: "transparent",
  },
  deleteBtnText: {
    color: theme.colors.onError,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: "600",
  },
  confirmBox: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
    backgroundColor: "rgba(125,38,38,0.15)",
    gap: theme.spacing.md,
  },
  confirmText: {
    color: theme.colors.onError,
    fontFamily: theme.fonts.serif,
    fontSize: 14,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  confirmCancel: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceTertiary,
    alignItems: "center",
  },
  confirmCancelText: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: "600",
  },
  confirmDelete: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.error,
    alignItems: "center",
  },
  confirmDeleteText: {
    color: theme.colors.onError,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: "700",
  },
});
