import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../config/firebase";

interface FamilyData {
  familyId: string | null;
  familyName: string | null;
  aiName: string | null;
  loading: boolean;
}

export function useFamily(): FamilyData {
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [aiName, setAiName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFamily = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const fid = userData.familyId;
          setFamilyId(fid);

          if (fid) {
            const familyDoc = await getDoc(doc(db, "families", fid));
            if (familyDoc.exists()) {
              const familyData = familyDoc.data();
              setFamilyName(familyData.name);
              setAiName(familyData.aiName || "Noo");
            }
          }
        }
      } catch (error) {
        console.error("Error fetching family:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFamily();
  }, []);

  return { familyId, familyName, aiName, loading };
}
