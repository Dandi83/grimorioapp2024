import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DieShape } from "@/src/components/DieShape";
import { theme } from "@/src/theme";

type DieSides = 4 | 6 | 8 | 10 | 12 | 20 | 100;

// Reordered per user preference: d20 first, then descending by size, d100 last.
const DICE: { sides: DieSides; label: string }[] = [
  { sides: 20, label: "d20" },
  { sides: 12, label: "d12" },
  { sides: 10, label: "d10" },
  { sides: 8, label: "d8" },
  { sides: 6, label: "d6" },
  { sides: 4, label: "d4" },
  { sides: 100, label: "d100" },
];

const COUNT_PRESETS = [1, 2, 3, 4, 5, 6, 8, 10];

interface RollEntry {
  id: string;
  sides: DieSides;
  count: number;
  values: number[];
  sum: number;
  timestamp: number;
}

function rollDie(sides: DieSides): number {
  return Math.floor(Math.random() * sides) + 1;
}

export default function DiceScreen() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<DieSides>(20);
  const [count, setCount] = useState<number>(1);
  const [currentValues, setCurrentValues] = useState<number[]>([]);
  const [history, setHistory] = useState<RollEntry[]>([]);
  const [rolling, setRolling] = useState(false);
  const rollingCounter = useRef(0);

  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  const sum = useMemo(
    () => currentValues.reduce((a, b) => a + b, 0),
    [currentValues],
  );

  const roll = useCallback(() => {
    if (rolling) return;
    setRolling(true);
    rollingCounter.current += 1;
    const myRun = rollingCounter.current;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Shuffle preview during tumble
    const shuffleInterval = setInterval(() => {
      setCurrentValues(
        Array.from({ length: count }, () => rollDie(selected)),
      );
    }, 70);

    rotate.value = 0;
    rotate.value = withSequence(
      withTiming(360 + Math.random() * 360, {
        duration: 750,
        easing: Easing.out(Easing.cubic),
      }),
    );
    scale.value = withSequence(
      withTiming(1.12, { duration: 300, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 420, easing: Easing.inOut(Easing.quad) }),
    );

    setTimeout(() => {
      clearInterval(shuffleInterval);
      if (myRun !== rollingCounter.current) return;
      const values = Array.from({ length: count }, () => rollDie(selected));
      const total = values.reduce((a, b) => a + b, 0);
      setCurrentValues(values);
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
      setHistory((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          sides: selected,
          count,
          values,
          sum: total,
          timestamp: Date.now(),
        },
        ...prev.slice(0, 19),
      ]);
      setRolling(false);
    }, 800);
  }, [count, rolling, rotate, scale, selected]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Crit / min detection only meaningful for a single d20
  const critMessage = (() => {
    if (currentValues.length !== 1 || rolling) return null;
    const v = currentValues[0];
    if (selected === 20 && v === 20) return "🔥 Successo Critico!";
    if (selected === 20 && v === 1) return "💀 Fallimento Critico";
    if (v === selected) return "✨ Massimo!";
    if (v === 1 && selected !== 4) return "⚠️ Minimo";
    return null;
  })();

  const isCritLow =
    currentValues.length === 1 &&
    selected === 20 &&
    currentValues[0] === 1;

  return (
    <View style={styles.container} testID="dice-screen">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
          <Text style={styles.title}>Dadi</Text>
          <Text style={styles.subtitle}>Scegli dado, quantità, e lancia</Text>
        </View>

        {/* Stage */}
        <View style={styles.stage}>
          <Animated.View style={[styles.stageDie, animatedStyle]}>
            <DieShape
              sides={selected}
              size={200}
              value={
                currentValues.length === 1 && !rolling
                  ? currentValues[0]
                  : undefined
              }
            />
          </Animated.View>

          {/* Results row for multi-rolls */}
          {currentValues.length > 1 && !rolling && (
            <View style={styles.resultsRow} testID="dice-results-row">
              {currentValues.map((v, i) => (
                <View key={i} style={styles.resultChip}>
                  <Text style={styles.resultChipText}>{v}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Sum */}
          {currentValues.length > 1 && !rolling && (
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>TOTALE</Text>
              <Text style={styles.sumValue} testID="dice-sum">
                {sum}
              </Text>
            </View>
          )}

          {currentValues.length <= 1 && (
            <Text style={styles.stageLabel}>d{selected}</Text>
          )}

          {critMessage && (
            <Text
              style={[
                styles.critText,
                isCritLow && { color: theme.colors.onError },
              ]}
              testID="crit-message"
            >
              {critMessage}
            </Text>
          )}
        </View>

        {/* Roll button */}
        <Pressable
          testID="dice-roll-btn"
          onPress={roll}
          disabled={rolling}
          style={({ pressed }) => [
            styles.rollBtn,
            (pressed || rolling) && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="sync" size={20} color={theme.colors.onBrand} />
          <Text style={styles.rollBtnText}>
            {rolling ? "Lanciando..." : `Lancia ${count}d${selected}`}
          </Text>
        </Pressable>

        {/* Count selector */}
        <Text style={styles.sectionLabel}>Quanti dadi</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.countRow}
        >
          {COUNT_PRESETS.map((n) => {
            const active = count === n;
            return (
              <Pressable
                key={n}
                testID={`count-${n}`}
                onPress={() => {
                  setCount(n);
                  setCurrentValues([]);
                  Haptics.selectionAsync().catch(() => {});
                }}
                style={[
                  styles.countChip,
                  active && styles.countChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.countChipText,
                    active && styles.countChipTextActive,
                  ]}
                >
                  {n}d
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Die selector */}
        <Text style={styles.sectionLabel}>Seleziona dado</Text>
        <View style={styles.dieGrid}>
          {DICE.map((d) => {
            const active = selected === d.sides;
            return (
              <Pressable
                key={d.sides}
                testID={`die-select-${d.sides}`}
                onPress={() => {
                  setSelected(d.sides);
                  setCurrentValues([]);
                  Haptics.selectionAsync().catch(() => {});
                }}
                style={({ pressed }) => [
                  styles.dieCell,
                  active && styles.dieCellActive,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <DieShape
                  sides={d.sides}
                  size={54}
                  variant={active ? "gold" : "muted"}
                />
                <Text
                  style={[
                    styles.dieCellLabel,
                    active && { color: theme.colors.brand, fontWeight: "700" },
                  ]}
                >
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* History */}
        <View style={styles.historyHeader}>
          <Text style={styles.sectionLabel}>Cronologia</Text>
          {history.length > 0 && (
            <Pressable
              testID="dice-clear-history"
              onPress={clearHistory}
              hitSlop={8}
            >
              <Text style={styles.clearBtn}>Pulisci</Text>
            </Pressable>
          )}
        </View>

        {history.length === 0 ? (
          <Text style={styles.emptyHistory} testID="dice-empty-history">
            I tuoi lanci appariranno qui.
          </Text>
        ) : (
          <View style={styles.historyList}>
            {history.map((h) => (
              <View
                key={h.id}
                testID={`history-${h.id}`}
                style={styles.historyRow}
              >
                <View style={styles.historyShape}>
                  <DieShape sides={h.sides} size={40} variant="muted" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyDie}>
                    {h.count}d{h.sides}
                  </Text>
                  <Text style={styles.historyTime}>
                    {h.count > 1 && h.values.length <= 10
                      ? `${h.values.join(" + ")} = `
                      : ""}
                    {new Date(h.timestamp).toLocaleTimeString("it-IT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.historyValue,
                    h.count === 1 &&
                      h.sides === 20 &&
                      h.sum === 20 && { color: theme.colors.brand },
                    h.count === 1 &&
                      h.sides === 20 &&
                      h.sum === 1 && { color: theme.colors.onError },
                  ]}
                >
                  {h.sum}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  stage: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xl,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 340,
  },
  stageDie: {
    alignItems: "center",
    justifyContent: "center",
  },
  stageLabel: {
    color: theme.colors.onSurfaceTertiary,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "700",
    marginTop: theme.spacing.md,
  },
  resultsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    justifyContent: "center",
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  resultChip: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.brandTertiary,
    borderWidth: 1,
    borderColor: theme.colors.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  resultChipText: {
    color: theme.colors.brand,
    fontFamily: theme.fonts.serif,
    fontSize: 20,
    fontWeight: "700",
  },
  sumRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  sumLabel: {
    color: theme.colors.onSurfaceTertiary,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "700",
  },
  sumValue: {
    color: theme.colors.brand,
    fontFamily: theme.fonts.serif,
    fontSize: 36,
    fontWeight: "700",
  },
  critText: {
    color: theme.colors.brand,
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontStyle: "italic",
    marginTop: theme.spacing.sm,
  },
  rollBtn: {
    marginHorizontal: theme.spacing.xl,
    height: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    shadowColor: theme.colors.brand,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  rollBtnText: {
    color: theme.colors.onBrand,
    fontFamily: theme.fonts.sans,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  sectionLabel: {
    color: theme.colors.brand,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
    textTransform: "uppercase",
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  countRow: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  countChip: {
    minWidth: 52,
    height: 40,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  countChipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  countChipText: {
    color: theme.colors.onSurfaceSecondary,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: "600",
  },
  countChipTextActive: {
    color: theme.colors.onBrand,
    fontWeight: "700",
  },
  dieGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  dieCell: {
    width: "22%",
    aspectRatio: 0.9,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    gap: 4,
  },
  dieCellActive: {
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.brandTertiary,
  },
  dieCellLabel: {
    color: theme.colors.onSurfaceSecondary,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: "600",
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: theme.spacing.xl,
  },
  clearBtn: {
    color: theme.colors.onSurfaceTertiary,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  emptyHistory: {
    color: theme.colors.onSurfaceTertiary,
    fontFamily: theme.fonts.serif,
    fontSize: 14,
    fontStyle: "italic",
    paddingHorizontal: theme.spacing.xl,
  },
  historyList: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyShape: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  historyDie: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontWeight: "600",
  },
  historyTime: {
    color: theme.colors.onSurfaceTertiary,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    marginTop: 2,
  },
  historyValue: {
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    fontWeight: "700",
    minWidth: 48,
    textAlign: "right",
  },
});
