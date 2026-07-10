import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

import { createSpell, fetchSuggestions, Suggestions } from "@/src/api";
import { PickerField } from "@/src/components/PickerField";
import { theme } from "@/src/theme";

type Values = {
  nome_italiano: string;
  livello: string;
  tempo_di_lancio: string;
  gittata: string;
  componenti: string;
  durata: string;
  descrizione: string;
};

const EMPTY: Values = {
  nome_italiano: "",
  livello: "",
  tempo_di_lancio: "",
  gittata: "",
  componenti: "",
  durata: "",
  descrizione: "",
};

export default function NewSpellScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Values>(EMPTY);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);

  useEffect(() => {
    fetchSuggestions()
      .then(setSuggestions)
      .catch((e) => console.warn("suggestions fetch", e));
  }, []);

  const setField = (k: keyof Values, v: string) =>
    setValues((prev) => ({ ...prev, [k]: v }));

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
      router.replace(`/spell/${created.id}`);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Errore nel salvataggio dell'incantesimo.";
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

        {/* Nome — free text */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            Nome<Text style={styles.required}> *</Text>
          </Text>
          <TextInput
            testID="new-nome_italiano"
            value={values.nome_italiano}
            onChangeText={(t) => setField("nome_italiano", t)}
            placeholder='Es. "Fulmine Rovente"'
            placeholderTextColor={theme.colors.onSurfaceTertiary}
            style={styles.input}
            autoCorrect
            autoCapitalize="characters"
          />
        </View>

        {/* Livello — dropdown */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            Livello<Text style={styles.required}> *</Text>
          </Text>
          <PickerField
            testID="new-livello"
            label="Livello dell'incantesimo"
            value={values.livello}
            placeholder="Scegli livello, scuola e classi..."
            options={suggestions?.livello ?? []}
            onChange={(v) => setField("livello", v)}
          />
          <Text style={styles.hint}>
            Formato: &ldquo;Evocazione di 3° livello (mago, stregone)&rdquo; oppure
            &ldquo;Trucchetto di Illusione (bardo)&rdquo;
          </Text>
        </View>

        {/* Tempo di lancio — dropdown */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Tempo di lancio</Text>
          <PickerField
            testID="new-tempo_di_lancio"
            label="Tempo di lancio"
            value={values.tempo_di_lancio}
            placeholder='Es. "azione", "1 minuto"...'
            options={suggestions?.tempo_di_lancio ?? []}
            onChange={(v) => setField("tempo_di_lancio", v)}
          />
        </View>

        {/* Gittata — dropdown */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Gittata</Text>
          <PickerField
            testID="new-gittata"
            label="Gittata"
            value={values.gittata}
            placeholder='Es. "9 metri", "contatto"...'
            options={suggestions?.gittata ?? []}
            onChange={(v) => setField("gittata", v)}
          />
        </View>

        {/* Componenti — dropdown */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Componenti</Text>
          <PickerField
            testID="new-componenti"
            label="Componenti"
            value={values.componenti}
            placeholder='Es. "V, S", "V, S, M (una piuma)"...'
            options={suggestions?.componenti ?? []}
            onChange={(v) => setField("componenti", v)}
          />
        </View>

        {/* Durata — dropdown */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Durata</Text>
          <PickerField
            testID="new-durata"
            label="Durata"
            value={values.durata}
            placeholder='Es. "istantanea", "concentrazione..."'
            options={suggestions?.durata ?? []}
            onChange={(v) => setField("durata", v)}
          />
        </View>

        {/* Descrizione — free text multiline */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Descrizione</Text>
          <TextInput
            testID="new-descrizione"
            value={values.descrizione}
            onChangeText={(t) => setField("descrizione", t)}
            placeholder="Descrizione dell'incantesimo. Puoi usare <b>grassetto</b> e <br> per andare a capo."
            placeholderTextColor={theme.colors.onSurfaceTertiary}
            style={[styles.input, styles.inputMulti]}
            multiline
            autoCorrect
            autoCapitalize="sentences"
            textAlignVertical="top"
          />
        </View>
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
});
