'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Spot, SpotType, SPOT_TYPE_COLORS, SPOT_TYPE_EMOJIS } from '@/lib/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface Props {
  spots: Spot[];
  center?: [number, number];
  onSpotClick: (spot: Spot) => void;
}

export default function MapView({ spots, center, onSpotClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: center ?? [135.502, 34.694],
      zoom: 15,
      // 地名の日本語化はこれだけで足りる。GL JS が composite ソースの URL に language=ja を
      // 付けるので、タイルからは name_en / name_ko / name_zh が丸ごと落ち、name に日本語が入る。
      // light-v11 の text-field は coalesce(name_en, name) なので、name_en が無い＝日本語が出る。
      // （text-field を name_ja 優先に書き換える必要はない。language=ja のタイルには
      //   name_ja というフィールド自体が存在せず、書き換えると airport-label の
      //   「空港コード＋名称」の出し分けだけ壊れる）
      // NavigationControl のツールチップも locale 未指定ならこの言語に追従する。
      language: 'ja',
      // CJK は端末のフォントで描画される。Mac / Windows / フォールバックの順に並べる。
      localIdeographFontFamily:
        "'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic UI', 'Meiryo', sans-serif",
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (center && mapRef.current) {
      mapRef.current.easeTo({ center, zoom: 15 });
    }
  }, [center]);

  const addMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    spots.forEach((spot) => {
      const el = document.createElement('div');
      el.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        background: ${SPOT_TYPE_COLORS[spot.type as SpotType]};
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 3px 8px rgba(0,0,0,0.25);
        cursor: pointer;
      `;
      const inner = document.createElement('span');
      inner.style.cssText = 'transform: rotate(45deg); font-size: 18px; display: block; line-height: 1;';
      inner.textContent = SPOT_TYPE_EMOJIS[spot.type as SpotType];
      el.appendChild(inner);

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom-left' })
        .setLngLat([spot.lng, spot.lat])
        .addTo(map);

      el.addEventListener('click', () => onSpotClick(spot));
      markersRef.current.push(marker);
    });
  }, [spots, onSpotClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.isStyleLoaded()) {
      addMarkers();
    } else {
      map.once('load', addMarkers);
    }
  }, [addMarkers]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
