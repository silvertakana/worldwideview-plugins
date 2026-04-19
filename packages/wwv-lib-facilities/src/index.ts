import { 
    createSvgIconUrl,
    type WorldPlugin, 
    type GeoEntity, 
    type TimeRange, 
    type PluginContext, 
    type LayerConfig, 
    type CesiumEntityOptions, 
    type ServerPluginConfig,
    type PluginCategory
} from "@worldwideview/wwv-plugin-sdk";

interface RepPoint {
    lat: number;
    lon: number;
    alt?: number;
}

function representativePoint(geom: any): RepPoint {
    switch (geom.type) {
        case "Point": {
            const [lon, lat, alt] = geom.coordinates;
            return { lat, lon, ...(alt !== undefined ? { alt } : {}) };
        }
        case "MultiPoint":
        case "LineString": {
            const first = geom.coordinates[0] as number[];
            return { lat: first[1], lon: first[0] };
        }
        case "Polygon":
        case "MultiLineString": {
            const ring = geom.coordinates[0] as number[][];
            return { lat: ring[0][1], lon: ring[0][0] };
        }
        case "MultiPolygon": {
            const poly = geom.coordinates[0] as number[][][];
            return { lat: poly[0][0][1], lon: poly[0][0][0] };
        }
        default:
            return { lat: 0, lon: 0 };
    }
}

function featureToEntity(
    feature: any,
    pluginId: string,
    index: number
): GeoEntity {
    const point = representativePoint(feature.geometry);
    const featureId = feature.id ?? index;

    return {
        id: `${pluginId}-${featureId}`,
        pluginId,
        latitude: point.lat,
        longitude: point.lon,
        altitude: point.alt,
        timestamp: new Date(),
        label: (feature.properties.name as string) ?? undefined,
        properties: {
            ...feature.properties,
            _geometryType: feature.geometry.type,
        },
    };
}

export abstract class BaseFacilityPlugin implements WorldPlugin {
    abstract id: string;
    abstract name: string;
    abstract description: string;
    abstract icon: any;
    abstract category: PluginCategory;
    abstract version: string;
    
    protected context: PluginContext | null = null;
    protected iconUrls: Record<string, string> = {};
    
    // Configurable rendering defaults
    protected defaultLayerColor = "#3b82f6";
    protected clusterDistance = 50;
    protected maxEntities = 5000;
    protected iconScale = 1.0;
    
    // Extended plugins can provide embedded geojson data here
    protected geojsonData: any = null;
    
    async initialize(ctx: PluginContext): Promise<void> { this.context = ctx; }
    destroy(): void { this.context = null; }

    async fetch(_timeRange: TimeRange): Promise<GeoEntity[]> { 
        if (!this.geojsonData || !this.geojsonData.features) {
            return [];
        }
        return this.geojsonData.features.map((feature: any, i: number) => 
            featureToEntity(feature, this.id, i)
        );
    }
    getPollingInterval(): number { return 0; }

    getLayerConfig(): LayerConfig {
        return { 
            color: this.defaultLayerColor, 
            clusterEnabled: true, 
            clusterDistance: this.clusterDistance,
            maxEntities: this.maxEntities
        };
    }

    protected getEntityColor(entity: GeoEntity): string {
        return this.defaultLayerColor;
    }

    protected getEntityIcon(entity: GeoEntity): any {
        return this.icon;
    }

    renderEntity(entity: GeoEntity): CesiumEntityOptions {
        const color = this.getEntityColor(entity);
        const iconComponent = this.getEntityIcon(entity);
        
        const cacheKey = `${iconComponent?.displayName || iconComponent?.name || "default"}-${color}`;
        
        if (!this.iconUrls[cacheKey]) {
            this.iconUrls[cacheKey] = createSvgIconUrl(iconComponent, { color });
        }

        return {
            type: "billboard", 
            iconUrl: this.iconUrls[cacheKey], 
            color: color,
            iconScale: this.iconScale
        };
    }

}
