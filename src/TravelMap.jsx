import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "./firebase";
import {
  collection, addDoc, onSnapshot, deleteDoc, doc,
  serverTimestamp, orderBy, query,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  Box, Typography, Stack, IconButton, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Chip, InputAdornment,
} from "@mui/material";
import CloseIcon      from "@mui/icons-material/Close";
import DeleteIcon     from "@mui/icons-material/Delete";
import PhotoCamera    from "@mui/icons-material/PhotoCamera";
import MapIcon        from "@mui/icons-material/Map";
import ListIcon       from "@mui/icons-material/List";
import SearchIcon     from "@mui/icons-material/Search";
import MyLocationIcon from "@mui/icons-material/MyLocation";

const B = {
  pants: "#7B4FA6", skin: "#F5B8A0", cream: "#FFF8F2",
  peach: "#FFE4D4", lavender: "#EDE0F5", accent: "#E8630A",
  dark: "#3D1F00", pink: "#FF8FAB",
};

const CATEGORY_LIST = [
  { label: "카페",   emoji: "☕", color: "#A0522D" },
  { label: "맛집",   emoji: "🍽️", color: "#E8630A" },
  { label: "여행",   emoji: "✈️", color: "#3A86FF" },
  { label: "데이트", emoji: "💜", color: "#7B4FA6" },
  { label: "산책",   emoji: "🌿", color: "#2D9E5F" },
  { label: "기타",   emoji: "📍", color: "#888"    },
];
const getCatInfo = (cat) => CATEGORY_LIST.find((c) => c.label === cat) || CATEGORY_LIST[5];

// ── 카카오 지도 SDK 동적 로드 ────────────────────────────────────
// ※ 카카오 개발자 콘솔 → 내 애플리케이션 → 앱 키 → "JavaScript 키" 를 넣어주세요!
const KAKAO_JS_KEY = "c3c3c6b84c1f8a2ee81502aac5ca9982";

const loadKakaoSdk = () =>
  new Promise((resolve) => {
    if (window.kakao?.maps?.services) { resolve(); return; }
    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=services&autoload=false`;
    script.onload = () => window.kakao.maps.load(resolve);
    script.onerror = () => resolve(); // 실패해도 앱 크래시 방지
    document.head.appendChild(script);
  });

// ── Leaflet 동적 로드 ────────────────────────────────────────────
const loadLeaflet = () =>
  new Promise((resolve) => {
    if (window.L) { resolve(window.L); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = `
      .leaflet-container { font-family: 'Noto Sans KR', sans-serif !important; }
      .leaflet-control-zoom a {
        font-family: sans-serif !important; border-radius: 8px !important;
        border: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
        background: white !important; color: #444 !important;
        font-size: 18px !important; line-height: 28px !important;
        width: 30px !important; height: 30px !important;
      }
      .leaflet-control-zoom { border: none !important; box-shadow: none !important; display: flex !important; flex-direction: column !important; gap: 4px !important; }
      .leaflet-control-zoom a:hover { background: #f5f5f5 !important; }
      .leaflet-control-attribution { font-size: 9px !important; background: rgba(255,255,255,0.7) !important; border-radius: 4px 0 0 0 !important; }
    `;
    document.head.appendChild(style);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve(window.L);
    document.head.appendChild(script);
  });

// ── 커스텀 핀 아이콘 ────────────────────────────────────────────
const makeIcon = (L, emoji, color) =>
  L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:40px;height:50px;filter:drop-shadow(0 4px 10px ${color}66);">
        <svg viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg" width="40" height="50">
          <path d="M20 0C9.402 0 0.8 8.6 0.8 19.2c0 7.5 4.2 14 10.4 17.4L20 50l8.8-13.4C35 33.2 39.2 26.7 39.2 19.2 39.2 8.6 30.598 0 20 0z" fill="${color}"/>
          <circle cx="20" cy="19" r="13" fill="white" opacity="0.95"/>
        </svg>
        <span style="position:absolute;top:5px;left:50%;transform:translateX(-50%);font-size:15px;line-height:1;">${emoji}</span>
      </div>`,
    iconSize: [40, 50], iconAnchor: [20, 50], popupAnchor: [0, -52],
  });

const makeMyLocIcon = (L) =>
  L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#3A86FF;border:3px solid white;box-shadow:0 0 0 3px #3A86FF55,0 2px 8px #3A86FF88;"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9],
  });

