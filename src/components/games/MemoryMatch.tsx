"use client";
import React, { useState, useCallback } from "react";

const SYMBOLS = ["🌷","🎂","✿","🎁","♡","🌙","☀","🦋","🌸","💌","🎵","🌺"];

interface Tile { id: number; symbol: string; flipped: boolean; matched: boolean; }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(count = 6): Tile[] {
  const symbols = SYMBOLS.slice(0, count);
  return shuffle([...symbols, ...symbols].map((symbol, id) => ({ id, symbol, flipped: false, matched: false })));
}

export function MemoryMatch() {
  const [tiles, setTiles] = useState<Tile[]>(() => buildDeck(6));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [moves, setMoves] = useState(0);
  const won = tiles.length > 0 && tiles.every(t => t.matched);

  const matched = tiles.filter(t => t.matched).length / 2;
  const total = tiles.length / 2;

  const reset = useCallback(() => {
    setTiles(buildDeck(6));
    setFlipped([]);
    setLocked(false);
    setMoves(0);
  }, []);

  function flip(id: number) {
    if (locked) return;
    const tile = tiles.find(t => t.id === id);
    if (!tile || tile.flipped || tile.matched) return;
    if (flipped.length === 1 && flipped[0] === id) return;

    const newFlipped = [...flipped, id];
    setTiles(prev => prev.map(t => t.id === id ? { ...t, flipped: true } : t));
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newFlipped.map(fid => tiles.find(t => t.id === fid)!);
      if (a.symbol === b.symbol) {
        setTiles(prev => prev.map(t => newFlipped.includes(t.id) ? { ...t, matched: true } : t));
        setFlipped([]);
      } else {
        setLocked(true);
        setTimeout(() => {
          setTiles(prev => prev.map(t => newFlipped.includes(t.id) ? { ...t, flipped: false } : t));
          setFlipped([]);
          setLocked(false);
        }, 900);
      }
    }
  }

  return (
    <div className="memoryMatch">
      <div className="memoryMatchHeader">
        <div>
          <span className="kicker">Memory Match · یادوں کا کھیل</span>
          <h3>Birthday memory cards</h3>
          <p>Find every matching pair to reveal a birthday message.</p>
        </div>
        <div className="memoryMatchStats">
          <span className="chip">{matched}/{total} pairs</span>
          <span className="chip">{moves} moves</span>
          <button className="button secondary" onClick={reset} style={{padding:"4px 10px",fontSize:"11px"}}>Reset ↺</button>
        </div>
      </div>
      {won && (
        <div className="reward" style={{marginBottom:"16px"}}>
          <span>🎉</span>
          <h3>All pairs matched!</h3>
          <p>You found every birthday memory in {moves} moves. Some things are always worth finding twice. ♡</p>
        </div>
      )}
      <div className="memoryGrid">
        {tiles.map(tile => (
          <button
            key={tile.id}
            className={`memoryTile ${tile.flipped || tile.matched ? "isFlipped" : ""} ${tile.matched ? "isMatched" : ""}`}
            onClick={() => flip(tile.id)}
            aria-label={tile.flipped || tile.matched ? tile.symbol : "Hidden card"}
            aria-pressed={tile.flipped || tile.matched}
            disabled={tile.matched}
          >
            <span className="memoryTileFront">{tile.symbol}</span>
            <span className="memoryTileBack">✿</span>
          </button>
        ))}
      </div>
    </div>
  );
}
