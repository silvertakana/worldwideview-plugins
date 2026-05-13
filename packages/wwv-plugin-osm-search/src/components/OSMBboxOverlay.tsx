import React, { useEffect, useMemo } from "react";
import { Color, Cartesian3, Rectangle, ArcType, ClassificationType } from "cesium";
import { Entity, PolylineGraphics, CustomDataSource } from "resium";
import { useOsmStore } from "../store";

export function OSMBboxOverlay({ viewer, enabled }: { viewer: any; enabled: boolean }) {
    const { bboxLocked, showBbox, lockedBbox, currentBbox, setCurrentBbox } = useOsmStore();

    useEffect(() => {
        if (!viewer || !enabled) return;
        
        const updateBbox = () => {
             if (bboxLocked) return;
             const rect = viewer.camera.computeViewRectangle(viewer.scene.globe.ellipsoid);
             if (rect) {
                 const marginLat = (rect.north - rect.south) * 0.15;
                 const marginLon = (rect.east - rect.west) * 0.15;
                 setCurrentBbox(new Rectangle(
                     rect.west + marginLon, rect.south + marginLat,
                     rect.east - marginLon, rect.north - marginLat
                 ));
             }
        };

        viewer.camera.changed.addEventListener(updateBbox);
        viewer.camera.moveEnd.addEventListener(updateBbox);
        
        updateBbox();

        const initInterval = setInterval(updateBbox, 100);
        const timeout = setTimeout(() => clearInterval(initInterval), 2000);
        
        return () => {
            clearInterval(initInterval);
            clearTimeout(timeout);
            if (viewer && !viewer.isDestroyed()) {
                viewer.camera.changed.removeEventListener(updateBbox);
                viewer.camera.moveEnd.removeEventListener(updateBbox);
            }
        };
    }, [viewer, enabled, bboxLocked, setCurrentBbox]);

    const activeBbox = bboxLocked ? lockedBbox : currentBbox;

    const positions = useMemo(() => {
        if (!activeBbox) return [];
        return Cartesian3.fromRadiansArray([
            activeBbox.west, activeBbox.south,
            activeBbox.east, activeBbox.south,
            activeBbox.east, activeBbox.north,
            activeBbox.west, activeBbox.north,
            activeBbox.west, activeBbox.south,
        ]);
    }, [activeBbox]);

    if (!enabled || !activeBbox || !showBbox) return null;

    return (
        <CustomDataSource name="OSMSearchBBox">
            <Entity
                rectangle={{
                    coordinates: activeBbox,
                    fill: true,
                    material: Color.RED.withAlpha(0.25),
                    classificationType: ClassificationType.BOTH
                }}
            >
                <PolylineGraphics
                    positions={positions}
                    width={3}
                    material={Color.RED}
                    depthFailMaterial={Color.RED.withAlpha(0.7)}
                    clampToGround={true}
                    arcType={ArcType.RHUMB}
                />
            </Entity>
        </CustomDataSource>
    );
}
