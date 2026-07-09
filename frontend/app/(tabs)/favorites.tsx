import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchSpells, Spell } from "@/src/api";
import { useFavorites } from "@/src/favorites";
import { schoolColors, theme } from "@/src/theme";

function capitalize(s: string) {
  if (!s) return s;
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { favorites, isFavorite, toggle, loaded } = useFavorites();
  const [allSpells, setAllSpells] = useState<Spell[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSpells({});
      setAllSpells(data);
    } catch (e) {
      console.warn("favorites fetch", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const favSpells = allSpells.filter((s) => favorites.includes(s.id));

  return (
    <View style={styles.container} testID="favorites-screen">
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <Text style={styles.title}>Preferiti</Text>
        <Text style={styles.subtitle}>
          {favSpells.length}{" "}
          {favSpells.length === 1 ? "incantesimo salvato" : "incantesimi salvati"}
        </Text>
      </View>

      {loading || !loaded ? (
        <View style={styles.centered} testID="favorites-loading">
          <ActivityIndicator color={theme.colors.brand} />
        </View>
      ) : favSpells.length === 0 ? (
        <View style={styles.centered} testID="favorites-empty">
          <Ionicons
            name="star-outline"
            size={56}
            color={theme.colors.onSurfaceTertiary}
          />
          <Text style={styles.emptyTitle}>Il tuo grimorio è vuoto.</Text>
          <Text style={styles.emptyBody}>
            Aggiungi i tuoi incantesimi preferiti per ritrovarli qui.
          </Text>
        </View>
      ) : (
        <FlatList
          testID="favorites-list"
          data={favSpells}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: theme.spacing.sm, paddingBottom: theme.spacing.xxxl }}
          renderItem={({ item }) => {
            const scuolaColor =
              schoolColors[item.scuola] ?? theme.colors.brand;
            return (
              <Pressable
                testID={`favorite-row-${item.id}`}
                onPress={() => router.push(`/spell/${item.id}`)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <View
                  style={[styles.rowAccent, { backgroundColor: scuolaColor }]}
                />
                <View style={styles.rowContent}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {capitalize(item.nome_italiano)}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {item.livello_num === 0
                      ? `Trucchetto · ${item.scuola}`
                      : `${item.livello_num}° liv. · ${item.scuola}`}
                  </Text>
                </View>
                <Pressable
                  testID={`favorite-remove-${item.id}`}
                  onPress={() => toggle(item.id)}
                  hitSlop={12}
                  style={styles.starBtn}
                >
                  <Ionicons
                    name={isFavorite(item.id) ? "star" : "star-outline"}
                    size={22}
                    color={theme.colors.brand}
                  />
                </Pressable>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  title: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.serif,
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.colors.onSurfaceTertiary,
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    marginTop: theme.spacing.xs,
    letterSpacing: 0.4,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.xxl,
  },
  emptyTitle: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.serif,
    fontSize: 20,
    fontWeight: "600",
    marginTop: theme.spacing.md,
  },
  emptyBody: {
    color: theme.colors.onSurfaceTertiary,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    paddingRight: theme.spacing.xl,
  },
  rowAccent: {
    width: 3,
    height: 32,
    marginRight: theme.spacing.md,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  rowContent: { flex: 1 },
  rowName: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    fontWeight: "600",
  },
  rowMeta: {
    color: theme.colors.onSurfaceTertiary,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 2,
  },
  starBtn: { padding: theme.spacing.sm },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.divider,
    marginLeft: theme.spacing.xl + 3,
  },
});
