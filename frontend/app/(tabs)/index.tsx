import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchMeta, SpellsMeta } from "@/src/api";
import { IMAGES, schoolColors, theme } from "@/src/theme";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [meta, setMeta] = useState<SpellsMeta | null>(null);

  useEffect(() => {
    fetchMeta()
      .then(setMeta)
      .catch((e) => console.warn("meta fetch failed", e));
  }, []);

  const goToSpells = (params?: { scuola?: string; livello?: number }) => {
    router.push({
      pathname: "/(tabs)/spells",
      params: {
        scuola: params?.scuola ?? "",
        livello: params?.livello !== undefined ? String(params.livello) : "",
      },
    });
  };

  return (
    <View style={styles.container} testID="home-screen">
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Image
            source={{ uri: IMAGES.darkAtmosphere }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={400}
          />
          <LinearGradient
            colors={[
              "rgba(10,10,11,0.4)",
              "rgba(10,10,11,0.75)",
              "rgba(10,10,11,1)",
            ]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroContent, { paddingTop: insets.top + 24 }]}>
            <Text style={styles.eyebrow} testID="home-eyebrow">
              D&D 5e · 2024
            </Text>
            <Text style={styles.title} testID="home-title">
              GrimorioApp
            </Text>
            <Text style={styles.tagline} testID="home-tagline">
              &ldquo;Il sapere è la più potente delle magie.&rdquo;
            </Text>

            <Pressable
              testID="home-cta-search"
              onPress={() => goToSpells()}
              style={({ pressed }) => [
                styles.cta,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons
                name="search"
                size={18}
                color={theme.colors.onBrand}
              />
              <Text style={styles.ctaText}>Cerca un incantesimo</Text>
            </Pressable>
          </View>
        </View>

        {/* Scuole di Magia */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scuole di Magia</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.schoolsRow}
          >
            {(meta?.scuole ?? []).map((s) => (
              <Pressable
                key={s}
                testID={`school-card-${s.toLowerCase()}`}
                onPress={() => goToSpells({ scuola: s })}
                style={({ pressed }) => [
                  styles.schoolCard,
                  { borderColor: schoolColors[s] ?? theme.colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View
                  style={[
                    styles.schoolDot,
                    { backgroundColor: schoolColors[s] ?? theme.colors.brand },
                  ]}
                />
                <Text style={styles.schoolName}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Livelli */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Livelli</Text>
          <View style={styles.levelsGrid}>
            <Pressable
              testID="level-cantrip"
              onPress={() => goToSpells({ livello: 0 })}
              style={({ pressed }) => [
                styles.levelCard,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.levelNum}>0</Text>
              <Text style={styles.levelLabel}>Trucchetti</Text>
            </Pressable>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <Pressable
                key={n}
                testID={`level-${n}`}
                onPress={() => goToSpells({ livello: n })}
                style={({ pressed }) => [
                  styles.levelCard,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.levelNum}>{n}</Text>
                <Text style={styles.levelLabel}>Livello</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  hero: {
    height: 380,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  heroContent: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  eyebrow: {
    color: theme.colors.brand,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: "700",
    marginBottom: theme.spacing.md,
    textTransform: "uppercase",
  },
  title: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.serif,
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  tagline: {
    color: theme.colors.onSurfaceSecondary,
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontStyle: "italic",
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  cta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.brand,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.pill,
  },
  ctaText: {
    color: theme.colors.onBrand,
    fontFamily: theme.fonts.sans,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  section: {
    marginTop: theme.spacing.xl,
  },
  sectionTitle: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.serif,
    fontSize: 22,
    fontWeight: "700",
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  schoolsRow: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  schoolCard: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flexShrink: 0,
  },
  schoolDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  schoolName: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: "600",
  },
  levelsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  levelCard: {
    width: "30%",
    aspectRatio: 1.2,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  levelNum: {
    color: theme.colors.brand,
    fontFamily: theme.fonts.serif,
    fontSize: 32,
    fontWeight: "700",
  },
  levelLabel: {
    color: theme.colors.onSurfaceTertiary,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: theme.spacing.xs,
  },
});
