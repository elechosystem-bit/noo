import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, TextInput, Modal } from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { auth, db } from "../../src/config/firebase";
import { useFamily } from "../../src/hooks/useFamily";
import { showAlert } from "../../src/utils/alert";

interface Member {
  id: string;
  name: string;
  age: number;
  role: string;
}

export default function Profile() {
  const router = useRouter();
  const user = auth.currentUser;
  const { familyId, familyName, aiName } = useFamily();
  const [members, setMembers] = useState<Member[]>([]);
  const [booksCount, setBooksCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newRole, setNewRole] = useState("Enfant");
  const [saving, setSaving] = useState(false);

  // Load members and books count
  useEffect(() => {
    if (!familyId || !user) return;
    (async () => {
      try {
        const membersSnap = await getDocs(collection(db, "families", familyId, "members"));
        const m: Member[] = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Member));
        setMembers(m);

        const readingRef = doc(db, "users", user.uid, "readingProfile", "data");
        const readingSnap = await getDoc(readingRef);
        if (readingSnap.exists()) {
          const lib = readingSnap.data().library || [];
          setBooksCount(lib.filter((b: any) => b.status === "finished").length);
        }
      } catch (e) { console.error(e); }
    })();
  }, [familyId, user]);

  const addMember = async () => {
    if (!newName.trim() || !newAge.trim() || !familyId) return;
    setSaving(true);
    try {
      const memberId = "member_" + Date.now();
      await setDoc(doc(db, "families", familyId, "members", memberId), {
        name: newName.trim(),
        age: parseInt(newAge),
        role: newRole,
        preferences: [],
        createdAt: new Date().toISOString(),
      });
      setMembers((p) => [...p, { id: memberId, name: newName.trim(), age: parseInt(newAge), role: newRole }]);
      setNewName("");
      setNewAge("");
      setNewRole("Enfant");
      setShowAddModal(false);
    } catch (e: any) {
      showAlert("Erreur", e.message || "Impossible d'ajouter le membre");
    } finally { setSaving(false); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/");
  };

  const COLORS = ["#F9E4B7", "#C7E5F5", "#D5C5F0", "#B7EDD1", "#F5C5C5", "#FCE4B0"];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Family card */}
        <View style={styles.familyCard}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <Text style={{ fontSize: 52, marginBottom: 8 }}>🏡</Text>
          <Text style={styles.familyName}>{familyName || "Ma famille"}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}><Text style={styles.statNum}>{members.length + 1}</Text><Text style={styles.statLbl}>membres</Text></View>
            <View style={styles.stat}><Text style={styles.statNum}>{booksCount}</Text><Text style={styles.statLbl}>livres lus</Text></View>
            <View style={styles.stat}><Text style={styles.statNum}>NOO</Text><Text style={styles.statLbl}>ensemble</Text></View>
          </View>
        </View>

        {/* AI card */}
        <View style={styles.card}>
          <View style={styles.aiAvatar}><Text style={{ fontSize: 22 }}>🤖</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Notre assistant : {aiName || "Noo"}</Text>
            <Text style={styles.cardSub}>Apprend a connaitre votre famille</Text>
          </View>
        </View>

        {/* Members */}
        <Text style={styles.section}>MEMBRES</Text>

        {/* Current user */}
        <View style={styles.card}>
          <View style={[styles.memberAvatar, { backgroundColor: COLORS[0] }]}>
            <Text style={styles.memberLetter}>{user?.displayName?.[0]?.toUpperCase() || "?"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{user?.displayName || "Utilisateur"}</Text>
            <Text style={styles.cardSub}>{user?.email} · Admin</Text>
          </View>
        </View>

        {/* Other members */}
        {members.map((m, i) => (
          <View key={m.id} style={styles.card}>
            <View style={[styles.memberAvatar, { backgroundColor: COLORS[(i + 1) % COLORS.length] }]}>
              <Text style={styles.memberLetter}>{m.name[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{m.name}</Text>
              <Text style={styles.cardSub}>{m.role} · {m.age} ans</Text>
            </View>
          </View>
        ))}

        {/* Add member button */}
        <TouchableOpacity style={styles.inviteBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
          <Text style={styles.inviteBtnText}>+ Ajouter un membre</Text>
        </TouchableOpacity>

        {/* Premium */}
        <View style={styles.premium}>
          <View>
            <Text style={styles.premiumTitle}>NOO Premium</Text>
            <Text style={styles.premiumSub}>Tout debloquer · 6,99€/mois</Text>
          </View>
          <TouchableOpacity style={styles.premiumBtn} activeOpacity={0.85}>
            <Text style={styles.premiumBtnText}>Essayer</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Se deconnecter</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Add member modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>👨‍👩‍👧‍👦</Text>
            <Text style={styles.modalTitle}>Ajouter un membre</Text>

            <Text style={styles.label}>PRENOM</Text>
            <TextInput style={styles.input} placeholder="Prenom" placeholderTextColor="#B0978A" value={newName} onChangeText={setNewName} />

            <Text style={styles.label}>AGE</Text>
            <TextInput style={styles.input} placeholder="Age" placeholderTextColor="#B0978A" value={newAge} onChangeText={setNewAge} keyboardType="numeric" />

            <Text style={styles.label}>ROLE</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {["Parent", "Enfant", "Ado", "Grand-parent"].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleChip, newRole === r && styles.roleChipOn]}
                  onPress={() => setNewRole(r)}
                >
                  <Text style={[styles.roleChipText, newRole === r && styles.roleChipTextOn]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.btn, (!newName.trim() || !newAge.trim() || saving) && { opacity: 0.4 }]}
              onPress={addMember}
              disabled={!newName.trim() || !newAge.trim() || saving}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>{saving ? "Ajout..." : "Ajouter"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowAddModal(false)} style={{ padding: 14, marginTop: 4 }}>
              <Text style={{ color: "#B0978A", fontSize: 15 }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBF7F2" },
  scroll: { paddingTop: Platform.OS === "ios" ? 56 : 36, paddingHorizontal: 18, paddingBottom: 30 },

  familyCard: {
    backgroundColor: "#2A7C6F", borderRadius: 24, padding: 24, alignItems: "center",
    marginBottom: 18, position: "relative", overflow: "hidden",
  },
  circle1: { position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.06)" },
  circle2: { position: "absolute", bottom: -20, left: -10, width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.04)" },
  familyName: { fontSize: 24, fontWeight: "800", color: "#fff", fontStyle: "italic", marginBottom: 16 },
  statsRow: { flexDirection: "row", justifyContent: "center", gap: 28 },
  stat: { alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "900", color: "#fff" },
  statLbl: { fontSize: 11, color: "rgba(255,255,255,0.6)" },

  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 14, flexDirection: "row", gap: 12,
    alignItems: "center", marginBottom: 10, borderWidth: 1, borderColor: "rgba(107,78,61,0.08)",
    shadowColor: "rgba(44,31,20,0.06)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#2C1F14" },
  cardSub: { fontSize: 12, color: "#B0978A" },
  aiAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#D0EDE9", alignItems: "center", justifyContent: "center" },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  memberLetter: { fontSize: 18, fontWeight: "800", color: "#2C1F14" },

  section: { fontSize: 11, fontWeight: "800", color: "#B0978A", letterSpacing: 0.8, marginBottom: 10, marginTop: 10 },

  inviteBtn: { borderWidth: 2, borderColor: "rgba(107,78,61,0.12)", borderStyle: "dashed", borderRadius: 18, paddingVertical: 14, alignItems: "center", marginBottom: 20 },
  inviteBtnText: { fontSize: 14, fontWeight: "700", color: "#7A6055" },

  premium: { backgroundColor: "#78350F", borderRadius: 20, padding: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  premiumTitle: { fontSize: 15, fontWeight: "800", color: "#FEF3C7" },
  premiumSub: { fontSize: 12, color: "#FDE68A" },
  premiumBtn: { backgroundColor: "#FDE68A", borderRadius: 12, paddingVertical: 9, paddingHorizontal: 16 },
  premiumBtnText: { fontSize: 13, fontWeight: "900", color: "#78350F" },

  logoutBtn: { borderWidth: 2, borderColor: "#E8634A", borderRadius: 18, paddingVertical: 14, alignItems: "center" },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#E8634A" },

  // Modal
  modalBg: { flex: 1, backgroundColor: "rgba(44,31,20,0.6)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#FBF7F2", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 26, alignItems: "center" },
  modalTitle: { fontSize: 22, fontWeight: "800", color: "#2C1F14", marginBottom: 16 },

  label: { fontSize: 11, fontWeight: "800", color: "#B0978A", letterSpacing: 1, marginBottom: 6, alignSelf: "flex-start" },
  input: { backgroundColor: "#F5EFE6", padding: 14, borderRadius: 16, fontSize: 16, width: "100%", marginBottom: 12, color: "#2C1F14" },

  roleChip: { backgroundColor: "#F5EFE6", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14 },
  roleChipOn: { backgroundColor: "#2A7C6F" },
  roleChipText: { fontSize: 13, fontWeight: "700", color: "#7A6055" },
  roleChipTextOn: { color: "#fff" },

  btn: { backgroundColor: "#2A7C6F", paddingVertical: 16, borderRadius: 18, width: "100%", alignItems: "center", marginTop: 8, shadowColor: "rgba(42,124,111,0.35)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 20, elevation: 6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
