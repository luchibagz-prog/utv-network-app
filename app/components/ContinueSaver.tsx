"use client";

import { useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function ContinueSaver({ uploadId }: { uploadId: string }) {
  useEffect(() => {
    const saveStarted = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("continue_watching").insert({
        user_id: user?.id || null,
        upload_id: uploadId,
        progress: 1,
        duration: 100,
      });
    };

    saveStarted();
  }, [uploadId]);

  return null;
}