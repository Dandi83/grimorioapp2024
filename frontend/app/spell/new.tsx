import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
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

import { createSpell } from "@/src/api";
import { theme } from "@/src/theme";

type FieldKey =
  | "nome_italiano"
  | "livello"
  | "tempo_di_lancio"
  | "gittata"
  | "componenti"
  | "durata"
  | "descrizione";

const FIELD_LABELS: Record<FieldKey, string> = {
  nome_italiano: "Nome",
  livello: "Livello",
  tempo_di_lancio: "Tempo di lancio",
  gittata: "Gittata",
  componenti: "Componenti",
  durata: "Durata",
  descrizione: "Descrizione",
};

const FIELD_HINTS: Record<FieldKey, string> = {
  nome_italiano: "Es. \"Fulmine Rovente\"",
  livello: "Es. \"Evocazione di 3° livello (mago, stregone)\" oppure \"Trucchetto di Illusione (bardo)\"",
  tempo_di_lancio: "Es. \"azione\"",
  gittata: "Es. \"9 metri\"",
  componenti: "Es. \"V, S, M (un pizzico di ferro)\"",
  durata: "Es. \"concentrazione, fino a 1 minuto\"",
  descrizione:
    "Descrizione dell'incantesimo. Puoi usare <b>grassetto</b> e <br> per andare a capo.",
};

export default function NewSpellScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<FieldKey, string>>({
    nome_italiano: "",
    livello: "",
    tempo_di_lancio: "",
    gittata: "",
    componenti: "",
    durata: "",
    descrizione: "",
  });

  const onSave = async () => {
    setError(null);
    if (!values.nome_italiano.trim()) {
      setError("Il nome è obbligatorio.");
      return;
    }
    if (!values.livello.trim()) {
      setError("Il livello è obbligatorio.");
      return;
    }
    setSaving(true);
    try {
      const created = await createSpell(values);
      // Go to detail of the new spell (replace, so back returns to list)
      router.replace(`/spell/${created.id}`);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Errore nel salvataggio dell'incantesimo.";
      // Backend returns JSON like {"detail": "..."}
      try {
        const parsed = JSON.parse(msg);
        setError(parsed.detail || msg);
      } catch {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <Pressable
          testID="new-back"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.iconBtn}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Nuovo</Text>
          <Text style={styles.title}>Aggiungi incantesimo</Text>
        </View>
        <Pressable
          testID="new-save"
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
            <Text style={styles.saveBtnText}>Crea</Text>
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
        {error && (
          <View style={styles.errorBanner} testID="new-error">
            <Ionicons
              name="alert-circle"
              size={18}
              color={theme.colors.onError}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {(Object.keys(FIELD_LABELS) as FieldKey[]).map((k) => {
          const multi = k === "descrizione";
          return (
            <View key={k} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {FIELD_LABELS[k]}
                {(k === "nome_italiano" || k === "livello") && (
                  <Text style={styles.required}> *</Text>
                )}
              </Text>
              <TextInput
                testID={`new-${k}`}
                value={values[k]}
                onChangeText={(t) => setValues((v) => ({ ...v, [k]: t }))}
                placeholder={FIELD_HINTS[k]}
                placeholderTextColor={theme.colors.onSurfaceTertiary}
                style={[styles.input, multi && styles.inputMulti]}
                multiline={multi}
                autoCorrect
                autoCapitalize={
                  k === "nome_italiano" ? "characters" : multi ? "sentences" : "none"
                }
                textAlignVertical={multi ? "top" : "center"}
              />
            </View>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.error,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    flex: 1,
    color: theme.colors.onError,
    fontFamily: theme.fonts.sans,
    fontSize: 13,
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
  required: {
    color: theme.colors.error,
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
});
