"use client";
import { useEffect } from "react";
import { useChinaContext } from "@/lib/ChinaContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ChinaContextInitializer() {
  const { setChina } = useChinaContext();

  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) return;
      const userId = data.user.id;
      const userEmail = data.user.email || "";
      let chinaName = "";
      let chinaRole = "";
      let userImage = "";
      try {
        const { data: chinaData } = await supabase
          .from("employees")
          .select("name")
          .eq("user_id", userId)
          .maybeSingle();
        chinaName = chinaData?.name || "";
        const { data: levelData } = await supabase
          .from("userlevel")
          .select("user_level, user_image")
          .eq("id", userId)
          .maybeSingle();
        chinaRole = levelData?.user_level || "";
        userImage = levelData?.user_image || "";
      } catch { }
      setChina({ chinaId: userId, chinaName, chinaEmail: userEmail, chinaRole, userImage });
    };
    fetchUserData();
  }, [setChina]);

  return null;
}
