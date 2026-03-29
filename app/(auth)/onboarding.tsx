import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../src/config/firebase";
import { showAlert } from "../../src/utils/alert";

type Step = "family" | "members" | "ai_name" | "rgpd" | "done";

interface FamilyMember {
  id: string;
  name: string;
  age: string;
  role: "parent" | "enfant" | "grand-parent" | "autre";
}

const aiNameSuggestions = {
  "Chaleureux": ["Léon", "Alma", "Jules", "Rose", "Félix", "Élise"],
  "Lumineux": ["Noor", "Lumi", "Sol", "Clair", "Lucie", "Aube"],
  "Poétiques": ["Écho", "Sage", "Zéphyr", "Milo", "Fée", "Flo"],
  "Drôles": ["Coco", "Bulle", "Pip", "Zap", "Doudou", "Pom"],
};

const roleLabels: Record<FamilyMember["role"], string> = {
  parent: "👨‍👩‍👧 Parent",
  enfant: "👶 Enfant",
  "grand-parent": "👴 Grand-parent",
  autre: "👤 Autre",
};

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("family");
  const [familyName, setFamilyName] = useState("");
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberAge, setNewMemberAge] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<FamilyMember["role"]>("enfant");
  const [aiName, setAiName] = useState("");
  const [customAiName, setCustomAiName] = useState("");
  const [rgpdConsent, setRgpdConsent] = useState(false);
  const [parentalConsent, setParentalConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasMinors = members.some((m) => {
    const age = parseInt(m.age);
    return !isNaN(age) && age < 15;
  });

  const addMember = () => {
    if (!newMemberName.trim() || !newMemberAge.trim()) {
      showAlert("Erreur", "Renseignez le prénom et l'âge");
      return;
    }
    setMembers((prev) => [
      ...prev,
      {
        id: `member_${Date.now()}`,
        name: newMemberName.trim(),
        age: newMemberAge.trim(),
        role: newMemberRole,
      },
    ]);
    setNewMemberName("");
    setNewMemberAge("");
    setNewMemberRole("enfant");
  };

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const finishOnboarding = async () => {
    const chosenName = aiName || customAiName.trim();
    if (!chosenName) {
      showAlert("Erreur", "Choisissez un prénom pour votre IA familiale");
      return;
    }
    if (!rgpdConsent) {
      showAlert("Erreur", "Veuillez accepter la politique de confidentialité");
      return;
    }
    if (hasMinors && !parentalConsent) {
      showAlert("Erreur", "Le consentement parental est requis pour les mineurs de 15 ans");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Non connecté");

      const familyId = `family_${user.uid}`;
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      await setDoc(doc(db, "families", familyId), {
        name: familyName,
        createdBy: user.uid,
        inviteCode,
        aiName: chosenName,
        memberIds: [user.uid],
        rgpdConsent: true,
        parentalConsent: hasMinors ? true : null,
        createdAt: new Date(),
      });

      // Create member profiles
      for (const member of members) {
        const memberId = `${familyId}_member_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await setDoc(doc(db, "families", familyId, "members", memberId), {
          name: member.name,
          age: parseInt(member.age),
          role: member.role,
          preferences: [],
          readingHistory: [],
          createdAt: new Date(),
        });
      }

      // Update user doc with familyId
      await setDoc(doc(db, "users", user.uid), {
        displayName: user.displayName,
        email: user.email,
        familyId,
        role: "admin",
        createdAt: new Date(),
      }, { merge: true });

      router.replace("/(tabs)/feed");
    } catch (err: any) {
      showAlert("Erreur", err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Progress */}
      <View style={styles.progress}>
        {["family", "members", "ai_name", "rgpd"].map((s, i) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              (step === s || ["family", "members", "ai_name", "rgpd"].indexOf(step) > i) && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {/* Step 1: Family Name */}
      {step === "family" && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepEmoji}>🏠</Text>
          <Text style={styles.stepTitle}>Bienvenue dans NOO !</Text>
          <Text style={styles.stepSubtitle}>Comment s'appelle votre famille ?</Text>

          <TextInput
            style={styles.input}
            placeholder="Ex : Famille Dupont"
            value={familyName}
            onChangeText={setFamilyName}
          />

          <TouchableOpacity
            style={[styles.nextButton, !familyName.trim() && styles.nextButtonDisabled]}
            onPress={() => familyName.trim() && setStep("members")}
            disabled={!familyName.trim()}
          >
            <Text style={styles.nextButtonText}>Suivant</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2: Members */}
      {step === "members" && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepEmoji}>👨‍👩‍👧‍👦</Text>
          <Text style={styles.stepTitle}>Qui fait partie de la famille ?</Text>
          <Text style={styles.stepSubtitle}>
            Ajoutez les membres — vous pourrez en ajouter d'autres plus tard
          </Text>

          {/* Member list */}
          {members.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberInfo}>
                  {member.age} ans — {roleLabels[member.role]}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeMember(member.id)}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Add member form */}
          <View style={styles.addMemberForm}>
            <TextInput
              style={styles.inputSmall}
              placeholder="Prénom"
              value={newMemberName}
              onChangeText={setNewMemberName}
            />
            <TextInput
              style={[styles.inputSmall, { width: 80 }]}
              placeholder="Âge"
              value={newMemberAge}
              onChangeText={setNewMemberAge}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.roleRow}>
            {(Object.keys(roleLabels) as FamilyMember["role"][]).map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.roleChip, newMemberRole === role && styles.roleChipActive]}
                onPress={() => setNewMemberRole(role)}
              >
                <Text style={[styles.roleChipText, newMemberRole === role && styles.roleChipTextActive]}>
                  {roleLabels[role]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.addButton} onPress={addMember}>
            <Text style={styles.addButtonText}>+ Ajouter ce membre</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextButton, { marginTop: 20 }]}
            onPress={() => setStep("ai_name")}
          >
            <Text style={styles.nextButtonText}>
              {members.length === 0 ? "Passer pour l'instant" : "Suivant"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 3: AI Name */}
      {step === "ai_name" && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepEmoji}>🤖</Text>
          <Text style={styles.stepTitle}>Nommez votre IA familiale</Text>
          <Text style={styles.stepSubtitle}>
            Choisissez ensemble ! Ce sera le prénom de votre assistant dans NOO.
          </Text>

          {Object.entries(aiNameSuggestions).map(([category, names]) => (
            <View key={category}>
              <Text style={styles.categoryLabel}>{category}</Text>
              <View style={styles.nameGrid}>
                {names.map((name) => (
                  <TouchableOpacity
                    key={name}
                    style={[styles.nameChip, aiName === name && styles.nameChipActive]}
                    onPress={() => { setAiName(name); setCustomAiName(""); }}
                  >
                    <Text style={[styles.nameChipText, aiName === name && styles.nameChipTextActive]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          <Text style={styles.categoryLabel}>Ou choisissez le vôtre</Text>
          <TextInput
            style={styles.input}
            placeholder="Prénom libre..."
            value={customAiName}
            onChangeText={(t) => { setCustomAiName(t); setAiName(""); }}
          />

          <TouchableOpacity
            style={[styles.nextButton, !(aiName || customAiName.trim()) && styles.nextButtonDisabled]}
            onPress={() => (aiName || customAiName.trim()) && setStep("rgpd")}
            disabled={!(aiName || customAiName.trim())}
          >
            <Text style={styles.nextButtonText}>Suivant</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 4: RGPD */}
      {step === "rgpd" && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepEmoji}>🔒</Text>
          <Text style={styles.stepTitle}>Protection de vos données</Text>
          <Text style={styles.stepSubtitle}>
            NOO respecte votre vie privée. Rien ne sort de votre espace famille.
          </Text>

          <View style={styles.rgpdInfo}>
            <Text style={styles.rgpdItem}>✅ Vos données restent privées et chiffrées</Text>
            <Text style={styles.rgpdItem}>✅ Aucune conversation IA n'est stockée</Text>
            <Text style={styles.rgpdItem}>✅ Vous pouvez supprimer votre compte à tout moment</Text>
            <Text style={styles.rgpdItem}>✅ Aucun partage avec des tiers</Text>
          </View>

          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setRgpdConsent(!rgpdConsent)}
          >
            <View style={[styles.checkBox, rgpdConsent && styles.checkBoxChecked]}>
              {rgpdConsent && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.checkLabel}>
              J'accepte la politique de confidentialité de NOO
            </Text>
          </TouchableOpacity>

          {hasMinors && (
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setParentalConsent(!parentalConsent)}
            >
              <View style={[styles.checkBox, parentalConsent && styles.checkBoxChecked]}>
                {parentalConsent && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>
                Je suis le parent ou tuteur légal et j'autorise la création des profils enfants de moins de 15 ans
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.nextButton, styles.finishButton, loading && styles.nextButtonDisabled]}
            onPress={finishOnboarding}
            disabled={loading}
          >
            <Text style={styles.nextButtonText}>
              {loading ? "Création en cours..." : `Lancer NOO avec ${aiName || customAiName} ! 🚀`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  scrollContent: { padding: 24, paddingBottom: 60 },

  // Progress
  progress: { flexDirection: "row", justifyContent: "center", marginBottom: 30 },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 6,
  },
  progressDotActive: { backgroundColor: "#6C63FF", width: 24 },

  // Step
  stepContainer: { alignItems: "center" },
  stepEmoji: { fontSize: 56, marginBottom: 12 },
  stepTitle: { fontSize: 26, fontWeight: "bold", color: "#333", textAlign: "center", marginBottom: 8 },
  stepSubtitle: { fontSize: 15, color: "#888", textAlign: "center", marginBottom: 28, lineHeight: 22 },

  // Input
  input: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    width: "100%",
    marginBottom: 16,
  },
  inputSmall: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    flex: 1,
    marginRight: 8,
  },

  // Button
  nextButton: {
    backgroundColor: "#6C63FF",
    paddingVertical: 16,
    borderRadius: 30,
    width: "100%",
    alignItems: "center",
  },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  finishButton: { backgroundColor: "#4CAF50" },

  // Members
  memberCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    width: "100%",
  },
  memberName: { fontSize: 16, fontWeight: "600", color: "#333" },
  memberInfo: { fontSize: 13, color: "#888", marginTop: 2 },
  removeText: { fontSize: 18, color: "#FF4757", padding: 8 },

  addMemberForm: { flexDirection: "row", width: "100%", marginBottom: 10 },
  roleRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginBottom: 10 },
  roleChip: {
    backgroundColor: "#F0F0F0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    margin: 4,
  },
  roleChipActive: { backgroundColor: "#6C63FF" },
  roleChipText: { fontSize: 13, color: "#666" },
  roleChipTextActive: { color: "#fff" },

  addButton: {
    borderWidth: 2,
    borderColor: "#6C63FF",
    borderStyle: "dashed",
    paddingVertical: 12,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
  },
  addButtonText: { color: "#6C63FF", fontSize: 15, fontWeight: "600" },

  // AI Name
  categoryLabel: { fontSize: 14, fontWeight: "600", color: "#888", marginTop: 16, marginBottom: 8, alignSelf: "flex-start" },
  nameGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start", width: "100%" },
  nameChip: {
    backgroundColor: "#F0EEFF",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    margin: 4,
  },
  nameChipActive: { backgroundColor: "#6C63FF" },
  nameChipText: { fontSize: 15, color: "#6C63FF", fontWeight: "500" },
  nameChipTextActive: { color: "#fff" },

  // RGPD
  rgpdInfo: {
    backgroundColor: "#F0FFF0",
    borderRadius: 16,
    padding: 18,
    width: "100%",
    marginBottom: 20,
  },
  rgpdItem: { fontSize: 14, color: "#555", lineHeight: 28 },
  checkbox: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    marginBottom: 16,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CCC",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkBoxChecked: { backgroundColor: "#6C63FF", borderColor: "#6C63FF" },
  checkMark: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  checkLabel: { flex: 1, fontSize: 14, color: "#555", lineHeight: 20 },
});
