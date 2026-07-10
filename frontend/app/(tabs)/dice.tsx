import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useRef, useState } from "react";
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

const DICE: { sides: DieSides; label: string }[] = [
  { sides: 4, label: "d4" },
  { sides: 6, label: "d6" },
  { sides: 8, label: "d8" },
  { sides: 10, label: "d10" },
  { sides: 12, label: "d12" },
  { sides: 20, label: "d20" },
  { sides: 100, label: "d100" },
];

interface RollEntry {
  id: string;
  sides: DieSides;
  value: number;
  timestamp: number;
}

function rollDie(sides: DieSides): number {
  // d100 = percentile: 1-100
  return Math.floor(Math.random() * sides) + 1;
}

export default function DiceScreen() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<DieSides>(20);
  const [current, setCurrent] = useState<number | null>(null);
  const [history, setHistory] = useState<RollEntry[]>([]);
  const [rolling, setRolling] = useState(false);
  const rollingCounter = useRef(0);

  // Animated tumble
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  const roll = useCallback(() => {
    if (rolling) return;
    setRolling(true);
    rollingCounter.current += 1;
    const myRun = rollingCounter.current;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Show shuffling numbers during the tumble
    const shuffleInterval = setInterval(() => {
      setCurrent(rollDie(selected));
    }, 60);

    // Animate: tumble with random rotation, scale bump
    rotate.value = 0;
    rotate.value = withSequence(
      withTiming(360 + Math.random() * 360, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      }),
    );
    scale.value = withSequence(
      withTiming(1.15, { duration: 300, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 400, easing: Easing.inOut(Easing.quad) }),
    );

    setTimeout(() => {
      clearInterval(shuffleInterval);
      // If a newer roll happened, skip finalizing this one
      if (myRun !== rollingCounter.current) return;
      const finalValue = rollDie(selected);
      setCurrent(finalValue);
      Haptics.notificationAsync(
        finalValue === selected
          ? Haptics.NotificationFeedbackType.Success
          : finalValue === 1
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
      setHistory((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          sides: selected,
          value: finalValue,
          timestamp: Date.now(),
        },
        ...prev.slice(0, 19),
      ]);
      setRolling(false);
    }, 750);
  }, [rolling, rotate, scale, selected]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const critMessage = (() => {
    if (current === null || rolling) return null;
    if (selected === 20 && current === 20) return "🔥 Successo Critico!";
    if (selected === 20 && current === 1) return "💀 Fallimento Critico";
    if (current === selected) return "✨ Massimo!";
    if (current === 1 && selected !== 4) return "⚠️ Minimo";
    return null;
  })();

  return (
    <View style={styles.container} testID="dice-screen">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
          <Text style={styles.title}>Dadi</Text>
          <Text style={styles.subtitle}>Tocca un dado per lanciarlo</Text>
        </View>

        {/* Big central display */}
        <View style={styles.stage}>
          <Animated.View style={[styles.stageDie, animatedStyle]}>
            <DieShape
              sides={selected}
              size={200}
              value={current ?? undefined}
            />
          </Animated.View>
          <Text style={styles.stageLabel}>d{selected}</Text>
          {critMessage && (
            <Text
              style={[
                styles.critText,
                current === 1 && selected === 20 && { color: theme.colors.onError },
              ]}
              testID="crit-message"
            >
              {critMessage}
            </Text>
          )}
        </View>

        {/* Big roll button */}
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
            {rolling ? "Lanciando..." : `Lancia d${selected}`}
          </Text>
        </Pressable>

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
                  setCurrent(null);
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
                  size={56}
                  color={active ? theme.colors.brand : theme.colors.surfaceTertiary}
                  strokeColor={
                    active ? theme.colors.brandSecondary : theme.colors.borderStrong
                  }
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
                  <DieShape
                    sides={h.sides}
                    size={40}
                    color={theme.colors.surfaceTertiary}
                    strokeColor={theme.colors.borderStrong}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyDie}>d{h.sides}</Text>
                  <Text style={styles.historyTime}>
                    {new Date(h.timestamp).toLocaleTimeString("it-IT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.historyValue,
                    h.sides === 20 && h.value === 20 && { color: theme.colors.brand },
                    h.sides === 20 && h.value === 1 && { color: theme.colors.onError },
                  ]}
                >
                  {h.value}
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
    paddingVertical: theme.spacing.xxl,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 320,
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
