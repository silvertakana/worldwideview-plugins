import React, { useState } from "react";
import { Math as CesiumMath } from "cesium";
import { Eye, EyeOff } from "lucide-react";
import { useOsmStore } from "../store";

const COMMON_TAGS = [
    // Military & Security
    "military=base", "military=bunker", "amenity=police", "amenity=prison",
    // Aviation & Maritime
    "aeroway=aerodrome", "aeroway=helipad", "aeroway=hangar", "man_made=pier", "harbour=yes",
    // Infrastructure & Utilities
    "power=plant", "power=substation", "telecom=antenna", "man_made=communications_tower", "man_made=water_tower",
    // Transport
    "highway=bus_stop", "railway=station", "amenity=fuel", "amenity=parking",
    // Medical & Emergency
    "amenity=hospital", "amenity=fire_station", "amenity=clinic",
    // General Commercial & Industrial
    "shop=supermarket", "tourism=hotel", "industrial=factory", "landuse=industrial",
    // Education & Amenities
    "amenity=school", "amenity=university", "amenity=cafe", "building=house"
];

interface OSMSidebarProps {
    plugin?: any; // OSMSearchPlugin
}

export function OSMSidebar({ plugin }: OSMSidebarProps) {
    const { 
        bboxLocked, showBbox, setShowBbox, setBboxLocked, currentBbox, setLockedBbox, lockedBbox,
        activeTags, setActiveTags,
        mode, setMode,
        rawQuery, setRawQuery,
        distance, setDistance
    } = useOsmStore();
    
    const [searchText, setSearchText] = useState("");
    const [customTags, setCustomTags] = useState<string[]>([]);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [advKey, setAdvKey] = useState("");
    const [advOp, setAdvOp] = useState("=");
    const [advVal, setAdvVal] = useState("");

    React.useEffect(() => {
        try {
            const saved = localStorage.getItem("wwv_osm_custom_tags");
            if (saved) setCustomTags(JSON.parse(saved));
        } catch {}
    }, []);

    React.useEffect(() => {
        localStorage.setItem("wwv_osm_custom_tags", JSON.stringify(customTags));
    }, [customTags]);
    const [isScanning, setIsScanning] = useState(false);
    
    // Taginfo dynamic search states
    const [dynamicTags, setDynamicTags] = useState<string[]>([]);
    const [isSearchingApi, setIsSearchingApi] = useState(false);

    // Fetch dynamic tags when search text changes
    React.useEffect(() => {
        if (searchText.length < 3) {
            setDynamicTags([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingApi(true);
            try {
                const res = await fetch(`https://taginfo.openstreetmap.org/api/4/search/by_keyword?query=${encodeURIComponent(searchText)}`);
                const data = await res.json();
                if (data && data.data) {
                    const tags = data.data
                        .filter((item: any) => item.key && item.value)
                        .map((item: any) => `${item.key}=${item.value}`)
                        .slice(0, 15);
                    setDynamicTags(tags);
                }
            } catch (err) {
                console.error("Taginfo fetch failed", err);
            } finally {
                setIsSearchingApi(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchText]);
    
    const toggleLock = () => {
        if (!bboxLocked) {
            setLockedBbox(currentBbox);
            setBboxLocked(true);
        } else {
            setBboxLocked(false);
            setLockedBbox(null);
        }
    };

    const handleScan = async () => {
        if (!bboxLocked) {
            setLockedBbox(currentBbox);
            setBboxLocked(true);
        }
        
        const bboxParams = lockedBbox || currentBbox;
        if (!bboxParams) {
            alert("Please wait for map viewport to initialize");
            return;
        }

        // Overpass bbox order: south, west, north, east (in degrees)
        const s = CesiumMath.toDegrees(bboxParams.south).toFixed(6);
        const w = CesiumMath.toDegrees(bboxParams.west).toFixed(6);
        const n = CesiumMath.toDegrees(bboxParams.north).toFixed(6);
        const e = CesiumMath.toDegrees(bboxParams.east).toFixed(6);
        const bboxString = `${s},${w},${n},${e}`;

        let ql = "";
        if (mode === "turbo") {
            ql = rawQuery.replace(/{{bbox}}/g, bboxString);
        } else {
            // Bellingcat-style proximity search
            const filters = activeTags.map(tag => {
                let key, val, op = "=";
                if (tag.includes("@@")) {
                    const parts = tag.split("@@");
                    key = parts[0]; op = parts[1]; val = parts[2];
                } else if (tag.includes("=")) {
                    const parts = tag.split("=");
                    key = parts[0]; val = parts.slice(1).join("=");
                } else {
                    key = tag; op = "is_not_null"; val = "";
                }
                
                let filter = "";
                if (op === "=") filter = `["${key}"="${val}"]`;
                else if (op === "!=") filter = `["${key}"!="${val}"]`;
                else if (op === ">") filter = `["${key}"](if:number(t["${key}"]) > ${val})`;
                else if (op === "<") filter = `["${key}"](if:number(t["${key}"]) < ${val})`;
                else if (op === ">=") filter = `["${key}"](if:number(t["${key}"]) >= ${val})`;
                else if (op === "<=") filter = `["${key}"](if:number(t["${key}"]) <= ${val})`;
                else if (op === "starts_with") filter = `["${key}"~"^${val}"]`;
                else if (op === "ends_with") filter = `["${key}"~"${val}$"]`;
                else if (op === "contains") filter = `["${key}"~"${val}"]`;
                else if (op === "does_not_contain") filter = `["${key}"!~"${val}"]`;
                else if (op === "is_null") filter = `[!"${key}"]`;
                else if (op === "is_not_null") filter = `["${key}"]`;
                return filter;
            });

            if (activeTags.length === 1) {
                ql = `[out:json][timeout:25];\nnwr${filters[0]}(${bboxString});\nout center;`;
            } else if (activeTags.length > 1) {
                // Chain search: Find A, then find B near A, then find C near B...
                // Using .t0, .t1, .t2 as set names
                ql = `[out:json][timeout:25];\n`;
                
                filters.forEach((filter, idx) => {
                    if (idx === 0) {
                        ql += `nwr${filter}(${bboxString})->.t0;\n`;
                    } else {
                        ql += `nwr${filter}(around.t${idx - 1}:${distance})->.t${idx};\n`;
                    }
                });
                
                // Final output: the last set in the chain
                ql += `.t${activeTags.length - 1} out center;`;
            }
        }
        
        setIsScanning(true);
        try {
            const res = await fetch("/api/plugins/osm-search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: ql })
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Search failed");
            
            if (plugin?.pushResults && plugin?.mapOverpassToEntities) {
                const entities = plugin.mapOverpassToEntities(data.data || []);
                plugin.pushResults(entities);
            } else {
                console.warn("Plugin bridge not available in OSMSidebar", data.data);
            }
        } catch (err) {
            console.error(err);
            alert("Search failed: " + (err as Error).message);
        } finally {
            setIsScanning(false);
        }
    };

    // Combine filtered common tags with newly fetched dynamic tags, removing duplicates
    const filteredCommon = searchText 
        ? COMMON_TAGS.filter(t => t.toLowerCase().includes(searchText.toLowerCase())) 
        : COMMON_TAGS;
        
    const customTagMatch = searchText.includes("=") ? [searchText.trim()] : [];
        
    const renderedTags = Array.from(new Set([...filteredCommon, ...dynamicTags, ...customTagMatch, ...customTags]));

    const formatTag = (tag: string) => {
        if (tag.includes("@@")) {
            const [k, op, v] = tag.split("@@");
            const opLabel = op.replace(/_/g, " ");
            return op === "is_null" || op === "is_not_null" ? `${k} ${opLabel}` : `${k} ${opLabel} ${v}`;
        }
        return tag.replace("=", ": ");
    };

    const handleAddAdvanced = () => {
        if (!advKey) return;
        const tag = `${advKey}@@${advOp}@@${advVal}`;
        if (!activeTags.includes(tag)) {
            setActiveTags(prev => [...prev, tag]);
        }
        if (!customTags.includes(tag)) {
            setCustomTags(prev => [...prev, tag]);
            try {
                (window as any).umami?.track("osm-search-custom-tag", { tag });
            } catch {}
        }
        setAdvKey("");
        setAdvVal("");
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
             <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Viewport Bounding Box</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button 
                            onClick={() => setShowBbox(!showBbox)}
                            title={showBbox ? "Hide Box" : "Show Box"}
                            style={{ 
                                background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", 
                                display: "flex", alignItems: "center", padding: "2px" 
                            }}
                        >
                            {showBbox ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <span style={{ 
                            fontSize: "10px", 
                            padding: "2px 6px", 
                            borderRadius: "10px",
                            background: bboxLocked ? "#ef444422" : "#22c55e22",
                            color: bboxLocked ? "#ef4444" : "#22c55e",
                            border: `1px solid ${bboxLocked ? "#ef444444" : "#22c55e44"}`
                        }}>
                            {bboxLocked ? "LOCKED" : "FOLLOWING"}
                        </span>
                    </div>
                </div>
                <button 
                    onClick={toggleLock} 
                    style={{ 
                        width: "100%", 
                        padding: "6px", 
                        background: "var(--bg-secondary)", 
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "4px",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                        cursor: "pointer"
                    }}
                >
                    {bboxLocked ? "Unlock Viewport" : "Lock Selection Box"}
                </button>
             </div>

             <div style={{ display: "flex", gap: "4px", background: "rgba(0,0,0,0.2)", padding: "2px", borderRadius: "6px" }}>
                 <button 
                    style={{ 
                        flex: 1,
                        padding: "6px",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "12px",
                        backgroundColor: mode === "bellingcat" ? "var(--bg-tertiary)" : "transparent", 
                        color: mode === "bellingcat" ? "var(--text-primary)" : "var(--text-muted)",
                        cursor: "pointer"
                    }} 
                    onClick={() => setMode("bellingcat")}
                >
                    Quick Presets
                </button>
                 <button 
                    style={{ 
                        flex: 1,
                        padding: "6px",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "12px",
                        backgroundColor: mode === "turbo" ? "var(--bg-tertiary)" : "transparent", 
                        color: mode === "turbo" ? "var(--text-primary)" : "var(--text-muted)",
                        cursor: "pointer"
                    }} 
                    onClick={() => setMode("turbo")}
                >
                    Overpass QL
                </button>
             </div>

             {mode === "bellingcat" && (
                 <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                     {activeTags.length > 1 && (
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "4px" }}>
                            <label style={{ fontSize: "11px", color: "var(--text-muted)" }}>Intersection Radius: <strong>{distance}m</strong></label>
                            <input 
                                type="range" min="50" max="2000" step="50"
                                value={distance} onChange={e => setDistance(Number(e.target.value))}
                                style={{ width: "100px", accentColor: "var(--accent-blue)" }}
                            />
                         </div>
                     )}
                     <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "4px" }}>
                         <div style={{ display: "flex", gap: "4px" }}>
                             <input 
                                 style={{ 
                                     flex: 1,
                                     padding: "8px", 
                                     paddingRight: "24px",
                                     backgroundColor: "rgba(0,0,0,0.3)", 
                                     color: "#fff", 
                                     border: "1px solid var(--border-subtle)",
                                     borderRadius: "4px",
                                     fontSize: "13px"
                                 }}
                                 placeholder="Filter, search OSM, or type key=value..." 
                                 value={searchText} 
                                 onChange={e => setSearchText(e.target.value)} 
                                 onKeyDown={e => {
                                     if (e.key === "Enter" && searchText.includes("=")) {
                                         const tag = searchText.trim();
                                         if (!activeTags.includes(tag)) {
                                             setActiveTags(prev => [...prev, tag]);
                                         }
                                         if (!customTags.includes(tag)) {
                                             setCustomTags(prev => [...prev, tag]);
                                             try {
                                                 (window as any).umami?.track("osm-search-custom-tag", { tag });
                                             } catch {}
                                         }
                                         setSearchText("");
                                     }
                                 }}
                             />
                             <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                title="Advanced Filters"
                                style={{
                                    padding: "0 10px",
                                    backgroundColor: showAdvanced ? "var(--accent-blue)" : "rgba(0,0,0,0.3)",
                                    color: "#fff",
                                    border: "1px solid var(--border-subtle)",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    display: "flex",
                                    alignItems: "center"
                                }}
                             >
                                 ⚡
                             </button>
                             {isSearchingApi && (
                                 <span style={{ 
                                     position: "absolute", 
                                     right: "42px", 
                                     top: "12px", 
                                     fontSize: "10px", 
                                     color: "var(--text-muted)" 
                                 }}>
                                     ⏳
                                 </span>
                             )}
                         </div>
                         
                         {showAdvanced && (
                             <div style={{ display: "flex", gap: "4px", padding: "6px", background: "rgba(0,0,0,0.2)", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.05)" }}>
                                 <input 
                                     placeholder="Key" 
                                     value={advKey} 
                                     onChange={e => setAdvKey(e.target.value)} 
                                     style={{ flex: 1, padding: "4px 8px", fontSize: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", color: "#fff", borderRadius: "2px" }}
                                 />
                                 <select 
                                     value={advOp} 
                                     onChange={e => setAdvOp(e.target.value)}
                                     style={{ width: "90px", padding: "4px", fontSize: "11px", background: "rgba(0,0,0,0.4)", border: "1px solid var(--border-subtle)", color: "#fff", borderRadius: "2px" }}
                                 >
                                     <optgroup label="Comparison">
                                         <option value="=">=</option>
                                         <option value="!=">!=</option>
                                         <option value="&gt;">&gt;</option>
                                         <option value="&lt;">&lt;</option>
                                         <option value="&gt;=">&gt;=</option>
                                         <option value="&lt;=">&lt;=</option>
                                     </optgroup>
                                     <optgroup label="String">
                                         <option value="starts_with">Starts with</option>
                                         <option value="ends_with">Ends with</option>
                                         <option value="contains">Contains</option>
                                         <option value="does_not_contain">Doesn't contain</option>
                                         <option value="is_null">Is null</option>
                                         <option value="is_not_null">Is not null</option>
                                     </optgroup>
                                 </select>
                                 <input 
                                     placeholder="Value" 
                                     value={advVal} 
                                     onChange={e => setAdvVal(e.target.value)} 
                                     disabled={advOp === 'is_null' || advOp === 'is_not_null'}
                                     style={{ flex: 1, padding: "4px 8px", fontSize: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", color: "#fff", borderRadius: "2px", opacity: (advOp === 'is_null' || advOp === 'is_not_null') ? 0.3 : 1 }}
                                 />
                                 <button 
                                     onClick={handleAddAdvanced}
                                     disabled={!advKey || ((advOp !== 'is_null' && advOp !== 'is_not_null') && !advVal)}
                                     style={{ padding: "4px 8px", fontSize: "11px", background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: "2px", cursor: "pointer", fontWeight: "bold" }}
                                 >
                                     ADD
                                 </button>
                             </div>
                         )}
                     </div>

                     {activeTags.length > 0 && (
                         <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "4px 0" }}>
                             {activeTags.map(tag => (
                                 <div 
                                     key={`active-${tag}`} 
                                     style={{ 
                                         background: "var(--accent-blue)", 
                                         color: "#fff", 
                                         padding: "4px 10px", 
                                         borderRadius: "14px", 
                                         fontSize: "11px",
                                         display: "flex",
                                         alignItems: "center",
                                         gap: "4px"
                                     }}
                                 >
                                     {formatTag(tag)}
                                     <span
                                         onClick={(e) => {
                                             e.stopPropagation();
                                             setActiveTags(prev => prev.filter(t => t !== tag));
                                         }}
                                         style={{
                                             marginLeft: "2px",
                                             padding: "0 4px",
                                             borderRadius: "50%",
                                             background: "rgba(255,255,255,0.15)",
                                             display: "flex",
                                             justifyContent: "center",
                                             alignItems: "center",
                                             cursor: "pointer"
                                         }}
                                         title="Remove from selection"
                                     >
                                         ×
                                     </span>
                                 </div>
                             ))}
                         </div>
                     )}

                     <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "150px", overflowY: "auto", padding: "4px" }}>
                         {renderedTags.filter(tag => !activeTags.includes(tag)).map(tag => {
                             return (
                                <button 
                                    key={tag} 
                                    style={{ 
                                        background: "rgba(255,255,255,0.05)", 
                                        color: "var(--text-secondary)", 
                                        padding: "4px 10px", 
                                        borderRadius: "14px", 
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        fontSize: "11px",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px"
                                    }}
                                    onClick={() => setActiveTags(prev => [...prev, tag])}
                                >
                                    {formatTag(tag)}
                                    {customTags.includes(tag) && (
                                        <span
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCustomTags(prev => prev.filter(t => t !== tag));
                                            }}
                                            style={{
                                                marginLeft: "2px",
                                                padding: "0 4px",
                                                borderRadius: "50%",
                                                background: "rgba(255,255,255,0.15)",
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center"
                                            }}
                                            title="Delete custom tag permanently"
                                        >
                                            ×
                                        </span>
                                    )}
                                </button>
                             );
                         })}
                     </div>
                 </div>
             )}

             {mode === "turbo" && (
                 <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                     <label style={{ fontSize: "11px", color: "var(--text-muted)" }}>Raw Overpass Query</label>
                     <textarea 
                         style={{ 
                             backgroundColor: "rgba(0,0,0,0.3)", 
                             color: "#fff", 
                             border: "1px solid var(--border-subtle)", 
                             padding: "8px", 
                             width: "100%",
                             borderRadius: "4px",
                             fontSize: "12px",
                             fontFamily: "monospace",
                             resize: "vertical"
                         }}
                         value={rawQuery} 
                         onChange={e => setRawQuery(e.target.value)} 
                         rows={6} 
                     />
                     <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Use {'{{bbox}}'} as placeholder</span>
                 </div>
             )}

             <button 
                onClick={handleScan} 
                disabled={isScanning || (mode === "bellingcat" && activeTags.length === 0)}
                style={{ 
                    padding: "10px", 
                    background: isScanning ? "var(--bg-tertiary)" : "var(--accent-blue)", 
                    color: "white", 
                    marginTop: "4px", 
                    border: "none", 
                    borderRadius: "4px",
                    fontWeight: 600,
                    cursor: isScanning ? "not-allowed" : "pointer",
                    opacity: (mode === "bellingcat" && activeTags.length === 0) ? 0.5 : 1
                }}
            >
                 {isScanning ? "SCANNING OVERPASS..." : `SCAN AREA (${mode === "turbo" ? "TURBO" : activeTags.length + " TAGS"})`}
             </button>
        </div>
    );
}
