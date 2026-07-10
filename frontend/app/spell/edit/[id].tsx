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

import { fetchSpell, Spell, updateSpell, deleteSpell } from "@/src/api";
import { theme } from "@/src/theme";

type FieldKey =
  | "livello"
  | "tempo_di_lancio"
  | "gittata"
  | "componenti"
  | "durata"
  | "descrizione";

const FIELD_LABELS: Record<FieldKey, string> = {
  livello: "Livello",
  tempo_di_lancio: "Tempo di lancio",
  gittata: "Gittata",
  componenti: "Componenti",
  durata: "Durata",
  descrizione: "Descrizione",
};

const FIELD_HINTS: Record<FieldKey, string> = {
  livello: "Es. \"Ammaliamento di 6° livello (bardo, mago)\"",
  tempo_di_lancio: "Es. \"azione\"",
  gittata: "Es. \"9 metri\"",
  componenti: "Es. \"V, S, M (un pizzico di ferro)\"",
  durata: "Es. \"concentrazione, fino a 1 minuto\"",
  descrizione:
    "Trascrivi qui la descrizione dal manuale. Puoi usare <b>grassetto</b> e <br> per andare a capo.",
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
  const [values, setValues] = useState<Record<FieldKey, string>>({
    livello: "",
    tempo_di_lancio: "",
    gittata: "",
    componenti: "",
    durata: "",
    descrizione: "",
  });

  useEffect(() => {
    if (!id) return;
    fetchSpell(id)
      .then((s) => {
        setSpell(s);
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
      // Go back to the spells list (pop two levels: editor -> detail -> list)
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

  const titolo = spell.nome_italiano.toLowerCase().replace(/(^|\s)\S/g, (t) =>
    t.toUpperCase(),
  );

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
        {(Object.keys(FIELD_LABELS) as FieldKey[]).map((k) => {
          const multi = k === "descrizione";
          return (
            <View key={k} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{FIELD_LABELS[k]}</Text>
              <TextInput
                testID={`edit-${k}`}
                value={values[k]}
                onChangeText={(t) => setValues((v) => ({ ...v, [k]: t }))}
                placeholder={FIELD_HINTS[k]}
                placeholderTextColor={theme.colors.onSurfaceTertiary}
                style={[styles.input, multi && styles.inputMulti]}
                multiline={multi}
                autoCorrect
                autoCapitalize={multi ? "sentences" : "none"}
                textAlignVertical={multi ? "top" : "center"}
              />
            </View>
          );
        })}

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
