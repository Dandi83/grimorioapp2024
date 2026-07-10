import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchMeta, fetchSpells, Spell, SpellsMeta } from "@/src/api";
import { useFavorites } from "@/src/favorites";
import { EDIT_MODE, schoolColors, theme } from "@/src/theme";

type FilterKind = "livello" | "scuola" | "classe" | null;

function levelLabel(n: number) {
  return n === 0 ? "Trucchetto" : `${n}° liv.`;
}

function capitalize(s: string) {
  if (!s) return s;
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

export default function SpellsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    scuola?: string;
    livello?: string;
    classe?: string;
  }>();

  const [q, setQ] = useState("");
  const [livello, setLivello] = useState<number | null>(
    params.livello ? parseInt(params.livello, 10) : null,
  );
  const [scuola, setScuola] = useState<string | null>(params.scuola || null);
  const [classe, setClasse] = useState<string | null>(params.classe || null);
  const [meta, setMeta] = useState<SpellsMeta | null>(null);
  const [spells, setSpells] = useState<Spell[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState<FilterKind>(null);

  const { isFavorite, toggle } = useFavorites();

  useEffect(() => {
    fetchMeta()
      .then(setMeta)
      .catch((e) => console.warn("meta fetch", e));
  }, []);

  // Sync route params (when Home navigates here with a preset)
  useEffect(() => {
    if (params.livello !== undefined) {
      setLivello(params.livello ? parseInt(params.livello, 10) : null);
    }
    if (params.scuola !== undefined) {
      setScuola(params.scuola || null);
    }
    if (params.classe !== undefined) {
      setClasse(params.classe || null);
    }
  }, [params.livello, params.scuola, params.classe]);

  const loadSpells = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSpells({
        q: q.trim() || undefined,
        livello: livello ?? undefined,
        scuola: scuola ?? undefined,
        classe: classe ?? undefined,
      });
      setSpells(data);
    } catch (e) {
      console.warn("spells fetch", e);
      setSpells([]);
    } finally {
      setLoading(false);
    }
  }, [q, livello, scuola, classe]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadSpells();
    }, 200);
    return () => clearTimeout(t);
  }, [loadSpells]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (livello !== null) n++;
    if (scuola) n++;
    if (classe) n++;
    return n;
  }, [livello, scuola, classe]);

  const clearFilters = () => {
    setLivello(null);
    setScuola(null);
    setClasse(null);
    setFilterOpen(null);
  };

  return (
    <View style={styles.container} testID="spells-screen">
      {/* Sticky Header */}
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <Text style={styles.headerTitle}>Grimorio</Text>

        <View style={styles.searchWrap}>
          <Ionicons
            name="search"
            size={18}
            color={theme.colors.onSurfaceTertiary}
          />
          <TextInput
            testID="spells-search-input"
            value={q}
            onChangeText={setQ}
            placeholder="Cerca incantesimo..."
            placeholderTextColor={theme.colors.onSurfaceTertiary}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {q.length > 0 && (
            <Pressable
              testID="spells-search-clear"
              onPress={() => setQ("")}
              hitSlop={10}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={theme.colors.onSurfaceTertiary}
              />
            </Pressable>
          )}
        </View>

        {/* Filter chips row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <Chip
            testID="chip-livello"
            active={livello !== null}
            label={livello !== null ? levelLabel(livello) : "Livello"}
            onPress={() =>
              setFilterOpen(filterOpen === "livello" ? null : "livello")
            }
            hasCaret
          />
          <Chip
            testID="chip-scuola"
            active={!!scuola}
            label={scuola ?? "Scuola"}
            onPress={() =>
              setFilterOpen(filterOpen === "scuola" ? null : "scuola")
            }
            hasCaret
          />
          <Chip
            testID="chip-classe"
            active={!!classe}
            label={classe ? capitalize(classe) : "Classe"}
            onPress={() =>
              setFilterOpen(filterOpen === "classe" ? null : "classe")
            }
            hasCaret
          />
          {activeFilterCount > 0 && (
            <Chip
              testID="chip-clear"
              active
              destructive
              label="Pulisci"
              onPress={clearFilters}
            />
          )}
        </ScrollView>

        {/* Expanded filter drawer */}
        {filterOpen && meta && (
          <View style={styles.filterDrawer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterOptionsRow}
            >
              {filterOpen === "livello" &&
                meta.livelli.map((n) => {
                  const active = livello === n;
                  return (
                    <Pressable
                      key={n}
                      testID={`filter-livello-${n}`}
                      onPress={() => {
                        setLivello(active ? null : n);
                        setFilterOpen(null);
                      }}
                      style={[
                        styles.filterOption,
                        active && styles.filterOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          active && styles.filterOptionTextActive,
                        ]}
                      >
                        {levelLabel(n)}
                      </Text>
                    </Pressable>
                  );
                })}
              {filterOpen === "scuola" &&
                meta.scuole.map((s) => {
                  const active = scuola === s;
                  return (
                    <Pressable
                      key={s}
                      testID={`filter-scuola-${s.toLowerCase()}`}
                      onPress={() => {
                        setScuola(active ? null : s);
                        setFilterOpen(null);
                      }}
                      style={[
                        styles.filterOption,
                        active && styles.filterOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          active && styles.filterOptionTextActive,
                        ]}
                      >
                        {s}
                      </Text>
                    </Pressable>
                  );
                })}
              {filterOpen === "classe" &&
                meta.classi.map((c) => {
                  const active = classe === c;
                  return (
                    <Pressable
                      key={c}
                      testID={`filter-classe-${c}`}
                      onPress={() => {
                        setClasse(active ? null : c);
                        setFilterOpen(null);
                      }}
                      style={[
                        styles.filterOption,
                        active && styles.filterOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          active && styles.filterOptionTextActive,
                        ]}
                      >
                        {capitalize(c)}
                      </Text>
                    </Pressable>
                  );
                })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centered} testID="spells-loading">
          <ActivityIndicator color={theme.colors.brand} />
        </View>
      ) : spells.length === 0 ? (
        <View style={styles.centered} testID="spells-empty">
          <Ionicons
            name="document-text-outline"
            size={48}
            color={theme.colors.onSurfaceTertiary}
          />
          <Text style={styles.emptyText}>Nessun incantesimo trovato.</Text>
        </View>
      ) : (
        <FlatList
          data={spells}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          testID="spells-list"
          renderItem={({ item }) => (
            <SpellRow
              spell={item}
              favorite={isFavorite(item.id)}
              onPress={() => router.push(`/spell/${item.id}`)}
              onToggleFavorite={() => toggle(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
        />
      )}

      {/* Create FAB — only in admin mode */}
      {EDIT_MODE && (
        <Pressable
          testID="spells-create-fab"
          onPress={() => router.push("/spell/new")}
          style={({ pressed }) => [
            styles.createFab,
            { bottom: insets.bottom + 80 },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name="add" size={28} color={theme.colors.onBrand} />
        </Pressable>
      )}
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  hasCaret,
  destructive,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  hasCaret?: boolean;
  destructive?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[
        styles.chip,
        active && styles.chipActive,
        destructive && styles.chipDestructive,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          active && styles.chipTextActive,
          destructive && styles.chipTextDestructive,
        ]}
      >
        {label}
      </Text>
      {hasCaret && (
        <Ionicons
          name="chevron-down"
          size={14}
          color={active ? theme.colors.onBrand : theme.colors.onSurfaceSecondary}
        />
      )}
    </Pressable>
  );
}

function SpellRow({
  spell,
  favorite,
  onPress,
  onToggleFavorite,
}: {
  spell: Spell;
  favorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}) {
  const scuolaColor = schoolColors[spell.scuola] ?? theme.colors.brand;
  const incomplete = EDIT_MODE && (!spell.descrizione || spell.livello_num === -1);
  return (
    <Pressable
      testID={`spell-row-${spell.id}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    >
      <View style={[styles.rowAccent, { backgroundColor: scuolaColor }]} />
      <View style={styles.rowContent}>
        <View style={styles.rowNameRow}>
          <Text style={styles.rowName} numberOfLines={1}>
            {capitalize(spell.nome_italiano)}
          </Text>
          {incomplete && (
            <View style={styles.todoBadge} testID={`todo-${spell.id}`}>
              <Text style={styles.todoBadgeText}>DA COMPLETARE</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {spell.livello_num === 0
            ? `Trucchetto · ${spell.scuola}`
            : spell.livello_num === -1
              ? `? · ${spell.scuola || "?"}`
              : `${spell.livello_num}° liv. · ${spell.scuola}`}
        </Text>
      </View>
      <Pressable
        testID={`favorite-toggle-${spell.id}`}
        onPress={onToggleFavorite}
        hitSlop={12}
        style={styles.starBtn}
      >
        <Ionicons
          name={favorite ? "star" : "star-outline"}
          size={22}
          color={favorite ? theme.colors.brand : theme.colors.onSurfaceTertiary}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.serif,
    fontSize: 32,
    fontWeight: "700",
    marginBottom: theme.spacing.lg,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.sans,
    fontSize: 16,
    padding: 0,
  },
  chipsRow: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingRight: theme.spacing.xl,
  },
  chip: {
    height: 36,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  chipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  chipDestructive: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderColor: theme.colors.error,
  },
  chipText: {
    color: theme.colors.onSurfaceSecondary,
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: theme.colors.onBrand,
  },
  chipTextDestructive: {
    color: theme.colors.onError,
  },
  filterDrawer: {
    marginTop: theme.spacing.xs,
    marginHorizontal: -theme.spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  filterOptionsRow: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  filterOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 0,
  },
  filterOptionActive: {
    backgroundColor: theme.colors.brandTertiary,
    borderColor: theme.colors.brand,
  },
  filterOptionText: {
    color: theme.colors.onSurfaceSecondary,
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: "600",
  },
  filterOptionTextActive: {
    color: theme.colors.brand,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.onSurfaceTertiary,
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontStyle: "italic",
  },
  listContent: {
    paddingVertical: theme.spacing.sm,
    paddingBottom: theme.spacing.xxxl,
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
  rowContent: {
    flex: 1,
  },
  rowNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: 2,
  },
  rowName: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    fontWeight: "600",
    flexShrink: 1,
  },
  todoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.brandTertiary,
    borderWidth: 1,
    borderColor: theme.colors.brandSecondary,
  },
  todoBadgeText: {
    color: theme.colors.brand,
    fontFamily: theme.fonts.sans,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  rowMeta: {
    color: theme.colors.onSurfaceTertiary,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  starBtn: {
    padding: theme.spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.divider,
    marginLeft: theme.spacing.xl + 3,
  },
  createFab: {
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
