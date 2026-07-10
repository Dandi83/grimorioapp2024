import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchSpell, Spell } from "@/src/api";
import { HtmlText } from "@/src/components/HtmlText";
import { useFavorites } from "@/src/favorites";
import { IMAGES, schoolColors, theme } from "@/src/theme";

function capitalize(s: string) {
  if (!s) return s;
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

export default function SpellDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [spell, setSpell] = useState<Spell | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isFavorite, toggle } = useFavorites();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchSpell(id)
      .then((s) => setSpell(s))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered} testID="detail-loading">
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  if (error || !spell) {
    return (
      <View style={styles.centered} testID="detail-error">
        <Ionicons
          name="alert-circle"
          size={40}
          color={theme.colors.onSurfaceTertiary}
        />
        <Text style={styles.errorText}>Impossibile caricare l&apos;incantesimo.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Torna indietro</Text>
        </Pressable>
      </View>
    );
  }

  const fav = isFavorite(spell.id);
  const scuolaColor = schoolColors[spell.scuola] ?? theme.colors.brand;
  const titolo = capitalize(spell.nome_italiano);

  return (
    <View style={styles.container} testID="detail-screen">
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing.xxxl * 2 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Image
            source={{ uri: IMAGES.magicBook }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={400}
          />
          <LinearGradient
            colors={[
              "rgba(10,10,11,0.3)",
              "rgba(10,10,11,0.55)",
              "rgba(10,10,11,1)",
            ]}
            style={StyleSheet.absoluteFill}
          />
          {/* Back button */}
          <Pressable
            testID="detail-back-btn"
            onPress={() => router.back()}
            style={[styles.backCircle, { top: insets.top + theme.spacing.md }]}
            hitSlop={12}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={theme.colors.onSurface}
            />
          </Pressable>

          <View style={styles.heroBottom}>
            <View
              style={[
                styles.schoolBadge,
                { borderColor: scuolaColor },
              ]}
            >
              <View
                style={[styles.schoolDot, { backgroundColor: scuolaColor }]}
              />
              <Text style={styles.schoolBadgeText}>
                {spell.livello_num === 0
                  ? `Trucchetto · ${spell.scuola}`
                  : `${spell.livello_num}° Livello · ${spell.scuola}`}
              </Text>
            </View>
            <Text style={styles.title} testID="detail-title">
              {titolo}
            </Text>
          </View>
        </View>

        {/* Metadata grid */}
        <View style={styles.metaGrid}>
          <MetaCell label="Tempo di lancio" value={spell.tempo_di_lancio} />
          <MetaCell label="Gittata" value={spell.gittata} />
          <MetaCell label="Componenti" value={spell.componenti} />
          <MetaCell label="Durata" value={spell.durata} />
        </View>

        {/* Classes */}
        {spell.classi.length > 0 && (
          <View style={styles.classesWrap}>
            <Text style={styles.sectionLabel}>Classi</Text>
            <View style={styles.classesRow}>
              {spell.classi.map((c) => (
                <View
                  key={c}
                  testID={`detail-classe-${c}`}
                  style={styles.classPill}
                >
                  <Text style={styles.classPillText}>{capitalize(c)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Description */}
        <View style={styles.descWrap}>
          <Text style={styles.sectionLabel}>Descrizione</Text>
          <HtmlText
            html={spell.descrizione}
            testID="detail-description"
          />
        </View>
      </ScrollView>

      {/* FAB */}
      <Pressable
        testID="detail-favorite-fab"
        onPress={() => toggle(spell.id)}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + theme.spacing.lg },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Ionicons
          name={fav ? "star" : "star-outline"}
          size={24}
          color={theme.colors.onBrand}
        />
      </Pressable>
    </View>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCell}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value || "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  errorText: {
    color: theme.colors.onSurfaceSecondary,
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontStyle: "italic",
  },
  backBtn: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.brand,
  },
  backBtnText: {
    color: theme.colors.brand,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: "600",
  },
  hero: {
    height: 380,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  backCircle: {
    position: "absolute",
    left: theme.spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(20,20,22,0.75)",
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBottom: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  schoolBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    backgroundColor: "rgba(29,29,32,0.7)",
    marginBottom: theme.spacing.md,
  },
  schoolDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  schoolBadgeText: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  title: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.serif,
    fontSize: 38,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  metaCell: {
    width: "47%",
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  metaLabel: {
    color: theme.colors.onSurfaceTertiary,
    fontFamily: theme.fonts.sans,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: theme.spacing.xs,
  },
  metaValue: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.serif,
    fontSize: 15,
    lineHeight: 20,
  },
  classesWrap: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    color: theme.colors.brand,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: theme.spacing.md,
  },
  classesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  classPill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.brandTertiary,
    borderWidth: 1,
    borderColor: theme.colors.brandSecondary,
  },
  classPillText: {
    color: theme.colors.onBrandTertiary,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: "600",
  },
  descWrap: {
    paddingHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.md,
  },
  descText: {
    color: theme.colors.onSurfaceSecondary,
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    lineHeight: 26,
  },
  fab: {
    position: "absolute",
    right: theme.spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
