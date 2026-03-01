declare module 'genius-lyrics-api' {
    interface Song {
        id: number;
        title: string;
        url: string;
        lyrics: string;
        albumArt: string;
    }

    export function getSongById(id: number, accessToken: string): Promise<Song | null>;
    export function getLyrics(optionsOrUrl: string | { apiKey: string; title: string; artist: string; optimizeQuery?: boolean }): Promise<string | null>;
    export function getSong(options: { apiKey: string; title: string; artist: string; optimizeQuery?: boolean }): Promise<Song | null>;
    export function searchSong(options: { apiKey: string; title: string; artist: string; optimizeQuery?: boolean }): Promise<Array<{ id: number; url: string; title: string; albumArt: string }> | null>;
}