// ── 카카오 SDK 장소 검색 ─────────────────────────────────────────
const kakaoSearchPlaces = (keyword) =>
  new Promise((resolve, reject) => {
    if (!window.kakao?.maps?.services) { reject(new Error("SDK 미로드")); return; }
    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(keyword, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        resolve(data.map((d) => ({
          lat: d.y, lon: d.x,
          display_name: d.place_name,
          address: d.road_address_name || d.address_name,
          category: d.category_name,
        })));
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        resolve([]);
      } else {
        reject(new Error("검색 실패"));
      }
    });
  });

// ── 검색 바 ─────────────────────────────────────────────────────
const SearchBar = ({ onSelect, onMyLocation, kakaoReady }) => {
  const [keyword,  setKeyword]  = useState("");
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [showList, setShowList] = useState(false);
  const timerRef = useRef(null);

  const doSearch = async (kw) => {
    if (!kw.trim() || kw.trim().length < 2) { setResults([]); setShowList(false); return; }
    if (!kakaoReady) return;
    setLoading(true);
    try {
      const data = await kakaoSearchPlaces(kw);
      setResults(data);
      setShowList(true);
    } catch (e) { setResults([]); }
    setLoading(false);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setKeyword(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(v), 400);
  };

  const handleSelect = (item) => {
    onSelect({ lat: parseFloat(item.lat), lng: parseFloat(item.lon), name: item.display_name });
    setKeyword(item.display_name);
    setShowList(false);
    setResults([]);
  };

  return (
    <Box sx={{ position: "relative", zIndex: 1000 }}>
      <Stack direction="row" gap={0.8}>
        <TextField
          value={keyword}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setShowList(true)}
          placeholder={kakaoReady ? "상호명·주소 검색 (예: 삼미원, 경복궁)" : "검색 준비 중..."}
          size="small" fullWidth disabled={!kakaoReady}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {loading
                  ? <CircularProgress size={14} sx={{ color: B.pants }} />
                  : <SearchIcon sx={{ fontSize: 18, color: B.pants + "88" }} />}
              </InputAdornment>
            ),
            endAdornment: keyword && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => { setKeyword(""); setResults([]); setShowList(false); }}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </InputAdornment>
            ),
            sx: {
              borderRadius: 2.5, bgcolor: "white", fontSize: "0.82rem",
              "& fieldset": { borderColor: B.pants + "44" },
              "&:hover fieldset": { borderColor: B.pants + "88" },
              "&.Mui-focused fieldset": { borderColor: B.pants },
            },
          }}
        />
        <IconButton onClick={onMyLocation}
          sx={{
            width: 40, height: 40, borderRadius: 2.5, flexShrink: 0,
            bgcolor: "white", border: `1.5px solid ${B.pants}44`, color: B.pants,
            "&:hover": { bgcolor: B.lavender }, "&:active": { transform: "scale(0.9)" },
          }}>
          <MyLocationIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>

      {showList && results.length > 0 && (
        <Box sx={{
          position: "absolute", top: "100%", left: 0, right: 0, mt: 0.5,
          bgcolor: "white", borderRadius: 2.5, overflow: "hidden",
          border: `1.5px solid ${B.pants}22`,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 2000,
        }}>
          {results.map((item, i) => (
            <Box key={i} onClick={() => handleSelect(item)}
              sx={{
                px: 1.8, py: 1.2, cursor: "pointer",
                borderBottom: i < results.length - 1 ? `1px solid ${B.pants}11` : "none",
                transition: "background 0.1s",
                "&:hover": { bgcolor: B.lavender + "55" },
                "&:active": { bgcolor: B.lavender },
              }}>
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: B.dark, lineHeight: 1.3 }}>
                📍 {item.display_name}
              </Typography>
              {item.address && item.address !== item.display_name && (
                <Typography sx={{ fontSize: "0.7rem", color: B.dark + "66", mt: 0.2 }}>
                  {item.address}
                </Typography>
              )}
              {item.category && (
                <Typography sx={{ fontSize: "0.65rem", color: B.pants + "99", mt: 0.1 }}>
                  {item.category.split(" > ").pop()}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

// ── 핀 추가 다이얼로그 ──────────────────────────────────────────
const AddPinDialog = ({ open, latlng, placeName, onClose, onSave, currentUser }) => {
  const [title,    setTitle]    = useState("");
  const [memo,     setMemo]     = useState("");
  const [category, setCategory] = useState("데이트");
  const [file,     setFile]     = useState(null);
  const [preview,  setPreview]  = useState(null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (open) { setTitle(placeName || ""); setMemo(""); setCategory("데이트"); setFile(null); setPreview(null); }
  }, [open, placeName]);

  const handleFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      let photoURL = null;
      if (file) {
        const storageRef = ref(storage, `travel/${Date.now()}_${file.name}`);
        const snap = await new Promise((res, rej) => {
          const task = uploadBytesResumable(storageRef, file);
          task.on("state_changed", null, rej, () => res(task.snapshot));
        });
        photoURL = await getDownloadURL(snap.ref);
      }
      await onSave({ title, memo, category, photoURL, lat: latlng.lat, lng: latlng.lng, addedBy: currentUser });
      onClose();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"
      PaperProps={{ sx: { borderRadius: 4, bgcolor: B.cream, border: `1.5px solid ${B.pants}33` } }}>
      <DialogTitle sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: "1.1rem",
        display: "flex", alignItems: "center", justifyContent: "space-between", pb: 0 }}>
        📍 여기 어디야?
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        <Stack spacing={2}>
          <Box>
            <Typography sx={{ fontSize: "0.72rem", color: B.dark + "88", mb: 0.8 }}>카테고리</Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.7}>
              {CATEGORY_LIST.map((cat) => (
                <Chip key={cat.label} label={`${cat.emoji} ${cat.label}`}
                  onClick={() => setCategory(cat.label)}
                  sx={{
                    fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.72rem",
                    bgcolor: category === cat.label ? cat.color : B.peach,
                    color: category === cat.label ? "white" : B.dark,
                    border: `1.5px solid ${category === cat.label ? cat.color : "transparent"}`,
                    fontWeight: category === cat.label ? 700 : 400, transition: "all 0.15s",
                    "& .MuiChip-label": { px: 1.2 },
                  }} />
              ))}
            </Stack>
          </Box>
          <TextField label="장소 이름" value={title} onChange={(e) => setTitle(e.target.value)}
            fullWidth size="small" placeholder="예: 성수동 어니언 베이커리"
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "white" } }} />
          <TextField label="메모 (선택)" value={memo} onChange={(e) => setMemo(e.target.value)}
            fullWidth size="small" multiline rows={2} placeholder="여기서 뭐 했어? 어땠어? 🐷"
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "white" } }} />
          <Box>
            <Typography sx={{ fontSize: "0.72rem", color: B.dark + "88", mb: 0.8 }}>사진 (선택)</Typography>
            <Stack direction="row" alignItems="center" gap={1.5}>
              <Button component="label" size="small" startIcon={<PhotoCamera />}
                sx={{ bgcolor: B.lavender, color: B.pants, borderRadius: 2,
                  fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.75rem",
                  "&:hover": { bgcolor: B.pants + "22" } }}>
                사진 선택
                <input type="file" accept="image/*" hidden onChange={handleFile} />
              </Button>
              {preview && (
                <Box sx={{ position: "relative" }}>
                  <Box component="img" src={preview} alt=""
                    sx={{ width: 56, height: 56, borderRadius: 2, objectFit: "cover", border: `2px solid ${B.pants}44` }} />
                  <IconButton size="small" onClick={() => { setFile(null); setPreview(null); }}
                    sx={{ position: "absolute", top: -8, right: -8, bgcolor: "white", width: 18, height: 18, border: `1px solid ${B.pants}44` }}>
                    <CloseIcon sx={{ fontSize: 11 }} />
                  </IconButton>
                </Box>
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: B.dark + "77", fontFamily: "'Noto Sans KR',sans-serif" }}>취소</Button>
        <Button onClick={handleSave} disabled={!title.trim() || loading} variant="contained"
          sx={{ bgcolor: B.pants, borderRadius: 10, px: 3, fontFamily: "'Jua',sans-serif", fontSize: "0.95rem",
            boxShadow: `0 3px 12px ${B.pants}55`, "&:hover": { bgcolor: "#6A3D96" }, "&:active": { transform: "scale(0.95)" } }}>
          {loading ? <CircularProgress size={18} sx={{ color: "white" }} /> : "핀 꽂기 📍"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── 핀 상세 다이얼로그 ──────────────────────────────────────────
const PinDetailDialog = ({ pin, open, onClose, onDelete }) => {
  if (!pin) return null;
  const cat  = getCatInfo(pin.category);
  const date = pin.createdAt?.toDate?.()
    ? pin.createdAt.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : "";
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"
      PaperProps={{ sx: { borderRadius: 4, bgcolor: B.cream, border: `1.5px solid ${B.pants}33`, overflow: "hidden" } }}>
      {pin.photoURL && (
        <Box component="img" src={pin.photoURL} alt="" sx={{ width: "100%", height: 190, objectFit: "cover" }} />
      )}
      <DialogTitle sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: "1.1rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        pt: pin.photoURL ? 1.5 : 2, pb: 0 }}>
        {cat.emoji} {pin.title}
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ pt: 0.5 }}>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Chip label={`${cat.emoji} ${cat.label}`} size="small"
              sx={{ bgcolor: cat.color + "22", color: cat.color, fontWeight: 700,
                fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.72rem" }} />
            <Typography sx={{ fontSize: "0.72rem", color: B.dark + "66" }}>
              {pin.addedBy} · {date}
            </Typography>
          </Stack>
          {pin.memo && (
            <Typography sx={{ fontSize: "0.85rem", color: B.dark + "cc", lineHeight: 1.6,
              bgcolor: B.lavender + "44", borderRadius: 2, p: 1.2, fontFamily: "'Noto Sans KR',sans-serif" }}>
              {pin.memo}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2 }}>
        <Button onClick={() => onDelete(pin.id)} startIcon={<DeleteIcon />}
          sx={{ color: "#cc4444", fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.8rem" }}>
          삭제
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── 메인 컴포넌트 ───────────────────────────────────────────────
const TravelMap = ({ currentUser }) => {
  const mapRef      = useRef(null);
  const leafletMap  = useRef(null);
  const markersRef  = useRef({});
  const myLocMarker = useRef(null);

  const [pins,          setPins]          = useState([]);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [kakaoReady,    setKakaoReady]    = useState(false);
  const [addDialog,     setAddDialog]     = useState({ open: false, latlng: null, placeName: "" });
  const [detailDialog,  setDetailDialog]  = useState({ open: false, pin: null });
  const [view,          setView]          = useState("map");
  const [filterCat,     setFilterCat]     = useState("전체");
  const [locLoading,    setLocLoading]    = useState(false);

  // Leaflet + 카카오 SDK 동시 로드
  useEffect(() => {
    loadLeaflet().then(() => setLeafletLoaded(true));
    loadKakaoSdk().then(() => setKakaoReady(true)).catch(() => {});
  }, []);

  // Firestore 핀 리스너
  useEffect(() => {
    const q = query(collection(db, "travelPins"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setPins(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || leafletMap.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, {
      center: [37.5665, 126.9780], zoom: 13,
      zoomControl: false, attributionControl: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '© <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd", maxZoom: 19,
    }).addTo(map);
    map.on("click", (e) => {
      setAddDialog({ open: true, latlng: e.latlng, placeName: "" });
    });
    leafletMap.current = map;
  }, [leafletLoaded]);

  // ── 핵심: view가 map으로 바뀌면 두 프레임 뒤에 invalidateSize ──
  useEffect(() => {
    if (view === "map" && leafletMap.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          leafletMap.current?.invalidateSize();
        });
      });
    }
  }, [view]);

  // 마커 동기화
  useEffect(() => {
    if (!leafletLoaded || !leafletMap.current) return;
    const L = window.L;
    const map = leafletMap.current;
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};
    pins.forEach((pin) => {
      const cat    = getCatInfo(pin.category);
      const icon   = makeIcon(L, cat.emoji, cat.color);
      const marker = L.marker([pin.lat, pin.lng], { icon })
        .addTo(map)
        .on("click", () => setDetailDialog({ open: true, pin }));
      markersRef.current[pin.id] = marker;
    });
  }, [pins, leafletLoaded]);

  const handleSearchSelect = ({ lat, lng, name }) => {
    setView("map");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        leafletMap.current?.invalidateSize();
        leafletMap.current?.flyTo([lat, lng], 16, { duration: 1.0 });
      });
    });
    setTimeout(() => {
      setAddDialog({ open: true, latlng: { lat, lng }, placeName: name });
    }, 1200);
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation) { alert("위치 서비스를 지원하지 않는 기기예요 😢"); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        const L   = window.L;
        const map = leafletMap.current;
        if (!map) return;
        setView("map");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            map.invalidateSize();
            map.flyTo([lat, lng], 16, { duration: 1.0 });
          });
        });
        if (myLocMarker.current) myLocMarker.current.remove();
        myLocMarker.current = L.marker([lat, lng], { icon: makeMyLocIcon(L) }).addTo(map);
        setLocLoading(false);
      },
      () => { alert("위치를 가져올 수 없어요 😢"); setLocLoading(false); }
    );
  };

  const handleSavePin = async (data) => {
    await addDoc(collection(db, "travelPins"), { ...data, createdAt: serverTimestamp() });
  };

  const handleDeletePin = async (id) => {
    if (!window.confirm("이 핀을 삭제할까요?")) return;
    await deleteDoc(doc(db, "travelPins", id));
    setDetailDialog({ open: false, pin: null });
  };

  const flyToPin = (pin) => {
    setView("map");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        leafletMap.current?.invalidateSize();
        leafletMap.current?.flyTo([pin.lat, pin.lng], 16, { duration: 1.2 });
      });
    });
    setTimeout(() => setDetailDialog({ open: true, pin }), 1400);
  };

  const filteredPins = filterCat === "전체" ? pins : pins.filter((p) => p.category === filterCat);

  return (
    <Box sx={{ position: "relative" }}>

      {/* 헤더 */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5} px={0.5}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, fontSize: "1rem" }}>
            🗺️ 우리의 여행 지도
          </Typography>
          <Chip label={`총 ${pins.length}곳`} size="small"
            sx={{ bgcolor: B.pants, color: "white", fontWeight: 700,
              fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.68rem", height: 20 }} />
        </Stack>
        <Stack direction="row" gap={0.5}>
          {[{ v: "map", icon: <MapIcon sx={{ fontSize: 16 }} /> },
            { v: "list", icon: <ListIcon sx={{ fontSize: 16 }} /> }].map(({ v, icon }) => (
            <IconButton key={v} size="small" onClick={() => setView(v)}
              sx={{
                width: 32, height: 32, borderRadius: 2,
                bgcolor: view === v ? B.pants : B.lavender,
                color:   view === v ? "white"  : B.pants,
                "&:hover": { bgcolor: view === v ? B.pants : B.lavender + "cc" },
              }}>
              {icon}
            </IconButton>
          ))}
        </Stack>
      </Stack>

      {/* 검색 바 */}
      <Box mb={1.5}>
        <SearchBar onSelect={handleSearchSelect} onMyLocation={handleMyLocation} kakaoReady={kakaoReady} />
      </Box>

      {/* 카테고리 필터 */}
      <Box sx={{ overflowX: "auto", pb: 1, mb: 1.5, "&::-webkit-scrollbar": { height: 0 } }}>
        <Stack direction="row" gap={0.7} sx={{ width: "max-content" }}>
          {["전체", ...CATEGORY_LIST.map((c) => c.label)].map((cat) => {
            const info   = getCatInfo(cat);
            const isAll  = cat === "전체";
            const active = filterCat === cat;
            return (
              <Chip key={cat} label={isAll ? "📍 전체" : `${info.emoji} ${cat}`} size="small"
                onClick={() => setFilterCat(cat)}
                sx={{
                  fontFamily: "'Noto Sans KR',sans-serif", fontSize: "0.72rem",
                  bgcolor: active ? (isAll ? B.pants : info.color) : B.peach,
                  color:   active ? "white" : B.dark,
                  fontWeight: active ? 700 : 400,
                  border: `1.5px solid ${active ? (isAll ? B.pants : info.color) : "transparent"}`,
                  transition: "all 0.15s", height: 26,
                }} />
            );
          })}
        </Stack>
      </Box>

      {/* ── 지도: 항상 DOM에 존재하고 display로 show/hide (이게 핵심!) ── */}
      <Box sx={{ position: "relative", display: view === "map" ? "block" : "none" }}>
        <Box ref={mapRef} sx={{
          width: "100%", height: 440, borderRadius: 3, overflow: "hidden",
          border: `1px solid rgba(0,0,0,0.08)`,
          boxShadow: "0 2px 16px rgba(0,0,0,0.10)",
        }} />
        <Box sx={{
          position: "absolute", bottom: 14, left: 14, zIndex: 800,
          bgcolor: "white", borderRadius: 2, px: 1.4, py: 0.6,
          boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
        }}>
          <Typography sx={{ fontSize: "0.68rem", color: "#555", fontFamily: "'Noto Sans KR',sans-serif" }}>
            지도 탭 → 핀 추가 📍
          </Typography>
        </Box>
        {locLoading && (
          <Box sx={{
            position: "absolute", top: 14, right: 52, zIndex: 800,
            bgcolor: "white", borderRadius: 2, px: 1.4, py: 0.8,
            boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
            display: "flex", alignItems: "center", gap: 1,
          }}>
            <CircularProgress size={12} sx={{ color: B.pants }} />
            <Typography sx={{ fontSize: "0.68rem", color: B.pants, fontFamily: "'Noto Sans KR',sans-serif" }}>
              위치 찾는 중...
            </Typography>
          </Box>
        )}
        {!leafletLoaded && (
          <Box sx={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            bgcolor: "#f8f8f8", borderRadius: 3,
          }}>
            <Stack alignItems="center" gap={1}>
              <CircularProgress sx={{ color: B.pants }} size={32} />
              <Typography sx={{ fontSize: "0.78rem", color: B.pants, fontFamily: "'Noto Sans KR',sans-serif" }}>
                지도 불러오는 중...
              </Typography>
            </Stack>
          </Box>
        )}
      </Box>

      {/* 목록 뷰 */}
      {view === "list" && (
        <Stack spacing={1.2}>
          {filteredPins.length === 0 && (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <Typography sx={{ fontSize: "2rem" }}>🐷</Typography>
              <Typography sx={{ fontFamily: "'Jua',sans-serif", color: B.pants, mt: 1 }}>
                아직 핀이 없어요!
              </Typography>
              <Typography sx={{ fontSize: "0.78rem", color: B.dark + "66", mt: 0.5 }}>
                상호명 검색하거나 지도를 탭해서 핀을 꽂아봐요
              </Typography>
            </Box>
          )}
          {filteredPins.map((pin) => {
            const cat  = getCatInfo(pin.category);
            const date = pin.createdAt?.toDate?.()
              ? pin.createdAt.toDate().toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
              : "";
            return (
              <Box key={pin.id} onClick={() => flyToPin(pin)}
                sx={{
                  display: "flex", gap: 1.5, alignItems: "flex-start",
                  bgcolor: "white", borderRadius: 3, p: 1.5,
                  border: `1px solid ${B.pants}18`, cursor: "pointer", transition: "all 0.15s",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                  "&:active": { transform: "scale(0.98)", bgcolor: B.lavender + "44" },
                }}>
                <Box sx={{
                  width: 54, height: 54, borderRadius: 2.5, flexShrink: 0,
                  overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                  bgcolor: cat.color + "18", border: `1.5px solid ${cat.color}33`,
                }}>
                  {pin.photoURL
                    ? <Box component="img" src={pin.photoURL} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <Typography sx={{ fontSize: "1.7rem" }}>{cat.emoji}</Typography>}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" gap={0.8} mb={0.3}>
                    <Typography sx={{ fontFamily: "'Jua',sans-serif", fontSize: "0.92rem", color: B.dark,
                      flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {pin.title}
                    </Typography>
                    <Chip label={cat.label} size="small"
                      sx={{ bgcolor: cat.color + "18", color: cat.color, fontWeight: 700,
                        fontSize: "0.65rem", height: 18, fontFamily: "'Noto Sans KR',sans-serif" }} />
                  </Stack>
                  {pin.memo && (
                    <Typography sx={{ fontSize: "0.75rem", color: B.dark + "88", lineHeight: 1.4,
                      overflow: "hidden", textOverflow: "ellipsis",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {pin.memo}
                    </Typography>
                  )}
                  <Typography sx={{ fontSize: "0.68rem", color: B.dark + "55", mt: 0.4 }}>
                    {pin.addedBy} · {date}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}

      <AddPinDialog
        open={addDialog.open} latlng={addDialog.latlng} placeName={addDialog.placeName}
        onClose={() => setAddDialog({ open: false, latlng: null, placeName: "" })}
        onSave={handleSavePin} currentUser={currentUser}
      />
      <PinDetailDialog
        open={detailDialog.open} pin={detailDialog.pin}
        onClose={() => setDetailDialog({ open: false, pin: null })}
        onDelete={handleDeletePin}
      />
    </Box>
  );
};

export default TravelMap;