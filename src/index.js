import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import {
    Search,
    MapPin,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Settings,
    Navigation,
    ExternalLink,
    Users,
    Phone,
    Mail,
    User,
    RefreshCw,
    Globe,
    Download,
    Upload,
    Loader2,
    AlertTriangle,
    Trash2,
    Filter,
    Save,
    FileText
} from 'lucide-react';

// --- 类型定义与配置 ---
const STATUS_OPTIONS = [
    {
        id: 'new',
        label: 'New Lead',
        color: 'bg-red-100 text-red-700',
        icon: AlertCircle,
        pinColor: '#EF4444'
    },
    {
        id: 'interested',
        label: 'Interested',
        color: 'bg-emerald-100 text-emerald-700',
        icon: MapPin,
        pinColor: '#10B981'
    },
    {
        id: 'contacted',
        label: 'Contacted',
        color: 'bg-yellow-100 text-yellow-700',
        icon: Clock,
        pinColor: '#F59E0B'
    },
    {
        id: 'visited',
        label: 'Visited',
        color: 'bg-purple-100 text-purple-700',
        icon: Navigation,
        pinColor: '#8B5CF6'
    },
    {
        id: 'done',
        label: 'Closed/Won',
        color: 'bg-green-100 text-green-700',
        icon: CheckCircle,
        pinColor: '#16A34A'
    },
    {
        id: 'rejected',
        label: 'Rejected',
        color: 'bg-gray-100 text-gray-700',
        icon: XCircle,
        pinColor: '#6B7280'
    }
];

const QUICK_TAGS = [
    'Tennis Club',
    'Pickleball Club',
    'Padel Club',
    'Tennis Court',
    'Pickleball Court',
    'Padel Court'
];

// --- 模拟数据 (稳定版: 北京) ---
const MOCK_RESULTS = Array.from({ length: 25 }).map((_, i) => ({
    place_id: `mock-${i}`,
    name: `Mock Club ${i + 1} (Demo)`,
    vicinity: `Beijing District, Street ${i + 1}`,
    geometry: {
        location: {
            lat: 39.9 + (Math.random() * 0.1 - 0.05),
            lng: 116.4 + (Math.random() * 0.1 - 0.05)
        }
    },
    rating: 4.0 + Math.random(),
    user_ratings_total: Math.floor(Math.random() * 500)
}));

