import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { PlaylistDetailView } from "@/components/playlist-detail-view";
import type { PlaylistRow } from "@/lib/playlists";
import type { SongRow } from "@/lib/songs";
import { supabaseWithSession } from "@/lib/supabase-server";

const getPlaylist = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await supabaseWithSession();
  const { data } = await supabase
    .from("playlists")
    .select(
      "id,name,description,genre,genre_other,rating_like,rating_difficulty,created_at",
    )
    .eq("id", id)
    .single<PlaylistRow>();
  return data;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const playlist = await getPlaylist(id);
  return {
    title: playlist ? `${playlist.name} — Yuthikal AudioTech` : "Yuthikal AudioTech",
  };
}

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseWithSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const playlist = await getPlaylist(id);
  if (!playlist) notFound();

  const { data: songs } = await supabase
    .from("songs")
    .select("id,playlist_id,name,description,key_note,content,created_at")
    .eq("playlist_id", id)
    .order("created_at")
    .returns<SongRow[]>();

  return <PlaylistDetailView playlist={playlist} songs={songs ?? []} />;
}
