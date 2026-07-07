import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PlaylistsView } from "@/components/playlists-view";
import type { PlaylistRow } from "@/lib/playlists";
import { supabaseWithSession } from "@/lib/supabase-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("playlists");
  return { title: `${t("title")} — Yuthikal AudioTech` };
}

export default async function PlaylistsPage() {
  const supabase = await supabaseWithSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: playlists, error } = await supabase
    .from("playlists")
    .select(
      "id,name,description,genre,genre_other,rating_like,rating_difficulty,created_at,songs(count)",
    )
    .order("created_at", { ascending: false })
    .returns<(PlaylistRow & { songs: { count: number }[] })[]>();

  if (error) throw new Error(error.message);

  const withCount = (playlists ?? []).map(({ songs, ...p }) => ({
    ...p,
    songs_count: songs[0]?.count ?? 0,
  }));

  return <PlaylistsView playlists={withCount} />;
}
