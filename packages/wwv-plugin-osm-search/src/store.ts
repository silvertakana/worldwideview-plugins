import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Rectangle } from "cesium";

interface OsmPluginState {
    bboxLocked: boolean;
    showBbox: boolean;
    currentBbox: Rectangle | null;
    lockedBbox: Rectangle | null;
    activeTags: string[];
    mode: "bellingcat" | "turbo";
    rawQuery: string;
    distance: number;
    setBboxLocked: (locked: boolean) => void;
    setShowBbox: (show: boolean) => void;
    setCurrentBbox: (rect: Rectangle | null) => void;
    setLockedBbox: (rect: Rectangle | null) => void;
    setActiveTags: (tags: string[] | ((prev: string[]) => string[])) => void;
    setMode: (mode: "bellingcat" | "turbo") => void;
    setRawQuery: (query: string) => void;
    setDistance: (distance: number) => void;
}

export const useOsmStore = create<OsmPluginState>()(
    persist(
        (set) => ({
            bboxLocked: false,
            showBbox: true,
            currentBbox: null,
            lockedBbox: null,
            activeTags: [],
            mode: "bellingcat",
            rawQuery: "[out:json];\nnode[amenity=cafe]({{bbox}});\nout center;",
            distance: 500,
            setBboxLocked: (locked) => set({ bboxLocked: locked }),
            setShowBbox: (show) => set({ showBbox: show }),
            setCurrentBbox: (rect) => set({ currentBbox: rect }),
            setLockedBbox: (rect) => set({ lockedBbox: rect }),
            setActiveTags: (tags) => set((state) => ({ activeTags: typeof tags === 'function' ? tags(state.activeTags) : tags })),
            setMode: (mode) => set({ mode }),
            setRawQuery: (rawQuery) => set({ rawQuery }),
            setDistance: (distance) => set({ distance }),
        }),
        {
            name: "wwv-osm-store",
            partialize: (state) => ({
                activeTags: state.activeTags,
                mode: state.mode,
                rawQuery: state.rawQuery,
                distance: state.distance,
            }),
        }
    )
);