// 生成 SVG Pin 图标
const getPinIcon = (color, number) => {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
      <path fill="${color}" stroke="white" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <text x="12" y="10" font-family="Arial" font-size="10" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${number}</text>
    </svg>
  `;
    return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
        scaledSize: new window.google.maps.Size(40, 40),
        anchor: new window.google.maps.Point(20, 40)
    };
};

export default function MapApp() {
    const [apiKey, setApiKey] = useState('');
    const [isApiLoaded, setIsApiLoaded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedPlaceId, setSelectedPlaceId] = useState(null);
    const [showSearchAreaBtn, setShowSearchAreaBtn] = useState(false);

    // 分页与筛选
    const [hasNextPage, setHasNextPage] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');

    // 数据存储
    const [placeData, setPlaceData] = useState({});
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // 引用
    const mapRef = useRef(null);
    const googleMapRef = useRef(null);
    const markersRef = useRef({});
    const infoWindowRef = useRef(null);
    const placesServiceRef = useRef(null);
    const isProgrammaticMoveRef = useRef(false);
    const fileInputRef = useRef(null);
    const paginationRef = useRef(null);

    // --- 初始化 ---

    useEffect(() => {
        const savedData = localStorage.getItem('mapAppPlaceData');
        if (savedData) {
            setPlaceData(JSON.parse(savedData));
        }

        const savedKey = localStorage.getItem('mapAppApiKey');
        if (savedKey) {
            setApiKey(savedKey);
            loadGoogleMaps(savedKey);
        } else {
            setIsSettingsOpen(true);
        }

        // 基础错误处理
        window.gm_authFailure = () => {
            console.error('Google Maps Authentication Failure');
            setIsApiLoaded(false);
            setErrorMsg('Invalid API Key detected. Please check permissions.');
            setIsSettingsOpen(true);
            localStorage.removeItem('mapAppApiKey');
        };
        return () => {
            window.gm_authFailure = null;
        };
    }, []);

    useEffect(() => {
        localStorage.setItem('mapAppPlaceData', JSON.stringify(placeData));
        updateMapMarkers(searchResults);
    }, [placeData, isApiLoaded, searchResults, filterStatus, selectedPlaceId]);

    useEffect(() => {
        if (selectedPlaceId) {
            const element = document.getElementById(`place-${selectedPlaceId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [selectedPlaceId]);

    const loadGoogleMaps = (keyOverride) => {
        const keyToUse = keyOverride || apiKey;

        if (!keyToUse)
            return setErrorMsg('Please enter a valid Google Maps API Key');

        if (window.google && window.google.maps) {
            setIsApiLoaded(true);
            initMap();
            setIsSettingsOpen(false);
            return;
        }

        // 清理可能存在的旧脚本
        const existingScripts = document.querySelectorAll(
            'script[src*="maps.googleapis.com"]'
        );
        existingScripts.forEach((script) => script.remove());

        const script = document.createElement('script');
        // 恢复最简加载方式，移除 v=weekly 等可能导致问题的参数
        script.src = `https://maps.googleapis.com/maps/api/js?key=${keyToUse}&libraries=places`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            setIsApiLoaded(true);
            localStorage.setItem('mapAppApiKey', keyToUse);
            setIsSettingsOpen(false);
            setErrorMsg('');
            initMap();
        };

        script.onerror = () => {
            setErrorMsg(
                'Network error: Failed to load Google Maps API script.'
            );
            setIsApiLoaded(false);
        };

        document.head.appendChild(script);
    };

    const initMap = () => {
        if (!mapRef.current) return;
        try {
            // 稳定版配置：默认中心点为北京
            const defaultCenter = { lat: 39.9042, lng: 116.4074 };

            googleMapRef.current = new window.google.maps.Map(mapRef.current, {
                center: defaultCenter,
                zoom: 12,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }]
                    }
                ]
            });
            infoWindowRef.current = new window.google.maps.InfoWindow();
            placesServiceRef.current =
                new window.google.maps.places.PlacesService(
                    googleMapRef.current
                );
            googleMapRef.current.addListener('idle', () => {
                if (isProgrammaticMoveRef.current) {
                    isProgrammaticMoveRef.current = false;
                    return;
                }
                setShowSearchAreaBtn(true);
            });
        } catch (e) {
            console.error('Map init error:', e);
            setErrorMsg('Error initializing map.');
            setIsApiLoaded(false);
            setIsSettingsOpen(true);
        }
    };

    // --- 搜索逻辑 ---

    const performSearch = (query, isAppendInitial = false) => {
        if (!query.trim()) return;

        if (!isApiLoaded) {
            setSearchResults(MOCK_RESULTS);
            setHasNextPage(false);
            setErrorMsg('Demo Mode: Using mock data');
            return;
        }

        if (!placesServiceRef.current)
            return setErrorMsg('Map service not initialized.');

        setIsLoading(true);
        setErrorMsg('');
        setShowSearchAreaBtn(false);

        if (!isAppendInitial) {
            setSearchResults([]);
            setSelectedPlaceId(null);
            setHasNextPage(false);
            paginationRef.current = null;
        }

        const request = {
            query: query,
            fields: [
                'name',
                'geometry',
                'formatted_address',
                'place_id',
                'rating',
                'user_ratings_total'
            ]
        };

        if (isAppendInitial && googleMapRef.current) {
            request.bounds = googleMapRef.current.getBounds();
        }

        placesServiceRef.current.textSearch(
            request,
            (results, status, pagination) => {
                setIsLoading(false);

                if (
                    status ===
                        window.google.maps.places.PlacesServiceStatus.OK &&
                    results
                ) {
                    setSearchResults((prev) => {
                        const existingIds = new Set(
                            prev.map((p) => p.place_id)
                        );
                        const newItems = results.filter(
                            (r) => !existingIds.has(r.place_id)
                        );
                        const combined = [...prev, ...newItems];
                        return combined;
                    });

                    if (pagination && pagination.hasNextPage) {
                        paginationRef.current = pagination;
                        setHasNextPage(true);
                    } else {
                        paginationRef.current = null;
                        setHasNextPage(false);
                    }

                    if (
                        !isAppendInitial &&
                        googleMapRef.current &&
                        results.length > 0
                    ) {
                        isProgrammaticMoveRef.current = true;
                        const bounds = new window.google.maps.LatLngBounds();
                        results.forEach((place) => {
                            if (place.geometry?.location)
                                bounds.extend(place.geometry.location);
                        });
                        googleMapRef.current.fitBounds(bounds);
                    }
                } else {
                    if (status === 'ZERO_RESULTS') {
                        if (!isAppendInitial) setErrorMsg('No results found.');
                    } else if (status !== 'OK') {
                        setErrorMsg('API Error: ' + status);
                    }
                }
            }
        );
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        performSearch(searchQuery, false);
    };

    const handleSearchAreaClick = () => {
        performSearch(searchQuery, true);
    };

    const handleLoadMore = () => {
        if (paginationRef.current && paginationRef.current.hasNextPage) {
            setIsLoading(true);
            paginationRef.current.nextPage();
        }
    };

    const handleClearResults = () => {
        setSearchResults([]);
        setSearchQuery('');
        setHasNextPage(false);
        paginationRef.current = null;
        setSelectedPlaceId(null);
    };

    const handleExportJSON = () => {
        const dataStr = JSON.stringify(placeData, null, 2);
        const dataUri =
            'data:application/json;charset=utf-8,' +
            encodeURIComponent(dataStr);
        const exportFileDefaultName = 'map_scout_backup.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleImportJSON = (event) => {
        const fileReader = new FileReader();
        if (event.target.files && event.target.files.length > 0) {
            fileReader.readAsText(event.target.files[0], 'UTF-8');
            fileReader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    setPlaceData((prev) => ({ ...prev, ...importedData }));
                    alert(
                        `Success! Imported ${
                            Object.keys(importedData).length
                        } records.`
                    );
                    if (fileInputRef.current) fileInputRef.current.value = '';
                } catch (error) {
                    alert('Error importing JSON: ' + error.message);
                }
            };
        }
    };

    const getFilteredResults = () => {
        if (filterStatus === 'all') return searchResults;
        return searchResults.filter((place) => {
            const status = placeData[place.place_id]?.status || 'new';
            return status === filterStatus;
        });
    };

    const updateMapMarkers = (allPlaces) => {
        Object.values(markersRef.current).forEach((marker) =>
            marker.setMap(null)
        );
        markersRef.current = {};

        allPlaces.forEach((place, index) => {
            const currentData = getPlaceData(place.place_id);
            const currentStatusId = currentData.status || 'new';

            if (filterStatus !== 'all' && currentStatusId !== filterStatus)
                return;

            if (!place.geometry?.location) return;

            const statusOption =
                STATUS_OPTIONS.find((s) => s.id === currentStatusId) ||
                STATUS_OPTIONS[0];

            const marker = new window.google.maps.Marker({
                map: googleMapRef.current,
                position: place.geometry.location,
                title: place.name,
                icon: getPinIcon(statusOption.pinColor, index + 1),
                zIndex: 100 - index
            });

            marker.addListener('click', () => {
                handlePlaceSelect(place);
            });

            markersRef.current[place.place_id] = marker;
        });
    };

    const handlePlaceSelect = (place) => {
        setSelectedPlaceId(place.place_id);
        if (googleMapRef.current && place.geometry) {
            isProgrammaticMoveRef.current = true;
            googleMapRef.current.panTo(place.geometry.location);
        }
        const marker = markersRef.current[place.place_id];
        if (marker && infoWindowRef.current) {
            infoWindowRef.current.setContent(
                `<div style="padding:5px;"><strong>${place.name}</strong></div>`
            );
            infoWindowRef.current.open(googleMapRef.current, marker);
        }
        setPlaceData((prev) => ({
            ...prev,
            [place.place_id]: {
                ...prev[place.place_id],
                name: place.name,
                address: place.formatted_address || place.vicinity,
                status: prev[place.place_id]?.status || 'new'
            }
        }));
        fetchPlaceDetails(place.place_id);
    };

    const fetchPlaceDetails = (placeId) => {
        if (!placesServiceRef.current || !isApiLoaded) return;

        // 稳定版：移除所有实验性缓存逻辑，每次强制请求
        setIsDetailLoading(true);
        const request = {
            placeId: placeId,
            fields: [
                'name',
                'formatted_phone_number',
                'website',
                'formatted_address'
            ]
        };
        placesServiceRef.current.getDetails(request, (place, status) => {
            setIsDetailLoading(false);
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                setPlaceData((prev) => ({
                    ...prev,
                    [placeId]: {
                        ...prev[placeId],
                        contactPhone:
                            place.formatted_phone_number ||
                            prev[placeId]?.contactPhone ||
                            '',
                        website: place.website || prev[placeId]?.website || '',
                        name: place.name || prev[placeId]?.name,
                        address:
                            place.formatted_address || prev[placeId]?.address
                    }
                }));
            }
        });
    };

    const updatePlaceData = (placeId, field, value) => {
        setPlaceData((prev) => ({
            ...prev,
            [placeId]: { ...prev[placeId], [field]: value }
        }));
    };

    const getPlaceData = (placeId) => {
        const data = placeData[placeId];
        return data
            ? { ...data, status: data.status || 'new' }
            : { status: 'new' };
    };

    const handleExportCSV = () => {
        const rows = Object.keys(placeData)
            .map((key) => {
                const d = placeData[key];
                if (!d.status && !d.contactName && !d.notes) return null;
                const statusLabel =
                    STATUS_OPTIONS.find((s) => s.id === (d.status || 'new'))
                        ?.label || 'New Lead';
                const escape = (text) =>
                    text ? `"${text.toString().replace(/"/g, '""')}"` : '';
                return [
                    escape(key),
                    escape(d.name),
                    escape(d.address),
                    escape(statusLabel),
                    escape(d.coachCount),
                    escape(d.volocoachCount),
                    escape(d.contactName),
                    escape(d.contactPhone),
                    escape(d.contactEmail),
                    escape(d.website),
                    escape(d.notes)
                ].join(',');
            })
            .filter((r) => r);
        const header =
            'Place ID,Name,Address,Status,Coach Count,Volocoach Count,Contact Name,Phone,Email,Website,Notes';
        const link = document.createElement('a');
        link.href =
            'data:text/csv;charset=utf-8,' +
            encodeURI([header, ...rows].join('\n'));
        link.download = 'map_leads_export.csv';
        link.click();
    };

    const filteredResults = getFilteredResults();

    return (
        <div className="flex flex-col h-screen bg-gray-50 text-slate-800 font-sans overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-green-600 p-2 rounded-lg">
                        <MapPin className="text-white w-5 h-5" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800">
                        Map Scout Pro v1.1
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 mr-2">
                        <button
                            onClick={handleExportJSON}
                            title="Backup Data (JSON)"
                            className="p-2 hover:bg-white hover:text-blue-600 rounded-md transition-colors text-gray-600"
                        >
                            <Save className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            title="Restore Data (JSON)"
                            className="p-2 hover:bg-white hover:text-blue-600 rounded-md transition-colors text-gray-600"
                        >
                            <Upload className="w-4 h-4" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImportJSON}
                            className="hidden"
                            accept=".json"
                        />
                    </div>

                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" />{' '}
                        <span className="hidden md:inline">CSV</span>
                    </button>

                    <div
                        className={`text-sm px-3 py-1 rounded-full flex items-center gap-2 ${
                            isApiLoaded
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                        }`}
                    >
                        <div
                            className={`w-2 h-2 rounded-full ${
                                isApiLoaded ? 'bg-green-500' : 'bg-yellow-500'
                            }`}
                        ></div>
                        {isApiLoaded ? 'API Ready' : 'Demo'}
                    </div>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Left: Map */}
                <div className="flex-1 relative bg-gray-200 group">
                    <div ref={mapRef} className="w-full h-full" />
                    {showSearchAreaBtn && searchQuery && isApiLoaded && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 animate-in fade-in slide-in-from-top-4 duration-300">
                            <button
                                onClick={handleSearchAreaClick}
                                className="bg-white text-gray-700 px-4 py-2 rounded-full shadow-lg border border-gray-200 font-semibold text-sm flex items-center gap-2 hover:bg-gray-50 hover:text-green-600 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" /> Search this
                                area (Add results)
                            </button>
                        </div>
                    )}
                    {!isApiLoaded && !mapRef.current && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
                            <div className="text-center">
                                <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p>Waiting for map...</p>
                                <p className="text-sm mt-2">
                                    Please click settings to enter API Key
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Sidebar */}
                <div className="w-[450px] bg-white border-l border-gray-200 flex flex-col shadow-xl z-20">
                    <div className="p-4 border-b border-gray-100 bg-white space-y-3">
                        <form
                            onSubmit={handleSearchSubmit}
                            className="relative flex gap-2"
                        >
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    placeholder="Search places..."
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all shadow-sm"
                                />
                                <Search className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                                {isLoading ? '...' : 'Search'}
                            </button>
                            {searchResults.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleClearResults}
                                    className="bg-gray-100 text-gray-500 px-3 py-2 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                        </form>

                        {searchResults.length > 0 && (
                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                <Filter className="w-4 h-4 text-gray-500" />
                                <select
                                    value={filterStatus}
                                    onChange={(e) =>
                                        setFilterStatus(e.target.value)
                                    }
                                    className="bg-transparent text-gray-700 text-xs font-medium flex-1 focus:outline-none cursor-pointer"
                                >
                                    <option value="all">
                                        Show All Statuses
                                    </option>
                                    {STATUS_OPTIONS.map((opt) => (
                                        <option key={opt.id} value={opt.id}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            {QUICK_TAGS.map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() => {
                                        setSearchQuery(tag);
                                        performSearch(tag, false);
                                    }}
                                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-green-50 hover:text-green-700 text-gray-600 rounded border border-gray-200 transition-colors"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>

                        {errorMsg && (
                            <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {searchResults.length > 0 && (
                            <div className="text-xs text-gray-400 font-medium">
                                Found {searchResults.length} places (Showing{' '}
                                {filteredResults.length})
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 scroll-smooth">
                        {searchResults.map((place, index) => {
                            const data = getPlaceData(place.place_id);
                            const currentStatusId = data.status;
                            if (
                                filterStatus !== 'all' &&
                                currentStatusId !== filterStatus
                            )
                                return null;

                            const currentStatus =
                                STATUS_OPTIONS.find(
                                    (s) => s.id === currentStatusId
                                ) || STATUS_OPTIONS[0];
                            const Icon = currentStatus.icon;
                            const isSelected =
                                selectedPlaceId === place.place_id;

                            const hasMeaningfulData =
                                data.status !== 'new' ||
                                data.contactName ||
                                data.notes ||
                                data.coachCount ||
                                data.volocoachCount;
                            const shouldExpand =
                                isSelected || hasMeaningfulData;

                            return (
                                <div
                                    key={place.place_id}
                                    id={`place-${place.place_id}`}
                                    onClick={() => handlePlaceSelect(place)}
                                    className={`bg-white p-4 rounded-xl border transition-all duration-300 cursor-pointer group ${
                                        isSelected
                                            ? 'ring-2 ring-green-500 border-transparent shadow-xl scale-[1.02]'
                                            : 'border-gray-200 hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex gap-2">
                                            <div
                                                className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold shrink-0 shadow-sm transition-colors duration-300"
                                                style={{
                                                    backgroundColor:
                                                        currentStatus.pinColor
                                                }}
                                            >
                                                {index + 1}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 leading-tight">
                                                    {place.name}
                                                </h3>
                                                <div className="flex items-center text-xs text-yellow-500 mt-1">
                                                    <span className="font-bold mr-1">
                                                        {place.rating || 'N/A'}
                                                    </span>
                                                    {[...Array(5)].map(
                                                        (_, i) => (
                                                            <span
                                                                key={i}
                                                                className={
                                                                    i <
                                                                    Math.round(
                                                                        place.rating ||
                                                                            0
                                                                    )
                                                                        ? 'fill-current'
                                                                        : 'text-gray-300'
                                                                }
                                                            >
                                                                ★
                                                            </span>
                                                        )
                                                    )}
                                                    <span className="text-gray-400 ml-1">
                                                        (
                                                        {place.user_ratings_total ||
                                                            0}
                                                        )
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <a
                                            href={`https://www.google.com/maps/place/?q=place_id:${place.place_id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-gray-400 hover:text-green-600"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-3 pl-8 line-clamp-2">
                                        {place.formatted_address ||
                                            place.vicinity}
                                    </p>

                                    {shouldExpand && (
                                        <div
                                            className="pl-8 space-y-2 mb-3 animate-in fade-in duration-300"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {isSelected && isDetailLoading && (
                                                <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded animate-pulse mb-2">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    Syncing info...
                                                </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">
                                                        Total Coaches
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            placeholder="0"
                                                            className="w-full text-sm p-1.5 bg-gray-50 border border-gray-200 rounded focus:ring-1 focus:ring-green-500 outline-none"
                                                            value={
                                                                data.coachCount ||
                                                                ''
                                                            }
                                                            onChange={(e) =>
                                                                updatePlaceData(
                                                                    place.place_id,
                                                                    'coachCount',
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                        />
                                                        <Users className="w-3 h-3 absolute right-2 top-2 text-gray-400" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">
                                                        Volocoach Coaches
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            placeholder="0"
                                                            className="w-full text-sm p-1.5 bg-gray-50 border border-gray-200 rounded focus:ring-1 focus:ring-green-500 outline-none"
                                                            value={
                                                                data.volocoachCount ||
                                                                ''
                                                            }
                                                            onChange={(e) =>
                                                                updatePlaceData(
                                                                    place.place_id,
                                                                    'volocoachCount',
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                        />
                                                        <div className="absolute right-2 top-2 text-[10px] font-bold text-green-600">
                                                            V
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">
                                                    Details
                                                </label>
                                                <div className="space-y-1.5">
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            placeholder="Name"
                                                            className="w-full text-sm pl-7 p-1.5 bg-gray-50 border border-gray-200 rounded focus:ring-1 focus:ring-green-500 outline-none"
                                                            value={
                                                                data.contactName ||
                                                                ''
                                                            }
                                                            onChange={(e) =>
                                                                updatePlaceData(
                                                                    place.place_id,
                                                                    'contactName',
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                        />
                                                        <User className="w-3.5 h-3.5 absolute left-2 top-2 text-gray-400" />
                                                    </div>
                                                    <div className="relative">
                                                        <input
                                                            type="tel"
                                                            placeholder="Phone"
                                                            className="w-full text-sm pl-7 p-1.5 bg-gray-50 border border-gray-200 rounded focus:ring-1 focus:ring-green-500 outline-none"
                                                            value={
                                                                data.contactPhone ||
                                                                ''
                                                            }
                                                            onChange={(e) =>
                                                                updatePlaceData(
                                                                    place.place_id,
                                                                    'contactPhone',
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                        />
                                                        <Phone className="w-3.5 h-3.5 absolute left-2 top-2 text-gray-400" />
                                                    </div>
                                                    <div className="relative">
                                                        <input
                                                            type="url"
                                                            placeholder="Website"
                                                            className="w-full text-sm pl-7 p-1.5 bg-gray-50 border border-gray-200 rounded focus:ring-1 focus:ring-green-500 outline-none"
                                                            value={
                                                                data.website ||
                                                                ''
                                                            }
                                                            onChange={(e) =>
                                                                updatePlaceData(
                                                                    place.place_id,
                                                                    'website',
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                        />
                                                        <Globe className="w-3.5 h-3.5 absolute left-2 top-2 text-gray-400" />
                                                    </div>
                                                    <div className="relative">
                                                        <input
                                                            type="email"
                                                            placeholder="Email"
                                                            className="w-full text-sm pl-7 p-1.5 bg-gray-50 border border-gray-200 rounded focus:ring-1 focus:ring-green-500 outline-none"
                                                            value={
                                                                data.contactEmail ||
                                                                ''
                                                            }
                                                            onChange={(e) =>
                                                                updatePlaceData(
                                                                    place.place_id,
                                                                    'contactEmail',
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                        />
                                                        <Mail className="w-3.5 h-3.5 absolute left-2 top-2 text-gray-400" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">
                                                    Notes
                                                </label>
                                                <div className="relative">
                                                    <textarea
                                                        placeholder="Add private notes here..."
                                                        className="w-full text-sm pl-7 p-2 bg-gray-50 border border-gray-200 rounded focus:ring-1 focus:ring-green-500 outline-none min-h-[60px]"
                                                        value={data.notes || ''}
                                                        onChange={(e) =>
                                                            updatePlaceData(
                                                                place.place_id,
                                                                'notes',
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                    <FileText className="w-3.5 h-3.5 absolute left-2 top-2.5 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div
                                        className="pl-8 pt-3 border-t border-gray-100 flex items-center justify-between"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            Status:
                                        </label>
                                        <div className="relative group/select">
                                            <select
                                                value={data.status || 'new'}
                                                onChange={(e) =>
                                                    updatePlaceData(
                                                        place.place_id,
                                                        'status',
                                                        e.target.value
                                                    )
                                                }
                                                className={`appearance-none pl-8 pr-8 py-1.5 rounded-lg text-sm font-medium border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 transition-all ${currentStatus.color}`}
                                                style={{
                                                    backgroundImage: 'none'
                                                }}
                                            >
                                                {STATUS_OPTIONS.map((opt) => (
                                                    <option
                                                        key={opt.id}
                                                        value={opt.id}
                                                    >
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <Icon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-xs">
                                                ▼
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {hasNextPage && (
                            <button
                                onClick={handleLoadMore}
                                disabled={isLoading}
                                className="w-full py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4" />
                                )}
                                Load More Results
                            </button>
                        )}

                        <div className="h-10"></div>
                    </div>
                </div>
            </div>

            {isSettingsOpen && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-[500px] p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">
                                Set API Key
                            </h2>
                            <button
                                onClick={() => setIsSettingsOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {errorMsg && (
                                <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm flex items-start gap-3 border border-red-100">
                                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold">
                                            Connection Failed
                                        </p>
                                        <p className="mt-1">{errorMsg}</p>
                                    </div>
                                </div>
                            )}
                            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm leading-relaxed">
                                <strong>Note:</strong> API Key is required for
                                map data.
                                <br />
                                API Key is stored locally. Ensure{' '}
                                <b>Maps JS API</b> & <b>Places API</b> are
                                enabled.
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Google Maps API Key
                                </label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Paste Key (AIzaSy...)"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setIsSettingsOpen(false);
                                        setIsApiLoaded(false);
                                    }}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                                >
                                    Use Demo Mode
                                </button>
                                <button
                                    onClick={() => loadGoogleMaps(apiKey)}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg shadow-green-200 transition-all"
                                >
                                    Save & Load Map
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const root = createRoot(document.getElementById('root'));
root.render(<MapApp />);
