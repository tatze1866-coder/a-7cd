# a-7cd

Browserbasierter MapleStory-inspirierter 2D-Sidescroller mit Node.js/WebSocket-Server.

## Starten

```bash
npm install
npm start
```

Dann im Browser öffnen: **http://localhost:3000**

Mehrere Browser-Tabs/Geräte im selben Netzwerk = Multiplayer (Server-IP statt localhost verwenden).

## Steuerung

- **Pfeiltasten / A,D** – Bewegen, **Pfeil hoch / Leertaste** – Springen
- **Q** – Normalangriff
- **W / E / R / T / Y** – Skill 1–5 (abhängig vom Job)
- **I** – Inventar
- **J** – Quests (noch keine vorhanden)
- **K** – Skillbaum (Skillpunkte pro Level-up investieren, +10% Effekt/Stufe)
- **C** – Charakter (Ausrüstung: Hut, Brustpanzer, Handschuhe, Umhang, Hose, Schuhe, 2 Ringe + Stats: STR/DEX/INT/LUK/HP, 5 Punkte pro Level-up)
- **L** – Job wählen (ab Level 3)
- **H** – Händler (Shop)
- **Enter** – Chat öffnen/senden

## Inhalt (aktueller Stand)

- 3 Maps mit Portalen: Henesys Field → Kerning Forest → Sleepywood Dungeon
- 4 Jobs (ab Level 3 wählbar): Warrior, Bowmaster, Thief, Priest – je 5 Skills mit eigenen Pixel-FX beim Cast
- 6 Mob-Typen mit einfacher KI (Wandern / Aggro-Chase), Respawn-Timer
- Inventar, Equipment (Waffe + 6 Rüstungsslots + 2 Ringe), Loot-Tabellen pro Mob
- Charakter-Panel mit STR/DEX/INT/LUK/HP-Stats (5 Punkte pro Level-up) und Skillbaum (1 Skillpunkt pro Level-up, +10% Skilleffekt je Stufe, max. 5)
- Händler-Panel (Kaufen/Verkaufen) mit dem Shop-Sortiment pro Job
- Leveling mit EXP-Kurve, HP/MP-Wachstum
- Server-autoritative Physik (Gravity, Plattform-Kollision, one-way Plattformen)
- Chat pro Map
- UI-Soundeffekte (Buttons, Panels, Kauf/Verkauf, Levelup, Tod, Job-Wechsel, Chat)

## Architektur

```
server/
  index.js          Game-Loop, WebSocket-Handling, Nachrichten-Router
  game/Player.js     Spielerzustand, Leveling, Inventory
  game/Mob.js        Mob-KI, Respawn
  game/Job.js        Job-/Skill-Definitionen
  game/Items.js       Items, Loot-Tabellen, Shop
  game/Physics.js     Gravity + Plattform-Kollision
  maps/maps.js        Map-Layouts, Portale, Mob-Spawns
public/
  index.html          UI-Grundgerüst (HUD, Skillbar, Panels, Chat)
  client.js           Networking, Canvas-Rendering, Input
  style.css           Styling
```

## Credits

UI-Soundeffekte: "Cute & Cozy UI Audio" von Case Portman (caseportmanaudio.com), Free-Sample-Pack, Lizenz erfordert Namensnennung – siehe `public/assets/sfx/`.
Skill-FX: "Super Package Retro Pixel Effects 32x32 pack 2" – siehe `public/assets/fx/`.

## Nächste Schritte (Ideen)

- Echte Sprites statt Farbrechtecke (PIL-generierte Assets wie bei deinem no-food Projekt)
- NPC-Händler als klickbare Figur statt reinem Panel
- Party-System, Trade zwischen Spielern
- Mehr Maps/Mobs, Boss-Fight
- Persistenz (aktuell: alles im RAM, Reset bei Server-Neustart)
