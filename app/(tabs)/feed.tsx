import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { auth } from "../../src/config/firebase";
import { useFamily } from "../../src/hooks/useFamily";
import { askClaude } from "../../src/services/ai";

export default function Feed() {
  const router = useRouter();
  const { familyName, aiName } = useFamily();
  const userName = auth.currentUser?.displayName || "vous";
  const [tip, setTip] = useState("");
  const [tipLoading, setTipLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await askClaude(
          "Propose une idee concrete et chaleureuse pour creer du lien en famille aujourd'hui. 2 phrases max.",
          "Famille " + (familyName || "NOO")
        );
        setTip(t);
      } catch {
        setTip("Prenez un moment ensemble aujourd'hui !");
      } finally {
        setTipLoading(false);
      }
    })();
  }, []);

  const TILES = [
    { route: "/(tabs)/reading", emoji: "📚", title: "Lecture", sub: "Decouvrir, lire, partager", color: "#D0EDE9", iconBg: "#2A7C6F" },
    { route: "/(tabs)/chat", emoji: "💬", title: "Messages", sub: "Parler en famille", color: "#D6EAF8", iconBg: "#5B8FA8" },
    { route: "/(tabs)/challenges", emoji: "🏆", title: "Defis", sub: "Activites ensemble", color: "#FEF3C7", iconBg: "#C9933A" },
    { route: "/(tabs)/ai", emoji: "🤖", title: aiName || "Noo", sub: "Votre assistant", color: "#D0EDE9", iconBg: "#1F5C52" },
    { route: "/(tabs)/gallery", emoji: "🖼️", title: "Souvenirs", sub: "Notre histoire", color: "#EDE8F4", iconBg: "#8B7BA8" },
    { route: "/(tabs)/profile", emoji: "👤", title: "Profil", sub: "Mon compte", color: "#EEEBE8", iconBg: "#6B6560" },
  ];

  return (
    <View style={styles.container}>
      {/* Hero header */}
      <View style={styles.hero}>
        <View style={styles.heroCircle1} />
        <View style={styles.heroCircle2} />
        <View style={styles.heroInner}>
          <Text style={styles.heroLabel}>Bonjour 👋</Text>
          <Text style={styles.heroTitle}>{familyName || "Ma famille"}</Text>

          {/* AI tip */}
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Text style={{ fontSize: 16 }}>{tipLoading ? "⟳" : "🤖"}</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipLabel}>{aiName || "Noo"} · Idee du jour</Text>
              <Text style={styles.tipText}>{tipLoading ? "Je reflechis pour vous..." : tip}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quick actions - 2 big tiles */}
        <View style={styles.row}>
          {TILES.slice(0, 2).map((t) => (
            <TouchableOpacity
              key={t.route}
              style={[styles.tileBig, { backgroundColor: t.color }]}
              onPress={() => router.push(t.route as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.tileIconBig, { backgroundColor: t.iconBg }]}>
                <Text style={styles.tileIconText}>{t.emoji}</Text>
              </View>
              <Text style={styles.tileBigTitle}>{t.title}</Text>
              <Text style={styles.tileBigSub}>{t.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 2 more tiles */}
        <View style={styles.row}>
          {TILES.slice(2, 4).map((t) => (
            <TouchableOpacity
              key={t.route}
              style={[styles.tileBig, { backgroundColor: t.color }]}
              onPress={() => router.push(t.route as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.tileIconBig, { backgroundColor: t.iconBg }]}>
                <Text style={styles.tileIconText}>{t.emoji}</Text>
              </View>
              <Text style={styles.tileBigTitle}>{t.title}</Text>
              <Text style={styles.tileBigSub}>{t.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Last 2 tiles */}
        <View style={styles.row}>
          {TILES.slice(4, 6).map((t) => (
            <TouchableOpacity
              key={t.route}
              style={[styles.tileSmall, { backgroundColor: t.color }]}
              onPress={() => router.push(t.route as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.tileIconSmall, { backgroundColor: t.iconBg }]}>
                <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
              </View>
              <Text style={styles.tileSmallTitle}>{t.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBF7F2" },

  // Hero
  hero: {
    backgroundColor: "#2A7C6F",
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    paddingBottom: 24,
    paddingHorizontal: 22,
    position: "relative",
    overflow: "hidden",
  },
  heroCircle1: {
    position: "absolute", top: -30, right: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  heroCircle2: {
    position: "absolute", bottom: -20, left: -10,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  heroInner: { position: "relative" },
  heroLabel: {
    fontSize: 12, color: "rgba(255,255,255,0.6)",
    fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26, color: "#fff", fontWeight: "800",
    fontStyle: "italic", marginBottom: 14,
  },

  // Tip
  tipCard: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 18, padding: 12,
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  tipIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  tipContent: { flex: 1 },
  tipLabel: {
    fontSize: 10, color: "rgba(255,255,255,0.6)",
    fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6,
    marginBottom: 3,
  },
  tipText: { fontSize: 13, color: "rgba(255,255,255,0.9)", lineHeight: 20 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 18, gap: 14, paddingBottom: 30 },

  // Row
  row: { flexDirection: "row", gap: 14 },

  // Big tile
  tileBig: {
    flex: 1, borderRadius: 24, padding: 18,
    minHeight: 150, justifyContent: "space-between",
  },
  tileIconBig: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  tileIconText: { fontSize: 24 },
  tileBigTitle: {
    fontSize: 18, fontWeight: "800", color: "#2C1F14", marginTop: 14,
  },
  tileBigSub: { fontSize: 12, color: "#7A6055", marginTop: 2 },

  // Small tile
  tileSmall: {
    flex: 1, borderRadius: 20, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
    minHeight: 64,
  },
  tileIconSmall: {
    width: 40, height: 40, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  tileSmallTitle: { fontSize: 15, fontWeight: "800", color: "#2C1F14" },
});
